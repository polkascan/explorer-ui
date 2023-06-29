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

import { BehaviorSubject, combineLatest, defer, EMPTY, merge, Observable, Subject, Subscription, take } from 'rxjs';
import { AugmentedApi } from '../polkadapt.service';
import { Polkadapt, types } from '@polkadapt/core';
import { filter, finalize, first, switchMap, takeUntil } from 'rxjs/operators';

export type Block = Partial<types.Block> & {
  status: 'new' | 'loading' | 'loaded',
  number: number,
  finalized: boolean,
  extrinsics: (types.Extrinsic | undefined)[],
  events: (types.Event | undefined)[]
};

export type BlockSubject = BehaviorSubject<Block>;

type BlockCache = { [nr: string]: BlockSubject };

export class BlockHarvester {
  private newBlockSubscription: Subscription | null;
  private newFinalizedBlocksSubscription: Subscription | null;
  private readonly cache: BlockCache = {};
  headNumber = new BehaviorSubject<number>(0);
  finalizedNumber = new BehaviorSubject<number>(0);
  loadedNumber = new BehaviorSubject<number>(0);
  blocks: BlockCache;
  observedBlocks: { [nr: string]: number } = {};
  paused = false;
  untilBlocksObservable: Observable<types.Block[]>;

  constructor(public polkadapt: Polkadapt<AugmentedApi>, public network: string) {
    // Create a block cache where data is lazy loaded when you get an item.
    const cacheTarget: BlockCache = {};
    this.cache = new Proxy(cacheTarget, {
      get: (cache, nr: string) => {
        let cached = cache[nr];
        if (!cached) {
          cached = cache[nr] = new BehaviorSubject<Block>({
            status: 'new', number: parseInt(nr, 10), finalized: false, extrinsics: [], events: []
          });
        }
        return cached;
      }
    });
    this.blocks = new Proxy(this.cache, {
      get: (cache, prop: string) => {
        const nr = parseInt(prop, 10);
        const cached = cache[nr];
        if (cached.value.status === 'new') {
          this.loadBlock(nr);
        }
        return defer(() => {
          if (this.observedBlocks.hasOwnProperty(nr)) {
            this.observedBlocks[nr] += 1;
          } else {
            this.observedBlocks[nr] = 1;
          }
          return cached;
        }).pipe(finalize(() => {
          this.observedBlocks[nr] -= 1;
          if (this.observedBlocks[nr] === 0) {
            delete this.observedBlocks[nr];
          }
        })) as BehaviorSubject<Block>;
      }
    });

    this.subscribeNewBlocks().then();
  }

  private async subscribeNewBlocks(): Promise<void> {
    if (!this.newBlockSubscription) {
      // Subscribe to new blocks *without finality*.
      this.newBlockSubscription = this.polkadapt.run().subscribeNewBlock().subscribe({
        next: (block) => {
          const done = new Subject<void>();

          // Subscribe to the block observable to catch the latest response from an adapter.
          block.pipe(
            takeUntil(done)
          ).subscribe((block) => {
            if (block.complete) {
              this.finalizedBlockHandler(block);
              // A finalized block has been retrieved and processed. Unsubscribe the observable.
              done.next();
              done.complete();
            } else {
              this.newBlockHandler(block);
            }
          })
        }
      });
    }
  }

  private newBlockHandler(block: types.Block): void {
    const newNumber = block.number;
    // Only update the head number if the new number is greater.
    if (newNumber > this.headNumber.value) {
      this.headNumber.next(newNumber);
      // Preload block data.
      const blockMerged: Block = Object.assign({}, this.cache[newNumber].value, block);
      this.cache[newNumber].next(blockMerged);
      this.loadBlock(newNumber);
    }
  }

  private finalizedBlockHandler(block: types.Block): void {
    if (!block || !block.number) {
      return;
    }
    const newNumber = block.number;
    // We want to update all cached blocks that haven't been finalized and still have observers listening to them.
    Object.keys(this.observedBlocks)
      .map(nr => this.cache[nr].value)
      .filter(block => !block.finalized && newNumber >= block.number)
      .forEach(block => {
        this.loadBlock(block.number);
      });
    // Only update the finalized number if the new number is greater.
    if (newNumber > this.finalizedNumber.value) {
      // If a non-finalized cache entry exists for this number, update it.
      const cached = this.cache[newNumber];
      if (!cached.value.finalized) {
        cached.next(Object.assign({}, cached.value, block, {
          status: 'loaded',
          finalized: true,
          extrinsics: new Array(block.countExtrinsics),
          events: new Array(block.countEvents)
        }));
      }
      this.finalizedNumber.next(newNumber);
      if (newNumber > this.loadedNumber.value) {
        this.loadedNumber.next(newNumber);
      }
    }
  }

  private loadBlock(nr: number): void {
    const cached = this.cache[nr];
    // Only continue if there is a headNumber or finalizedNumber set. If not, this block will be loaded once the first
    // block arrives from the subscriptions.
    combineLatest(this.headNumber, this.finalizedNumber).pipe(
      filter(([hn, fn]) => hn > 0 || fn > 0),
      first()  // So it stops right after we get one of the two numbers.
    ).subscribe({
      next: ([headNumber, finalizedNumber]) => {
        let block = Object.assign({}, cached.value);
        if (
          block.status === 'loading' || // It's already loading this block.
          nr > headNumber ||  // Block doesn't exist, yet.
          nr > finalizedNumber && block.status === 'loaded' ||  // Block can't load finalized data, yet.
          block.finalized  // Block is already finalized.
        ) {
          // Do nothing.
          return;
        }
        // Otherwise, raise the loading flag.
        const oldStatus: 'new' | 'loaded' = block.status;
        block.status = 'loading';
        cached.next(block);

        if (block.number <= finalizedNumber) {
          // Load finalized data from Polkascan.
          this.polkadapt.run().getBlock(block.number).pipe(
            switchMap(obs => obs),
            filter(block => Boolean(block.complete)),
            take(1)
          ).subscribe({
            next: response => {
              block = Object.assign(block, response);
              block.finalized = true;
              block.extrinsics = new Array(block.countExtrinsics);
              block.events = new Array(block.countEvents);
              block.status = 'loaded';
              cached.next(block);
            },
            error: err => {
              block.status = oldStatus;
              cached.next(block);
              console.error(err);
              throw new Error('Error loading block, will try again when possible and if necessary.');
            }
          });
        } else {
          if (cached.value.status !== 'loaded') {
            block.status = 'loaded';
            cached.next(block);
            // If this block can be finalized already, do it now.
            if (nr <= this.finalizedNumber.value) {
              this.loadBlock(nr);
            }
          }
        }
        if (nr > this.loadedNumber.value) {
          this.loadedNumber.next(nr);
        }
      }
    });
  }

  private unsubscribeHeads(): void {
    if (this.newBlockSubscription) {
      this.newBlockSubscription.unsubscribe();
      this.newBlockSubscription = null;
    }
    if (this.newFinalizedBlocksSubscription) {
      this.newFinalizedBlocksSubscription.unsubscribe();
      this.newFinalizedBlocksSubscription = null;
    }
  }

  pause(): void {
    this.paused = true;
    this.unsubscribeHeads();
    this.headNumber.next(0);
    this.finalizedNumber.next(0);
  }

  resume(): void {
    this.paused = false;
    this.subscribeNewBlocks().then();
  }

  async loadBlocksUntil(untilNumber: number | null, pageSize: number): Promise<void> {
    // Helper function to efficiently load a list of latest finalized blocks.
    // First mark these cached blocks for load, so other block loading mechanisms don't kick in.
    untilNumber = untilNumber || this.finalizedNumber.value;
    let loadBlocks = false;
    for (let nr = untilNumber; nr > untilNumber - pageSize; nr--) {
      if (this.cache[nr].value.status !== 'loaded') {
        this.cache[nr].next(Object.assign(this.cache[nr].value, {status: 'loading'}));
        loadBlocks = true;
      }
    }

    if (loadBlocks) {
      // Then, await the result from Polkascan and update our cached block data.
      this.polkadapt.run().getBlocksUntil(untilNumber, pageSize).pipe(
        switchMap((obs) => obs.length ? merge(...obs) : EMPTY)
      ).subscribe({
        next: (obj) => {
          const blockNr: number = obj.number;
          const cached: BehaviorSubject<Block> = this.cache[blockNr];
          const block: Block = Object.assign({}, cached.value, obj, {
            status: 'loaded',
            finalized: true,
            extrinsics: new Array(obj.countExtrinsics),
            events: new Array(obj.countEvents)
          });
          cached.next(block);
          if (blockNr > this.loadedNumber.value) {
            this.loadedNumber.next(blockNr);
          }
        }
      });
    }
  }

  destroy(): void {
    this.pause();
  }
}
