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
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { types as pst } from '@polkadapt/polkascan-explorer';
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
  fetchConstantStatus: BehaviorSubject<any> = new BehaviorSubject(null);

  private destroyer: Subject<undefined> = new Subject();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService,
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
          const specVersion = params['runtime'].substring(lastIndex);
          return [specName, parseInt(specVersion, 10), params['pallet'], params['constantName']];
        }),
        tap(([specName, specVersion, pallet]) => {
          this.runtime = `${specName}-${specVersion}`;
          this.pallet = pallet;
        })
      )),
      switchMap(([specName, specVersion, pallet, constantName]) =>
        this.rs.getRuntime(specName, specVersion).pipe(
          takeUntil(this.destroyer),
          map(runtime => [runtime as pst.Runtime, pallet, constantName])
        ))
    );

    this.constant = runtimeObservable.pipe(
      tap(() => this.fetchConstantStatus.next(null)),
      switchMap(([runtime, pallet, constantName]) => {
        const subject: Subject<pst.RuntimeConstant | null> = new Subject();
        if (runtime) {
          this.rs.getRuntimeConstants(runtime.specName, runtime.specVersion).then(
            (constants) => {
              const palletConstant: pst.RuntimeConstant = constants.filter(s =>
                s.pallet === pallet && s.constantName === constantName
              )[0];
              if (palletConstant) {
                subject.next(palletConstant);
                this.fetchConstantStatus.next(null)
              } else {
                subject.error('Runtime constant not found.')
              }
            },
            (e) => {
              subject.error(e);
          });
        }
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchConstantStatus.next('error');
        return of(null);
      })
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }
}
