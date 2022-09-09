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
  selector: 'app-runtime-storage-detail',
  templateUrl: './runtime-storage-detail.component.html',
  styleUrls: ['./runtime-storage-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeStorageDetailComponent implements OnInit, OnDestroy {
  runtime: Observable<string>;
  pallet: Observable<string>;
  storage: Observable<pst.RuntimeStorage | null>;
  fetchStorageStatus: BehaviorSubject<any> = new BehaviorSubject(null);

  private destroyer: Subject<undefined> = new Subject();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService,
  ) {
  }

  ngOnInit(): void {
    // Get the network.
    const observable = this.ns.currentNetwork.pipe(
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
            return [specName, parseInt(specVersion, 10), params['pallet'], params['storageName']];
          })
        )
      )
    )

    this.runtime = observable.pipe(
      map(([specName, specVersion, pallet]) => `${specName}-${specVersion}`)
    )

    this.pallet = observable.pipe(
      map(([specName, specVersion, pallet]) => pallet)
    );

    this.storage = observable.pipe(
      tap(() => this.fetchStorageStatus.next('loading')),
      switchMap(([specName, specVersion, pallet, storageName]) =>
        this.rs.getRuntime(specName, specVersion).pipe(
          takeUntil(this.destroyer),
          filter(r => r !== null),
          first(),
          map(runtime => [runtime as pst.Runtime, pallet, storageName])
        )
      ),
      switchMap(([runtime, pallet, storageName]) => {
        const subject = new Subject<pst.RuntimeStorage>();
        this.rs.getRuntimeStorages(runtime.specName, runtime.specVersion).then(
          (storages) => {
            const palletStorages: pst.RuntimeStorage[] = storages.filter(s =>
              s.pallet === pallet && s.storageName === storageName
            );
            const storage = palletStorages[0];
            if (storage) {
              subject.next(storage);
              this.fetchStorageStatus.next(null)
            } else {
              subject.error('Storage function not found.');
            }
          },
          (e) => {
            subject.error(e);
          });
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchStorageStatus.next('error');
        return of(null);
      })
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }
}
