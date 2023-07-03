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
import { BehaviorSubject, combineLatest, Observable, of, Subject, tap } from 'rxjs';
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
  runtimeEventAttributes: Observable<pst.RuntimeEventAttribute[] | null>
  networkProperties = this.ns.currentNetworkProperties;
  fetchEventStatus: BehaviorSubject<any> = new BehaviorSubject(null);

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
      takeUntil(this.destroyer),
      // Network must be set.
      filter(network => !!network),
      // Only need to load once.
      first(),
      // Switch over to the route param from which we extract the extrinsic keys.
      switchMap(() => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => params['id'].split('-').map((v: string) => parseInt(v, 10)))
      ))
    )

    this.event = paramsObservable.pipe(
      tap(() => this.fetchEventStatus.next('loading')),
      switchMap(([blockNr, eventIdx]) => {
        const subject = new BehaviorSubject<pst.Event | null>(null);
        this.pa.run().getEvent(blockNr, eventIdx).pipe(
          takeUntil(this.destroyer),
          switchMap((obs) => obs),
        ).subscribe({
          next: (event) => {
            if (event) {
              subject.next(event);
              this.fetchEventStatus.next(null);
            } else {
              subject.error('Event not found.');
            }
          },
          error: (e) => {
            console.error(e);
            subject.error(e);
          }
        });
        return subject.pipe(takeUntil(this.destroyer))
      }),
      catchError((e) => {
        this.fetchEventStatus.next('error');
        return of(null);
      })
    );

    this.runtimeEventAttributes = this.event.pipe(
      switchMap((event) => {
        if (event && event.specName && event.specVersion && event.eventModule && event.eventName) {
          const subject: Subject<pst.RuntimeEventAttribute[]> = new Subject();

          this.rs.getRuntimeEventAttributes(this.ns.currentNetwork.value, event.specVersion, event.eventModule, event.eventName).pipe(
            takeUntil(this.destroyer)
          ).subscribe({
            next: (items) => {
              if (Array.isArray(items)) {
                subject.next(items);
              }
            },
            error: (e) => {
              console.error(e);
              subject.error(e);
            }
          });
          return subject.pipe(takeUntil(this.destroyer));
        }

        return of(null);
      }),
      catchError((e) => {
        return of(null);
      })
    );
  }

  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
  }
}
