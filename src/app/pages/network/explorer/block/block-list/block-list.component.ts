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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { rowsAnimationByCounter } from '../../../../../animations';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { catchError, distinctUntilChanged, filter, first, switchMap, takeUntil, tap, timeout } from 'rxjs/operators';
import { Block } from '../../../../../services/block/block.harvester';

@Component({
  selector: 'app-block-list',
  templateUrl: './block-list.component.html',
  styleUrls: ['./block-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [rowsAnimationByCounter]
})
export class BlockListComponent implements OnInit, OnDestroy {
  listSize = 100;
  latestBlockNumber = new BehaviorSubject<number>(0);
  blocks = new BehaviorSubject<BehaviorSubject<Block>[]>([]);
  customUntilBlockNumber: number | null = null;
  loadingObservable = new BehaviorSubject<number>(0);

  visibleColumns = ['icon', 'number', 'age', 'blockHash', 'signedExtrinsics', 'moduleEvents', 'details'];

  private destroyer: Subject<undefined> = new Subject();

  constructor(
    private pa: PolkadaptService,
    private ns: NetworkService
  ) {
  }

  ngOnInit(): void {
    // Watch for changes to network, the latest block number and last block data.
    this.ns.currentNetwork.pipe(
      // Keep it running until this component is destroyed.
      takeUntil(this.destroyer),
      // Only continue if a network is set.
      filter(network => !!network),
      // Only continue if the network value has changed.
      distinctUntilChanged(),
      // When network has changed, reset the block Array for this component.
      tap(() => {
        this.latestBlockNumber.next(0);
        this.blocks.next([]);
      }),
      // Wait for the first most recent finalized block to arrive from Polkascan.
      switchMap(() => this.ns.blockHarvester.finalizedNumber.pipe(
        timeout(2000),
        takeUntil(this.destroyer),
        filter(nr => nr > 0),
        first(),
        // Start preloading the latest 100 blocks.
        tap(() => {
          // We won't wait for the result, but the function will mark the blocks to load,
          // so other (lazy) block loading mechanics won't kick in.
          this.loadingObservable.next(this.loadingObservable.value + 1);
          this.ns.blockHarvester.loadBlocksUntil(null, this.listSize).then().finally(() => this.loadingObservable.next(this.loadingObservable.value - 1));
        }),
        catchError(error => of(-1))
      )),
      // Watch for new loaded block numbers from the Substrate node.
      switchMap(() => this.ns.blockHarvester.loadedNumber.pipe(
        takeUntil(this.destroyer),
        // Only continue if new block number is larger than 0.
        filter(nr => nr > 0)
      )),
      // Watch for changes in new block data.
      switchMap(nr => this.ns.blockHarvester.blocks[nr].pipe(
        takeUntil(this.destroyer)
      ))
    ).subscribe(block => {
      const newBlockCount: number = block.number - this.latestBlockNumber.value;
      if (newBlockCount > 0) {
        this.latestBlockNumber.next(block.number);
        // Add new blocks to the beginning (while removing same amount at the end) of the Array.
        if (this.customUntilBlockNumber === null) {
          this.spliceBlocks(Math.min(newBlockCount, this.listSize));
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }

  spliceBlocks(n: number): void {
    // Remove the last n items.
    const blocks: BehaviorSubject<Block>[] = this.blocks.value.slice();
    const latest: number = this.latestBlockNumber.value;
    blocks.splice(-n, n);
    // Insert n blocks.
    for (let nr = latest; nr > latest - n; nr--) {
      const block: BehaviorSubject<Block> = this.ns.blockHarvester.blocks[nr];
      blocks.splice(latest - nr, 0, block);
    }
    this.blocks.next(blocks);
  }

  getPrevPage(): void {
    if (this.loadingObservable.value) {
      return;
    }

    if (!this.latestBlockNumber.value) {
      // Don't know what the current block number should be.
      return;
    }

    const latest = this.latestBlockNumber.value;
    let until: number = Math.max(this.listSize - 1,
      ((this.customUntilBlockNumber === null ? latest : this.customUntilBlockNumber) || 0) + this.listSize
    );

    if (until >= latest) {
      this.customUntilBlockNumber = null;
      until = Math.min(until, latest);
    } else {
      this.customUntilBlockNumber = until;
    }

    this.loadingObservable.next(this.loadingObservable.value + 1);
    this.ns.blockHarvester.loadBlocksUntil(until, this.listSize).then().finally(() => this.loadingObservable.next(this.loadingObservable.value - 1));

    const blocks: BehaviorSubject<Block>[] = []
    for (let nr = until; nr > until - this.listSize; nr--) {
      const block: BehaviorSubject<Block> = this.ns.blockHarvester.blocks[nr];
      blocks.push(block);
    }
    this.blocks.next(blocks);
  }

  getNextPage(): void {
    if (this.loadingObservable.value) {
      return;
    }

    if (!this.latestBlockNumber.value) {
      // Don't know what the current block number should be.
      return;
    }

    const until: number = Math.max(this.listSize - 1,
      ((this.customUntilBlockNumber === null ? this.latestBlockNumber.value : this.customUntilBlockNumber) || 0) - this.listSize
    );

    this.customUntilBlockNumber = until;
    this.loadingObservable.next(this.loadingObservable.value + 1);

    this.ns.blockHarvester.loadBlocksUntil(until, this.listSize).then().finally(() => this.loadingObservable.next(this.loadingObservable.value - 1));

    const blocks: BehaviorSubject<Block>[] = []
    for (let nr = until; nr > until - this.listSize; nr--) {
      const block: BehaviorSubject<Block> = this.ns.blockHarvester.blocks[nr];
      blocks.push(block);
    }
    this.blocks.next(blocks);
    window.scrollTo(0, 0);
  }
}
