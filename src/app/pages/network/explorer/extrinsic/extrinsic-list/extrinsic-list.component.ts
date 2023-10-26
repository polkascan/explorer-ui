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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { distinctUntilChanged, filter, first, map, switchMap, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { types as pst } from '@polkadapt/core';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';


@Component({
  selector: 'app-extrinsic-list',
  templateUrl: './extrinsic-list.component.html',
  styleUrls: ['./extrinsic-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicListComponent extends PaginatedListComponentBase<pst.Extrinsic> implements OnInit, OnDestroy {
  listSize = 100;
  blockNumberIdentifier = 'blockNumber'
  extrinsicsFilters = new Map();
  specVersions = new BehaviorSubject<number[]>([]);
  runtimesSubscription: Subscription | null = null;

  palletControl = new FormControl<string>('');
  callNameControl = new FormControl<string>('');
  addressControl = new FormControl<string>('');
  specVersionControl = new FormControl<number | ''>('');
  dateRangeBeginControl = new FormControl<Date | ''>('');
  dateRangeEndControl = new FormControl<Date | ''>('');
  blockRangeBeginControl = new FormControl<number | ''>('');
  blockRangeEndControl = new FormControl<number | ''>('');
  signatureControl = new FormControl<string>('signed');

  filtersFormGroup = new FormGroup({
    pallet: this.palletControl,
    callName: this.callNameControl,
    multiAddressAccountId: this.addressControl,
    specVersion: this.specVersionControl,
    dateRangeBegin: this.dateRangeBeginControl,
    dateRangeEnd: this.dateRangeEndControl,
    blockRangeBegin: this.blockRangeBeginControl,
    blockRangeEnd: this.blockRangeEndControl,
    signature: this.signatureControl
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
      distinctUntilChanged(),
      map(params => [
        params.get('address') as string || '',
        parseInt(params.get('runtime') as string, 10) || '',
        params.get('pallet') as string || '',
        params.get('callName') as string || '',
        params.get('dateRangeBegin') ? new Date(`${params.get('dateRangeBegin') as string}T00:00`) : '',
        params.get('dateRangeEnd') ? new Date(`${params.get('dateRangeEnd') as string}T00:00`) : '',
        parseInt(params.get('blockRangeBegin') as string, 10) || '',
        parseInt(params.get('blockRangeEnd') as string, 10) || '',
        params.get('signature') as string || 'signed'
      ] as [string, number | '', string, string, Date | '', Date | '', number | '', number | '', string]),
      takeUntil(this.destroyer)
    ).subscribe({
      next: ([address, specVersion, pallet, callName, dateRangeBegin, dateRangeEnd,
               blockRangeBegin, blockRangeEnd, signature]) => {
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
        if (signature !== this.signatureControl.value) {
          this.signatureControl.setValue(signature);
        }
      }
    });

    this.filtersFormGroup.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe({
        next: (values) => {
          this.gotoLatestItems();

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
          if (values.signature !== 'signed') {
            queryParams.signature = values.signature;
          }

          this.router.navigate(['.'], {
            relativeTo: this.route,
            queryParams
          });
        }
      });

    this.specVersionControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe({
        next: (specVersion) => {
          this.palletControl.reset('', {emitEvent: false});
          this.callNameControl.reset('', {emitEvent: false});
          this.extrinsicsFilters.clear();
          if (this.network) {
            this.loadExtrinsicsFilters(this.network, specVersion || undefined);
          }
        }
      });

    this.palletControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe({
        next: () => {
          this.callNameControl.reset('', {emitEvent: false});
        }
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
        dateRangeBegin: '',
        dateRangeEnd: '',
        blockRangeBegin: '',
        blockRangeEnd: '',
        signature: 'signed'
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
      ).subscribe({
        next: (runtimes) => {
          this.specVersions.next(runtimes.map(r => r.specVersion));
          const params = this.route.snapshot.queryParamMap;
          const specVersion: number | undefined = parseInt(params.get('runtime') as string, 10) || undefined;
          if (specVersion) {
            // If a runtime was set in the route, update the control.
            this.rs.getRuntime(network, specVersion).pipe(
              takeUntil(this.destroyer)
            ).subscribe({
              next: (runtime: pst.Runtime | null) => {
                if (runtime && runtime.specVersion !== this.specVersionControl.value) {
                  this.specVersionControl.setValue(runtime.specVersion);
                }
              }
            });
          }
        }
      });
    }
  }


  loadExtrinsicsFilters(network: string, specVersion?: number): void {
    this.rs.getRuntime(network, specVersion).pipe(
      filter((r) => r !== null),
      switchMap((runtime) =>
        combineLatest([
          this.rs.getRuntimePallets(network, (runtime as pst.Runtime).specVersion),
          this.rs.getRuntimeCalls(network, (runtime as pst.Runtime).specVersion)
        ])
      ),
      takeUntil(this.destroyer)
    ).subscribe({
      next: ([pallets, calls]): void => {
        if (pallets) {
          pallets.forEach((pallet) => {
            this.extrinsicsFilters.set(pallet, calls ? calls.filter((call) => pallet.pallet === call.pallet).sort() : []);
          });
          this.cd.markForCheck();
        }
      }
    });
  }


  createGetItemsRequest(untilBlockNumber?: number): Observable<Observable<pst.Extrinsic>[]> {
    const filters = this.filters;
    if (untilBlockNumber) {
      filters.blockRangeEnd = untilBlockNumber;
    }

    return this.pa.run(this.network).getExtrinsics(
      filters,
      this.listSize
    );
  }


  createNewItemSubscription(): Observable<Observable<pst.Extrinsic>> {
    return this.pa.run(this.network).subscribeNewExtrinsic(this.filters);
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
    // if (this.specVersionControl.value) {  // TURNED OFF, can be turned on when specversion is indexed in the db.
    //   filters.specVersion = this.specVersionControl.value;
    // }
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
    if (this.signatureControl.value === 'signed') {
      filters.signed = 1;
    } else if (this.signatureControl.value === 'unsigned') {
      filters.signed = 0;
    }

    return filters;
  }


  track(i: any, extrinsic: pst.Extrinsic): string {
    return `${extrinsic.blockNumber}-${extrinsic.extrinsicIdx}`;
  }
}
