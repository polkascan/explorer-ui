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
import { types as pst } from '@polkadapt/polkascan-explorer';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { AccountId, Balance, BalanceLock, BlockHash } from '@polkadot/types/interfaces';
import { debounceTime, map, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AccountInfo } from '@polkadot/types/interfaces/system/types';
import { AccountData } from '@polkadot/types/interfaces/balances/types';
import { BN } from '@polkadot/util';
import * as Highcharts from 'highcharts';


type HistoricalBalance = {
  locked?: BN;
  total?: BN;
  transferable?: BN;
  free?: BN;
  reserved?: BN;
}

type BalancesItem = {
  event: pst.AccountEvent;
  balances: BehaviorSubject<HistoricalBalance>;
}

type ChartItem = {
  x: number;
  y: number | null;
  blockNumber: number;
  total: string | null;
  free: string | null;
  reserved: string | null;
  locked: string | null;
  transferable: string | null;
}


@Component({
  selector: 'app-historical-balance',
  templateUrl: './historical-balance.component.html',
  styleUrls: ['./historical-balance.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoricalBalanceComponent extends PaginatedListComponentBase<pst.AccountEvent> implements OnInit, OnChanges {

  @Input() accountId: AccountId | null | undefined;

  listSize = 100;

  balancesPerBlock = new Map<number, BehaviorSubject<HistoricalBalance>>();
  balancesObservable: Observable<BalancesItem[]>;

  chartDataObservable: Observable<Highcharts.Options | null>;

  visibleColumns = ['blockNumber', 'total', 'free', 'reserved', 'locked', 'transferable'];

  networkProperties = this.ns.currentNetworkProperties;

  Highcharts: typeof Highcharts = Highcharts; // required
  chartConstructor = 'chart'; // optional string, defaults to 'chart'
  chartCallback: Highcharts.ChartCallbackFunction = (chart) => {
  } // optional function, defaults to null
  updateFlag = false; // optional boolean
  oneToOneFlag = true; // optional boolean, defaults to false


  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private cd: ChangeDetectorRef) {
    super(ns);

    this.balancesObservable = this.itemsObservable.pipe(
      takeUntil(this.destroyer),
      map<pst.AccountEvent[], BalancesItem[]>((items) => {
        const result = items
          .map((event) => {
            if (this.balancesPerBlock.has(event.blockNumber) === false) {
              this.balancesPerBlock.set(event.blockNumber, new BehaviorSubject<HistoricalBalance>({}));
              this.getBalanceAtBlock(event.blockNumber);
              return {event: event, balances: this.balancesPerBlock.get(event.blockNumber)} as BalancesItem;
            } else {
              return null;
            }
          })
          .filter((item) => item !== null);
        return result as BalancesItem[];
      }),
      shareReplay(1)
    );

    this.chartDataObservable = this.balancesObservable.pipe(
      takeUntil(this.destroyer),
      switchMap<BalancesItem[], Observable<(ChartItem | null)[]>>(
        (bis): Observable<(ChartItem | null)[]> => combineLatest(
          bis.map(
            (bi) => combineLatest([of(bi.event), bi.balances]).pipe(
              map<[pst.AccountEvent, HistoricalBalance], ChartItem | null>(([event, balances]): ChartItem | null => {
                if (event && event.blockDatetime) {
                  const total = this.convertBNforChart(balances.total);
                  const free = this.convertBNforChart(balances.free);
                  const reserved = this.convertBNforChart(balances.reserved);
                  const locked = this.convertBNforChart(balances.locked);
                  const transferable = this.convertBNforChart(balances.transferable);
                  const date = new Date(event.blockDatetime);
                  if (total !== null) {
                    return {
                      x: date.getTime(),
                      y: total !== null ? parseFloat(total.split('.').map((b, i) => i === 1 ? b.substring(0, 2) : b).join('.')) : null,  // Only two decimals in the chart
                      blockNumber: event.blockNumber,
                      total: total,
                      free: free,
                      reserved: reserved,
                      locked: locked,
                      transferable: transferable
                    }
                  }
                }
                return null;
              })
            )
          )
        )
      ),
      debounceTime(300),
      map<(ChartItem | null)[], ChartItem[]>((items) => items.filter((i) => i !== null) as ChartItem[]),
      map<ChartItem[], Highcharts.Options | null>((items): Highcharts.Options | null => {
        if (items.length === 0) {
          return null;
        }

        return {
          chart: {
            zooming: {
              type: 'x'
            }
          },
          title: {
            text: ''
          },
          xAxis: {
            type: 'datetime'
          },
          yAxis: {
            title: {
              text: this.networkProperties.value?.tokenSymbol
            }
          },
          tooltip: {
            headerFormat: '',
          },
          credits: {
            enabled: false
          },
          legend: {
            enabled: false
          },
          series: [
            {
              type: 'spline',
              color: '#350659',
              name: 'Total',
              data: items,
              tooltip: {
                pointFormat: '<b>{point.x:%Y-%m-%d %H:%M:%S}</b><br>' +
                  'Block: {point.blockNumber}<br>' +
                  'Total: <b>{point.total}</b><br>' +
                  'Free: {point.free}<br>' +
                  'Reserved: {point.reserved}<br>' +
                  'Locked: {point.locked}<br>' +
                  'Transferable: {point.transferable}'
              }
            }
          ]
        }
      }),
      tap(() => {
        this.updateFlag = true;
        this.cd.markForCheck();
      })
    )
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


  createGetItemsRequest(pageKey?: string, blockLimitOffset?: number): Promise<pst.ListResponse<pst.AccountEvent>> {
    if (this.accountId) {
      return this.pa.run(this.network).polkascan.chain.getEventsByAccount(
        this.accountId.toHex(),
        this.filters,
        this.listSize,
        pageKey,
        blockLimitOffset
      );
    }
    return Promise.reject();
  }


  createNewItemSubscription(handleItemFn: (item: pst.AccountEvent) => void): Promise<() => void> {
    if (this.accountId) {
      return this.pa.run(this.network).polkascan.chain.subscribeNewEventByAccount(
        this.accountId?.toJSON(),
        this.filters,
        handleItemFn
      )
    }
    return Promise.reject();
  }


  sortCompareFn(a: pst.AccountEvent, b: pst.AccountEvent): number {
    return b.blockNumber - a.blockNumber;
  }


  equalityCompareFn(a: pst.AccountEvent, b: pst.AccountEvent): boolean {
    return a.blockNumber === b.blockNumber;
  }


  get filters(): any {
    const filters: any = {
      accountId: this.accountId
    };
    return filters;
  }


  track(i: any, item: BalancesItem): string {
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
        balances.free = systemAccount.data.free;
        balances.reserved = systemAccount.data.reserved;
        balances.total = systemAccount.data.free.add(systemAccount.data.reserved);
        balances.transferable = systemAccount.data.free.sub(systemAccount.data.feeFrozen);
        balances.locked = systemAccount.data.feeFrozen;

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
      balances.free = accountData.free;
      balances.reserved = accountData.reserved;
      balances.total = accountData.free.add(accountData.reserved);
      balances.transferable = accountData.free.sub(accountData.feeFrozen);
      balances.locked = accountData.feeFrozen;

    } else {
      // Check if freeBalance or reservedBalance exist if balances.account was not available.
      if (freeBalance) {
        balances.free = freeBalance;
      }
      if (reservedBalance) {
        balances.reserved = reservedBalance;
      }
      if (freeBalance && reservedBalance) {
        balances.total = freeBalance.add(reservedBalance);
      }
      if (locks && locks.length) {
        locks.sort((a, b) => b.amount.sub(a.amount).isNeg() ? -1 : 1);
        balances.locked = locks[0].amount;

        if (freeBalance) {
          balances.transferable = freeBalance.sub(locks[0].amount);
        }
      }
    }

    observable.next(balances);
  }

  convertBNforChart(val: BN | number | undefined | null): string | null {
    if (BN.isBN(val)) {
      if (val.isZero()) {
        return '0';
      }

      try {
        const decimals = this.networkProperties.value?.tokenDecimals || 0;
        const stringified = val.toString(undefined, decimals + 1); // String gets added preceding zeros.
        const l = stringified.length;
        // Split the string in two parts where the decimal point is expected.
        const intergralPart = stringified.substring(0, l - decimals).replace(/^0+\B/, ''); // remove preceding zeros, but allow a value of '0'.
        const decimalPart = stringified.substring(l - decimals).replace(/0+$/, ''); // remove leading zeros
        return decimalPart.length ? `${intergralPart}.${decimalPart}` : intergralPart;
      } catch (e) {
        return null;
      }
    }

    return null;
  }
}
