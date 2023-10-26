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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { types as pst } from '@polkadapt/core';
import { ActivatedRoute } from '@angular/router';
import { NetworkService } from '../../../../../../services/network.service';
import { RuntimeService } from '../../../../../../services/runtime/runtime.service';
import { catchError, filter, first, map, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PolkadaptService } from '../../../../../../services/polkadapt.service';

@Component({
  selector: 'app-runtime-event-detail',
  templateUrl: './runtime-event-detail.component.html',
  styleUrls: ['./runtime-event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeEventDetailComponent implements OnInit, OnDestroy {
  runtime: string;
  pallet: string;
  event: Observable<pst.RuntimeEvent | null>;
  eventAttributes: Observable<(pst.RuntimeEventAttribute | never)[]>;
  fetchEventStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  fetchEventAttributesStatus: BehaviorSubject<any> = new BehaviorSubject(null);

  visibleColumns = ['icon', 'eventAttributeName', 'type', 'typeComposition'];

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
          return [specName, parseInt(specVersion, 10), params['pallet'], params['eventName']];
        }),
        tap(([specName, specVersion, pallet]) => {
          this.runtime = `${specName}-${specVersion}`;
          this.pallet = pallet;
          setTimeout(() => {
              this.cd.markForCheck();
            })
          })
      )),
      switchMap(([specName, specVersion, pallet, eventName]) =>
        this.rs.getRuntime(specName, specVersion).pipe(
          map(runtime => [runtime as pst.Runtime, pallet, eventName])
        )
      ),
      shareReplay({
        bufferSize: 1,
        refCount: true
      }),
      takeUntil(this.destroyer)
    );

    this.event = runtimeObservable.pipe(
      tap({
        subscribe: () => this.fetchEventStatus.next('loading')
      }),
      switchMap(([runtime, pallet, eventName]) =>
        runtime
          ? this.rs.getRuntimeEvents(runtime.specName, runtime.specVersion).pipe(
            map((events) => {
              const matchedEvent: pst.RuntimeEvent = events.filter(e => e.pallet.toLowerCase() === pallet.toLowerCase() && e.eventName?.toLowerCase() === eventName.toLowerCase())[0];
              if (matchedEvent) {
                this.fetchEventStatus.next(null);
                return matchedEvent;
              }
              return null;
            })
          )
          : of(null)
      ),
      catchError((e) => {
        this.fetchEventStatus.next('error');
        return of(null);
      }),
      takeUntil(this.destroyer),
    )

    this.eventAttributes = runtimeObservable.pipe(
      tap({
        subscribe: () => this.fetchEventAttributesStatus.next('loading')
      }),
      switchMap(([runtime, pallet, eventName]) =>
        runtime ?
          this.rs.getRuntimeEventAttributes(this.ns.currentNetwork.value, runtime.specVersion, pallet, eventName).pipe(
            map((items) => {
              if (Array.isArray(items)) {
                const objects: (pst.RuntimeEventAttribute & { parsedComposition?: any })[] = [...items];
                for (let obj of objects) {
                  if (obj.scaleTypeComposition) {
                    obj.parsedComposition = typeof obj.scaleTypeComposition === 'string' ?
                      JSON.parse(obj.scaleTypeComposition)
                      : obj.scaleTypeComposition;
                  }
                }
                this.fetchEventAttributesStatus.next(null);
                return objects;
              }
              return [];
            })
          )
          : of([])
      ),
      catchError((e) => {
        this.fetchEventAttributesStatus.next('error');
        return of([]);
      }),
      takeUntil(this.destroyer)
    )
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackEventAttribute(index: number, item: pst.RuntimeEventAttribute): string {
    return item.eventAttributeName;
  }
}
