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
import { BehaviorSubject, combineLatest, Observable, of, Subject, tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { catchError, filter, first, map, shareReplay, switchMap, takeUntil } from 'rxjs/operators';
import { types as pst } from '@polkadapt/core';


@Component({
  selector: 'app-extrinsic-detail',
  templateUrl: './extrinsic-detail.component.html',
  styleUrls: ['./extrinsic-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicDetailComponent implements OnInit, OnDestroy {
  extrinsic: Observable<pst.Extrinsic | null>;
  callArguments: Observable<string>;
  events: Observable<pst.Event[]>;
  networkProperties = this.ns.currentNetworkProperties;
  fetchExtrinsicStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  fetchEventsStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  visibleColumns = ['eventId', 'pallet', 'event', 'details']

  private destroyer = new Subject<void>();
  private onDestroyCalled = false;

  constructor(private router: Router,
              private route: ActivatedRoute,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
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

    this.extrinsic = paramsObservable.pipe(
      tap(() => this.fetchExtrinsicStatus.next('loading')),
      switchMap(([blockNr, extrinsicIdx]) => {
        const subject = new Subject<pst.Extrinsic>();
        (this.pa.run().getExtrinsic(blockNr, extrinsicIdx) as unknown as Observable<Observable<pst.Extrinsic>>).pipe(  // TODO FIX TYPING
          switchMap((obs) => obs),
          takeUntil(this.destroyer)
        ).subscribe({
          next: (inherent) => {
            if (inherent) {
              subject.next(inherent);
              this.fetchExtrinsicStatus.next(null);
            } else {
              subject.error('Extrinsic not found.');
            }
          }
          ,
          error: (e) => {
            subject.error(e);
          }
        });
        return subject.pipe(takeUntil(this.destroyer))
      }),
      catchError((e) => {
        this.fetchExtrinsicStatus.next('error');
        return of(null);
      })
    );

    this.events = paramsObservable.pipe(
      tap(() => this.fetchEventsStatus.next('loading')),
      switchMap(([blockNr, extrinsicIdx]) => {
        const subject = new Subject<pst.Event[]>();
        (this.pa.run()
          .getEvents({blockNumber: blockNr, extrinsicIdx: extrinsicIdx}, 100) as unknown as Observable<Observable<pst.Event>[]>) // TODO FIX TYPING
          .pipe(
          switchMap((obs) => obs.length ? combineLatest(obs) : of([])),
          takeUntil(this.destroyer)
        ).subscribe({
          next: (items) => {
            if (Array.isArray(items)) {
              subject.next(items);
              this.fetchEventsStatus.next(null)
            } else {
              subject.error('Invalid response.')
            }
          }
          ,
          error: (e) => {
            subject.error(e)
          }
        });
        return subject.pipe(shareReplay(1), takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchEventsStatus.next('error');
        return of([]);
      })
    );

    this.callArguments = this.extrinsic.pipe(
      map((extrinsic) => {
        if (extrinsic) {
          return extrinsic.callArguments as string;
        } else {
          return '';
        }
      }),
      catchError((e) => {
        return of('');
      })
    )
  }

  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackEvent(i: any, event: pst.Event): string {
    return `${event.blockNumber}-${event.eventIdx}`;
  }
}
