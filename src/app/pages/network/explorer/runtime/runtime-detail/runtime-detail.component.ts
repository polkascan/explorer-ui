import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NetworkService } from '../../../../../services/network.service';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';

@Component({
  selector: 'app-runtime-detail',
  templateUrl: './runtime-detail.component.html',
  styleUrls: ['./runtime-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeDetailComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  runtime: Observable<pst.Runtime | null>;
  pallets = new BehaviorSubject<pst.RuntimePallet[]>([]);

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService
  ) { }

  ngOnInit(): void {
    this.runtime = this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => network !== null),
      first(),
      switchMap(network => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => [network, parseInt(params.specVersion, 10)])
      )),
      switchMap(([network, specVersion]) => {
        const runtime = this.rs.getRuntime(network as string, specVersion as number).pipe(
          takeUntil(this.destroyer),
          filter(r => r !== null)
        );
        this.rs.getRuntimePallets(network as string, specVersion as number).then(pallets => {
          this.pallets.next(pallets);
        });
        return runtime;
      })
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  track(index: number, item: pst.RuntimePallet): string {
    return item.name as string;
  }
}
