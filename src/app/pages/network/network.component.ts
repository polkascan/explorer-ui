import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { NetworkService } from '../../services/network.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-network',
  templateUrl: './network.component.html',
  styleUrls: ['./network.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();

  constructor(private route: ActivatedRoute,
              private networkService: NetworkService) {
  }

  ngOnInit(): void {
    console.log('init network comp');
    const networkParam = this.route.snapshot.params.network;
    if (this.networkService.currentNetwork.value !== networkParam) {
      if (networkParam) {
        console.log('set network on init');
        const noAwait = this.networkService.setNetwork(networkParam);
      }
    }

    this.route.params
      .pipe(
        takeUntil(this.destroyer),
        map((p) => p.network),
        distinctUntilChanged()
      )
      .subscribe((network: string) => {
        console.log('set network on route change');
        const noAwait = this.networkService.setNetwork(network);
      });
  }

  ngOnDestroy(): void {
    console.log('destroy network comp');
    this.destroyer.next();
    this.destroyer.complete();
    this.networkService.destroy();
  }
}
