import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PolkadaptService } from '../../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../../services/network.service';
import { filter, first, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-balances-transfer-detail',
  templateUrl: './balances-transfer-detail.component.html',
  styleUrls: ['./balances-transfer-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalancesTransferDetailComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  transfer: pst.Transfer;

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
    ).subscribe(async ([blockNr, eventIdx]) => {
      this.transfer = await this.pa.run().polkascan.chain.getTransfer(blockNr, eventIdx);
      this.cd.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }
}
