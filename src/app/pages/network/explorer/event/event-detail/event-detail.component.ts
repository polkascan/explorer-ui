import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { filter, first, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

type psEvent = {
  blockNumber: number; // combined primary key blockNumber, eventIdx
  eventIdx: number; // combined primary key blockNumber, eventIdx
  extrinsicIdx: number | null;
  event: string | null;
  eventModule: string | null;
  eventName: string | null;
  blockHash: string;
  attributes: string | null;
};


@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventDetailComponent implements OnInit, OnDestroy {
  event: psEvent;

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
      const eventId: number[] = id.split('-').map((v) => parseInt(v, 10));

      this.ns.currentNetwork.pipe(
        takeUntil(this.destroyer),
        // network must be set.
        filter(n => !!n),
        // only need to load once.
        first()
      ).subscribe(async (network) => {
        try {
          const event = await this.pa.run(network).polkascan.getEvent(eventId[0], eventId[1]);
          if (!this.onDestroyCalled) {
            this.event = event;
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
