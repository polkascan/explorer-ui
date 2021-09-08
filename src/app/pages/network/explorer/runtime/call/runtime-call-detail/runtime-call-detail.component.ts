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
import { PolkadaptService } from '../../../../../../services/polkadapt.service';
import { filter, first, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-runtime-call-detail',
  templateUrl: './runtime-call-detail.component.html',
  styleUrls: ['./runtime-call-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeCallDetailComponent implements OnInit, OnDestroy {
  call = new BehaviorSubject<pst.RuntimeCall | null>(null);
  callArguments = new BehaviorSubject<pst.RuntimeCallArgument[]>([]);

  visibleColumns = ['icon', 'name', 'type'];

  private destroyer: Subject<undefined> = new Subject();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService,
    private pa: PolkadaptService
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
        map(params => [network, params.specVersion, params.pallet, params.callName])
      )),
      switchMap(([network, specVersion, pallet, callName]) =>
        this.rs.getRuntime(network, parseInt(specVersion, 10)).pipe(
          takeUntil(this.destroyer),
          filter(r => r !== null),
          first(),
          map(runtime => [network, runtime as pst.Runtime, pallet, callName])
        )
      )
    ).subscribe(async ([network, runtime, pallet, callName]) => {
      this.rs.getRuntimeCalls(network, runtime.specVersion).then(calls => {
        const palletCalls: pst.RuntimeCall[] = calls.filter(c =>
          c.pallet === pallet && c.callName === callName
        );
        this.call.next(palletCalls[0]);
      });
      const response: pst.ListResponse<pst.RuntimeCallArgument> =
        await this.pa.run().polkascan.state.getRuntimeCallArguments(runtime.specName, runtime.specVersion, pallet, callName);
      this.callArguments.next(response.objects);
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackCallArgument(index: number, item: pst.RuntimeCallArgument): number {
    return item.callArgumentIdx as number;
  }
}
