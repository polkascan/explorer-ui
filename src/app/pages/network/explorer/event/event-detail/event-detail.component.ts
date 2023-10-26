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
import { ActivatedRoute } from '@angular/router';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { catchError, filter, first, map, switchMap, takeUntil } from 'rxjs/operators';
import { BehaviorSubject, Observable, of, Subject, tap } from 'rxjs';
import { types as pst } from '@polkadapt/core';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';

@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventDetailComponent implements OnInit, OnDestroy {
  event: Observable<pst.Event | null>;
  eventAttributes: Observable<any[] | string | null>;
  runtimeEventAttributes: Observable<pst.RuntimeEventAttribute[] | null>
  networkProperties = this.ns.currentNetworkProperties;
  fetchEventStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  fetchEventAttributesStatus: BehaviorSubject<any> = new BehaviorSubject(null);

  private destroyer = new Subject<void>();
  private onDestroyCalled = false;

  constructor(private route: ActivatedRoute,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
              private rs: RuntimeService,
              private ns: NetworkService
  ) {
  }

  ngOnInit(): void {
    const paramsObservable = this.ns.currentNetwork.pipe(
      // Network must be set.
      filter(network => !!network),
      // Only need to load once.
      first(),
      // Switch over to the route param from which we extract the extrinsic keys.
      switchMap(() => this.route.params.pipe(
        map(params => params['id'].split('-').map((v: string) => parseInt(v, 10)))
      )),
      takeUntil(this.destroyer)
    )

    this.event = paramsObservable.pipe(
      tap({
        subscribe: () => this.fetchEventStatus.next('loading')
      }),
      switchMap(([blockNr, eventIdx]) =>
        this.pa.run().getEvent(blockNr, eventIdx).pipe(
          switchMap((obs) => obs),
          map((event) => {
            if (event) {
              this.fetchEventStatus.next(null);
              return event;
            }
            throw new Error('Event not found.')
          })
        )
      ),
      catchError((e) => {
        this.fetchEventStatus.next('error');
        return of(null);
      }),
      takeUntil(this.destroyer)
    );

    this.eventAttributes = this.event.pipe(
      tap({
        subscribe: () => this.fetchEventAttributesStatus.next('loading')
      }),
      map((event) => {
        let parsed: any | null = event && event.attributes || null;
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        } else if (parsed) {
          parsed = JSON.parse(JSON.stringify(parsed)); // make a copy.
        }
        return parsed;
      }),
      tap({
        next: () => this.fetchEventAttributesStatus.next(null),
        error: () => this.fetchEventAttributesStatus.next('error')
      })
    )

    this.runtimeEventAttributes = this.event.pipe(
      switchMap((event) => {
        if (event && event.specVersion && event.eventModule && event.eventName) {
          return this.rs.getRuntime(this.ns.currentNetwork.value, event.specVersion).pipe(
            filter((r) => !!r),
            switchMap(() =>
              this.rs.getRuntimeEventAttributes(this.ns.currentNetwork.value, event.specVersion as number, event.eventModule as string, event.eventName as string).pipe(
                map((items) => Array.isArray(items) ? items : null)
              )
            )
          )
        }

        return of(null);
      }),
      catchError((e) => {
        return of(null);
      }),
      takeUntil(this.destroyer),
    );
  }

  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
  }
}
