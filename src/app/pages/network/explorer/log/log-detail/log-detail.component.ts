import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { filter, first, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-log-detail',
  templateUrl: './log-detail.component.html',
  styleUrls: ['./log-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogDetailComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  log: pst.Log;

  constructor(private route: ActivatedRoute,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
              private ns: NetworkService) { }

  ngOnInit(): void {
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      // Network must be set.
      filter(network => !!network),
      // Only need to load once.
      first(),
      // Switch over to the route param from which we extract the extrinsic keys.
      switchMap(() => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => params.id.split('-').map((v: string) => parseInt(v, 10)))
      ))
    ).subscribe(async ([blockNr, logIdx]) => {
      this.log =
        await this.pa.run().polkascan.chain.getLog(blockNr, logIdx);
      this.cd.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }
}
