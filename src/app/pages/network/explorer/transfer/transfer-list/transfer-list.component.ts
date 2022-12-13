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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { ActivatedRoute, Params, Router } from '@angular/router';
import {u8aToHex} from "@polkadot/util";
import {decodeAddress} from "@polkadot/util-crypto";


@Component({
  selector: 'app-transfer-list',
  templateUrl: './transfer-list.component.html',
  styleUrls: ['./transfer-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransferListComponent extends PaginatedListComponentBase<pst.Event | pst.AccountEvent> implements OnInit {
  listSize = 100;

  dateRangeBeginControl = new FormControl<Date | ''>('');
  dateRangeEndControl = new FormControl<Date | ''>('');
  blockRangeBeginControl = new FormControl<number | ''>('');
  blockRangeEndControl = new FormControl<number | ''>('');
  addressControl = new FormControl<string>('');

  filtersFormGroup: FormGroup = new FormGroup({
    dateRangeBegin: this.dateRangeBeginControl,
    dateRangeEnd: this.dateRangeEndControl,
    blockRangeBegin: this.blockRangeBeginControl,
    blockRangeEnd: this.blockRangeEndControl,
    address: this.addressControl,
  });

  visibleColumns = ['icon', 'referencedTransaction', 'age', 'fromAddress', 'arrow', 'toAddress', 'amount', 'details'];

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private rs: RuntimeService,
              private cd: ChangeDetectorRef,
              private router: Router,
              private route: ActivatedRoute) {
    super(ns);
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      takeUntil(this.destroyer),
      distinctUntilChanged(),
      map(params => [
        params.get('dateRangeBegin') ? new Date(`${params.get('dateRangeBegin') as string}T00:00`) : '',
        params.get('dateRangeEnd') ? new Date(`${params.get('dateRangeEnd') as string}T00:00`) : '',
        parseInt(params.get('blockRangeBegin') as string, 10) || '',
        parseInt(params.get('blockRangeEnd') as string, 10) || '',
        params.get('address') as string || ''
      ] as [Date | '', Date | '', number | '', number | '', string])
    ).subscribe(([dateRangeBegin, dateRangeEnd, blockRangeBegin, blockRangeEnd, address]) => {
      const oldDateStart = this.dateRangeBeginControl.value;
      if ((dateRangeBegin && dateRangeBegin.getTime() || '') !== (oldDateStart && oldDateStart.getTime() || '')) {
        this.dateRangeBeginControl.setValue(dateRangeBegin);
      }
      const oldDateEnd = this.dateRangeEndControl.value;
      if ((dateRangeEnd && dateRangeEnd.getTime() || '') !== (oldDateEnd && oldDateEnd.getTime() || '')) {
        this.dateRangeEndControl.setValue(dateRangeEnd);
      }
      if (blockRangeBegin !== this.blockRangeBeginControl.value) {
        this.blockRangeBeginControl.setValue(blockRangeBegin);
      }
      if (blockRangeEnd !== this.blockRangeEndControl.value) {
        this.blockRangeEndControl.setValue(blockRangeEnd);
      }
      if (address !== this.addressControl.value) {
        this.addressControl.setValue(address);
      }
    });

    this.filtersFormGroup.valueChanges
      .pipe(
        debounceTime(100),  // To make sure eventNameControl reset has taken place
        takeUntil(this.destroyer)
      )
      .subscribe((values) => {
        this.items = [];
        this.subscribeNewItem();
        this.getItems();

        const queryParams: Params = {};
        if (values.dateRangeBegin) {
          const d = new Date(values.dateRangeBegin.getTime() - values.dateRangeBegin.getTimezoneOffset() * 60000)
          queryParams.dateRangeBegin = d.toISOString().substring(0, 10);
        }
        if (values.dateRangeEnd) {
          const d = new Date(values.dateRangeEnd.getTime() - values.dateRangeEnd.getTimezoneOffset() * 60000)
          queryParams.dateRangeEnd = d.toISOString().substring(0, 10);
        }
        if (values.blockRangeBegin) {
          queryParams.blockRangeBegin = values.blockRangeBegin;
        }
        if (values.blockRangeEnd) {
          queryParams.blockRangeEnd = values.blockRangeEnd;
        }
        if (values.address) {
          queryParams.address = values.address;
        }

        this.router.navigate(['.'], {
          relativeTo: this.route,
          queryParams
        });
      });

    super.ngOnInit();
  }


  ngOnDestroy() {
    super.ngOnDestroy();
  }


  onNetworkChange(network: string, previous: string): void {
    if (previous) {
      this.filtersFormGroup.reset({
        dateRangeBegin: '',
        dateRangeEnd: '',
        blockRangeBegin: '',
        blockRangeEnd: '',
        address: ''
      }, {emitEvent: false});

      this.router.navigate(['.'], {
        relativeTo: this.route
      });
    }

    super.onNetworkChange(network);
  }


  createGetItemsRequest(pageKey?: string, blockLimitOffset?: number): Promise<pst.ListResponse<pst.Event | pst.AccountEvent>> {
    if (this.addressControl.value) {
      return this.pa.run(this.network).polkascan.chain.getEventsByAccount(
        u8aToHex(decodeAddress(this.addressControl.value)),
        this.filters,
        this.listSize,
        pageKey,
        blockLimitOffset
      );
    } else {
      return this.pa.run(this.network).polkascan.chain.getEvents(
        this.filters,
        this.listSize,
        pageKey,
        blockLimitOffset
      );
    }
  }


  createNewItemSubscription(handleItemFn: (item: pst.Event | pst.AccountEvent) => void): Promise<() => void> {
    if (this.addressControl.value) {
      return this.pa.run(this.network).polkascan.chain.subscribeNewEventByAccount(
        u8aToHex(decodeAddress(this.addressControl.value)),
        this.filters,
        handleItemFn
      );
    } else {
      return this.pa.run(this.network).polkascan.chain.subscribeNewEvent(
        this.filters,
        handleItemFn
      );
    }
  }


  sortCompareFn(a: pst.Event, b: pst.Event): number {
    return b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx;
  }


  equalityCompareFn(a: pst.Event, b: pst.Event): boolean {
    return a.blockNumber === b.blockNumber && a.eventIdx === b.eventIdx;
  }


  get filters(): any {
    const filters: any = {
      eventModule: 'Balances',
      pallet: 'Balances',
      eventName: 'Transfer'
    };
    if (this.dateRangeBeginControl.value) {
      filters.dateRangeBegin = this.dateRangeBeginControl.value;
    }
    const dateRangeEnd = this.dateRangeEndControl.value;
    if (dateRangeEnd) {
      // Add an entire day (minus 1 millisecond), so it will become inclusive.
      filters.dateRangeEnd = new Date(dateRangeEnd.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
    if (this.blockRangeBeginControl.value) {
      filters.blockRangeBegin = this.blockRangeBeginControl.value;
    }
    if (this.blockRangeEndControl.value) {
      filters.blockRangeEnd = this.blockRangeEndControl.value;
    }

    return filters;
  }


  track(i: any, event: pst.Event | pst.AccountEvent): string {
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


  getAddressFromEvent(event: pst.AccountEvent, attrName: string): string {
    if (event.attributes) {
      const data: any = JSON.parse(event.attributes);
      return data[attrName];
    }
    return '';
  }
}
