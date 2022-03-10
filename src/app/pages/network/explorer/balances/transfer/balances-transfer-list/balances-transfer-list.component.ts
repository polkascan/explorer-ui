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

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { NetworkService } from '../../../../../../services/network.service';
import { PolkadaptService } from '../../../../../../services/polkadapt.service';
import { types as pst } from '@polkadapt/polkascan-explorer';
import {
  PaginatedListComponentBase
} from '../../../../../../../common/list-base/paginated-list-component-base.directive';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';


@Component({
  selector: 'app-balances-transfer-list',
  templateUrl: './balances-transfer-list.component.html',
  styleUrls: ['./balances-transfer-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalancesTransferListComponent extends PaginatedListComponentBase<pst.Transfer> implements OnInit {
  listSize = 100;
  visibleColumns = ['icon', 'block', 'from', 'to', 'value', 'details'];

  toAddressControl: FormControl = new FormControl('');
  fromAddressControl: FormControl = new FormControl('');
  filtersFormGroup: FormGroup = new FormGroup({
    toMultiAddressAccountId: this.toAddressControl,
    fromMultiAddressAccountId: this.fromAddressControl
  })

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private router: Router,
              private route: ActivatedRoute) {
    super(ns);
  }


  ngOnInit(): void {
    // Set address if already in route query params;
    this.route.queryParamMap.pipe(
      takeUntil(this.destroyer),
      map((params) => params.get('toAddress') || ''),
      distinctUntilChanged()
    ).subscribe((address) => {
      if (address) {
        address = u8aToHex(decodeAddress(address));
      }
      this.toAddressControl.setValue(address);
    });

    this.route.queryParamMap.pipe(
      takeUntil(this.destroyer),
      map((params) => params.get('fromAddress') || ''),
      distinctUntilChanged()
    ).subscribe((address) => {
      if (address) {
        address = u8aToHex(decodeAddress(address));
      }
      this.fromAddressControl.setValue(address);
    });

    // Initialize and get items
    super.ngOnInit();

    this.filtersFormGroup.valueChanges
      .pipe(
        debounceTime(100),
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.items = [];
        this.subscribeNewItem();
        this.getItems();
      });
  }

  createGetItemsRequest(pageKey?: string): Promise<pst.ListResponse<pst.Transfer>> {
    return this.pa.run(this.network).polkascan.chain.getTransfers(
      this.filters,
      this.listSize,
      pageKey
    );
  }


  createNewItemSubscription(handleItemFn: (item: pst.Transfer) => void): Promise<() => void> {
    return this.pa.run(this.network).polkascan.chain.subscribeNewTransfer(
      this.filters,
      handleItemFn
    );
  }


  sortCompareFn(a: pst.Transfer, b: pst.Transfer): number {
    return b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx;
  }


  equalityCompareFn(a: pst.Transfer, b: pst.Transfer): boolean {
    return a.blockNumber === b.blockNumber && a.eventIdx === b.eventIdx;
  }


  track(i: any, transfer: pst.Transfer): string {
    return `${transfer.blockNumber}-${transfer.eventIdx}`;
  }


  get filters(): any {
    const filters: any = {};
    if (this.toAddressControl.value) {
      // If true, singed only is being set. There is no need for a not signed check.
      filters.toMultiAddressAccountId = this.toAddressControl.value;
    }
    if (this.fromAddressControl.value) {
      filters.fromMultiAddressAccountId = this.fromAddressControl.value;
    }

    return filters;
  }
}
