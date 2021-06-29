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
import { filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NetworkService } from '../../../../../services/network.service';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';

@Component({
  selector: 'app-runtime-detail',
  templateUrl: './runtime-detail.component.html',
  styleUrls: ['./runtime-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeDetailComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  runtime: Observable<pst.Runtime | null>;
  pallets = new BehaviorSubject<pst.RuntimePallet[]>([]);

  columnsToDisplay = ['icon', 'name', 'events', 'calls', 'storage', 'constants', 'details']

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService
  ) { }

  ngOnInit(): void {
    this.runtime = this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => network !== ''),
      first(),
      switchMap(network => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => [network, parseInt(params.specVersion, 10)])
      )),
      switchMap(([network, specVersion]) =>
        this.rs.getRuntime(network as string, specVersion as number).pipe(
          takeUntil(this.destroyer),
          filter(r => r !== null),
          tap(() => {
            this.rs.getRuntimePallets(network as string, specVersion as number).then(pallets => {
              this.pallets.next(pallets);
            });
          })
        )
      )
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  track(index: number, item: pst.RuntimePallet): string {
    return item.name as string;
  }
}
