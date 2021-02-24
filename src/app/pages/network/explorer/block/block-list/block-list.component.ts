import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild
} from '@angular/core';
import { rowsAnimationByCounter } from '../../../../../animations';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { distinctUntilChanged, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Block } from '../../../../../services/block/block.harvester';

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
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => !!network),
      distinctUntilChanged(),
      tap((network) => {
        // Reset blocks Array when currentNetwork changes.
        this.blocks = [];
      }),
      switchMap(() => !!this.ns.blockHarvester ? this.ns.blockHarvester.headNumber : of(0))
    ).subscribe(nr => {
      // Latest head subscription is resubscribed when currentNetwork changes.
      if (nr === 0) {
        return;
      }
      this.latestBlockNumber = nr;
      if (this.blocks.length === 0) {
        // TODO await this.ns.blockHarvester.loadLatestFinalizedBlocks();
        this.spliceBlocks(nr, 100);
      } else {
        this.spliceBlocks(nr, 1);
      }
      this.cd.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  spliceBlocks(latestNumber: number, count: number): void {
    const firstNumber = latestNumber - count + 1;
    this.blocks.splice(-1, count);
    for (let nr = firstNumber; nr <= latestNumber; nr++) {
      const block: BehaviorSubject<Block> = this.ns.blockHarvester.blocks[nr];
      this.blocks.splice(0, 0, block);
    }
  }
}
