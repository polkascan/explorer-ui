import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { animate, group, query, stagger, style, transition, trigger } from '@angular/animations';
import { PolkadaptService } from '../../../services/polkadapt.service';
import { Block, NetworkService } from '../../../services/network.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


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
  latestBlockNumber = 0;
  blocks: BehaviorSubject<Block>[] = [];

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
  }

  ngOnDestroy(): void {
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
