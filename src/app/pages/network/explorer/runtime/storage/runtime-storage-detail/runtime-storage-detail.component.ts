/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2021 Polkascan Foundation (NL)
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
import { BehaviorSubject, Subject } from 'rxjs';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { ActivatedRoute } from '@angular/router';
import { NetworkService } from '../../../../../../services/network.service';
import { RuntimeService } from '../../../../../../services/runtime/runtime.service';
import { filter, first, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-runtime-storage-detail',
  templateUrl: './runtime-storage-detail.component.html',
  styleUrls: ['./runtime-storage-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeStorageDetailComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  storage = new BehaviorSubject<pst.RuntimeStorage | null>(null);

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService,
  ) { }

  ngOnInit(): void {
    // Get the network.
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => !!network),
      first(),
      // Get the route parameters.
      switchMap(network => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => [network, params['specVersion'], params['pallet'], params['storageName']])
      )),
      switchMap(([network, specVersion, pallet, storageName]) =>
        this.rs.getRuntime(network, parseInt(specVersion, 10)).pipe(
          takeUntil(this.destroyer),
          filter(r => r !== null),
          first(),
          map(runtime => [network, runtime as pst.Runtime, pallet, storageName])
        )
      )
    ).subscribe(async ([network, runtime, pallet, storageName]) => {
      this.rs.getRuntimeStorages(network, runtime.specVersion).then(storages => {
        const palletStorages: pst.RuntimeStorage[] = storages.filter(s =>
          s.pallet === pallet && s.storageName === storageName
        );
        this.storage.next(palletStorages[0]);
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }
}
