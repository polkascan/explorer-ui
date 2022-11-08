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

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { AccountId } from '@polkadot/types/interfaces';
import {
  EventIndexAccount
} from '../../../../../../../polkadapt/projects/polkascan-explorer/src/lib/polkascan-explorer.types';
import { map } from 'rxjs/operators';


type HistoricalBalance = {
  amount?: number
}

type BalancesObservableItem = {
  event: EventIndexAccount;
  balances: BehaviorSubject<HistoricalBalance>;
}


@Component({
  selector: 'app-historical-balance',
  templateUrl: './historical-balance.component.html',
  styleUrls: ['./historical-balance.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoricalBalanceComponent extends PaginatedListComponentBase<pst.EventIndexAccount> implements OnInit, OnChanges {

  @Input() accountId: AccountId | null | undefined;

  listSize = 100;

  balancesPerBlock = new Map<number, BehaviorSubject<HistoricalBalance>>();
  balancesObservable: Observable<BalancesObservableItem[]>;

  visibleColumns = ['icon', 'inherentID', 'age', 'block', 'pallet', 'call', 'details'];


  constructor(private ns: NetworkService,
              private pa: PolkadaptService) {
    super(ns);

    this.balancesObservable = this.itemsObservable.pipe(
      map<EventIndexAccount[], BalancesObservableItem[]>((items) => {
        const result = items
          .map((event) => {
            if (this.balancesPerBlock.has(event.blockNumber) === false) {
              this.balancesPerBlock.set(event.blockNumber, new BehaviorSubject<HistoricalBalance>({}));
              this.getBalanceAtBlock(event.blockNumber);
              return {event: event, balances: this.balancesPerBlock.get(event.blockNumber)} as BalancesObservableItem;
            } else {
              return null;
            }
          })
          .filter((item) => item !== null);
        return result as BalancesObservableItem[];
      })
    );
  }

  ngOnInit(): void {
    super.ngOnInit();
  }


  onNetworkChange(network: string, previous: string): void {
    this.balancesPerBlock = new Map();
    super.onNetworkChange(network);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.balancesPerBlock = new Map();

    typeof this.unsubscribeNewItem === 'function' ? this.unsubscribeNewItem() : null;

    if (this.network) {
      this.subscribeNewItem();
      this.getItems();
    }
  }


  createGetItemsRequest(pageKey?: string, blockLimitOffset?: number): Promise<pst.ListResponse<pst.EventIndexAccount>> {
    if (this.accountId) {
      return this.pa.run(this.network).polkascan.chain.getEventsForAccount(
        this.accountId.toHex(),
        this.filters,
        this.listSize,
        pageKey,
        blockLimitOffset
      );
    }
    return Promise.reject();
  }


  createNewItemSubscription(handleItemFn: (item: pst.EventIndexAccount) => void): Promise<() => void> {
    if (this.accountId) {
      return this.pa.run(this.network).polkascan.chain.subscribeNewEventForAccount(
        this.accountId?.toJSON(),
        this.filters,
        handleItemFn
      )
    }
    return Promise.reject();
  }


  sortCompareFn(a: pst.EventIndexAccount, b: pst.EventIndexAccount): number {
    return b.blockNumber - a.blockNumber;
  }


  equalityCompareFn(a: pst.EventIndexAccount, b: pst.EventIndexAccount): boolean {
    return a.blockNumber === b.blockNumber;
  }


  get filters(): any {
    const filters: any = {
      accountId: this.accountId
    };
    return filters;
  }


  track(i: any, inherent: pst.Extrinsic): string {
    return `${inherent.blockNumber}-${inherent.extrinsicIdx}`;
  }


  async getBalanceAtBlock(blockNumber: number): Promise<void> {
    const observable = this.balancesPerBlock.get(blockNumber);
    const blockHash = await this.pa.run({
      chain: this.network,
      adapters: ['substrate-rpc']
    }).rpc.chain.getBlockHash(blockNumber);
    const result = await this.pa.run({
      chain: this.network,
      adapters: ['substrate-rpc']
    }).query.system.account.at(blockHash, this.accountId);
    if (observable) {
      observable.next(result.toJSON() as HistoricalBalance);
    }
  }
}
