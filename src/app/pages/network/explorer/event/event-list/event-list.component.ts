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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { debounceTime, filter, first, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { PaginatedListComponentBase } from '../../../../../components/list-base/paginated-list-component-base.directive';


@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventListComponent extends PaginatedListComponentBase<pst.Event> implements OnInit {
  listSize = 100;
  eventFilters = new Map();

  palletControl: FormControl = new FormControl('');
  eventNameControl: FormControl = new FormControl('');
  filtersFormGroup: FormGroup = new FormGroup({
    eventModule: this.palletControl,
    eventName: this.eventNameControl
  });

  visibleColumns = ['icon', 'eventID', 'referencedTransaction', 'pallet', 'events', 'details'];

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
        this.items = [];
        this.subscribeNewItem();
        this.getItems();
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

    this.eventFilters.clear();

    super.onNetworkChange(network);

    if (network && !this.onDestroyCalled) {
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
              this.eventFilters.set(pallet, rEvents ? rEvents.filter((event) => pallet.pallet === event.pallet).sort() : []);
            });
            this.cd.markForCheck();
          }
        });
    }
  }


  createGetItemsRequest(pageKey?: string): Promise<pst.ListResponse<pst.Event>> {
    return this.pa.run(this.network).polkascan.chain.getEvents(
      this.filters,
      this.listSize,
      pageKey
    );
  }


  createNewItemSubscription(handleItemFn: (item: pst.Event) => void): Promise<() => void> {
    return this.pa.run(this.network).polkascan.chain.subscribeNewEvent(
      this.filters,
      handleItemFn
    );
  }


  sortCompareFn(a: pst.Event, b: pst.Event): number {
    return b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx;
  }


  equalityCompareFn(a: pst.Event, b: pst.Event): boolean {
    return a.blockNumber === b.blockNumber && a.eventIdx === b.eventIdx;
  }


  get filters(): any {
    const filters: any = {};
    if (this.palletControl.value) {
      filters.eventModule = this.palletControl.value;
    }
    if (this.eventNameControl.value) {
      filters.eventName = this.eventNameControl.value;
    }
    return filters;
  }


  track(i: any, event: pst.Event): string {
    return `${event.blockNumber}-${event.eventIdx}`;
  }
}
