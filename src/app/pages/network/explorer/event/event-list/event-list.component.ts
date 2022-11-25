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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { debounceTime, distinctUntilChanged, filter, first, map, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import {u8aToHex} from "@polkadot/util";
import {decodeAddress} from "@polkadot/util-crypto";


@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventListComponent extends PaginatedListComponentBase<pst.Event | pst.AccountEvent> implements OnInit, OnDestroy {
  listSize = 100;
  eventFilters = new Map();
  specVersions = new BehaviorSubject<number[]>([]);
  runtimesSubscription: Subscription | null = null;

  palletControl = new FormControl('');
  eventNameControl = new FormControl('');
  specVersionControl = new FormControl<number | ''>('');
  dateRangeBeginControl = new FormControl<Date | ''>('');
  dateRangeEndControl = new FormControl<Date | ''>('');
  blockRangeBeginControl = new FormControl<number | ''>('');
  blockRangeEndControl = new FormControl<number | ''>('');
  addressControl = new FormControl<string>('');

  filtersFormGroup: FormGroup = new FormGroup({
    pallet: this.palletControl,
    eventName: this.eventNameControl,
    specVersion: this.specVersionControl,
    dateRangeBegin: this.dateRangeBeginControl,
    dateRangeEnd: this.dateRangeEndControl,
    blockRangeBegin: this.blockRangeBeginControl,
    blockRangeEnd: this.blockRangeEndControl,
    address: this.addressControl,
  });

  visibleColumns = ['icon', 'eventID', 'age', 'referencedTransaction', 'pallet', 'event', 'amount', 'details'];
  visibleColumnsForAccount = ['icon', 'eventID', 'age', 'referencedTransaction', 'pallet', 'event', 'attribute', 'amount', 'details'];

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
        parseInt(params.get('runtime') as string, 10) || '',
        params.get('pallet') as string || '',
        params.get('eventName') as string || '',
        params.get('dateRangeBegin') ? new Date(`${params.get('dateRangeBegin') as string}T00:00`) : '',
        params.get('dateRangeEnd') ? new Date(`${params.get('dateRangeEnd') as string}T00:00`) : '',
        parseInt(params.get('blockRangeBegin') as string, 10) || '',
        parseInt(params.get('blockRangeEnd') as string, 10) || '',
        params.get('address') as string || ''
      ] as [number | '', string, string, Date | '', Date | '', number | '', number | '', string])
    ).subscribe(([specVersion, pallet, eventName, dateRangeBegin, dateRangeEnd, blockRangeBegin, blockRangeEnd, address]) => {
      if (pallet !== this.palletControl.value) {
        this.palletControl.setValue(pallet);
      }
      if (eventName !== this.eventNameControl.value) {
        this.eventNameControl.setValue(eventName);
      }
      if (specVersion !== this.specVersionControl.value) {
        this.specVersionControl.setValue(specVersion);
      }
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
        if (values.pallet) {
          queryParams.pallet = values.pallet;
        }
        if (values.eventName) {
          queryParams.eventName = values.eventName;
        }
        if (values.specVersion) {
          queryParams.runtime = values.specVersion;
        }
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

    this.addressControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe((address) => {
        this.specVersionControl.reset('', {emitEvent: false});
        this.eventFilters.clear();
        if (this.network) {
          this.loadEventFilters(this.network);
        }
      });

    this.specVersionControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe((specVersion) => {
        this.palletControl.reset('', {emitEvent: false});
        this.eventNameControl.reset('', {emitEvent: false});
        this.eventFilters.clear();
        if (this.network) {
          this.loadEventFilters(this.network, specVersion || undefined);
        }
      });

    this.palletControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.eventNameControl.reset('', {emitEvent: false});
      });

    super.ngOnInit();
  }


  ngOnDestroy() {
    if (this.runtimesSubscription) {
      this.runtimesSubscription.unsubscribe();
      this.runtimesSubscription = null;
    }
    super.ngOnDestroy();
  }


  onNetworkChange(network: string, previous: string): void {
    if (previous) {
      this.filtersFormGroup.reset({
        pallet: '',
        eventName: '',
        specVersion: '',
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

    this.eventFilters.clear();

    super.onNetworkChange(network);

    if (this.runtimesSubscription) {
      this.runtimesSubscription.unsubscribe();
      this.runtimesSubscription = null;
    }

    if (network && !this.onDestroyCalled) {
      // Load all pallets and calls for current runtime version.
      this.loadEventFilters(network);
      // Load all runtime versions and set the runtime control to the version in the route.
      this.runtimesSubscription = this.rs.getRuntimes(network).pipe(
        takeUntil(this.destroyer)
      ).subscribe(runtimes => {
        this.specVersions.next(runtimes.map(r => r.specVersion));
        const params = this.route.snapshot.queryParamMap;
        const specVersion: number | undefined = parseInt(params.get('runtime') as string, 10) || undefined;
        if (specVersion) {
          // If a runtime was set in the route, update the control.
          this.rs.getRuntime(network, specVersion).pipe(
            takeUntil(this.destroyer),
            first()
          ).subscribe((runtime: pst.Runtime | null) => {
            if (runtime && runtime.specVersion !== this.specVersionControl.value) {
              this.specVersionControl.setValue(runtime.specVersion);
            }
          });
        }
      });
    }
  }


  loadEventFilters(network: string, specVersion?: number): void {
    this.rs.getRuntime(network, specVersion)
      .pipe(
        takeUntil(this.destroyer),
        filter((r) => r !== null),
        first()
      )
      .subscribe(async (runtime): Promise<void> => {
        const pallets = await this.rs.getRuntimePallets(network, (runtime as pst.Runtime).specVersion);
        const events = await this.rs.getRuntimeEvents(network, (runtime as pst.Runtime).specVersion);

        if (pallets) {
          pallets.forEach((pallet) => {
            this.eventFilters.set(pallet, events ? events.filter((event) => pallet.pallet === event.pallet).sort() : []);
          });
          this.cd.markForCheck();
        }
      });
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
    const filters: any = {};
    if (this.palletControl.value) {
      filters.eventModule = filters.pallet = this.palletControl.value;
    }
    if (this.eventNameControl.value) {
      filters.eventName = this.eventNameControl.value;
    }
    if (this.specVersionControl.value) {
      filters.specVersion = this.specVersionControl.value;
    }
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
}
