import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { filter, first, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-inherent-detail',
  templateUrl: './inherent-detail.component.html',
  styleUrls: ['./inherent-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InherentDetailComponent implements OnInit, OnDestroy {
  inherent: pst.Extrinsic;
  callArguments: any;
  events: pst.Event[];

  private destroyer: Subject<undefined> = new Subject();
  private onDestroyCalled = false;

  constructor(private route: ActivatedRoute,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
              private ns: NetworkService
  ) {
  }

  ngOnInit(): void {
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      // Network must be set.
      filter(network => !!network),
      // Only need to load once.
      first(),
      // Switch over to the route param from which we extract the inherent keys.
      switchMap(() => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => params.id.split('-').map((v: string) => parseInt(v, 10)))
      ))
    ).subscribe(async ([blockNr, extrinsicIdx]) => {
      const inherent: pst.Extrinsic =
        await this.pa.run().polkascan.chain.getExtrinsic(blockNr, extrinsicIdx);
      const eventsResponse: pst.ListResponse<pst.Event> =
        await this.pa.run().polkascan.chain.getEvents({blockNumber: blockNr});
      const events = eventsResponse.objects.filter(event => event.extrinsicIdx === extrinsicIdx);
      if (!this.onDestroyCalled) {
        this.inherent = inherent;
        this.events = events;
        this.callArguments = null;
        try {
          this.callArguments = JSON.parse(inherent.callArguments as string);
        } catch (e) {
          // TODO what to do?
        }
        this.cd.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
  }
}
