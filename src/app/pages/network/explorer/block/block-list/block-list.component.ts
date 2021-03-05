import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit
} from '@angular/core';
import { rowsAnimationByCounter } from '../../../../../animations';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { distinctUntilChanged, filter, first, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Block } from '../../../../../services/block/block.harvester';

@Component({
  selector: 'app-block-list',
  templateUrl: './block-list.component.html',
  styleUrls: ['./block-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [rowsAnimationByCounter]
})
export class BlockListComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  listSize = 100;
  latestBlockNumber = 0;
  blocks: BehaviorSubject<Block>[] = [];

  constructor(
    private cd: ChangeDetectorRef,
    private pa: PolkadaptService,
    private ns: NetworkService
  ) {}

  ngOnInit(): void {
    // Watch for changes to network, latest block number and last block data.
    this.ns.currentNetwork.pipe(
      // Keep it running until this component is destroyed.
      takeUntil(this.destroyer),
      // Only continue if a network is set.
      filter(network => !!network),
      // Only continue if the network value has changed.
      distinctUntilChanged(),
      // When network has changed, reset the block Array for this component.
      tap(() => {
        this.latestBlockNumber = 0;
        this.blocks = [];
        this.cd.markForCheck();
      }),
      // Wait for the first most recent finalized block to arrive from Polkascan.
      switchMap(() => {
        return this.ns.blockHarvester.finalizedNumber.pipe(
          filter(nr => nr > 0),
          first(),
          // Start pre-loading the latest 100 blocks.
          tap(() => {
            // We won't wait for the result, but the function will mark the blocks to load,
            // so other (lazy) block loading mechanics won't kick in.
            this.ns.blockHarvester.loadLatestBlocks().then();
          })
        );
      }),
      // Watch for new block numbers from the Substrate node.
      switchMap(() => this.ns.blockHarvester.headNumber),
      // Only continue if new block number is larger than 0.
      filter(nr => nr > 0),
      // Watch for changes in new block data.
      switchMap(nr => this.ns.blockHarvester.blocks[nr]),
      // Only continue if the new block is fully loaded.
      filter(block => block.status === 'loaded')
    ).subscribe(block => {
      const newBlockCount: number = block.number - this.latestBlockNumber;
      if (newBlockCount > 0) {
        this.latestBlockNumber = block.number;
        // Add new blocks to the beginning (while removing same amount at the end) of the Array.
        this.spliceBlocks(Math.min(newBlockCount, this.listSize));
        this.cd.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  spliceBlocks(n: number): void {
    // Remove the last n items.
    this.blocks.splice(-n, n);
    // Insert n blocks.
    for (let nr = this.latestBlockNumber; nr > this.latestBlockNumber - n; nr--) {
      const block: BehaviorSubject<Block> = this.ns.blockHarvester.blocks[nr];
      this.blocks.splice(this.latestBlockNumber - nr, 0, block);
    }
  }
}
