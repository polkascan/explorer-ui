import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { BehaviorSubject, Subject } from 'rxjs';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { NetworkService } from '../../../../../services/network.service';
import { filter, first, switchMap, takeUntil } from 'rxjs/operators';
import { Block } from '../../../../../services/block/block.harvester';


@Component({
  selector: 'app-runtime-list',
  templateUrl: './runtime-list.component.html',
  styleUrls: ['./runtime-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeListComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  runtimes = new BehaviorSubject<pst.Runtime[] | null>(null);

  constructor(
    private rs: RuntimeService,
    private ns: NetworkService
  ) {
  }

  ngOnInit(): void {
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => !!network),
      first(),
      switchMap(network => this.rs.getRuntimes(network).pipe(
        takeUntil(this.destroyer)
      ))
    ).subscribe(runtimes => {
      this.runtimes.next(runtimes);
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  track(index: number, item: pst.Runtime): string {
    return `${item.specName}-${item.specVersion}`;
  }

}
