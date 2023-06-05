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

import { Directive, OnDestroy, OnInit } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  merge,
  Observable, of,
  shareReplay,
  Subject,
  Subscription,
  switchMap,
  take
} from 'rxjs';
import { debounceTime, filter, map, takeUntil, tap } from 'rxjs/operators';
import { NetworkService } from '../../app/services/network.service';
import { types as pst } from '@polkadapt/core';


@Directive()
export abstract class PaginatedListComponentBase<T> implements OnInit, OnDestroy {
  abstract listSize: number;
  abstract blockNumberIdentifier: string;

  abstract createGetItemsRequest(untilBlockNumber?: number): Observable<Observable<T>[]>;

  abstract createNewItemSubscription?(): Observable<Observable<T>>;

  abstract sortCompareFn(a: T, b: T): number;

  abstract equalityCompareFn(a: T, b: T): boolean;

  network: string;
  networkProperties = this._ns.currentNetworkProperties;

  newItemSubscription: Subscription | undefined;

  readonly latestItemObservable = new Subject<Observable<T>>();
  readonly listObservable = new BehaviorSubject<Observable<T>[]>([]);
  readonly itemsObservable: Observable<T[]>;
  readonly loadingObservable: Observable<boolean>;
  readonly loadingCounterObservable = new BehaviorSubject<number>(0);
  readonly pageLiveObservable = new BehaviorSubject<boolean>(true);
  private lowestBlockNumber: Observable<number | null>;

  get pageLive(): boolean {
    return this.pageLiveObservable.value;
  }

  set pageLive(value: boolean) {
    if (value !== this.pageLiveObservable.value) {
      this.pageLiveObservable.next(value);
    }
  }

  get loading(): number {
    return this.loadingCounterObservable.value;
  }

  set loading(value: number) {
    this.loadingCounterObservable.next(value);
  }

  readonly destroyer: Subject<void> = new Subject();
  protected onDestroyCalled = false;

  readonly reset: Subject<void> = new Subject();

  protected constructor(private _ns: NetworkService) {
    this.loadingObservable = this.loadingCounterObservable.pipe(takeUntil(this.destroyer), map((c) => !!c));

    // Generate the items for the table datasource without duplicates and sorted.
    this.itemsObservable = this.listObservable.pipe(
      takeUntil(this.destroyer),
      switchMap((itemsObservables) => {
        if (Array.isArray(itemsObservables) && itemsObservables.length > 0) {
          return combineLatest(itemsObservables)
        }
        return of([]);
      }),
      map((list) => {
        // Remove duplicates
        let items = list.filter((a, i) =>
          list.filter((b, ii) =>
            i <= ii ? false : this.equalityCompareFn(a, b)
          ).length === 0
        )
        // Sort items
        const result = items.sort(this.sortCompareFn);
        return result;
      })
    );

    this.lowestBlockNumber = this.itemsObservable.pipe(
      takeUntil(this.destroyer),
      map((items) => {
        if (items.length > 0) {
          const itemWithLowestBlockNumber: T =
            items.reduce((p, c) => {
              return p[this.blockNumberIdentifier as keyof T] < c[this.blockNumberIdentifier as keyof T]
                ? p
                : c;
            });
          if (itemWithLowestBlockNumber) {
            return itemWithLowestBlockNumber[this.blockNumberIdentifier as keyof T] as number;
          }
        }
        return null;
      }),
      shareReplay(1)
    );
  }


  ngOnInit(): void {
    this._ns.currentNetwork
      .pipe(
        debounceTime(100),
        takeUntil(this.destroyer),
        filter((n) => !!n)
      )
      .subscribe((network: string) => {
        if (this.network !== network) {
          if (typeof this.onNetworkChange === 'function') {
            this.onNetworkChange(network, this.network);
          }
          this.network = network;
        }
      });

    this.latestItemObservable
      .pipe(
        takeUntil(this.destroyer),
        filter(() => this.pageLive)
      )
      .subscribe((item: Observable<T>) => {
        const itemObservables = this.listObservable.value;
        // Add the latest item to the list.
        itemObservables.splice(0, 0, item);
        this.listObservable.next(itemObservables);
      });
  }


  onNetworkChange(network: string, previous?: string): void {
    typeof this.unsubscribeNewItem === 'function' ? this.unsubscribeNewItem() : null;

    if (network) {
      this.resetList();
      this.subscribeNewItem();
      this.getItems();
    }
  }


  handleItem(item: Observable<T>): void {
    if (this.onDestroyCalled) {
      // If still listening but component is already destroyed.
      this.unsubscribeNewItem();
      return;
    }

    this.latestItemObservable.next(item);
  }


  subscribeNewItem(): void {
    if (this.onDestroyCalled) {
      throw new Error('[subscribeNewItem] Component is already in process of destruction.')
    }

    // Clean up a possible existing subscription.
    this.unsubscribeNewItem();

    if (typeof this.createNewItemSubscription === 'function') {
      const newItemObservable = this.createNewItemSubscription();
      this.newItemSubscription = newItemObservable.pipe(
        takeUntil(this.destroyer)
      ).subscribe((item) => this.handleItem(item));
    }
  }


  getItems(untilBlockNumber?: number): void {
    if (typeof this.createGetItemsRequest !== 'function') {
      throw new Error('[getItems] createGetItemsRequest must be a function.')
    }

    if (this.onDestroyCalled) {
      throw new Error('[getItems] Component is already in process of destruction.')
    }

    try {
      const itemsObservable = this.createGetItemsRequest(untilBlockNumber);
      let itemsSubscription: Subscription;

      if (this.onDestroyCalled) {
        throw new Error('[getItems] Request ignored, component is already in process of destruction.')
      }

      // Merge list with current list, sort the list.
      itemsSubscription = itemsObservable.pipe(
        takeUntil(this.destroyer),
        takeUntil(this.reset),
        tap({
          subscribe: () => {
            this.loading++;
          },
          finalize: () => {
            this.loading--;
          }
        })
      ).subscribe({
        next: (items) => {
          if (items.length >= this.listSize) {
            itemsSubscription.unsubscribe();
          }

          const list = this.listObservable.value.concat(items);
          this.listObservable.next(list);
        }
      });

    } catch (e) {
      // Ignore for now...
      console.error(e);
    }
  }


  unsubscribeNewItem(): void {
    if (this.newItemSubscription) {
      this.newItemSubscription.unsubscribe();
      this.newItemSubscription = undefined;
    }
  }


  resetList(): void {
    this.reset.next();
    this.listObservable.next([])
    this.unsubscribeNewItem();
  }


  gotoLatestItems(): void {
    this.resetList();
    this.pageLive = true;
    this.subscribeNewItem();
    this.getItems();
  }


  loadMoreItems(): void {
    if (this.pageLive) {
      // Stop live mode.
      this.unsubscribeNewItem();
      this.pageLive = false;
    }

    this.lowestBlockNumber.pipe(
      take(1)
    ).subscribe((blockNumber) => {
      if (blockNumber !== null) {
        this.getItems(blockNumber);
      }
    });
  }


  ngOnDestroy(): void {
    this.unsubscribeNewItem();
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
  }
}
