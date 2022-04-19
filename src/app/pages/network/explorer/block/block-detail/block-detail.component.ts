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
import { ActivatedRoute, Params } from '@angular/router';
import { NetworkService } from '../../../../../services/network.service';
import { BehaviorSubject, combineLatest, Observable, of, Subject, take } from 'rxjs';
import { Block } from '../../../../../services/block/block.harvester';
import { catchError, filter, first, map, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { asObservable } from '../../../../../../common/polkadapt-rxjs';
import { Header } from '@polkadot/types/interfaces';

@Component({
  selector: 'app-block-detail',
  templateUrl: './block-detail.component.html',
  styleUrls: ['./block-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockDetailComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();
  block = new BehaviorSubject<Block | null>(null);
  extrinsics = new BehaviorSubject<pst.Extrinsic[]>([]);
  events = new BehaviorSubject<pst.Event[]>([]);
  headNumber = new BehaviorSubject<number>(0);
  invalidHash = new BehaviorSubject<boolean>(false);

  constructor(
    private route: ActivatedRoute,
    private ns: NetworkService,
    private pa: PolkadaptService,
  ) {
  }

  ngOnInit(): void {
    // Wait for network to be set.
    this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      // Only continue if a network is set.
      filter(network => !!network),
      // We don't have to wait for further changes to network, so terminate after first.
      first(),
      // Switch to the route param, from which we get the block number.
      switchMap(() => this.route.params.pipe(
        takeUntil(this.destroyer),
      )),
      tap(() => {
        this.invalidHash.next(false);
      }),
      switchMap<Params, Observable<number>>(((params) => {
        const id = parseInt(params['idOrHash'], 10);
        if (String(id) === params['idOrHash']) {
          // Id is a blockNumber.
          return of(id);
        } else {
          return asObservable(this.pa.run().rpc.chain.getHeader, params['idOrHash']).pipe(
            take(1),
            map((header: Header) => header.number.toJSON() as number),
            catchError((err) => {
              this.invalidHash.next(true);
              throw new Error(`Block detail could not be fetched. The header maybe invalid or does not exist. ${err}`);
            })
          );
        }
      })),
      switchMap((blockNr) => combineLatest(
        // Update block when block data changes.
        this.ns.blockHarvester.blocks[blockNr].pipe(
          tap(block => {
            this.block.next(block);
            if (block.finalized) {
              this.pa.run().polkascan.chain.getExtrinsics({blockNumber: blockNr}, 100)
                .then((result: pst.ListResponse<pst.Extrinsic>) => {
                  this.extrinsics.next(result.objects);
                });
              this.pa.run().polkascan.chain.getEvents({blockNumber: blockNr}, 100)
                .then((result: pst.ListResponse<pst.Event>) => {
                  this.events.next(result.objects);
                });
            }
          })
        ),
        // Update this component's headNumber when blockHarvester's headNumber changes.
        this.ns.blockHarvester.headNumber.pipe(
          filter(nr => nr > 0),
          tap(nr => {
            this.headNumber.next(nr);
          })
        )
      ).pipe(
        takeUntil(this.destroyer),
        // Stop watching when this block is finalized.
        takeWhile(result => !result[0].finalized),
      ))
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }
}
