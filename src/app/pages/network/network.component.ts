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
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { NetworkService } from '../../services/network.service';
import { Subject } from 'rxjs';
import { VariablesService } from '../../services/variables.service';

@Component({
  selector: 'app-network',
  templateUrl: './network.component.html',
  styleUrls: ['./network.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkComponent implements OnInit, OnDestroy {
  private destroyer: Subject<undefined> = new Subject();

  constructor(private route: ActivatedRoute,
              private ns: NetworkService,
              public vars: VariablesService) {
  }

  ngOnInit(): void {
    // Change network when param changes in route.
    this.route.params
      .pipe(
        takeUntil(this.destroyer),
        map((p) => p['network']),
        distinctUntilChanged()
      )
      .subscribe((network: string) => {
        const noAwait = this.ns.setNetwork(network);
        this.vars.network.next(network);
        this.vars.blockNumber.next(0);
      });

    // Pass the last loaded number to the variables service, so other parts of the application can pick it up.
    this.ns.currentNetwork.pipe(
      // Keep it running until this component is destroyed.
      takeUntil(this.destroyer),
      // Only continue if a network is set.
      filter(network => !!network),
      // Only continue if the network value has changed.
      distinctUntilChanged(),
      // Watch for new loaded block numbers from the Substrate node.
      switchMap(() => this.ns.blockHarvester.loadedNumber.pipe(
        takeUntil(this.destroyer),
        // Only continue if new block number is larger than 0.
        filter(nr => nr > 0)
      ))
    ).subscribe(nr => {
      this.vars.blockNumber.next(nr);
    })
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
    this.ns.destroy();
    this.vars.network.next('none');
    this.vars.blockNumber.next(0);
  }
}
