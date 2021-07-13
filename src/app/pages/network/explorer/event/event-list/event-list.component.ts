/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2021 Polkascan Foundation (NL)
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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { debounceTime, filter, first, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { ListComponentBase } from '../../../../../components/list-base/list.component.base';


@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventListComponent extends ListComponentBase implements OnInit, OnDestroy {
  events = new BehaviorSubject<pst.Event[]>([]);
  filters = new Map();

  palletControl: FormControl = new FormControl('');
  eventNameControl: FormControl = new FormControl('');
  filtersFormGroup: FormGroup = new FormGroup({
    eventModule: this.palletControl,
    eventName: this.eventNameControl
  });

  nextPage: string | null = null;
  columnsToDisplay = ['icon', 'eventID', 'referencedTransaction', 'pallet', 'events', 'details'];

  private unsubscribeNewEventFn: null | (() => void);

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private rs: RuntimeService,
              private cd: ChangeDetectorRef) {
    super(ns);
  }

  ngOnInit(): void {
    this.filtersFormGroup.valueChanges
      .pipe(
        debounceTime(100),  // Also to make sure eventNameControl reset has taken place
        takeUntil(this.destroyer)
      )
      .subscribe((values) => {
        this.unsubscribeNewEvent();
        this.events.next([]);

        this.subscribeNewEvent();
        this.getEvents();
      });

    this.palletControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.eventNameControl.reset('', {emitEvent: false});
      });
  }


  onNetworkChange(network: string): void {
    this.filtersFormGroup.reset({
      eventModule: '',
      eventName: ''
    }, {emitEvent: false});
    this.unsubscribeNewEvent();

    if (network) {
      this.subscribeNewEvent();
      this.getEvents();

      this.rs.getRuntime(network)
        .pipe(
          takeUntil(this.destroyer),
          filter((r) => r !== null),
          first()
        )
        .subscribe(async (runtime): Promise<void> => {
          const pallets = await this.rs.getRuntimePallets(network, (runtime as pst.Runtime).specVersion);
          const rEvents = await this.rs.getRuntimeEvents(network, (runtime as pst.Runtime).specVersion);

          if (pallets) {
            pallets.forEach((pallet) => {
              this.filters.set(pallet, rEvents ? rEvents.filter((event) => pallet.pallet === event.pallet).sort() : []);
            });
            this.cd.markForCheck();
          }
        });
    }
  }


  ngOnDestroy(): void {
    super.ngOnDestroy();
    this.unsubscribeNewEvent();
  }


  async subscribeNewEvent(): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      this.unsubscribeNewEvent();
      return;
    }

    const filters: any = {};
    if (this.palletControl.value) {
      filters.eventModule = this.palletControl.value;
    }
    if (this.eventNameControl.value) {
      filters.eventName = this.eventNameControl.value;
    }

    try {
      this.unsubscribeNewEventFn = await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.subscribeNewEvent(
        filters,
        (event: pst.Event) => {
          if (!this.onDestroyCalled) {
            const events = [...this.events.value];
            if (!events.some((e) => e.blockNumber === event.blockNumber && e.eventIdx === event.eventIdx)) {
              events.splice(0, 0, event);
              events.sort((a, b) => b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx);
              this.events.next(events);
            }
          } else {
            // If still listening but component is already destroyed.
            this.unsubscribeNewEvent();
          }
        });
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  unsubscribeNewEvent(): void {
    if (this.unsubscribeNewEventFn) {
      this.unsubscribeNewEventFn();
      this.unsubscribeNewEventFn = null;
    }
  }


  async getEvents(pageKey?: string): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      return;
    }

    this.loading++;

    const filters: any = {};
    if (this.palletControl.value) {
      filters.eventModule = this.palletControl.value;
    }
    if (this.eventNameControl.value) {
      filters.eventName = this.eventNameControl.value;
    }

    try {
      const response: pst.ListResponse<pst.Event> =
        await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.getEvents(filters, 100, pageKey);
      if (!this.onDestroyCalled) {
        const events = [...this.events.value];
        response.objects
          .filter((event) => {
            return !events.some((e) => e.blockNumber === event.blockNumber && e.eventIdx === event.eventIdx);
          })
          .forEach((event) => {
            events.push(event);
          });

        this.nextPage = response.pageInfo ? response.pageInfo.pageNext || null : null;

        events.sort((a, b) => b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx);
        this.events.next(events);
        this.loading--;
      }
    } catch (e) {
      this.loading--;
      console.error(e);
      // Ignore for now...
    }
  }


  async getNextPage(): Promise<void> {
    if (this.nextPage) {
      this.getEvents(this.nextPage);
    }
  }


  track(i: any, event: pst.Event): string {
    return `${event.blockNumber}-${event.eventIdx}`;
  }
}
