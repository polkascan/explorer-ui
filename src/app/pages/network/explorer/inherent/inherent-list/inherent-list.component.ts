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
import { FormControl, FormGroup } from '@angular/forms';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { debounceTime, distinctUntilChanged, filter, first, map, takeUntil } from 'rxjs/operators';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'app-inherent-list',
  templateUrl: './inherent-list.component.html',
  styleUrls: ['./inherent-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InherentListComponent extends PaginatedListComponentBase<pst.Extrinsic> implements OnInit {
  listSize = 100;
  inherentFilters = new Map();

  palletControl: FormControl = new FormControl('');
  callNameControl: FormControl = new FormControl('');
  filtersFormGroup: FormGroup = new FormGroup({
    eventModule: this.palletControl,
    callName: this.callNameControl
  });

  visibleColumns = ['icon', 'inherentID', 'age', 'block', 'pallet', 'call', 'details'];

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
      map((params) => {
        return [
          (params.get('pallet') || ''),
          (params.get('callName') || '')
        ];
      }),
      distinctUntilChanged()
    ).subscribe(([pallet, callName]) => {
      if (pallet !== this.palletControl.value) {
        this.palletControl.setValue(pallet);
      }
      if (callName !== this.callNameControl.value) {
        this.callNameControl.setValue(callName);
      }
    });

    super.ngOnInit();

    this.filtersFormGroup.valueChanges
      .pipe(
        debounceTime(100),  // To make sure eventControl reset has taken place
        takeUntil(this.destroyer)
      )
      .subscribe((values) => {
        this.items = [];
        this.subscribeNewItem();
        this.getItems();

        this.router.navigate(['.'], {
          relativeTo: this.route,
          queryParams: {pallet: values.eventModule, callName: values.callName}
        });
      });

    this.palletControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.callNameControl.reset('', {emitEvent: false});
      });
  }


  onNetworkChange(network: string, previous: string): void {
    if (previous) {
      this.filtersFormGroup.reset({
        eventModule: '',
        callName: ''
      }, {emitEvent: false});

      this.router.navigate(['.'], {
        relativeTo: this.route,
        queryParams: {pallet: '', callName: ''},
        queryParamsHandling: 'merge'
      });
    }

    this.inherentFilters.clear();

    super.onNetworkChange(network);

    if (network) {
      this.rs.getRuntime(network)
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
              this.inherentFilters.set(pallet, calls ? calls.filter((call) => pallet.pallet === call.pallet).sort() : []);
            });
            this.cd.markForCheck();
          }
        });
    }
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
    )
  }


  sortCompareFn(a: pst.Extrinsic, b: pst.Extrinsic): number {
    return b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx;
  }


  equalityCompareFn(a: pst.Extrinsic, b: pst.Extrinsic): boolean {
    return a.blockNumber === b.blockNumber && a.extrinsicIdx === b.extrinsicIdx;
  }


  get filters(): any {
    const filters: any = {
      signed: 0
    };

    if (this.palletControl.value) {
      filters.callModule = this.palletControl.value;
    }
    if (this.callNameControl.value) {
      filters.callName = this.callNameControl.value;
    }

    return filters;
  }


  track(i: any, inherent: pst.Extrinsic): string {
    return `${inherent.blockNumber}-${inherent.extrinsicIdx}`;
  }
}
