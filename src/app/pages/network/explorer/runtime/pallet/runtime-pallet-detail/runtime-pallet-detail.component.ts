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
import { filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-runtime-pallet-detail',
  templateUrl: './runtime-pallet-detail.component.html',
  styleUrls: ['./runtime-pallet-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimePalletDetailComponent implements OnInit, OnDestroy {
  pallet = new BehaviorSubject<pst.RuntimePallet | null>(null);
  calls = new BehaviorSubject<pst.RuntimeCall[]>([]);
  events = new BehaviorSubject<pst.RuntimeEvent[]>([]);
  storages = new BehaviorSubject<pst.RuntimeStorage[]>([]);
  constants = new BehaviorSubject<pst.RuntimeConstant[]>([]);
  types = new BehaviorSubject<pst.RuntimeType[]>([]);
  errors = new BehaviorSubject<pst.RuntimeErrorMessage[]>([]);

  columnsToDisplay = {
    calls: ['icon', 'name', 'lookup', 'arguments', 'details'],
    events: ['icon', 'name', 'lookup', 'attributes', 'details'],
    storages: ['icon', 'name', 'type', 'details'],
    constants: ['icon', 'name', 'type', 'value', 'details'],
    types: ['icon', 'name', 'decoderClass', 'corePrimitive', 'runtimePrimitive'],
    errors: ['icon', 'name', 'index', 'documentation']
  };

  private destroyer: Subject<undefined> = new Subject();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService
  ) { }

  ngOnInit(): void {
    // Get the network.
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      filter(network => network !== ''),
      first(),
      // Get the route parameters.
      switchMap(network => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => [network, parseInt(params.specVersion, 10), params.pallet])
      )),
      switchMap(([network, specVersion, pallet]) =>
        this.rs.getRuntime(network as string, specVersion as number).pipe(
          takeUntil(this.destroyer),
          filter(r => r !== null),
          tap((r) => {
            console.log('getRuntime', r);
            this.rs.getRuntimePallets(network as string, specVersion as number).then(pallets => {
              const matchedPallet: pst.RuntimePallet = pallets.filter(p => p.pallet === pallet)[0];
              this.pallet.next(matchedPallet);
            });
            this.rs.getRuntimeCalls(network as string, specVersion as number).then(calls => {
              const palletCalls: pst.RuntimeCall[] = calls.filter(c => c.pallet === pallet);
              this.calls.next(palletCalls);
            });
            this.rs.getRuntimeEvents(network as string, specVersion as number).then(events => {
              const palletEvents: pst.RuntimeEvent[] = events.filter(e => e.pallet === pallet);
              this.events.next(palletEvents);
            });
            this.rs.getRuntimeStorages(network as string, specVersion as number).then(storages => {
              const palletStorage: pst.RuntimeStorage[] = storages.filter(s => s.pallet === pallet);
              this.storages.next(palletStorage);
            });
            this.rs.getRuntimeConstants(network as string, specVersion as number).then(constants => {
              const palletConstants: pst.RuntimeConstant[] = constants.filter(c => c.pallet === pallet);
              this.constants.next(palletConstants);
            });
            this.rs.getRuntimeTypes(network as string, specVersion as number).then(types => {
              const palletTypes: pst.RuntimeType[] = types.filter(t => t.pallet === pallet);
              this.types.next(palletTypes);
            });
            this.rs.getRuntimeErrorMessages(network as string, specVersion as number).then(errors => {
              const palletErrors: pst.RuntimeErrorMessage[] = errors.filter(e => e.pallet === pallet);
              this.errors.next(palletErrors);
            });
          })
        )
      )
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackCall(index: number, item: pst.RuntimeCall): string {
    return item.callName as string;
  }

  trackEvent(index: number, item: pst.RuntimeEvent): string {
    return item.eventName as string;
  }

  trackStorage(index: number, item: pst.RuntimeStorage): string {
    return item.storageName as string;
  }

  trackConstant(index: number, item: pst.RuntimeConstant): string {
    return item.constantName as string;
  }

  trackType(index: number, item: pst.RuntimeType): string {
    return item.scaleType as string;
  }

  trackError(index: number, item: pst.RuntimeErrorMessage): string {
    return item.errorName as string;
  }

}
