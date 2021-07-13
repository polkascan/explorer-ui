import { Directive, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { NetworkService } from '../../services/network.service';


@Directive()
export abstract class ListComponentBase implements OnDestroy {
  protected network: string;

  get loading(): number {
    return this.loadingObservable.value;
  }
  set loading(value: number) {
    this.loadingObservable.next(value);
  }
  readonly loadingObservable = new BehaviorSubject<number>(0);

  readonly destroyer: Subject<undefined> = new Subject();
  protected onDestroyCalled = false;

  abstract onNetworkChange(network: string): void;

  constructor(private _ns: NetworkService) {
    this._ns.currentNetwork
      .pipe(
        debounceTime(100),
        takeUntil(this.destroyer)
      )
      .subscribe((network: string) => {
        if (this.network !== network) {
          this.network = network;
          typeof this.onNetworkChange === 'function' ? this.onNetworkChange(network) : null;
        }
      });
  }

  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
  }
}
