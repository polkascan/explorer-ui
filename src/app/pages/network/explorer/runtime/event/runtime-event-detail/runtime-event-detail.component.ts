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
  eventAttributes: Observable<pst.RuntimeEventAttribute[]>;
  fetchEventStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  fetchEventAttributesStatus: BehaviorSubject<any> = new BehaviorSubject(null);

  visibleColumns = ['icon', 'type'];

  private destroyer: Subject<undefined> = new Subject();

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private rs: RuntimeService,
    private pa: PolkadaptService
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
          return [specName, parseInt(specVersion, 10), params['pallet'], params['eventName']];
        }),
        tap(([specName, specVersion, pallet]) => {
          this.runtime = `${specName}-${specVersion}`;
          this.pallet = pallet;
        })
      )),
      switchMap(([specName, specVersion, pallet, eventName]) =>
        this.rs.getRuntime(specName, specVersion).pipe(
          takeUntil(this.destroyer),
          map(runtime => [runtime as pst.Runtime, pallet, eventName])
        )
      ),
      shareReplay(1)
    );

    this.event = runtimeObservable.pipe(
      tap(() => this.fetchEventStatus.next('loading')),
      switchMap(([runtime, pallet, eventName]) => {
        const subject: Subject<pst.RuntimeEvent | null> = new Subject();
        if (runtime) {
          this.rs.getRuntimeEvents(runtime.specName, runtime.specVersion).then(
            (events) => {
              const matchedEvent: pst.RuntimeEvent = events.filter(e => e.pallet === pallet && e.eventName === eventName)[0];
              if (matchedEvent) {
                subject.next(matchedEvent);
                this.fetchEventStatus.next(null);
              } else {
                subject.error('Runtime event not found.');
              }
            },
            (e) => {
              subject.error(e);
            });
        }
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchEventStatus.next('error');
        return of(null);
      })
    )

    this.eventAttributes = runtimeObservable.pipe(
      tap(() => this.fetchEventAttributesStatus.next('loading')),
      switchMap(([runtime, pallet, eventName]) => {
        const subject: Subject<pst.RuntimeEventAttribute[]> = new Subject();
        this.pa.run().polkascan.state.getRuntimeEventAttributes(runtime.specName, runtime.specVersion, pallet, eventName).then(
          (response) => {
            if (Array.isArray(response.objects)) {
              subject.next(response.objects);
              this.fetchEventAttributesStatus.next(null);
            } else {
              subject.error('Invalid response.')
            }
          },
          (e) => {
            subject.error(e);
          });
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchEventAttributesStatus.next('error');
        return of([]);
      })
    )
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }

  trackEventAttribute(index: number, item: pst.RuntimeEventAttribute): number {
    return item.eventAttributeIdx;
  }
}
