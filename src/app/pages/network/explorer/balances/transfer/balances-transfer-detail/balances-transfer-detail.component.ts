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
import { ActivatedRoute } from '@angular/router';
import { PolkadaptService } from '../../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../../services/network.service';
import { catchError, filter, first, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-balances-transfer-detail',
  templateUrl: './balances-transfer-detail.component.html',
  styleUrls: ['./balances-transfer-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalancesTransferDetailComponent implements OnInit, OnDestroy {
  transfer: Observable<pst.Transfer | null>;
  networkProperties = this.ns.currentNetworkProperties;
  fetchTransferStatus: BehaviorSubject<any> = new BehaviorSubject(null);

  private destroyer: Subject<undefined> = new Subject();


  constructor(private route: ActivatedRoute,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
              private ns: NetworkService) {
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

    this.transfer = paramsObservable.pipe(
      tap(() => this.fetchTransferStatus.next('loading')),
      switchMap(([blockNr, eventIdx]) => {
        const subject = new Subject<pst.Transfer>();
        this.pa.run().polkascan.chain.getTransfer(blockNr, eventIdx).then(
          (transfer) => {
            if (transfer) {
              subject.next(transfer);
              this.fetchTransferStatus.next(null);
            } else {
              subject.error('Event not found.');
            }
          },
          (e) => {
            subject.error(e);
          }
        );
        return subject.pipe(takeUntil(this.destroyer))
      }),
      catchError((e) => {
        this.fetchTransferStatus.next('error');
        return of(null);
      })
    );
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }
}
