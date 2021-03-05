import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { animate, group, query, stagger, style, transition, trigger } from '@angular/animations';
import { PolkadaptService } from '../../../services/polkadapt.service';
import { NetworkService } from '../../../services/network.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged, filter, first, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Block } from '../../../services/block/block.harvester';


const blocksAnimation = trigger('blocksAnimation', [
  transition(':increment', group([
    query(':enter',
      [
        style({opacity: 0, width: 0, transform: 'scale(0.5)', 'transform-origin': 'left center'}),
        stagger('60ms',
          animate('400ms cubic-bezier(0.25, 0.25, 0.2, 1.3)',
            style({opacity: 1, width: '120px', transform: 'scale(1)'})
          )
        )
      ],
      {optional: true}
    ),
    query(':leave',
      animate('400ms cubic-bezier(0.2, -0.2, 0.75, 0.75)',
        style({opacity: 0, transform: 'scale(1.2) rotate(2deg)', 'transform-origin': 'left center'})
      ),
      {optional: true}
    )
  ]))
]);

@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [blocksAnimation]
})
export class ExplorerComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  listSize = 100;
  latestBlockNumber = 0;
  blocks: BehaviorSubject<Block>[] = [];

  constructor(
    private cd: ChangeDetectorRef,
    private pa: PolkadaptService,
    private ns: NetworkService,
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
          first()
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
