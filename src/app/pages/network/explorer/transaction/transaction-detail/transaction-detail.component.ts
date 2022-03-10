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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { BehaviorSubject, Observable, of, Subject, tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { catchError, filter, first, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-transaction-detail',
  templateUrl: './transaction-detail.component.html',
  styleUrls: ['./transaction-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionDetailComponent implements OnInit, OnDestroy {
  transaction: Observable<pst.Extrinsic | null>;
  events: Observable<(pst.Event)[] | null>;
  callArguments: Observable<string | null>;
  networkProperties = this.ns.currentNetworkProperties;
  fetchTransactionStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  fetchEventsStatus: BehaviorSubject<any> = new BehaviorSubject(null);

  visibleColumns = ['eventId', 'pallet', 'event', 'details'];

  private destroyer: Subject<undefined> = new Subject();
  private onDestroyCalled = false;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
              private ns: NetworkService
  ) {
  }

  ngOnInit(): void {
    const observable = this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      // Network must be set.
      filter(network => !!network),
      // Only need to load once.
      first(),
      // Switch over to the route param from which we extract the extrinsic keys.
      switchMap(() => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => params['id'].split('-').map((v: string) => parseInt(v, 10)))
      )));

    this.transaction = observable.pipe(
      tap(() => this.fetchTransactionStatus.next('loading')),
      switchMap(([blockNr, extrinsicIdx]) => {
        const subject = new Subject<pst.Extrinsic>();
        this.pa.run().polkascan.chain.getExtrinsic(blockNr, extrinsicIdx).then(
          (transaction) => {
            subject.next(transaction)
            this.fetchTransactionStatus.next(null);
          },
          (e) => {
            subject.error(e);
          })
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchTransactionStatus.next('error');
        return of(null);
      })
    )

    this.callArguments = this.transaction.pipe(
      map((transaction) => {
        return transaction && transaction.callArguments || null;
      })
    )

    this.events = observable.pipe(
      tap(() => this.fetchEventsStatus.next('loading')),
      switchMap(([blockNr, extrinsicIdx]) => {
        const subject = new Subject<pst.Event[]>();
        this.pa.run().polkascan.chain.getEvents({blockNumber: blockNr, extrinsicIdx: extrinsicIdx}).then(
          (events) => {
            if (events.objects) {
              subject.next(events.objects);
              this.fetchEventsStatus.next(null)
            } else {
              subject.error('Error parsing events array.');
            }
          },
          (e) => {
            subject.error(e);
          }
        )
        return subject.pipe(takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchEventsStatus.next('error');
        return of(null);
      })
    );
  }

  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }

  trackEvent(i: any, event: pst.Event): string {
    return `${event.blockNumber}-${event.eventIdx}`;
  }
}





