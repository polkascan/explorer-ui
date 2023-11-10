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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { animate, group, query, stagger, style, transition, trigger } from '@angular/animations';
import { PolkadaptService } from '../../../services/polkadapt.service';
import { NetworkService } from '../../../services/network.service';
import { BehaviorSubject, map, Observable, of, startWith, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  first,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
  timeout
} from 'rxjs/operators';
import { Block } from '../../../services/block/block.harvester';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { validateAddress } from '@polkadot/util-crypto'
import { ActivatedRoute, Router } from '@angular/router';
import { VariablesService } from '../../../services/variables.service';
import { types as pst } from '@polkadapt/core';
import { BN } from "@polkadot/util";


const blocksAnimation = trigger('blocksAnimation', [
  transition(':increment', group([
    query('.block-outer:enter',
      [
        style({opacity: 0, width: 0, transform: 'scale(0.5)', 'transform-origin': 'left center'}),
        stagger('60ms',
          animate('400ms cubic-bezier(0.25, 0.25, 0.2, 1.3)',
            style({opacity: 1, width: '9vw', transform: 'scale(1)'})
          )
        )
      ],
      {optional: true}
    ),
    query('.block-outer:leave',
      animate('400ms cubic-bezier(0.2, -0.2, 0.75, 0.75)',
        style({opacity: 0, transform: 'scale(1.2) rotate(2deg)', 'transform-origin': 'left center'})
      ),
      {optional: true}
    )
  ]))
]);

const blockContentAnimation = trigger('blockContentAnimation', [
  transition('* => *', [
    query('.transaction:enter, .event:enter',
      [
        style({opacity: 0}),
        stagger('40ms',
          animate('200ms cubic-bezier(0.25, 0.25, 0.2, 1.3)',
            style({opacity: 1})
          )
        )
      ],
      {optional: true}
    )])
]);

@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [blocksAnimation, blockContentAnimation]
})
export class ExplorerComponent implements OnInit, OnDestroy {
  private destroyer = new Subject<void>();
  blockListSize = 10;
  latestBlockNumber = new BehaviorSubject<number>(0);
  blocks = new BehaviorSubject<BehaviorSubject<Block>[]>([]);

  statistics: Observable<pst.ChainStatistics | null>
  stakedRatio: Observable<string | null>;
  inflationRatio: Observable<string | null>;
  rewardsRatio: Observable<string | null>

  constructor(
    public pa: PolkadaptService,
    public ns: NetworkService,
    private vars: VariablesService
  ) {
  }

  ngOnInit(): void {
    // Watch for changes to network, the latest block number and last block data.
    const networkObservable = this.ns.currentNetwork.pipe(
      // Only continue if a network is set.
      filter(network => !!network),
      // Only continue if the network value has changed.
      distinctUntilChanged(),
      // Keep it running until this component is destroyed.
      takeUntil(this.destroyer)
    );

    // When network has changed, reset the block Array for this component.
    networkObservable.pipe(tap(() => {
        this.latestBlockNumber.next(0);
        this.blocks.next([]);
      }),
      // Wait for the first most recent finalized block to arrive from Polkascan.
      switchMap(() => this.ns.blockHarvester.finalizedNumber.pipe(
        timeout(2000),
        filter(nr => nr > 0),
        first(),
        // Start preloading the latest blocks.
        tap(() => {
          // We won't wait for the result, but the function will mark the blocks to load,
          // so other (lazy) block loading mechanics won't kick in.
          this.ns.blockHarvester.loadBlocksUntil(null, this.blockListSize).then();
        }),
        catchError(error => of(-1))
      )),
      // Watch for new loaded block numbers from the Substrate node.
      switchMap(() => this.ns.blockHarvester.loadedNumber.pipe(
        // Only continue if new block number is larger than 0.
        filter(nr => nr > 0)
      )),
      // Watch for changes in new block data.
      switchMap(nr => this.ns.blockHarvester.blocks[nr]),
      takeUntil(this.destroyer)
    ).subscribe({
      next: (block) => {
        const newBlockCount: number = block.number - this.latestBlockNumber.value;
        if (newBlockCount > 0) {
          this.latestBlockNumber.next(block.number);
          // Add new blocks to the beginning (while removing same amount at the end) of the Array.
          this.spliceBlocks(Math.min(newBlockCount, this.blockListSize));
        }
      }
    });

    // Watch the network variable that changes as soon as another network is *selected* by the user,
    // whereas the currentNetwork variable is only changed after initialization.
    this.vars.network.pipe(
      filter(network => !!network),
      distinctUntilChanged(),
      takeUntil(this.destroyer)
    ).subscribe({
      next: () => {
        this.latestBlockNumber.next(0);
        this.blocks.next([]);
      }
    });

    this.statistics = networkObservable.pipe(
      switchMap(() => this.pa.run().getLatestStatistics().pipe(
        startWith(null),
        catchError(() => of(null)),
        switchMap((o) => o || of(null)))),
      shareReplay({
        refCount: true,
        bufferSize: 1
      })
    );

    this.stakedRatio = this.statistics.pipe(
      // TODO Change this code when BN is implemented in the adapter.
      map((stats) => {
        if (stats && stats.balancesTotalIssuance && stats.stakingTotalStake) {
          const calc = new BN(stats.stakingTotalStake).mul(new BN(10000)).div(
            new BN(stats.balancesTotalIssuance)
          ).toNumber();
          return (calc / 100).toFixed(2);
        }
        return null;
      })
    );

    this.inflationRatio = this.statistics.pipe(
      map((stats) => stats?.stakingInflationRatio?.toFixed(2) || null)
    );

    this.rewardsRatio = this.statistics.pipe(
      map((stats) => stats?.stakingRewardsRatio?.toFixed(2) || null)
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next();
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

}
