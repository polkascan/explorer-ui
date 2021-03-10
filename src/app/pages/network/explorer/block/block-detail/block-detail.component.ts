import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NetworkService } from '../../../../../services/network.service';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { Block } from '../../../../../services/block/block.harvester';
import { distinctUntilChanged, filter, first, map, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';

@Component({
  selector: 'app-block-detail',
  templateUrl: './block-detail.component.html',
  styleUrls: ['./block-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockDetailComponent implements OnInit {
  block = new BehaviorSubject<Block | null>(null);
  headNumber = new BehaviorSubject<number>(0);

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService
  ) { }

  ngOnInit(): void {
    const blockNr = this.route.snapshot.params.id;
    // Wait for network to be set.
    this.ns.currentNetwork.pipe(
      // Only continue if a network is set.
      filter(network => !!network),
      // We don't have to wait for further changes to network, because that will trigger a redirect to another page.
      first(),
      // Watch for changes to block data (update on finalize) and head number (wait for future block number).
      switchMap(() => combineLatest(
        // Update block when block data changes.
        this.ns.blockHarvester.blocks[blockNr].pipe(
          tap(block => {
            this.block.next(block);
          })
        ),
        // Update this component's headNumber when blockHarvester's headNumber changes.
        this.ns.blockHarvester.headNumber.pipe(
          filter(nr => nr > 0),
          tap(nr => {
            this.headNumber.next(nr);
          })
        )
      ).pipe(
        // Stop watching when this block is finalized.
        takeWhile(combined => !combined[0].finalized, true)
      ))
    ).subscribe();
  }

}
