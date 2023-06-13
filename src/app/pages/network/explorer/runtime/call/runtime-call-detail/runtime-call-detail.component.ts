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
import { PolkadaptService } from '../../../../../../services/polkadapt.service';
import { catchError, filter, first, map, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-runtime-call-detail',
  templateUrl: './runtime-call-detail.component.html',
  styleUrls: ['./runtime-call-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeCallDetailComponent implements OnInit, OnDestroy {
  runtime: string;
  pallet: string;
  call: Observable<pst.RuntimeCall | null>;
  callArguments: Observable<pst.RuntimeCallArgument[]>;
  fetchCallStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  fetchCallAttributesStatus: BehaviorSubject<any> = new BehaviorSubject(null);

  visibleColumns = ['icon', 'name', 'type', 'typeComposition'];

  private destroyer = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService,
    private pa: PolkadaptService
  ) {
  }

  ngOnInit(): void {
    // Get the network.
    const runtimeObservable = this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => !!network),
      first(),
      // Get the route parameters.
      switchMap(network => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => {
          const lastIndex = params['runtime'].lastIndexOf('-');
          const specName = params['runtime'].substring(0, lastIndex);
          const specVersion = params['runtime'].substring(lastIndex + 1);
          return [specName, parseInt(specVersion, 10), params['pallet'], params['callName']];
        }),
        tap(([specName, specVersion, pallet]) => {
          this.runtime = `${specName}-${specVersion}`;
          this.pallet = pallet;
        })
      )),
      switchMap(([specName, specVersion, pallet, callName]) =>
        this.rs.getRuntime(specName, specVersion).pipe(
          takeUntil(this.destroyer),
          map(runtime => [runtime as pst.Runtime, pallet, callName])
        )
      ),
      shareReplay(1)
    )

    this.call = runtimeObservable.pipe(
      tap(() => this.fetchCallStatus.next('loading')),
      switchMap(([runtime, pallet, callName]) => {
        const subject = new BehaviorSubject<pst.RuntimeCall | null>(null);
        if (runtime) {
          this.rs.getRuntimeCalls(runtime.specName, runtime.specVersion).pipe(
            takeUntil(this.destroyer)
          ).subscribe({
            next: (calls) => {
              const palletCall: pst.RuntimeCall = calls.filter(c =>
                c.pallet === pallet && c.callName === callName
              )[0];

              if (palletCall) {
                subject.next(palletCall);
                this.fetchCallStatus.next(null);
              }
            },
            error: (e) => {
              subject.error(e);
            }
          });
        }
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchCallStatus.next('error');
        return of(null);
      })
    );

    this.callArguments = runtimeObservable.pipe(
      tap(() => this.fetchCallAttributesStatus.next('loading')),
      switchMap(([runtime, pallet, callName]) => {
        const subject = new BehaviorSubject<(pst.RuntimeCallArgument & { parsedComposition?: any })[]>([]);
        if (runtime) {
          this.pa.run().getRuntimeCallArguments(runtime.specName, runtime.specVersion, pallet, callName).pipe(
            switchMap((obs) => combineLatest(obs)),
            takeUntil(this.destroyer)
          ).subscribe({
            next: (items) => {
              if (Array.isArray(items)) {
                const objects: (pst.RuntimeCallArgument & { parsedComposition?: any })[] = [...items];
                for (let obj of objects) {
                  if (obj.scaleTypeComposition) {
                    obj.parsedComposition = JSON.parse(obj.scaleTypeComposition);
                  }
                }
                subject.next(objects);
                this.fetchCallAttributesStatus.next(null);
              }
            },
            error: (e) => {
              subject.error(e);
            }
          });
        }
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchCallAttributesStatus.next('error');
        return of([]);
      })
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackCallArgument(index: number, item: pst.RuntimeCallArgument): number {
    return item.callArgumentIdx as number;
  }
}
