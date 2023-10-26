/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2023 Polkascan Foundation (NL)
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
import { types as pst } from '@polkadapt/core';
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

  private destroyer = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService
  ) {
  }

  ngOnInit(): void {
    // Get the network.
    const paramsObservable = this.ns.currentNetwork.pipe(
      filter(network => network !== ''),
      first(),
      // Get the route parameters.
      switchMap(network => this.route.params.pipe(
        map(params => {
          const lastIndex = params['runtime'].lastIndexOf('-');
          const specName = params['runtime'].substring(0, lastIndex);
          const specVersion = params['runtime'].substring(lastIndex + 1);
          return [specName, parseInt(specVersion, 10), params['pallet']];
        })
      )),
      takeUntil(this.destroyer)
    )

    this.runtime = paramsObservable.pipe(
      map(([specName, specVersion]) => `${specName}-${specVersion}`)
    )

    const runtimeObservable = paramsObservable.pipe(
      switchMap(([specName, specVersion]) => this.rs.getRuntime(specName as string, specVersion as number)),
      catchError((e) => {
        this.fetchRuntimeStatus.next(e);
        return of(null);
      }),
      takeUntil(this.destroyer)
    );

    const paramsAndRuntimeObservable = combineLatest(
      paramsObservable,
      runtimeObservable
    );

    this.pallet = paramsAndRuntimeObservable.pipe(
      tap({
        subscribe: () => this.fetchPalletStatus.next('loading')
      }),
      filter(([n, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) =>
        runtime
          ? this.rs.getRuntimePallets(runtime.specName as string, runtime.specVersion as number).pipe(
            map((pallets) => {
              const matchedPallet: pst.RuntimePallet = pallets.filter(p => p.pallet.toLowerCase() === pallet.toLowerCase())[0];
              if (matchedPallet) {
                this.fetchPalletStatus.next(null);
                return matchedPallet
              }
              return null;
            })
          )
          : of(null)
      ),
      catchError((e) => {
        this.fetchPalletStatus.next('error');
        return of(null);
      }),
      takeUntil(this.destroyer)
    )

    this.calls = paramsAndRuntimeObservable.pipe(
      tap({
        subscribe: () => this.fetchCallsStatus.next('loading')
      }),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) =>
        runtime
          ? this.rs.getRuntimeCalls(runtime.specName as string, runtime.specVersion as number).pipe(
            map((calls) => {
              const palletCalls: pst.RuntimeCall[] = calls.filter(c => c.pallet.toLowerCase() === pallet.toLowerCase());
              this.fetchCallsStatus.next(null);
              return palletCalls
            })
          )
          : of([])
      ),
      catchError((e) => {
        this.fetchCallsStatus.next('error');
        return of([]);
      }),
      takeUntil(this.destroyer)
    )

    this.events = paramsAndRuntimeObservable.pipe(
      tap({
        subscribe: () => this.fetchEventsStatus.next('loading')
      }),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) =>
        runtime
          ? this.rs.getRuntimeEvents(runtime.specName as string, runtime.specVersion as number).pipe(
            map((events) => {
              const palletEvents: pst.RuntimeEvent[] = events.filter(e => e.pallet.toLowerCase() === pallet.toLowerCase());
              this.fetchEventsStatus.next(null);
              return palletEvents;
            })
          )
          : of([])
      ),
      catchError((e) => {
        this.fetchEventsStatus.next('error');
        return of([]);
      }),
      takeUntil(this.destroyer)
    )

    this.storages = paramsAndRuntimeObservable.pipe(
      tap({
        subscribe: () => this.fetchStoragesStatus.next('loading')
      }),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) =>
        runtime
          ? this.rs.getRuntimeStorages(runtime.specName as string, runtime.specVersion as number).pipe(
            map((storages) => {
              const palletStorages: pst.RuntimeStorage[] = storages.filter(s => s.pallet.toLowerCase() === pallet.toLowerCase());
              this.fetchStoragesStatus.next(null);
              return palletStorages;
            })
          )
          : of([])
      ),
      catchError((e) => {
        this.fetchStoragesStatus.next('error');
        return of([]);
      }),
      takeUntil(this.destroyer)
    )

    this.constants = paramsAndRuntimeObservable.pipe(
      tap({
        subscribe: () => this.fetchConstantsStatus.next('loading')
      }),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) =>
        runtime
          ? this.rs.getRuntimeConstants(runtime.specName as string, runtime.specVersion as number).pipe(
            map((constants) => {
              const palletConstants: pst.RuntimeConstant[] = constants.filter(c => c.pallet.toLowerCase() === pallet.toLowerCase());
              this.fetchConstantsStatus.next(null);
              return palletConstants;
            })
          )
          : of([])
      ),
      catchError((e) => {
        this.fetchConstantsStatus.next('error');
        return of([]);
      }),
      takeUntil(this.destroyer)
    )

    this.errorsMessages = paramsAndRuntimeObservable.pipe(
      tap({
        subscribe: () => this.fetchErrorMessagesStatus.next('loading')
      }),
      filter(([p, r]) => !!r),
      switchMap(([[specName, specVersion, pallet], runtime]) =>
        runtime
          ? this.rs.getRuntimeErrorMessages(runtime.specName as string, runtime.specVersion as number).pipe(
            map((errors) => {
              const palletErrors: pst.RuntimeErrorMessage[] = errors.filter(e => e.pallet.toLowerCase() === pallet.toLowerCase());
              this.fetchErrorMessagesStatus.next(null);
              return palletErrors;
            })
          )
          : of([])
      ),
      catchError((e) => {
        this.fetchErrorMessagesStatus.next('error');
        return of([]);
      }),
      takeUntil(this.destroyer)
    )
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
