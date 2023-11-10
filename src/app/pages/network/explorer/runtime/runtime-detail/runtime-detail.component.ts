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
import { catchError, filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NetworkService } from '../../../../../services/network.service';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { types as pst } from '@polkadapt/core';

@Component({
  selector: 'app-runtime-detail',
  templateUrl: './runtime-detail.component.html',
  styleUrls: ['./runtime-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeDetailComponent implements OnInit, OnDestroy {
  runtime: Observable<pst.Runtime | null>;
  pallets: Observable<pst.RuntimePallet[]>;
  fetchRuntimeStatus = new BehaviorSubject<any>(null);
  fetchPalletsStatus = new BehaviorSubject<any>(null);

  private destroyer = new Subject<void>();

  visibleColumns = {
    pallets: ['icon', 'name', 'events', 'calls', 'storage', 'constants', 'details']
  };

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService
  ) {
  }

  ngOnInit(): void {
    const observable = this.ns.currentNetwork.pipe(
      filter(network => network !== ''),
      first(),
      switchMap(() => this.route.params.pipe(
        map(params => {
          const lastIndex = params['runtime'].lastIndexOf('-');
          const specName = params['runtime'].substring(0, lastIndex);
          const specVersion = params['runtime'].substring(lastIndex + 1);
          return [specName, parseInt(specVersion, 10)];
        })
      )),
      takeUntil(this.destroyer)
    )

    this.runtime = observable.pipe(
      tap((runtime) => this.fetchRuntimeStatus.next('loading')),
      switchMap(([specName, specVersion]) => {
          return this.rs.getRuntime(specName as string, specVersion as number).pipe(
            tap(() => this.fetchRuntimeStatus.next(null)),
          )
        }
      ),
      catchError((e) => {
        this.fetchRuntimeStatus.next('error');
        return of(null);
      }),
      takeUntil(this.destroyer)
    );

    this.pallets = this.runtime.pipe(
      tap({
        subscribe: () => this.fetchPalletsStatus.next('loading')
      }),
      switchMap((runtime) =>
        runtime
          ? this.rs.getRuntimePallets(runtime.specName as string, runtime.specVersion as number).pipe(
            map((pallets) => {
              this.fetchPalletsStatus.next(null)
              return pallets;
            })
          )
          : throwError(() => new Error('Runtime not available'))
      ),
      catchError((e) => {
        this.fetchPalletsStatus.next('error');
        return of([]);
      }),
      takeUntil(this.destroyer)
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackPallet(index: number, item: pst.RuntimePallet): string {
    return item.name as string;
  }
}
