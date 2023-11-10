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
import { types as pst } from '@polkadapt/core';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { BehaviorSubject, combineLatest, EMPTY, Observable, of, ReplaySubject, Subject, take } from 'rxjs';
import {
  combineLatestWith,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { BN } from '@polkadot/util';
import * as Highcharts from 'highcharts';
import { VariablesService } from '../../../../../services/variables.service';
import { PricingService } from '../../../../../services/pricing.service';


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
  @Input() accountId: string;
  @Input() accountHex: string | null;

  accountIdObservable = new ReplaySubject<string | null | undefined>(1);

  listSize = 400;
  blockNumberIdentifier = 'blockNumber';

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

  chartLoading = 0;
  chartLoadingObservable = new BehaviorSubject<boolean>(false);

  blockOne: Observable<string>;
  itemAtBlockOne: Observable<BalancesItem | null>;

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private cd: ChangeDetectorRef,
              private variables: VariablesService,
              private pricing: PricingService) {
    super(ns);

    // Fetch the block hash for block 1.
    this.blockOne = this.pa.run().getBlockHash(1).pipe(
      switchMap((obs) => obs.pipe(takeUntil(this.destroyer))), // Keep takeUntil because child refCount is false
      shareReplay({
        bufferSize: 1,
        refCount: false
      }),
      takeUntil(this.destroyer)
    )

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


  createGetItemsRequest(untilBlockNumber?: number): Observable<Observable<pst.AccountEvent>[]> {
    const filters = this.filters;
    if (untilBlockNumber) {
      filters.blockRangeEnd = untilBlockNumber;
    }

    if (this.accountId && this.accountHex) {
      return this.pa.run(this.network).getEventsByAccount(
        this.accountHex,
        filters,
        this.listSize
      ).pipe(takeUntil(this.destroyer));
    }
    return EMPTY;
  }


  createNewItemSubscription(): Observable<Observable<(pst.AccountEvent)>> {
    if (this.accountId && this.accountHex) {
      return this.pa.run(this.network).subscribeNewEventByAccount(
        this.accountHex,
        this.filters
      ).pipe(takeUntil(this.destroyer));
    }
    return EMPTY;
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
    // Check if an account has balances at block 1.
    this.itemAtBlockOne = this.listAtEnd.pipe(
      distinctUntilChanged(),
      switchMap((listAtEnd) =>
        listAtEnd
          ? this.blockOne.pipe(
            switchMap((hash) => {
              let observable = this.balancesPerBlock.get(1);
              if (observable) {
                // Empty the observable before fetching a possible new value.
                observable.next({});
              }

              if (this.accountId && hash) {  // The items list is at its end. Check if at genesis there was an AccountInfo.
                const timestampObservable = this.pa.run({observableResults: false}).getTimestamp(hash);

                return this.pa.run({observableResults: false}).getAccount(this.accountId, hash ? hash : undefined).pipe(
                  combineLatestWith(timestampObservable),
                  map(([accountInfo, timestamp]) => {  // Check if the account exists.

                    if (accountInfo && accountInfo.data) {
                      if (accountInfo.data.free && accountInfo.data.reserved && accountInfo.data.free.add(accountInfo.data.reserved).isZero() === false) {
                        if (!observable) {
                          observable = new BehaviorSubject<HistoricalBalance>({})
                          this.balancesPerBlock.set(1, observable);
                        }
                        this.getBalanceAtBlock(1);

                        return {
                          event: {blockNumber: 1, blockDatetime: timestamp},
                          balances: observable
                        } as unknown as BalancesItem;
                      }
                    }
                    return null;
                  })
                )
              }

              return of(null);
            }),
            takeUntil(this.destroyer), // refCount will keep it open, so destroy manually.
            shareReplay({
              bufferSize: 1,
              refCount: false
            })
          )
          : of(null)
      ),
      takeUntil(this.destroyer)
    )
  }


  createBalancesObservable(): void {
    this.balancesObservable = this.itemsObservable.pipe(
      tap<pst.AccountEvent[]>(() => {
        this.loading++;
      }),
      map<pst.AccountEvent[], pst.AccountEvent[]>((items) => { // Filter out double blocks
        return items.filter((item) => items.find((other) => other.blockNumber === item.blockNumber) === item)
      }),
      map<pst.AccountEvent[], BalancesItem[]>((items) => {
        const result = items
          .filter((item) => item !== null)
          .map((event) => {
            if (this.balancesPerBlock.has(event.blockNumber) === false) {
              this.balancesPerBlock.set(event.blockNumber, new BehaviorSubject<HistoricalBalance>({}));
              this.getBalanceAtBlock(event.blockNumber);
            }
            return {event: event, balances: this.balancesPerBlock.get(event.blockNumber)} as BalancesItem;
          });
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
      shareReplay({
        bufferSize: 1,
        refCount: true
      }),
      takeUntil(this.destroyer)
    );
  }


  createChartDataObservable(): void {

    const latestItemObservable = this.pa.run({observableResults: false}).getFinalizedHead().pipe(
      take(1),
      switchMap((hash) =>
        combineLatest([
          this.pa.run({observableResults: false}).getAccount(this.accountId, hash as string).pipe(
            take(1)
          ),
          this.pa.run({observableResults: false}).getHeader(hash as string).pipe(
            take(1),
            map((header: pst.Header) => header.number as number)
          ),
          this.pa.run({observableResults: false}).getTimestamp(hash as string).pipe(
            take(1)
          )
        ])
      ),
      map<[pst.Account, number, number], BalancesItem | null>(([accountInfo, blockNumber, timestamp]) => {
        if (accountInfo && accountInfo.data) {
          if (accountInfo.data.free && accountInfo.data.reserved && accountInfo.data.free.add(accountInfo.data.reserved).isZero() === false) {
            let observable = this.balancesPerBlock.get(blockNumber);

            if (!observable) {
              observable = new BehaviorSubject({});
              this.balancesPerBlock.set(blockNumber, observable);
              this.getBalanceAtBlock(blockNumber);
            }

            const result = {
              event: {
                blockNumber: blockNumber,
                blockDatetime: timestamp
              },
              balances: observable
            } as unknown as BalancesItem; // Force this object to be a BalancesItem
            return result;
          }
        }
        return null;
      }),
      takeUntil(this.destroyer)
    )

    this.chartDataObservable = this.balancesObservable.pipe(
      tap<BalancesItem[]>((items) => {
        this.chartLoadingObservable.next(true);
        this.updateFlag = false;
      }),
      combineLatestWith( // Check if the account has a balance at the latest block height.
        latestItemObservable
      ),
      map<[BalancesItem[], BalancesItem | null], BalancesItem[]>(([balanceItems, latestItem]) => {
        return latestItem ? [latestItem, ...balanceItems] : balanceItems;
      }),
      switchMap<BalancesItem[], Observable<(ChartItem | null)[]>>(
        (bis): Observable<(ChartItem | null)[]> => {
          return combineLatest(
            bis.map(
              (bi) => of(bi.event).pipe(
                combineLatestWith(bi.balances.pipe(filter((b) => Object.keys(b).length > 0))),
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
        }
      ),
      map<(ChartItem | null)[], ChartItem[]>((items) => {
        return items.filter((i) => i !== null).sort((a, b) => +a!.blockDate - +b!.blockDate) as ChartItem[]
      }),
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
      tap(() => {
        this.chartLoadingObservable.next(false);
        this.updateFlag = true;
        this.cd.markForCheck();
      }),
      takeUntil<Highcharts.Options | null>(this.destroyer)
    ) as Observable<Highcharts.Options>
  }


  getBalanceAtBlock(blockNumber: number): Observable<HistoricalBalance> {
    const observable = this.balancesPerBlock.get(blockNumber)!;
    if (observable) {
      // Fetch the blockHash for the given block number. And the accountInfo at the time of this blockHash.
      this.pa.run({observableResults: false}).getBlockHash(blockNumber).pipe(
        take(1),
        tap({
          subscribe: () => {
            this.loading++;
          },
          finalize: () => {
            this.loading--;
          }
        }),
        switchMap((hash) =>
          this.pa.run({observableResults: false}).getAccount(this.accountId, hash).pipe(
            take(1) // TODO add filter for when all data is available that is needed.
          )
        ),
        map((account) => ({
          free: account?.data?.free || null,
          reserved: account?.data?.reserved || null,
          total: account?.data?.free && account?.data?.reserved && account.data.free.add(account.data.reserved) || null,
          transferable: account?.data?.free
            && (account?.data?.frozen || account?.data?.feeFrozen)
            && account.data.free.sub((account?.data?.frozen || account?.data?.feeFrozen) as BN)
            || null,
          locked: account?.data?.frozen || account?.data?.feeFrozen || null
        }) as HistoricalBalance),
        takeUntil(this.destroyer)
      ).subscribe({
        next: (val) => observable.next(val)
      });
    }
    return observable;
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
    this.lowestBlockNumber.pipe(
      take(1),
      takeUntil(this.destroyer)
    ).subscribe({
      next: (blockNumber) => {
        if (blockNumber !== null) {
          this.getItems(blockNumber);
        }
      }
    });
  }
}
