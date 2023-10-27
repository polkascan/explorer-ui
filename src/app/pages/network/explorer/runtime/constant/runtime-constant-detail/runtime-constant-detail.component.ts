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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { types as pst } from '@polkadapt/core';
import { ActivatedRoute } from '@angular/router';
import { NetworkService } from '../../../../../../services/network.service';
import { RuntimeService } from '../../../../../../services/runtime/runtime.service';
import { catchError, filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-runtime-constant-detail',
  templateUrl: './runtime-constant-detail.component.html',
  styleUrls: ['./runtime-constant-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeConstantDetailComponent implements OnInit, OnDestroy {
  runtime: string;
  pallet: string;
  constant: Observable<pst.RuntimeConstant | null>;
  parsedComposition = new BehaviorSubject<any>(null);
  fetchConstantStatus: BehaviorSubject<any> = new BehaviorSubject(null);

  private destroyer = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService,
    private cd: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void {
    // Get the network.
    const runtimeObservable = this.ns.currentNetwork.pipe(
      filter(network => !!network),
      first(),
      // Get the route parameters.
      switchMap(network => this.route.params.pipe(
        map(params => {
          const lastIndex = params['runtime'].lastIndexOf('-');
          const specName = params['runtime'].substring(0, lastIndex);
          const specVersion = params['runtime'].substring(lastIndex + 1);
          return [specName, parseInt(specVersion, 10), params['pallet'], params['constantName']];
        }),
        tap(([specName, specVersion, pallet]) => {
          this.runtime = `${specName}-${specVersion}`;
          this.pallet = pallet;
          setTimeout(() => {
            this.cd.markForCheck();
          })
        })
      )),
      switchMap(([specName, specVersion, pallet, constantName]) =>
        this.rs.getRuntime(specName, specVersion).pipe(
          map(runtime => [runtime as pst.Runtime, pallet, constantName])
        )),
      takeUntil(this.destroyer)
    );

    this.constant = runtimeObservable.pipe(
      tap({
        subscribe: () => this.fetchConstantStatus.next(null)
      }),
      switchMap(([runtime, pallet, constantName]) => {
        if (!runtime) {
          return of(null);
        }
        return this.rs.getRuntimeConstants(runtime.specName, runtime.specVersion).pipe(
          map((constants) => {
            const palletConstant: pst.RuntimeConstant = constants.filter(s =>
              s.pallet.toLowerCase() === pallet.toLowerCase() && s.constantName.toLowerCase() === constantName.toLowerCase()
            )[0];
            if (palletConstant) {
              if (palletConstant.scaleTypeComposition) {
                this.parsedComposition.next(
                  typeof palletConstant.scaleTypeComposition === 'string'
                    ? JSON.parse(palletConstant.scaleTypeComposition)
                    : palletConstant.scaleTypeComposition
                );
              }
              this.fetchConstantStatus.next(null)
              return palletConstant;
            }
            return null;
          })
        )
      }),
      catchError((e) => {
        this.fetchConstantStatus.next('error');
        return of(null);
      }),
      takeUntil(this.destroyer)
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }
}
