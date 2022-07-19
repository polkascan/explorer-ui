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
import { catchError, filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NetworkService } from '../../../../../services/network.service';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { types as pst } from '@polkadapt/polkascan-explorer';

@Component({
  selector: 'app-runtime-detail',
  templateUrl: './runtime-detail.component.html',
  styleUrls: ['./runtime-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeDetailComponent implements OnInit, OnDestroy {
  runtime: Observable<pst.Runtime | null>;
  pallets: Observable<pst.RuntimePallet[]>;
  types: Observable<pst.RuntimeType[]>;
  fetchRuntimeStatus = new BehaviorSubject<any>(null);
  fetchPalletsStatus = new BehaviorSubject<any>(null);
  fetchTypesStatus = new BehaviorSubject<any>(null);

  private destroyer: Subject<undefined> = new Subject();

  visibleColumns = {
    pallets: ['icon', 'name', 'events', 'calls', 'storage', 'constants', 'details'],
    types: ['icon', 'name', 'decoderClass', 'corePrimitive', 'runtimePrimitive'],
  };

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService
  ) {
  }

  ngOnInit(): void {
    const observable = this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => network !== ''),
      first(),
      switchMap(network => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => {
          const lastIndex = params['runtime'].lastIndexOf('-');
          const specName = params['runtime'].substring(0, lastIndex);
          const specVersion = params['runtime'].substring(lastIndex);
          return [specName, parseInt(specVersion, 10)];
        })
      ))
    )

    this.runtime = observable.pipe(
      tap((runtime) => this.fetchRuntimeStatus.next('loading')),
      switchMap(([specName, specVersion]) => {
          return this.rs.getRuntime(specName as string, specVersion as number).pipe(
            tap(() => this.fetchRuntimeStatus.next(null)),
            takeUntil(this.destroyer),
          )
        }
      ),
      catchError((e) => {
        this.fetchRuntimeStatus.next('error');
        return of(null);
      })
    );

    this.pallets = this.runtime.pipe(
      tap((runtime) => this.fetchPalletsStatus.next('loading')),
      switchMap((runtime) => {
        if (!runtime) {
          throw new Error('Runtime not available');
        }

        const subject = new Subject<pst.RuntimePallet[]>();

        this.rs.getRuntimePallets(runtime.specName as string, runtime.specVersion as number).then(
          (pallets) => {
            subject.next(pallets);
            this.fetchPalletsStatus.next(null)
          },
          (e) => {
            subject.error(e)
          })
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchPalletsStatus.next('error');
        return of([]);
      })
    )

    this.types = this.runtime.pipe(
      tap((runtime) => this.fetchTypesStatus.next('loading')),
      switchMap((runtime) => {
        if (!runtime) {
          throw new Error('Runtime not available');
        }

        const subject = new Subject<pst.RuntimeType[]>();
        this.rs.getRuntimeTypes(runtime.specName as string, runtime.specVersion as number).then(
          (types) => {
            subject.next(types);
            this.fetchTypesStatus.next(null)
          },
          (e) => {
            subject.error(e)
          })
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchTypesStatus.next('error');
        return of([]);
      })
    )
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }

  trackPallet(index: number, item: pst.RuntimePallet): string {
    return item.name as string;
  }

  trackType(index: number, item: pst.RuntimeType): string {
    return item.scaleType as string;
  }
}
