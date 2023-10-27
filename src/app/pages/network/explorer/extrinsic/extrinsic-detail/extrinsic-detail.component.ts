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
import { BehaviorSubject, combineLatest, combineLatestWith, Observable, of, Subject, tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { catchError, filter, first, map, shareReplay, switchMap, takeUntil } from 'rxjs/operators';
import { types as pst } from '@polkadapt/core';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';


@Component({
  selector: 'app-extrinsic-detail',
  templateUrl: './extrinsic-detail.component.html',
  styleUrls: ['./extrinsic-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicDetailComponent implements OnInit, OnDestroy {
  extrinsic: Observable<pst.Extrinsic | null>;
  callArguments: Observable<any>;
  runtimeCallArguments: Observable<pst.RuntimeCallArgument[] | null>;
  events: Observable<pst.Event[]>;
  networkProperties = this.ns.currentNetworkProperties;
  fetchExtrinsicStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  fetchEventsStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  fetchAttributesStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  visibleColumns = ['eventId', 'pallet', 'event', 'details']

  private destroyer = new Subject<void>();
  private onDestroyCalled = false;

  constructor(private router: Router,
              private route: ActivatedRoute,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
              private ns: NetworkService,
              private rs: RuntimeService
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
        map(params => params['id'].length === 66 ? [params['id'], null] : params['id'].split('-').map((v: string) => parseInt(v, 10)))
      )),
      takeUntil(this.destroyer)
    )

    this.extrinsic = paramsObservable.pipe(
      tap({
        subscribe: () => this.fetchExtrinsicStatus.next('loading')
      }),
      switchMap(([blockNrOrHash, extrinsicIdx]) =>
        this.pa.run().getExtrinsic(blockNrOrHash, extrinsicIdx).pipe(
          switchMap((obs) => obs),
          map((inherent) => {
            if (inherent) {
              this.fetchExtrinsicStatus.next(null);
              return inherent;
            }
            throw new Error('Extrinsic not found.')
          })
        )
      ),
      catchError((e) => {
        this.fetchExtrinsicStatus.next('error');
        return of(null);
      }),
      takeUntil(this.destroyer)
    );

    this.events = this.extrinsic.pipe(
      tap({
        subscribe: () => this.fetchEventsStatus.next('loading')
      }),
      switchMap((extrinsic) => {
          if (!extrinsic) {
            return of([]);
          }
          return this.pa.run().getEvents({blockNumber: extrinsic.blockNumber, extrinsicIdx: extrinsic.extrinsicIdx}, 100)
            .pipe(
              switchMap((obs) => obs.length ? combineLatest(obs) : of([])),
              map((items) => {
                if (Array.isArray(items)) {
                  this.fetchEventsStatus.next(null)
                  return items;
                }
                throw new Error('Invalid response.');
              })
            )
        }
      ),
      catchError((e) => {
        this.fetchEventsStatus.next('error');
        return of([]);
      }),
      shareReplay({
        refCount: true,
        bufferSize: 1
      }),
      takeUntil(this.destroyer)
    );

    this.callArguments = this.extrinsic.pipe(
      tap({
        subscribe: () => {
          this.fetchAttributesStatus.next('loading');
        }
      }),
      switchMap((extrinsic: pst.Extrinsic | null) => {
        if (!extrinsic) {
          return of(null);
        }

        return of(extrinsic.callArguments as any || null);
      }),
      tap({
        next: (extrinsic: pst.Extrinsic | null) => {
          if (extrinsic && extrinsic.callArguments) {
            this.fetchAttributesStatus.next(null);
          }
        }
      }),
      catchError((e) => {
        this.fetchAttributesStatus.next('error');
        return of(null);
      })
    )

    this.runtimeCallArguments = this.extrinsic.pipe(
      combineLatestWith(this.networkProperties),
      switchMap(([extrinsic, props]) => {
        if (extrinsic && extrinsic.specVersion && extrinsic.callModule && extrinsic.callName) {
          return this.rs.getRuntime(this.ns.currentNetwork.value, extrinsic.specVersion).pipe(
            filter((r) => !!r),
            switchMap(() =>
              this.rs.getRuntimeCallArguments(
                this.ns.currentNetwork.value,
                extrinsic.specVersion!,
                extrinsic.callModule!,
                extrinsic.callName!
              )
            )
          )
        }
        return of(null);
      }),
      takeUntil(this.destroyer)
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
