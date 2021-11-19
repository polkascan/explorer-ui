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
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';


@Component({
  selector: 'app-extrinsic-detail',
  templateUrl: './extrinsic-detail.component.html',
  styleUrls: ['./extrinsic-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicDetailComponent implements OnInit, OnDestroy {
  extrinsic: pst.Extrinsic;
  callArguments: any;
  events: pst.Event[];
  networkProperties = this.ns.currentNetworkProperties;

  visibleColumns = ['eventId', 'pallet', 'event', 'details']

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
      // Switch over to the route param from which we extract the extrinsic keys.
      switchMap(() => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => params['id'].split('-').map((v: string) => parseInt(v, 10)))
      ))
    ).subscribe(async ([blockNr, extrinsicIdx]) => {
      const extrinsic: pst.Extrinsic =
        await this.pa.run().polkascan.chain.getExtrinsic(blockNr, extrinsicIdx);
      const eventsResponse: pst.ListResponse<pst.Event> =
        await this.pa.run().polkascan.chain.getEvents({blockNumber: blockNr});
      const events = eventsResponse.objects.filter(event => event.extrinsicIdx === extrinsicIdx);
      if (!this.onDestroyCalled) {
        this.extrinsic = extrinsic;
        this.events = events;
        this.callArguments = null;
        try {
          this.callArguments = JSON.parse(extrinsic.callArguments as string);
        } catch (e) {
          // TODO what to do?
        }
        this.cd.markForCheck();
      }
    });
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
