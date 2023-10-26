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
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { types as pst } from '@polkadapt/core';
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

  private destroyer = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService,
  ) {
  }

  ngOnInit(): void {
    // Get the network.
    const observable = this.ns.currentNetwork.pipe(
      filter(network => !!network),
      first(),
      // Get the route parameters.
      switchMap(network => this.route.params.pipe(
          map(params => {
            const lastIndex = params['runtime'].lastIndexOf('-');
            const specName = params['runtime'].substring(0, lastIndex);
            const specVersion = params['runtime'].substring(lastIndex + 1);
            return [specName, parseInt(specVersion, 10), params['pallet'], params['storageName']];
          })
        )
      ),
      takeUntil(this.destroyer)
    )

    this.runtime = observable.pipe(
      map(([specName, specVersion, pallet]) => `${specName}-${specVersion}`)
    )

    this.pallet = observable.pipe(
      map(([specName, specVersion, pallet]) => pallet)
    );

    this.storage = observable.pipe(
      tap({
        subscribe: () => this.fetchStorageStatus.next('loading')
      }),
      switchMap(([specName, specVersion, pallet, storageName]) =>
        this.rs.getRuntime(specName, specVersion).pipe(
          filter(r => r !== null),
          first(),
          map(runtime => [runtime as pst.Runtime, pallet, storageName]),
        )
      ),
      switchMap(([runtime, pallet, storageName]) => this.rs.getRuntimeStorages(runtime.specName, runtime.specVersion).pipe(
        map((storages) => {
          const palletStorages: pst.RuntimeStorage[] = storages.filter(s =>
            s.pallet.toLowerCase() === pallet.toLowerCase() && s.storageName.toLowerCase() === storageName.toLowerCase()
          );
          const storage = palletStorages[0];
          if (storage) {
            this.fetchStorageStatus.next(null)
            return storage
          }
          return null;
        })
      )),
      catchError((e) => {
        this.fetchStorageStatus.next('error');
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
