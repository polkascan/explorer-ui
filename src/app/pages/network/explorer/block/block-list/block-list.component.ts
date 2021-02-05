import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild
} from '@angular/core';
import { rowsAnimationByCounter } from '../../../../../animations';
import { BehaviorSubject, Subject } from 'rxjs';
import { Block, NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-block-list',
  templateUrl: './block-list.component.html',
  styleUrls: ['./block-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [rowsAnimationByCounter]
})
export class BlockListComponent implements OnInit, OnDestroy {
  @ViewChild('blockContainer') blockContainer: ElementRef;

  private destroyer: Subject<undefined> = new Subject();
  latestBlockNumber = 0;
  blocks: BehaviorSubject<Block>[] = [];
  finalizedBlocks: any[] = [];

  finalizedHeadsUnsubscribeFn: () => void;

  constructor(
    private cd: ChangeDetectorRef,
    private pa: PolkadaptService,
    private ns: NetworkService
  ) {}

  async ngOnInit(): Promise<void> {
    this.ns.headNumber.pipe(takeUntil(this.destroyer)).subscribe((nr) => {
      if (nr === 0) {
        return;
      }
      this.latestBlockNumber = nr;
      if (this.blocks.length === 0) {
        this.spliceBlocks(nr, 10);
      } else {
        this.spliceBlocks(nr, 1);
      }
      this.cd.markForCheck();
    });

    this.finalizedHeadsUnsubscribeFn = await this.pa.run().rpc.chain.subscribeFinalizedHeads((blocks: any[]) => {
      // For now we do not get a single block but a list of blocks,
      // also we need to import the Block type from polkascan adapter.

      // Finalized blocks have no forks, so id is unique.

      // Add block to the blocks array and sort it.
      const currentblockIds = this.finalizedBlocks.map((b) => b.id);
      for (const block of blocks.filter((b) => currentblockIds.indexOf(b.id) === -1)) {
        this.finalizedBlocks.push(block);
      }
      this.finalizedBlocks.sort((a, b) => a.id - b.id);
      console.log('FINALIZEDBLOCKS', this.finalizedBlocks);
      this.cd.markForCheck();
    });
  }

  ngOnDestroy(): void {
    try {
      if (this.finalizedHeadsUnsubscribeFn) {
        this.finalizedHeadsUnsubscribeFn();
      }
    } catch (e) {
      // ignore errors for now until polkadapt catches the not connected errors.
    }

    this.destroyer.next();
    this.destroyer.complete();
  }

  spliceBlocks(latestNumber: number, count: number): void {
    const firstNumber = latestNumber - count + 1;
    this.blocks.splice(-1, count);
    for (let nr = firstNumber; nr <= latestNumber; nr++) {
      const block: BehaviorSubject<Block> = this.ns.blocks[nr];
      this.blocks.splice(0, 0, block);
    }
  }
}
