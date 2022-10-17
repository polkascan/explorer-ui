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
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import { NetworkService } from '../../app/services/network.service';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { ListResponse } from '../../../polkadapt/projects/polkascan-explorer/src/lib/polkascan-explorer.types';


@Directive()
export abstract class PaginatedListComponentBase<T> implements OnInit, OnDestroy {
  abstract listSize: number;

  abstract createGetItemsRequest(pageKey?: string, blockLimitOffset?: number): Promise<pst.ListResponse<T>>;

  abstract createNewItemSubscription?(handleItemFn: (item: T) => void): Promise<() => void>;

  abstract sortCompareFn(a: T, b: T): number;

  abstract equalityCompareFn(a: T, b: T): boolean;

  network: string;
  networkProperties = this._ns.currentNetworkProperties;

  pageKey: string | undefined;
  pagePrev: string | null = null;
  pageNext: string | null = null;
  blockLimitCount?: number;
  blockLimitOffset?: number;
  searchInfo: {fromBlock?: number, toBlock?: number, nextBlocksCount?: number} = {};

  newItemObservable = new Subject<T>();
  lastReceivedItem: T | null = null;
  unsubscribeNewItemFn: null | (() => void);

  readonly historyAvailableObservable = new BehaviorSubject<boolean>(true)
  readonly pageLiveObservable = new BehaviorSubject<boolean>(true);
  readonly itemsObservable = new BehaviorSubject<T[]>([]);
  readonly loadingObservable = new BehaviorSubject<number>(0);

  get pageLive(): boolean {
    return this.pageLiveObservable.value;
  }

  set pageLive(value: boolean) {
    if (value !== this.pageLiveObservable.value) {
      this.pageLiveObservable.next(value);
    }
  }

  get items(): T[] {
    return this.itemsObservable.value;
  }

  set items(value: T[]) {
    this.itemsObservable.next(value);
  }

  get loading(): number {
    return this.loadingObservable.value;
  }

  set loading(value: number) {
    this.loadingObservable.next(value);
  }

  readonly destroyer: Subject<undefined> = new Subject();
  protected onDestroyCalled = false;

  constructor(private _ns: NetworkService) {
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

    this.newItemObservable.subscribe((item: T) => {
      if (this.pageLive) {
        const items = this.items.slice(0);
        if (!items.some((e) => this.equalityCompareFn(e, item))) {
          items.splice(0, 0, item);
        }
        items.sort(this.sortCompareFn);
        items.length = Math.min(items.length, this.listSize);  // Cap the list if it is a live list.
        this.items = items;
      }
    });
  }


  onNetworkChange(network: string, previous?: string): void {
    typeof this.unsubscribeNewItem === 'function' ? this.unsubscribeNewItem() : null;

    if (network) {
      this.subscribeNewItem();
      this.getItems();
    }
  }


  handleItem(item: T): void {
    if (this.onDestroyCalled) {
      // If still listening but component is already destroyed.
      this.unsubscribeNewItem();
      return;
    }

    // Store the last item that came from the running subscription.
    this.lastReceivedItem = item;
    this.newItemObservable.next(item);
  }


  async subscribeNewItem() {
    if (this.onDestroyCalled) {
      throw new Error('[subscribeNewItem] Component is already in process of destruction.')
    }

    this.unsubscribeNewItem();
    this.lastReceivedItem = null;

    if (typeof this.createNewItemSubscription === 'function') {
      this.unsubscribeNewItemFn = await this.createNewItemSubscription((item) => this.handleItem(item));
      this.pageLive = true;
    }
  }


  async getItems(pageKey?: string, blockLimitOffset?: number, blockLimitCount?: number): Promise<void> {
    if (typeof this.createGetItemsRequest !== 'function') {
      throw new Error('[getItems] createGetItemsRequest must be a function.')
    }

    if (this.onDestroyCalled) {
      throw new Error('[getItems] Component is already in process of destruction.')
    }

    this.loading++;

    if (!pageKey) {
      this.searchInfo = {};
    }

    try {
      const response = await this.createGetItemsRequest(pageKey, blockLimitOffset);

      this.pageKey = pageKey;
      this.pagePrev = response.pageInfo ? response.pageInfo.pagePrev || null : null;
      this.pageNext = response.pageInfo ? response.pageInfo.pageNext || null : null;
      this.blockLimitCount = response.pageInfo ? response.pageInfo.blockLimitCount || undefined : undefined;
      this.blockLimitOffset = response.pageInfo ? response.pageInfo.blockLimitOffset || undefined : undefined;

      if (this.blockLimitOffset && this.blockLimitCount) {
        if (!this.searchInfo.fromBlock) {
          this.searchInfo.fromBlock = this.blockLimitOffset;
        }
        this.searchInfo.toBlock = Math.max(0, (this.blockLimitOffset as number) - (this.blockLimitCount as number));
        this.searchInfo.nextBlocksCount = Math.min(this.blockLimitCount, this.blockLimitOffset);
      }

      let historyAvailable = false;
      if (this.pageNext) {
        historyAvailable = true;
      } else if (this.blockLimitOffset && this.blockLimitCount) {
        historyAvailable = Math.max(0, this.blockLimitOffset - this.blockLimitCount) > 0;
      }

      this.historyAvailableObservable.next(historyAvailable);

      // Merge list with current list
      const items = response.objects.concat(this.items.filter((a) =>
        response.objects.findIndex((b) => this.equalityCompareFn(a, b)) === -1
      ));

      this.items = items.sort(this.sortCompareFn);

    } catch (e) {
      // Ignore for now...
      console.error(e);
    }

    this.loading--;
  }


  unsubscribeNewItem(): void {
    if (typeof this.unsubscribeNewItemFn === 'function') {
      this.unsubscribeNewItemFn();
      this.unsubscribeNewItemFn = null;
    }
  }


  async goLive(): Promise<void> {
    this.subscribeNewItem();
    await this.getItems();
  }


  async searchMoreItems(): Promise<void> {
    if (this.pageLive) {
      this.pageLive = false;
      this.unsubscribeNewItem();

      // When viewing live data we first want to fetch the current list to receive a recent pageNext key.
      const response: ListResponse<T> = await this.createGetItemsRequest();

      if (response.pageInfo && response.pageInfo.pageNext) {
        await this.getItems(response.pageInfo.pageNext, this.blockLimitOffset, this.blockLimitCount);
      }

    } else if (this.pageNext) {
      await this.getItems(this.pageNext, this.blockLimitOffset);
    } else if (this.blockLimitOffset && this.blockLimitCount) {
      const blockLimitOffset = Math.max(0, this.blockLimitOffset - this.blockLimitCount)
      if (blockLimitOffset) {
        await this.getItems(undefined, blockLimitOffset);
      }
    }
  }


  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next(undefined);
    this.destroyer.complete();
    this.unsubscribeNewItem();
  }
}
