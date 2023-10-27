/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2023 Polkascan Foundation (NL)
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
import { BehaviorSubject, catchError, combineLatest, Observable, of, Subject, takeUntil } from 'rxjs';
import { types as pst } from '@polkadapt/core';
import { FormControl, FormGroup } from '@angular/forms';
import { PolkadaptService } from '../../../../../../services/polkadapt.service';
import { BN, u8aToHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { NetworkService } from "../../../../../../services/network.service";
import { TooltipsService } from "../../../../../../services/tooltips.service";
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';


type eventAmounts = [string, BN][];
type eventAddresses = [string, string];  // [from, to]


@Component({
  selector: 'app-account-transfers',
  templateUrl: './account-transfers.component.html',
  styleUrls: ['./account-transfers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountTransfersComponent implements OnChanges, OnDestroy {
  @Input() address: string;
  @Input() listSize: number;

  rpcEventsCache = new Map<string, Observable<pst.Event & { attributeName?: string }>>
  amountsCache = new Map<string, Observable<eventAmounts>>
  addressesCache = new Map<string, Observable<eventAddresses>>
  directionCache = new Map<string, Observable<string | null>>

  eventTypes: { [pallet: string]: string[] } = {'Balances': ['Transfer']}
  events = new BehaviorSubject<(pst.AccountEvent | pst.Transfer)[]>([]);
  columns = ['icon', 'eventID', 'age', 'direction', 'address', 'amount', 'detailsEvent'];

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

  private reset: Subject<void> = new Subject();
  private destroyer = new Subject<void>();

  constructor(private pa: PolkadaptService,
              private ns: NetworkService,
              private ts: TooltipsService) {
  }

  ngOnDestroy(): void {
    this.reset.complete()
    this.destroyer.next();
    this.destroyer.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const address: string = changes.address.currentValue;
    this.events.next([]);
    this.reset.next();

    this.fetchAndSubscribeEvents(address);

    const queryParams: { [p: string]: string } = {'address': address};
    for (let pallet of Object.keys(this.eventTypes)) {
      queryParams.pallet = pallet;
      if (this.eventTypes[pallet].length === 1) {
        queryParams.eventName = this.eventTypes[pallet][0];
      }
    }

    this.routerLink.next('../../transfer');
    delete queryParams.pallet;
    delete queryParams.eventName;
    this.queryParams.next(queryParams);
  }

  async fetchAndSubscribeEvents(address: string): Promise<void> {
    const idHex: string = u8aToHex(decodeAddress(address));
    const filterParams: any = {eventTypes: this.eventTypes};

    let events: pst.AccountEvent[] = [];
    const listSize = this.listSize || 50;

    const subscription = this.pa.run().getTransfersByAccount(idHex, undefined, this.listSize).pipe(
      catchError(() => this.pa.run().getEventsByAccount(idHex, filterParams, listSize)),
      tap({
        subscribe: () => {
          this.loading.next(true);
        },
        finalize: () => {
          this.loading.next(false);
        }
      }),
      switchMap((obs) => obs.length
        ? combineLatest(obs) as unknown as Observable<(pst.AccountEvent | pst.Transfer)[]>
        : of([]) as Observable<pst.AccountEvent[]>),
      takeUntil(this.reset),
      takeUntil(this.destroyer)
    ).subscribe({
      next: (items) => {
        const merged = [...events, ...items.filter((event) => {
          const isDuplicate = events.some((item) =>
            event.blockNumber === item.blockNumber
            && event.eventIdx === item.eventIdx
          );
          return !isDuplicate;
        })];
        merged.sort((a, b) => (b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx));


        if (events.length > listSize) {
          // List size has been reached. List is done, limit to listsize.
          events.length = listSize;
          subscription.unsubscribe();
        }

        this.events.next(merged);
      }
    });

    this.pa.run({observableResults: false}).subscribeNewTransferByAccount(idHex, filterParams).pipe(
      catchError(() => this.pa.run({observableResults: false}).subscribeNewEventByAccount(idHex, filterParams)),
      takeUntil(this.reset),
      takeUntil(this.destroyer)
    ).subscribe({
      next: (event) => {
        const events = this.events.value;
        if (events && !events.some((e) =>
          e.blockNumber === event.blockNumber
          && e.eventIdx === event.eventIdx
        )) {
          const merged = [event, ...events];
          merged.sort((a, b) => (b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx));

          if (merged.length > listSize) {
            merged.length = listSize;
          }

          this.events.next(merged);
        }
      }
    })
  }

  eventTrackBy(i: any, event: pst.AccountEvent | pst.Transfer): string {
    return `${event.blockNumber}-${event.eventIdx}`;
  }

  fetchAndCacheRpcEvent(eventOrTransfer: pst.Event | pst.AccountEvent | pst.Transfer) {
    return this.pa.run({adapters: ['substrate-rpc']}).getEvent(eventOrTransfer.blockNumber, eventOrTransfer.eventIdx).pipe(
      switchMap((obs => obs)),
      map((event) => {
        if (event.attributes && event.attributes[0] && event.attributes[1]) {
          const direction = event.attributes[0] === this.address ? 'from' : event.attributes[1] === this.address ? 'to' : null;
          if (direction) {
            event = Object.assign({attributeName: direction}, event);
          }
        }
        return event as pst.Event & { attributeName?: string };
      }),
      shareReplay({
        bufferSize: 1,
        refCount: true
      }),
      takeUntil(this.destroyer)
    );
  }

  getAmountsFromEvent(eventOrTransfer: pst.AccountEvent | pst.Transfer): Observable<eventAmounts> {
    const key = `${eventOrTransfer.blockNumber}_${eventOrTransfer.eventIdx}`;
    let cachedAmount = this.amountsCache.get(key);
    let cachedEvent = this.rpcEventsCache.get(key);

    if (cachedAmount) {
      return cachedAmount;
    }

    // First check if there is a Transfer available.
    if ((eventOrTransfer as pst.Transfer).hasOwnProperty('amount')) {
      const amounts: eventAmounts = [];
      amounts.push(['amount', new BN((eventOrTransfer as pst.Transfer).amount)]);
      const observable = of(amounts);
      this.amountsCache.set(key, observable);
      return observable;
    }

    // Second check if there is an AccountEvent or Event with attributes available.
    const attributes = (eventOrTransfer as pst.Event | pst.AccountEvent).attributes;
    if (attributes) {
      const attrNames = ['amount', 'actual_fee', 'actualFee', 'tip'];
      const amounts: eventAmounts = [];

      if (typeof attributes === 'string') {
        for (let name of attrNames) {
          const match = new RegExp(`"${name}": ?\"?(\\d+)\"?`).exec(attributes);
          if (match) {
            amounts.push([name, new BN(match[1])]);
          }
        }
      } else if (Object.prototype.toString.call(attributes) == '[object Object]') {
        attrNames.forEach((name) => {
          if (attributes.hasOwnProperty(name)) {
            amounts.push([name, new BN(attributes[name])])
          }
        })
      }

      const observable = of(amounts);
      this.amountsCache.set(key, observable);
      return observable;
    }

    // Lastly fetch from the RPC.
    if (!cachedEvent) {
      cachedEvent = this.fetchAndCacheRpcEvent(eventOrTransfer);
      this.rpcEventsCache.set(key, cachedEvent)
    }

    const observable = cachedEvent.pipe(
      map((event) => {
        const amounts: [string, BN][] = [];
        if (event.attributes) {
          amounts.push(['amount', new BN(event.attributes[2])]);
        }
        return amounts;
      }),
      shareReplay({
        bufferSize: 1,
        refCount: true
      })
    );

    this.amountsCache.set(key, observable);
    return observable;
  }

  getAddressFromEvent(eventOrTransfer: pst.AccountEvent | pst.Event | pst.Transfer): Observable<eventAddresses> {
    const key = `${eventOrTransfer.blockNumber}_${eventOrTransfer.eventIdx}`;
    let cachedAddresses = this.addressesCache.get(key);
    let cachedEvent = this.rpcEventsCache.get(key);

    if (cachedAddresses) {
      return cachedAddresses;
    }

    // First check if there is a Transfer available.
    if ((eventOrTransfer as pst.Transfer).from && (eventOrTransfer as pst.Transfer).to) {
      const addresses: eventAddresses = [(eventOrTransfer as pst.Transfer).from, (eventOrTransfer as pst.Transfer).to];
      const observable = of(addresses);
      this.addressesCache.set(key, observable);
      return observable;
    }

    // Second check if there is an AccountEvent or Event with attributes available.
    const attributes = (eventOrTransfer as pst.Event | pst.AccountEvent).attributes
    if (attributes) {
      const data: any = typeof attributes === 'string'
        ? JSON.parse(attributes)
        : attributes;
      if (data.from && data.to) {
        const observable = of([data.from, data.to] as eventAddresses);
        this.addressesCache.set(key, observable);
        return observable;
      }
    }

    // Lastly fetch from the RPC.
    if (!cachedEvent) {
      cachedEvent = this.fetchAndCacheRpcEvent(eventOrTransfer);
      this.rpcEventsCache.set(key, cachedEvent);
    }

    const observable = cachedEvent.pipe(
      map((event) => {
        if (event.attributes) {
          return [event.attributes[0], event.attributes[1]] as eventAddresses;
        }
        return ['', ''] as eventAddresses;
      }),
      shareReplay({
        bufferSize: 1,
        refCount: true
      })
    );

    this.addressesCache.set(key, observable);
    return observable;
  }

  getDirectionFromEvent(eventOrTransfer: pst.AccountEvent | pst.Event | pst.Transfer): Observable<string | null> {
    const key = `${eventOrTransfer.blockNumber}_${eventOrTransfer.eventIdx}`;
    let cachedDirection = this.directionCache.get(key);
    let cachedEvent = this.rpcEventsCache.get(key);

    if (cachedDirection) {
      return cachedDirection;
    }

    // First check if there is a Transfer available.
    if ((eventOrTransfer as pst.Transfer | pst.AccountEvent).attributeName) {
      const observable = of((eventOrTransfer as pst.Transfer).attributeName as string);
      this.directionCache.set(key, observable);
      return observable;
    }

    // Second check if there is an AccountEvent or Event with attributes available.
    const attributes = (eventOrTransfer as pst.Event | pst.AccountEvent).attributes
    if (attributes) {
      const data: any = typeof attributes === 'string'
        ? JSON.parse(attributes)
        : attributes;
      if (data.from && data.to) {
        let observable: Observable<string> | undefined;
        if (data.from === this.address) {
          observable = of('from');
        } else if (data.to === this.address) {
          observable = of('to');
        }
        if (observable) {
          this.directionCache.set(key, observable);
          return observable;
        }
      }
    }

    // Lastly fetch from the RPC.
    if (!cachedEvent) {
      cachedEvent = this.fetchAndCacheRpcEvent(eventOrTransfer);
    }

    const observable = cachedEvent.pipe(
      map((event) => {
        if (event.attributeName) {
          return event.attributeName;
        }
        return null;
      }),
      shareReplay({
        bufferSize: 1,
        refCount: true
      })
    );

    this.directionCache.set(key, observable);
    return observable;
  }

  copied(address: string) {
    this.ts.notify.next(
      `Address copied.<br><span class="mono">${address}</span>`);
  }
}
