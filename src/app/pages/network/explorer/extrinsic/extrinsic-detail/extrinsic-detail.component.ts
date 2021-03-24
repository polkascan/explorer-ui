import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { filter, first, takeUntil } from 'rxjs/operators';


type psExtrinsic = {
  blockNumber: number; // combined primary key blockNumber, extrinsicIdx
  extrinsicIdx: number; // combined primary key blockNumber, extrinsicIdx
  hash: string | null;
  call: number | null;
  callModule: string | null;
  callName: string | null;
  callArguments: string | null;
  callHash: string | null;
  signed: number | null;
  signature: string | null;
  extrinsicLength: number | null;
  nonce: number | null;
  blockDatetime: string | null;
  blockHash: string | null;
};


@Component({
  selector: 'app-extrinsic-detail',
  templateUrl: './extrinsic-detail.component.html',
  styleUrls: ['./extrinsic-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicDetailComponent implements OnInit, OnDestroy {
  extrinsic: psExtrinsic;

  private destroyer: Subject<undefined> = new Subject();
  private onDestroyCalled = false;

  constructor(private route: ActivatedRoute,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
              private ns: NetworkService
  ) {
  }

  ngOnInit(): void {
    const id: string = this.route.snapshot.params.id;
    if (id) {
      const extrinsicId: number[] = id.split('-').map((v) => parseInt(v, 10));

      this.ns.currentNetwork.pipe(
        takeUntil(this.destroyer),
        // network must be set.
        filter(n => !!n),
        // only need to load once.
        first()
      ).subscribe(async (network) => {
        try {
          const extrinsic = await this.pa.run(network).polkascan.getExtrinsic(extrinsicId[0], extrinsicId[1]);
          if (!this.onDestroyCalled) {
            this.extrinsic = extrinsic;
            this.cd.markForCheck();
          }
        } catch (e) {
          // Do nothing;
        }
      });
    }
  }


  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
  }
}
