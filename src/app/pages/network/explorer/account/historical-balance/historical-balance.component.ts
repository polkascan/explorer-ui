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

import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  AccountId,
  ActiveEraInfo, Balance, BalanceLock,
  BlockHash,
  EraIndex,
  SessionIndex,
  ValidatorCount
} from '@polkadot/types/interfaces';
import {
  EventIndexAccount
} from '../../../../../../../polkadapt/projects/polkascan-explorer/src/lib/polkascan-explorer.types';
import { map } from 'rxjs/operators';
import { AccountInfo } from '@polkadot/types/interfaces/system/types';
import { AccountData } from '@polkadot/types/interfaces/balances/types';


type HistoricalBalance = {
  locked?: number;
  total?: number;
  transferable?: number;
  free?: number;
  reserved?: number;
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

  visibleColumns = ['blockNumber', 'total', 'free', 'reserved', 'locked', 'transferable'];

  networkProperties = this.ns.currentNetworkProperties;

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


  track(i: any, item: BalancesObservableItem): string {
    return `${item.event.blockNumber}-${item.event.extrinsicIdx}`;
  }


  async getBalanceAtBlock(blockNumber: number): Promise<void> {
    const observable = this.balancesPerBlock.get(blockNumber)!;
    const runParams = {
      chain: this.network,
      adapters: ['substrate-rpc']
    };

    let balances: HistoricalBalance = {};

    // Fetch the blockHash for the given block number. And the accountInfo at the time of this blockHash.
    let blockHash: BlockHash;
    try {
      blockHash = await this.pa.run(runParams).rpc.chain.getBlockHash(blockNumber);
    } catch (e) {
      throw (`[HistoricalBalance] Could not fetch block hash for block ${blockNumber}. ${e}`);
    }

    let systemAccount: AccountInfo | null = null;
    try {
      systemAccount = await this.pa.run(runParams).query.system.account.at(blockHash, this.accountId);
      if (systemAccount && systemAccount.data) {
        balances.free = systemAccount.data.free.toNumber();
        balances.reserved = systemAccount.data.reserved.toNumber();
        balances.total = systemAccount.data.free.add(systemAccount.data.reserved).toNumber();
        balances.transferable = systemAccount.data.free.sub(systemAccount.data.feeFrozen).toNumber();
        balances.locked = systemAccount.data.feeFrozen.toNumber();

        observable.next(balances);
        return;
      }
    } catch (e) {
      // Ignore.
    }

    // FALLBACK if system account did not work or does not exist.

    // Fetch accountInfo, staking information and session information at blockHash.
    const [accountData, locks, freeBalance, reservedBalance] = (await Promise.allSettled([
      this.pa.run(runParams).query.balances.account.at(blockHash, this.accountId),
      this.pa.run(runParams).query.balances.locks.at(blockHash, this.accountId),
      this.pa.run(runParams).query.balances.freeBalance.at(blockHash, this.accountId),
      this.pa.run(runParams).query.balances.reservedBalance.at(blockHash, this.accountId)
    ])).map((p) => p.status === 'fulfilled' ? p.value : null) as
      [AccountData | null, BalanceLock[] | null, Balance | null, Balance | null];


    if (accountData) {
      // Possible accountData will be a generated object with all zero balances.
      balances.free = accountData.free.toNumber();
      balances.reserved = accountData.reserved.toNumber();
      balances.total = accountData.free.add(accountData.reserved).toNumber();
      balances.transferable = accountData.free.sub(accountData.feeFrozen).toNumber();
      balances.locked = accountData.feeFrozen.toNumber();
    } else {

      // Check if freeBalance or reservedBalance exist if balances.account was not available.

      if (freeBalance) {
        balances.free = freeBalance.toNumber();
      }
      if (reservedBalance) {
        balances.reserved = reservedBalance.toNumber();
      }
      if (freeBalance && reservedBalance) {
        balances.total = freeBalance.add(reservedBalance).toNumber();
      }
      if (locks && locks.length) {
        locks.sort((a, b) => b.amount.sub(a.amount).toNumber());
        balances.locked = locks[0].amount.toNumber();

        if (freeBalance) {
          balances.transferable = freeBalance.sub(locks[0].amount).toNumber();
        }
      }
    }

    observable.next(balances);
  }
}
