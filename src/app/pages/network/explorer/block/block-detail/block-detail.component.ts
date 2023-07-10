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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { NetworkService } from '../../../../../services/network.service';
import { BehaviorSubject, combineLatest, Observable, of, Subject, take, timer } from 'rxjs';
import { Block } from '../../../../../services/block/block.harvester';
import { catchError, filter, first, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { types as pst } from '@polkadapt/core';

@Component({
  selector: 'app-block-detail',
  templateUrl: './block-detail.component.html',
  styleUrls: ['./block-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockDetailComponent implements OnInit, OnDestroy {
  private destroyer = new Subject<void>();
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
      switchMap<Params, Observable<pst.Header>>(((params) => {
        const idOrHash = params['idOrHash'];
        return this.pa.run({observableResults: false}).getHeader(idOrHash).pipe(
          take(1)
        );
      })),
      catchError((err) => {
        this.invalidHash.next(true);
        throw new Error(`Block detail could not be fetched. The header maybe invalid or does not exist. ${err}`);
      }),
      switchMap((header) => combineLatest([
        // Update block when block data changes.
        this.ns.blockHarvester.blocks[header.number].pipe(
          tap({
            next: (block) => {
              this.block.next(block);
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
      ]).pipe(
        takeUntil(this.destroyer),
        // Stop watching when this block is finalized.
        takeWhile(result => !result[0].finalized),
      ))
    ).subscribe();


    this.block.pipe(
      filter((block): block is Block => Boolean(block && block.finalized === true)),
      take(1)
    ).subscribe({
      next: (block) => {
        this.extrinsics.next([]);
        if (block.countExtrinsics) {
          timer(0, 1000).pipe(
            take(10),  // Try it for 10 seconds.
            switchMap(() => this.pa.run().getExtrinsics({
              blockNumber: block.number,
              blockRangeBegin: block.number,
              blockRangeEnd: block.number
            }, 300)),
            takeUntil(this.destroyer),
            takeWhile((extrinsics) => block.countExtrinsics! > extrinsics.length, true),
            switchMap((obs) => obs.length ? combineLatest(obs) : of([]))
          ).subscribe({
            next: (extrinsics: pst.Extrinsic[]) => this.extrinsics.next(extrinsics)
          });
        }

        this.events.next([]);
        if (block.countEvents) {
          timer(0, 1000).pipe(
            take(10),  // Try it for 10 seconds.
            switchMap(() => this.pa.run().getEvents({
              blockNumber: block.number,
              blockRangeBegin: block.number,
              blockRangeEnd: block.number
            }, 300)),
            takeUntil(this.destroyer),
            takeWhile((events) => block.countEvents! > events.length, true),
            switchMap((obs) => obs.length ? combineLatest(obs) : of([]))
          ).subscribe({
            next: (events: pst.Event[]) => this.events.next(events)
          });
        }
      }
    })
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
  }
}
