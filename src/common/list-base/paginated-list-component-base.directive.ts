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

import { Directive, OnDestroy, OnInit } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest, isObservable,
  Observable,
  of,
  shareReplay,
  Subject,
  Subscription,
  switchMap,
  take,
  throwError
} from 'rxjs';
import { debounceTime, filter, map, takeUntil, tap } from 'rxjs/operators';
import { NetworkService } from '../../app/services/network.service';


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
  readonly itemsObservable = new BehaviorSubject<T[]>([]);
  readonly loadingObservable: Observable<boolean>;
  readonly loadingCounterObservable = new BehaviorSubject<number>(0);
  readonly pageLiveObservable = new BehaviorSubject<boolean>(true);
  readonly listAtEnd = new BehaviorSubject<boolean>(false);
  readonly lowestBlockNumber: Observable<number | null>;

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
    this.loadingObservable = this.loadingCounterObservable.pipe(
      map((c) => !!c),
      takeUntil(this.destroyer),
    );

    this.lowestBlockNumber = this.itemsObservable.pipe(
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
      takeUntil(this.destroyer), // refcount is false, destroy manually.
      shareReplay({
        bufferSize: 1,
        refCount: false
      }),
      takeUntil(this.destroyer)
    );
  }


  ngOnInit(): void {
    this._ns.currentNetwork
      .pipe(
        debounceTime(100),
        filter((n) => !!n),
        takeUntil(this.destroyer)
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
        filter(() => this.pageLive),
        switchMap<Observable<T> | T, Observable<T>>((item) => isObservable(item) ? item : of(item)),
        takeUntil(this.destroyer)
      ).subscribe((item: T) => {
      const itemObservables = this.itemsObservable.value;
      // Add the latest item to the list.
      if (itemObservables.findIndex(
        (b) => {
          return this.equalityCompareFn((item as T), (b as T))
        }
      ) === -1) {
        const list = [item, ...itemObservables];
        list.sort(this.sortCompareFn);
        if (list.length > this.listSize) {
          list.length = this.listSize;
        }
        this.itemsObservable.next(list);
      }
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
        takeUntil(this.destroyer),
      ).subscribe((item) => this.handleItem(item));
    }
  }


  getItems(untilBlockNumber?: number): Observable<T[] | Observable<T>[]> {
    let listAtEnd = false;

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
        return throwError(() =>
          new Error('[getItems] Request ignored, component is already in process of destruction.')
        );
      }

      const list = this.itemsObservable.value

      // Merge list with current list, sort the list.
      itemsSubscription = itemsObservable.pipe(
        tap({
          subscribe: () => {
            this.loading++;
          },
          finalize: () => {
            this.loading--;
          }
        }),
        switchMap<any, Observable<T[]>>((itemsObservables) => {   // FIX TYPING (any)
          if (Array.isArray(itemsObservables) && itemsObservables.length > 0) {
            return (isObservable(itemsObservables[0]) ? combineLatest(itemsObservables) : of(itemsObservables)).pipe(
            )
          }
          return of([]);
        }),
        map((items) => items.filter(
          (a) => list.findIndex(
            (b) => {
              return isObservable(a) && isObservable(b) ? (a as Observable<T>) === (b as Observable<T>) : this.equalityCompareFn((a as T), (b as T))
            }
          ) === -1
        )),
        map((items) => items.sort(this.sortCompareFn)),
        takeUntil(this.destroyer),
        takeUntil(this.reset),
      ).subscribe({
        next: (items) => {
          if (items.length >= this.listSize) {
            listAtEnd = false;
            // itemsSubscription.unsubscribe();
          } else if (items.length === 0) {
            listAtEnd = true;
          }

          this.listAtEnd.next(listAtEnd);
          this.itemsObservable.next([...list, ...items]);
        }
      });

      return itemsObservable;

    } catch (e) {
      // Ignore for now...
      console.error(e);
      return throwError(() => e);
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
    this.itemsObservable.next([])
    this.listAtEnd.next(false);
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
