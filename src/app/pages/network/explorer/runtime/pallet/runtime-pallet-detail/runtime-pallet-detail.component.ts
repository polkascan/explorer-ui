import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { ActivatedRoute } from '@angular/router';
import { NetworkService } from '../../../../../../services/network.service';
import { RuntimeService } from '../../../../../../services/runtime/runtime.service';
import { filter, first, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-runtime-pallet-detail',
  templateUrl: './runtime-pallet-detail.component.html',
  styleUrls: ['./runtime-pallet-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimePalletDetailComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  runtime: Observable<pst.Runtime | null>;
  pallet = new BehaviorSubject<pst.RuntimePallet | null>(null);
  calls = new BehaviorSubject<pst.RuntimeCall[]>([]);
  events = new BehaviorSubject<pst.RuntimeEvent[]>([]);
  storages = new BehaviorSubject<pst.RuntimeStorage[]>([]);
  constants = new BehaviorSubject<pst.RuntimeConstant[]>([]);
  errors = new BehaviorSubject<pst.RuntimeErrorMessage[]>([]);

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService
  ) { }

  ngOnInit(): void {
    // Get the network.
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => network !== null),
      first(),
      // Get the route parameters.
      switchMap(network => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => [network, parseInt(params.specVersion, 10), params.pallet])
      ))
    ).subscribe(([network, specVersion, pallet]) => {
      this.runtime = this.rs.getRuntime(network as string, specVersion as number).pipe(
        takeUntil(this.destroyer),
        filter(r => r !== null),
        first()
      );
      this.rs.getRuntimePallets(network as string, specVersion as number).then(pallets => {
        const matchedPallet: pst.RuntimePallet = pallets.filter(p => p.pallet === pallet)[0];
        this.pallet.next(matchedPallet);
      });
      this.rs.getRuntimeCalls(network as string, specVersion as number).then(calls => {
        const palletCalls: pst.RuntimeCall[] = calls.filter(c => c.pallet === pallet);
        this.calls.next(palletCalls);
      });
      this.rs.getRuntimeEvents(network as string, specVersion as number).then(events => {
        const palletEvents: pst.RuntimeEvent[] = events.filter(e => e.pallet === pallet);
        this.events.next(palletEvents);
      });
      this.rs.getRuntimeStorages(network as string, specVersion as number).then(storages => {
        const palletStorage: pst.RuntimeStorage[] = storages.filter(s => s.pallet === pallet);
        this.storages.next(palletStorage);
      });
      this.rs.getRuntimeConstants(network as string, specVersion as number).then(constants => {
        const palletConstants: pst.RuntimeConstant[] = constants.filter(c => c.pallet === pallet);
        this.constants.next(palletConstants);
      });
      this.rs.getRuntimeErrorMessages(network as string, specVersion as number).then(errors => {
        const palletErrors: pst.RuntimeErrorMessage[] = errors.filter(e => e.pallet === pallet);
        this.errors.next(palletErrors);
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackCall(index: number, item: pst.RuntimeCall): string {
    return item.callName as string;
  }

  trackEvent(index: number, item: pst.RuntimeEvent): string {
    return item.eventName as string;
  }

  trackStorage(index: number, item: pst.RuntimeStorage): string {
    return item.storageName as string;
  }

  trackConstant(index: number, item: pst.RuntimeConstant): string {
    return item.constantName as string;
  }

  trackError(index: number, item: pst.RuntimeErrorMessage): string {
    return item.errorName as string;
  }

}
