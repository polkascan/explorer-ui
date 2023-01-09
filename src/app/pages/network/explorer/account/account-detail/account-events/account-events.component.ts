/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2022 Polkascan Foundation (NL)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { FormControl, FormGroup } from '@angular/forms';
import { PolkadaptService } from '../../../../../../services/polkadapt.service';
import { u8aToHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { NetworkService } from "../../../../../../services/network.service";
import { TooltipsService } from "../../../../../../services/tooltips.service";


@Component({
  selector: 'app-account-events',
  templateUrl: './account-events.component.html',
  styleUrls: ['./account-events.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountEventsComponent implements OnChanges, OnDestroy {
  @Input() address: string;
  @Input() listSize: number;
  @Input() eventTypes: { [pallet: string]: string[] }
  @Input() columns = ['icon', 'eventID', 'age', 'referencedTransaction', 'pallet', 'event', 'attribute', 'amount', 'details'];

  events = new BehaviorSubject<pst.AccountEvent[]>([]);

  palletControl = new FormControl('');
  eventNameControl = new FormControl('');
  dateRangeBeginControl = new FormControl<Date | ''>('');
  dateRangeEndControl = new FormControl<Date | ''>('');
  blockRangeBeginControl = new FormControl<number | ''>('');
  blockRangeEndControl = new FormControl<number | ''>('');

  filtersFormGroup: FormGroup = new FormGroup({
    pallet: this.palletControl,
    eventName: this.eventNameControl,
    dateRangeBegin: this.dateRangeBeginControl,
    dateRangeEnd: this.dateRangeEndControl,
    blockRangeBegin: this.blockRangeBeginControl,
    blockRangeEnd: this.blockRangeEndControl
  });

  routerLink = new BehaviorSubject<string>('../../event');
  queryParams = new BehaviorSubject<{ [p: string]: string }>({});
  networkProperties = this.ns.currentNetworkProperties;

  loading = new BehaviorSubject<boolean>(false);

  private unsubscribeFns: Map<string, (() => void)> = new Map();
  private destroyer: Subject<undefined> = new Subject();

  constructor(private pa: PolkadaptService,
              private ns: NetworkService,
              private ts: TooltipsService) {
  }

  ngOnDestroy(): void {
    this.unsubscribeFns.forEach(unsub => unsub());
    this.unsubscribeFns.clear();
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const address: string = changes.address.currentValue;
    this.events.next([]);
    this.fetchAndSubscribeEvents(address);
    const queryParams: { [p: string]: string } = {'address': address};
    if (this.eventTypes) {
      for (let pallet of Object.keys(this.eventTypes)) {
        queryParams.pallet = pallet;
        if (this.eventTypes[pallet].length === 1) {
          queryParams.eventName = this.eventTypes[pallet][0];
        }
      }
    }
    if (queryParams.pallet === 'Balances' && queryParams.eventName === 'Transfer') {
      this.routerLink.next('../../transfer');
      delete queryParams.pallet;
      delete queryParams.eventName;
    } else {
      this.routerLink.next('../../event');
    }
    this.queryParams.next(queryParams);
  }

  async fetchAndSubscribeEvents(address: string): Promise<void> {
    const existingUnsubscribe = this.unsubscribeFns.get('eventsUnsubscribeFn');
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    this.loading.next(true);

    const idHex: string = u8aToHex(decodeAddress(address));
    const filterParams: any = {eventTypes: this.eventTypes};

    let events: pst.AccountEvent[] = [];
    const listSize = this.listSize || 50;
    let pageNext: string | undefined = undefined
    let blockLimitOffset: number | undefined = undefined;
    let blockLimitCount: number | undefined = undefined;

    while (events.length < listSize) {
      const response: pst.ListResponse<pst.AccountEvent> = await this.pa.run().polkascan.chain.getEventsByAccount(idHex, filterParams, listSize, pageNext, blockLimitOffset);

      pageNext = response.pageInfo ? response.pageInfo.pageNext || undefined : undefined;
      blockLimitCount = response.pageInfo ? response.pageInfo.blockLimitCount || undefined : undefined;
      blockLimitOffset = response.pageInfo ? response.pageInfo.blockLimitOffset || undefined : undefined;

      if (response.objects && response.objects.length > 0) {
        events = [...events, ...response.objects];
      }

      if (events.length > listSize) {
        // List size has been reached. List is done, limit to listsize.
        events.length = listSize;
        break;
      }

      if (pageNext) {
        // There is a next page, continue while loop.
      } else if (blockLimitOffset && blockLimitCount) {
        const nextBlockLimitOffset = Math.max(0, blockLimitOffset - blockLimitCount);
        if (nextBlockLimitOffset === 0) {
          // Genesis has been reached. Stop the while loop.
          break;
        } else {
          // No more pages left in current block offset, move to the next offset.
          blockLimitOffset = nextBlockLimitOffset;
        }
      } else {
        // No more items to be expected.
        break;
      }
    }

    this.events.next(events);
    this.loading.next(false);

    const eventsUnsubscribeFn = await this.pa.run().polkascan.chain.subscribeNewEventByAccount(idHex,
      filterParams,
      (event: pst.AccountEvent) => {
        const events = this.events.value;
        if (events && !events.some((e) => e.blockNumber === event.blockNumber && e.eventIdx === event.eventIdx)) {
          const merged = [event, ...events];
          merged.sort((a, b) => (b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx));
          merged.length = this.listSize;
          this.events.next(merged);
        }
      });

    this.unsubscribeFns.set('eventsUnsubscribeFn', eventsUnsubscribeFn);
  }

  eventTrackBy(i: any, event: pst.AccountEvent): string {
    return `${event.blockNumber}-${event.eventIdx}`;
  }

  getAmountsFromAttributes(data: string): [string, number][] {
    const attrNames = ['amount', 'actual_fee', 'tip'];
    const amounts: [string, number][] = [];
    for (let name of attrNames) {
      const match = new RegExp(`"${name}": (\\d+)`).exec(data);
      if (match) {
        amounts.push([name, parseInt(match[1], 10)]);
      }
    }
    return amounts;
  }

  getAddressFromEvent(event: pst.AccountEvent): string {
    if (event.attributes) {
      const data: any = JSON.parse(event.attributes);
      let address: string = '';
      if (event.eventName === 'Transfer') {
        if (event.attributeName === 'from') {
          address = data.to;
        } else {
          address = data.from;
        }
        return address;
      }
    }
    return '';
  }

  copied(address: string) {
    this.ts.notify.next(
      `Address copied.<br><span class="mono">${address}</span>`);
  }
}
