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
import { BehaviorSubject, combineLatest, from, Observable, of, ReplaySubject } from 'rxjs';
import { AccountId, Balance, BalanceLock, BlockHash, Header } from '@polkadot/types/interfaces';
import { combineLatestWith, debounceTime, map, shareReplay, switchMap, takeUntil, tap, skip, filter } from 'rxjs/operators';
import { AccountInfo } from '@polkadot/types/interfaces/system/types';
import { AccountData } from '@polkadot/types/interfaces/balances/types';
import { BN } from '@polkadot/util';
import * as Highcharts from 'highcharts';
import { VariablesService } from '../../../../../services/variables.service';
import { PricingService } from '../../../../../services/pricing.service';
import { Codec } from '@polkadot/types/types';


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
  blockDate: Date,
  utcStartOfDay: number;
  historicValue?: string | null;
}


@Component({
  selector: 'app-historical-balance',
  templateUrl: './historical-balance.component.html',
  styleUrls: ['./historical-balance.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoricalBalanceComponent extends PaginatedListComponentBase<pst.AccountEvent> implements OnInit, OnChanges {

  @Input() accountId: AccountId | null | undefined;
  accountIdObservable = new ReplaySubject<AccountId | null | undefined>(1);

  listSize = 200;

  balancesPerBlock = new Map<number, BehaviorSubject<HistoricalBalance>>();
  balancesObservable: Observable<BalancesItem[]>;

  chartDataObservable: Observable<Highcharts.Options>;
  chartItemPerBlock = new Map<number, ChartItem>();

  visibleColumns = ['blockNumber', 'total', 'free', 'reserved', 'locked', 'transferable'];

  networkProperties = this.ns.currentNetworkProperties;

  Highcharts: typeof Highcharts = Highcharts; // required
  chartConstructor = 'chart'; // optional string, defaults to 'chart'
  chartCallback: Highcharts.ChartCallbackFunction = (chart) => {
  } // optional function, defaults to null
  updateFlag = false; // optional boolean
  oneToOneFlag = true; // optional boolean, defaults to false
  chartLoadingObservable = new BehaviorSubject<boolean>(false);

  blockOne = new ReplaySubject<BlockHash>(1);
  itemAtBlockOne: Observable<BalancesItem | null>;

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private cd: ChangeDetectorRef,
              private variables: VariablesService,
              private pricing: PricingService) {
    super(ns);

    // Fetch the block hash for block 1.
    this.pa.run({
      chain: this.network,
      adapters: ['substrate-rpc']
    }).rpc.chain.getBlockHash(1).then((hash) => this.blockOne.next(hash));

    // Load more items automatically.
    this.itemsObservable.pipe(skip(1)).subscribe((items) => {
      // Try to get at least the list size in items.
      if (items.length <= this.listSize) {
        this.loadMoreItems();
      }
    });

    // Start observables for data retrieval and conversion for table and charts.
    this.createItemAtBlockOneObservable();
    this.createBalancesObservable();
    this.createChartDataObservable();

  }

  ngOnInit(): void {
    this.accountIdObservable.next(this.accountId);
    super.ngOnInit();
  }


  onNetworkChange(network: string, previous: string): void {
    this.balancesPerBlock = new Map();
    super.onNetworkChange(network);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.accountId.currentValue !== changes.accountId.previousValue) {
      this.balancesPerBlock = new Map();
      this.chartItemPerBlock = new Map();

      typeof this.unsubscribeNewItem === 'function' ? this.unsubscribeNewItem() : null;

      this.accountIdObservable.next(this.accountId);

      if (this.network) {
        this.subscribeNewItem();
        this.getItems();
      }
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
        this.accountId?.toHex(),
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


  createItemAtBlockOneObservable(): void {
    const runParams = {
      chain: this.network,
      adapters: ['substrate-rpc']
    };

    // Check if an account has balances at block 1.
    this.itemAtBlockOne = this.itemsObservable.pipe(
      takeUntil(this.destroyer),
      map<pst.AccountEvent[], boolean>(() => { // Check that the items list is at its end.
        if (this.pageNext) {
          return false;
        } else if (this.blockLimitOffset && this.blockLimitCount) {
          const blockLimitOffset = Math.max(0, this.blockLimitOffset - this.blockLimitCount)
          if (blockLimitOffset > 0) {
            return false;
          }
        }
        return true;
      }),
      combineLatestWith(this.blockOne.pipe(
        takeUntil(this.destroyer),
      )),
      switchMap(([atListStart, hash]) => {
        if (atListStart && this.accountId) {  // The items list is at its end. Check if at genesis there was an AccountInfo.
          const timestampObservable = from(this.pa.run(runParams).query.timestamp.now.at(hash)).pipe(
            map((timestamp) => {
              if (timestamp.isEmpty === false) {
                return timestamp.toJSON() as EpochTimeStamp;
              }
              return null;
            })
          );

          return (from(this.pa.run(runParams).query.system.account.at(hash, this.accountId)) as Observable<AccountInfo>).pipe(
            combineLatestWith(timestampObservable),
            map<[AccountInfo, number | null], BalancesItem | null>(([accountInfo, timestamp]) => {  // Check if the account exists.
              if (accountInfo && accountInfo.data) {
                if (accountInfo.data.free.add(accountInfo.data.reserved).isZero() === false) {
                  if (this.balancesPerBlock.has(1) === false) {
                    this.balancesPerBlock.set(1, new BehaviorSubject<HistoricalBalance>({}));
                    this.getBalanceAtBlock(1);
                  }

                  return {
                    event: {blockNumber: 1, blockDatetime: timestamp},
                    balances: this.balancesPerBlock.get(1)
                  } as BalancesItem;
                }
              }
              return null;
            })
          )
        }
        return of(null);
      })
    )
  }


  createBalancesObservable(): void {
    this.balancesObservable = this.itemsObservable.pipe(
      takeUntil(this.destroyer),
      tap<pst.AccountEvent[]>(() => this.loading++),
      map<pst.AccountEvent[], pst.AccountEvent[]>((items) => { // Filter out double blocks
        return items.filter((item) => items.find((other) => other.blockNumber === item.blockNumber) === item)
      }),
      map<pst.AccountEvent[], BalancesItem[]>((items) => {
        const result = items
          .map((event) => {
            if (this.balancesPerBlock.has(event.blockNumber) === false) {
              this.balancesPerBlock.set(event.blockNumber, new BehaviorSubject<HistoricalBalance>({}));
              this.getBalanceAtBlock(event.blockNumber);
            }
            return {event: event, balances: this.balancesPerBlock.get(event.blockNumber)} as BalancesItem;
          })
          .filter((item) => item !== null);
        return result as BalancesItem[];
      }),
      tap<BalancesItem[]>(() => this.loading--),
      combineLatestWith(this.itemAtBlockOne),
      map<[BalancesItem[], BalancesItem | null], BalancesItem[]>(([balanceItems, itemAtBlockOne]) => {
        if (itemAtBlockOne) {
          return [...balanceItems, itemAtBlockOne];
        }
        return balanceItems;
      }),
      shareReplay(1)
    );
  }


  createChartDataObservable(): void {
    const runParams = {
      chain: this.network,
      adapters: ['substrate-rpc']
    };

    this.chartDataObservable = this.balancesObservable.pipe(
      takeUntil(this.destroyer),
      tap<BalancesItem[]>(() => this.chartLoadingObservable.next(true)),
      combineLatestWith( // Check if the account has a balance at the latest block height.
        from(this.pa.run(runParams).rpc.chain.getFinalizedHead()).pipe(
          switchMap((hash) =>
            from(
              this.pa.run(runParams).query.system.account.at(hash, this.accountId) as Promise<AccountInfo>)
              .pipe(
                combineLatestWith(
                  from(this.pa.run(runParams).rpc.chain.getHeader(hash)).pipe(
                    map<Header, number>((header) => header.number.toJSON() as number)
                  ),
                  from(this.pa.run(runParams).query.timestamp.now.at(hash)).pipe(
                    map<Codec, number>((timestamp) => timestamp.toJSON() as EpochTimeStamp)
                  )
                )
              )
          ),
          map<[AccountInfo, number, number], BalancesItem | null>(([accountInfo, blockNumber, timestamp]) => {
            if (accountInfo && accountInfo.data) {
              if (accountInfo.data.free.add(accountInfo.data.reserved).isZero() === false) {
                if (this.balancesPerBlock.has(blockNumber) === false) {
                  this.balancesPerBlock.set(blockNumber, new BehaviorSubject<HistoricalBalance>({}));
                  this.getBalanceAtBlock(blockNumber);
                }

                return {
                  event: {blockNumber: blockNumber, blockDatetime: timestamp},
                  balances: this.balancesPerBlock.get(blockNumber)
                } as unknown as BalancesItem; // Force this object to be a BalancesItem
              }
            }
            return null;
          })
        )
      ),
      map<[BalancesItem[], BalancesItem | null], BalancesItem[]>(([balanceItems, latestItem]) => {
        return latestItem ? [latestItem, ...balanceItems] : balanceItems;
      }),
      switchMap<BalancesItem[], Observable<(ChartItem | null)[]>>(
        (bis): Observable<(ChartItem | null)[]> => combineLatest(
          bis.map(
            (bi) => combineLatest([of(bi.event), bi.balances]).pipe(
              filter(([event, balances]) => Boolean(event && balances)),
              map<[pst.AccountEvent, HistoricalBalance], ChartItem | null>(([event, balances]): ChartItem | null => {
                if (this.chartItemPerBlock.has(event.blockNumber)) {
                  return this.chartItemPerBlock.get(event.blockNumber) as ChartItem;
                }

                if (event && event.blockDatetime && balances) {
                  const total = this.convertBNforChart(balances.total);
                  const free = this.convertBNforChart(balances.free);
                  const reserved = this.convertBNforChart(balances.reserved);
                  const locked = this.convertBNforChart(balances.locked);
                  const transferable = this.convertBNforChart(balances.transferable);
                  const date = new Date(event.blockDatetime);
                  if (total !== null) {
                    const chartItem = {
                      x: date.getTime(),
                      y: total !== null ? parseFloat(total.split('.').map((b, i) => i === 1 ? b.substring(0, 2) : b).join('.')) : null,  // Only two decimals in the chart
                      blockNumber: event.blockNumber,
                      total: total,
                      free: free,
                      reserved: reserved,
                      locked: locked,
                      transferable: transferable,
                      blockDate: date,
                      utcStartOfDay: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
                    }
                    this.chartItemPerBlock.set(event.blockNumber, chartItem);
                    return chartItem;
                  }
                }
                return null;
              })
            )
          )
        )
      ),
      map<(ChartItem | null)[], ChartItem[]>((items) => items.filter((i) => i !== null).sort((a, b) => +a!.blockDate - +b!.blockDate) as ChartItem[]),
      combineLatestWith(this.pricing.dailyHistoricPrices),
      map<[ChartItem[], ([number, number][] | undefined)], Highcharts.Options>(([items, historicPrices]): Highcharts.Options => {
        let pointFormat = '<b>{point.x:%Y-%m-%d %H:%M:%S}</b><br>' +
          'Block: {point.blockNumber}<br>' +
          'Total: <b>{point.total}</b><br>' +
          'Free: {point.free}<br>' +
          'Reserved: {point.reserved}<br>' +
          'Locked: {point.locked}<br>' +
          'Transferable: {point.transferable}';

        let min: number | null = null;
        let max: number | null = null;
        let historicPriceSeries: [number, number][] | null = null;
        let dailyPriceSeries: [number, number][] | null = null;

        if (historicPrices && historicPrices.length > 0) {
          // Try and set the historical value for the selected currency.
          items = items.map((i) => {
            const timestamp = +i.utcStartOfDay;

            // Find the minimum and maximum timestamp.
            if (min === null || timestamp < min) {
              min = timestamp;
            }
            if (max === null || timestamp > max) {
              max = timestamp;
            }

            const historicPrice = historicPrices.find((p) => p[0] === timestamp)
            if (i.y !== null && historicPrice) {
              i.historicValue = (i.y * historicPrice[1]).toFixed(2);
            }
            return i;
          })

          // Add historic value to the pointFormatter.
          pointFormat = pointFormat +
            '<br>' +
            'Historic value: {point.historicValue} ' + this.variables.currency.value;

          if (min !== null && max !== null) {
            // Create a second currency based historic series.
            const historicPricesInScope = historicPrices
              .filter((p) => p[0] >= min! && p[0] <= max!)

            const valuePerDay = historicPricesInScope
              .slice(1)  // Remove the first day
              .map((p, i) => {
                let item = items.find((i) => p[0] >= i.utcStartOfDay)
                if (i === 0 && !item) {
                  item = items[0];
                }
                if (item && item.y !== null) {
                  return [p[0], parseFloat((item.y * p[1]).toFixed(2))]
                }
                return null;
              }).filter((p) => p !== null) as [number, number][];

            const valuePerItem = items.map((item) => {
              if (item.historicValue !== undefined && item.historicValue !== null) {
                return [item.blockDate.getTime(), parseFloat(item.historicValue)];
              }
              return null;
            }).filter((p) => p !== null) as [number, number][];

            historicPriceSeries = valuePerItem.sort((a, b) => +a[0] - +b[0]);
            dailyPriceSeries = valuePerDay.sort((a, b) => +a[0] - +b[0]);
          }
        }

        const options: Highcharts.Options = {
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
          yAxis: [
            {
              title: {
                text: this.networkProperties.value?.tokenSymbol,
                style: {
                  color: '#350659'
                }
              }
            }
          ],
          tooltip: {
            headerFormat: '',
          },
          credits: {
            enabled: false
          },
          legend: {
            // enabled: false
          },
          series: [
            {
              type: 'line',
              yAxis: 0,
              // step: 'left',
              color: '#350659',
              name: this.networkProperties.value?.tokenSymbol + ' total',
              data: items,
              tooltip: {
                pointFormat: pointFormat
              },
              marker: {
                enabled: true
              }
            }
          ]
        }

        if (historicPriceSeries && historicPriceSeries.length > 0) {
          (options.yAxis! as any[]).push({
            title: {
              text: this.variables.currency.value,
              style: {
                color: '#426e24'
              }
            },
            opposite: true
          });

          options.series!.push({
            type: 'line',
            yAxis: 1,
            // step: 'left',
            color: '#426e24',
            name: this.variables.currency.value,
            data: historicPriceSeries,
            visible: false,
            marker: {
              enabled: true
            }
          });
        }

        if (dailyPriceSeries && dailyPriceSeries.length > 1) {
          (options.yAxis! as any[]).push({
            title: {
              text: this.variables.currency.value,
              style: {
                color: '#5f8ea2'
              }
            },
            opposite: true
          });

          options.series!.push({
            type: 'line',
            yAxis: 2,
            color: '#5f8ea2',
            name: this.variables.currency.value + ' daily value',
            data: dailyPriceSeries,
            visible: false,
            marker: {
              enabled: false
            }
          });
        }

        return options;
      }),
      tap<Highcharts.Options | null>(() => {
        this.chartLoadingObservable.next(false);
        this.updateFlag = true;
        this.cd.markForCheck();
      })
    ) as Observable<Highcharts.Options>
  }


  async getBalanceAtBlock(blockNumber: number): Promise<void> {
    this.loading++;

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
      this.loading--;
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

        this.loading--;
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

    this.loading--;
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
        const integralPart = stringified.substring(0, l - decimals).replace(/^0+\B/, ''); // remove preceding zeros, but allow a value of '0'.
        const decimalPart = stringified.substring(l - decimals).replace(/0+$/, ''); // remove leading zeros
        return decimalPart.length ? `${integralPart}.${decimalPart}` : integralPart;
      } catch (e) {
        return null;
      }
    }

    return null;
  }

  async loadMoreItems(): Promise<void> {
    // Keep the item list in live mode. We don't expect items coming in on every block.
    if (this.pageNext) {
      await this.getItems(this.pageNext, this.blockLimitOffset);
    } else if (this.blockLimitOffset && this.blockLimitCount) {
      const blockLimitOffset = Math.max(0, this.blockLimitOffset - this.blockLimitCount)
      if (blockLimitOffset > 0) {
        await this.getItems(undefined, blockLimitOffset);
      }
    }
  }
}
