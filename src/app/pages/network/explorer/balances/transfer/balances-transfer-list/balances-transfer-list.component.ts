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

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { NetworkService } from '../../../../../../services/network.service';
import { PolkadaptService } from '../../../../../../services/polkadapt.service';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import {
  PaginatedListComponentBase
} from '../../../../../../components/list-base/paginated-list-component-base.directive';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { FormControl } from '@angular/forms';


@Component({
  selector: 'app-balances-transfer-list',
  templateUrl: './balances-transfer-list.component.html',
  styleUrls: ['./balances-transfer-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalancesTransferListComponent extends PaginatedListComponentBase<pst.Transfer> implements OnInit {
  listSize = 100;
  visibleColumns = ['icon', 'block', 'from', 'to', 'value', 'details'];

  addressControl: FormControl = new FormControl('');

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
      map((params) => params.get('address') || ''),
      distinctUntilChanged()
    ).subscribe((address) => {
      this.addressControl.setValue(address)
    });

    // Initialize and get items
    super.ngOnInit();

    this.addressControl.valueChanges
      .pipe(
        debounceTime(100),
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.items = [];
        this.subscribeNewItem();
        this.getItems();
      });

    // TODO Create the address filter for To and From address. Convert address to hex version.
  }

  createGetItemsRequest(pageKey?: string): Promise<pst.ListResponse<pst.Transfer>> {
    return this.pa.run(this.network).polkascan.chain.getTransfers(
      {},
      this.listSize,
      pageKey
    );
  }


  createNewItemSubscription(handleItemFn: (item: pst.Transfer) => void): Promise<() => void> {
    return this.pa.run(this.network).polkascan.chain.subscribeNewTransfer(
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


  routeToAccount(address: string) {
    this.router.navigate([`../../account/${address}`], {relativeTo: this.route});
  }
}
