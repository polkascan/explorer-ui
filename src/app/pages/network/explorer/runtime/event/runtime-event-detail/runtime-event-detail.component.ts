import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { ActivatedRoute } from '@angular/router';
import { NetworkService } from '../../../../../../services/network.service';
import { RuntimeService } from '../../../../../../services/runtime/runtime.service';
import { filter, first, map, switchMap, takeUntil } from 'rxjs/operators';
import { PolkadaptService } from '../../../../../../services/polkadapt.service';

@Component({
  selector: 'app-runtime-event-detail',
  templateUrl: './runtime-event-detail.component.html',
  styleUrls: ['./runtime-event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeEventDetailComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  event = new BehaviorSubject<pst.RuntimeEvent | null>(null);
  eventAttributes = new BehaviorSubject<pst.RuntimeEventAttribute[]>([]);

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService,
    private pa: PolkadaptService
  ) { }

  ngOnInit(): void {
    // Get the network.
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => !!network),
      first(),
      // Get the route parameters.
      switchMap(network => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => [network, params.specVersion, params.pallet, params.eventName])
      )),
      switchMap(([network, specVersion, pallet, eventName]) =>
        this.rs.getRuntime(network, parseInt(specVersion, 10)).pipe(
          takeUntil(this.destroyer),
          filter(r => r !== null),
          first(),
          map(runtime => [network, runtime as pst.Runtime, pallet, eventName])
        )
      )
    ).subscribe(async ([network, runtime, pallet, eventName]) => {
      this.rs.getRuntimeEvents(network, runtime.specVersion).then(events => {
        const palletEvents: pst.RuntimeEvent[] = events.filter(e =>
          e.pallet === pallet && e.eventName === eventName
        );
        this.event.next(palletEvents[0]);
      });
      const response: pst.ListResponse<pst.RuntimeEventAttribute> =
        await this.pa.run().polkascan.state.getRuntimeEventAttributes(runtime.specName, runtime.specVersion, pallet, eventName);
      this.eventAttributes.next(response.objects);
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackEventAttribute(index: number, item: pst.RuntimeEventAttribute): number {
    return item.eventAttributeIdx;
  }
}
