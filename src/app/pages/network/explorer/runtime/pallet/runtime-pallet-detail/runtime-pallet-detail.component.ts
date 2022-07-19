/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2022 Polkascan Foundation (NL)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { ActivatedRoute } from '@angular/router';
import { NetworkService } from '../../../../../../services/network.service';
import { RuntimeService } from '../../../../../../services/runtime/runtime.service';
import { catchError, filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-runtime-pallet-detail',
  templateUrl: './runtime-pallet-detail.component.html',
  styleUrls: ['./runtime-pallet-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimePalletDetailComponent implements OnInit, OnDestroy {
  runtime: Observable<string>;
  pallet: Observable<pst.RuntimePallet | null>;
  calls: Observable<pst.RuntimeCall[]>;
  events: Observable<pst.RuntimeEvent[]>;
  storages: Observable<pst.RuntimeStorage[]>;
  constants: Observable<pst.RuntimeConstant[]>;
  errorsMessages: Observable<pst.RuntimeErrorMessage[]>;

  fetchRuntimeStatus = new BehaviorSubject<any>(null);
  fetchPalletStatus = new BehaviorSubject<any>(null);
  fetchCallsStatus = new BehaviorSubject<any>(null);
  fetchEventsStatus = new BehaviorSubject<any>(null);
  fetchStoragesStatus = new BehaviorSubject<any>(null);
  fetchConstantsStatus = new BehaviorSubject<any>(null);
  fetchErrorMessagesStatus = new BehaviorSubject<any>(null);

  visibleColumns = {
    calls: ['icon', 'name', 'lookup', 'arguments', 'details'],
    events: ['icon', 'name', 'lookup', 'attributes', 'details'],
    storages: ['icon', 'name', 'type', 'details'],
    constants: ['icon', 'name', 'type', 'value', 'details'],
    errors: ['icon', 'name', 'index', 'documentation']
  };

  private destroyer: Subject<undefined> = new Subject();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService
  ) {
  }

  ngOnInit(): void {
    // Get the network.
    const paramsObservable = this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => network !== ''),
      first(),
      // Get the route parameters.
      switchMap(network => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => {
          const lastIndex = params['runtime'].lastIndexOf('-');
          const specName = params['runtime'].substring(0, lastIndex);
          const specVersion = params['runtime'].substring(lastIndex);
          return [specName, parseInt(specVersion, 10), params['pallet']];
        })
      ))
    )

    this.runtime = paramsObservable.pipe(
      map(([specName, specVersion]) => `${specName}-${specVersion}`)
    )

    const runtimeObservable = paramsObservable.pipe(
      switchMap(([specName, specVersion]) => {
        return this.rs.getRuntime(specName as string, specVersion as number).pipe(
          takeUntil(this.destroyer)
        )
      }),
      catchError((e) => {
        this.fetchRuntimeStatus.next(e);
        return of(null);
      })
    );

    const paramsAndRuntimeObservable = combineLatest(
      paramsObservable,
      runtimeObservable
    );

    this.pallet = paramsAndRuntimeObservable.pipe(
      tap(() => this.fetchPalletStatus.next('loading')),
      filter(([n, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) => {
        const subject: Subject<pst.RuntimePallet | null> = new Subject();
        if (runtime) {
          this.rs.getRuntimePallets(runtime.specName as string, runtime.specVersion as number).then(
            (pallets) => {
              const matchedPallet: pst.RuntimePallet = pallets.filter(p => p.pallet === pallet)[0];
              if (matchedPallet) {
                subject.next(matchedPallet);
                this.fetchPalletStatus.next(null);
              } else {
                subject.error('Runtime pallet not found.');
              }
            },
            (e) => {
              subject.error(e);
            });
        }

        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchPalletStatus.next('error');
        return of(null);
      })
    )

    this.calls = paramsAndRuntimeObservable.pipe(
      tap(() => this.fetchCallsStatus.next('loading')),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) => {
        const subject: Subject<pst.RuntimeCall[]> = new Subject();
        if (runtime) {
          this.rs.getRuntimeCalls(runtime.specName as string, runtime.specVersion as number).then(
            (calls) => {
              const palletCalls: pst.RuntimeCall[] = calls.filter(c => c.pallet === pallet);
              subject.next(palletCalls)
              this.fetchCallsStatus.next(null);
            },
            (e) => {
              subject.error(e);
            });
        }

        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchCallsStatus.next('error');
        return of([]);
      })
    )

    this.events = paramsAndRuntimeObservable.pipe(
      tap(() => this.fetchEventsStatus.next('loading')),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) => {
        const subject: Subject<pst.RuntimeEvent[]> = new Subject();
        if (runtime) {
          this.rs.getRuntimeEvents(runtime.specName as string, runtime.specVersion as number).then(
            (events) => {
              const palletEvents: pst.RuntimeEvent[] = events.filter(e => e.pallet === pallet);
              subject.next(palletEvents);
              this.fetchEventsStatus.next(null);
              },
            (e) => {
              subject.error(e);
            });
        }

        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchEventsStatus.next('error');
        return of([]);
      })
    )

    this.storages = paramsAndRuntimeObservable.pipe(
      tap(() => this.fetchStoragesStatus.next('loading')),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) => {
        const subject: Subject<pst.RuntimeStorage[]> = new Subject();
        if (runtime) {
          this.rs.getRuntimeStorages(runtime.specName as string, runtime.specVersion as number).then(
            (storages) => {
              const palletStorages: pst.RuntimeStorage[] = storages.filter(s => s.pallet === pallet);
              subject.next(palletStorages);
              this.fetchStoragesStatus.next(null);
              },
            (e) => {
              subject.error(e);
            });
        }

        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchStoragesStatus.next('error');
        return of([]);
      })
    )

    this.constants = paramsAndRuntimeObservable.pipe(
      tap(() => this.fetchConstantsStatus.next('loading')),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) => {
        const subject: Subject<pst.RuntimeConstant[]> = new Subject();
        if (runtime) {
          this.rs.getRuntimeConstants(runtime.specName as string, runtime.specVersion as number).then(
            (constants) => {
              const palletConstants: pst.RuntimeConstant[] = constants.filter(c => c.pallet === pallet);
              subject.next(palletConstants);
              this.fetchConstantsStatus.next(null);
              },
            (e) => {
              subject.error(e);
            });
        }

        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchEventsStatus.next('error');
        return of([]);
      })
    )

    this.errorsMessages = paramsAndRuntimeObservable.pipe(
      tap(() => this.fetchConstantsStatus.next('loading')),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) => {
        const subject: Subject<pst.RuntimeErrorMessage[]> = new Subject();
        if (runtime) {
          this.rs.getRuntimeErrorMessages(runtime.specName as string, runtime.specVersion as number).then(
            (errors) => {
              const palletErrors: pst.RuntimeErrorMessage[] = errors.filter(e => e.pallet === pallet);
              subject.next(palletErrors);
              this.fetchConstantsStatus.next(null);
              },
            (e) => {
              subject.error(e);
            });
        }

        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchEventsStatus.next('error');
        return of([]);
      })
    )
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
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
