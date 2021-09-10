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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-inherent-detail',
  templateUrl: './inherent-detail.component.html',
  styleUrls: ['./inherent-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InherentDetailComponent implements OnInit, OnDestroy {
  inherent: pst.Extrinsic;
  callArguments: any;
  events: pst.Event[];
  tokenDecimals: number;
  tokenSymbol: string;

  private destroyer: Subject<undefined> = new Subject();
  private onDestroyCalled = false;

  constructor(private route: ActivatedRoute,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
              private ns: NetworkService
  ) {
  }

  ngOnInit(): void {
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      // Network must be set.
      filter(network => !!network),
      // Only need to load once.
      first(),
      tap(() => {
        this.tokenDecimals = this.ns.tokenDecimals;
        this.tokenSymbol = this.ns.tokenSymbol;
      }),
      // Switch over to the route param from which we extract the inherent keys.
      switchMap(() => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => params.id.split('-').map((v: string) => parseInt(v, 10)))
      ))
    ).subscribe(async ([blockNr, extrinsicIdx]) => {
      const inherent: pst.Extrinsic =
        await this.pa.run().polkascan.chain.getExtrinsic(blockNr, extrinsicIdx);
      const eventsResponse: pst.ListResponse<pst.Event> =
        await this.pa.run().polkascan.chain.getEvents({blockNumber: blockNr});
      const events = eventsResponse.objects.filter(event => event.extrinsicIdx === extrinsicIdx);
      if (!this.onDestroyCalled) {
        this.inherent = inherent;
        this.events = events;
        this.callArguments = null;
        try {
          this.callArguments = JSON.parse(inherent.callArguments as string);
        } catch (e) {
          // TODO what to do?
        }
        this.cd.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
  }
}
