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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { combineLatestWith, distinctUntilChanged, filter, first, map, switchMap, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { BehaviorSubject, Subscription } from 'rxjs';


@Component({
  selector: 'app-extrinsic-list',
  templateUrl: './extrinsic-list.component.html',
  styleUrls: ['./extrinsic-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicListComponent extends PaginatedListComponentBase<pst.Extrinsic> implements OnInit, OnDestroy {
  listSize = 100;
  extrinsicsFilters = new Map();
  specVersions = new BehaviorSubject<number[]>([]);
  runtimesSubscription: Subscription | null = null;

  palletControl = new FormControl<string>('');
  callNameControl = new FormControl<string>('');
  addressControl = new FormControl<string>('');
  specVersionControl = new FormControl<number | ''>('');
  dateRangeStartControl = new FormControl<Date | ''>('');
  dateRangeEndControl = new FormControl<Date | ''>('');
  blockRangeStartControl = new FormControl<number | ''>('');
  blockRangeEndControl = new FormControl<number | ''>('');

  filtersFormGroup = new FormGroup({
    pallet: this.palletControl,
    callName: this.callNameControl,
    multiAddressAccountId: this.addressControl,
    specVersion: this.specVersionControl,
    dateRangeStart: this.dateRangeStartControl,
    dateRangeEnd: this.dateRangeEndControl,
    blockRangeStart: this.blockRangeStartControl,
    blockRangeEnd: this.blockRangeEndControl
  });

  visibleColumns = ['icon', 'extrinsicID', 'age', 'block', 'pallet', 'call', 'signed', 'details'];

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
        params.get('address') as string || '',
        parseInt(params.get('runtime') as string, 10) || '',
        params.get('pallet') as string || '',
        params.get('callName') as string || '',
        params.get('dateRangeStart') ? new Date(params.get('dateRangeStart') as string) : '',
        params.get('dateRangeEnd') ? new Date(params.get('dateRangeEnd') as string) : '',
        parseInt(params.get('blockRangeStart') as string, 10) || '',
        parseInt(params.get('blockRangeEnd') as string, 10) || ''
      ] as [string, number | '', string, string, Date | '', Date | '', number | '', number | ''])
    ).subscribe(([address, specVersion, pallet, callName, dateRangeStart, dateRangeEnd, blockRangeStart, blockRangeEnd]) => {
      if (address !== this.addressControl.value) {
        this.addressControl.setValue(address);
      }
      if (pallet !== this.palletControl.value) {
        this.palletControl.setValue(pallet);
      }
      if (callName !== this.callNameControl.value) {
        this.callNameControl.setValue(callName);
      }
      if (specVersion !== this.specVersionControl.value) {
        this.specVersionControl.setValue(specVersion);
      }
      const oldDateStart = this.dateRangeStartControl.value;
      if ((dateRangeStart && dateRangeStart.getTime() || '') !== (oldDateStart && oldDateStart.getTime() || '')) {
        this.dateRangeStartControl.setValue(dateRangeStart);
      }
      const oldDateEnd = this.dateRangeEndControl.value;
      if ((dateRangeEnd && dateRangeEnd.getTime() || '') !== (oldDateEnd && oldDateEnd.getTime() || '')) {
        this.dateRangeEndControl.setValue(dateRangeEnd);
      }
      if (blockRangeStart !== this.blockRangeStartControl.value) {
        this.blockRangeStartControl.setValue(blockRangeStart);
      }
      if (blockRangeEnd !== this.blockRangeEndControl.value) {
        this.blockRangeEndControl.setValue(blockRangeEnd);
      }
    });

    this.filtersFormGroup.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe((values) => {
        this.items = [];
        this.subscribeNewItem();
        this.getItems();

        const queryParams: Params = {};
        if (values.multiAddressAccountId) {
          queryParams.address = values.multiAddressAccountId;
        }
        if (values.pallet) {
          queryParams.pallet = values.pallet;
        }
        if (values.callName) {
          queryParams.callName = values.callName;
        }
        if (values.specVersion) {
          queryParams.runtime = values.specVersion;
        }
        if (values.dateRangeStart) {
          queryParams.dateRangeStart = values.dateRangeStart.toISOString().substring(0, 10);
        }
        if (values.dateRangeEnd) {
          queryParams.dateRangeEnd = values.dateRangeEnd.toISOString().substring(0, 10);
        }
        if (values.blockRangeStart) {
          queryParams.blockRangeStart = values.blockRangeStart;
        }
        if (values.blockRangeEnd) {
          queryParams.blockRangeEnd = values.blockRangeEnd;
        }

        this.router.navigate(['.'], {
          relativeTo: this.route,
          queryParams
        });
      });

    this.specVersionControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe((specVersion) => {
        this.palletControl.reset('', {emitEvent: false});
        this.callNameControl.reset('', {emitEvent: false});
        this.extrinsicsFilters.clear();
        if (this.network) {
          this.loadExtrinsicsFilters(this.network, specVersion || undefined);
        }
      });

    this.palletControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.callNameControl.reset('', {emitEvent: false});
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
        callName: '',
        specVersion: '',
        dateRangeStart: '',
        dateRangeEnd: '',
        blockRangeStart: '',
        blockRangeEnd: ''
      }, {emitEvent: false});

      this.router.navigate(['.'], {
        relativeTo: this.route
      });
    }

    this.extrinsicsFilters.clear();

    super.onNetworkChange(network);

    if (this.runtimesSubscription) {
      this.runtimesSubscription.unsubscribe();
      this.runtimesSubscription = null;
    }

    if (network && !this.onDestroyCalled) {
      // Load all pallets and calls for current runtime version.
      this.loadExtrinsicsFilters(network);
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


  loadExtrinsicsFilters(network: string, specVersion?: number): void {
    this.rs.getRuntime(network, specVersion)
      .pipe(
        takeUntil(this.destroyer),
        filter((r) => r !== null),
        first()
      )
      .subscribe(async (runtime): Promise<void> => {
        const pallets = await this.rs.getRuntimePallets(network, (runtime as pst.Runtime).specVersion);
        const calls = await this.rs.getRuntimeCalls(network, (runtime as pst.Runtime).specVersion);

        if (pallets) {
          pallets.forEach((pallet) => {
            this.extrinsicsFilters.set(pallet, calls ? calls.filter((call) => pallet.pallet === call.pallet).sort() : []);
          });
          this.cd.markForCheck();
        }
      });
  }


  createGetItemsRequest(pageKey?: string): Promise<pst.ListResponse<pst.Extrinsic>> {
    return this.pa.run(this.network).polkascan.chain.getExtrinsics(
      this.filters,
      this.listSize,
      pageKey
    );
  }


  createNewItemSubscription(handleItemFn: (item: pst.Extrinsic) => void): Promise<() => void> {
    return this.pa.run(this.network).polkascan.chain.subscribeNewExtrinsic(
      this.filters,
      handleItemFn
    );
  }


  sortCompareFn(a: pst.Extrinsic, b: pst.Extrinsic): number {
    return b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx;
  }


  equalityCompareFn(a: pst.Extrinsic, b: pst.Extrinsic): boolean {
    return a.blockNumber === b.blockNumber && a.extrinsicIdx === b.extrinsicIdx;
  }


  get filters(): any {
    const filters: any = {};

    if (this.palletControl.value) {
      filters.callModule = this.palletControl.value;
    }
    if (this.callNameControl.value) {
      filters.callName = this.callNameControl.value;
    }
    if (this.addressControl.value) {
      filters.multiAddressAccountId = u8aToHex(decodeAddress(this.addressControl.value));
    }
    if (this.specVersionControl.value) {
      filters.specVersion = this.specVersionControl.value;
    }
    if (this.dateRangeStartControl.value) {
      filters.dateRangeStart = this.dateRangeStartControl.value?.toISOString().substring(0, 10);
    }
    if (this.dateRangeEndControl.value) {
      filters.dateRangeEnd = this.dateRangeEndControl.value?.toISOString().substring(0, 10);
    }
    if (this.blockRangeStartControl.value) {
      filters.blockRangeStart = this.blockRangeStartControl.value;
    }
    if (this.blockRangeEndControl.value) {
      filters.blockRangeEnd = this.blockRangeEndControl.value;
    }

    return filters;
  }


  track(i: any, extrinsic: pst.Extrinsic): string {
    return `${extrinsic.blockNumber}-${extrinsic.extrinsicIdx}`;
  }
}
