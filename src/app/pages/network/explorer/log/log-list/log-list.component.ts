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

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { takeUntil } from 'rxjs/operators';
import { BehaviorSubject, Subject } from 'rxjs';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';

@Component({
  selector: 'app-log-list',
  templateUrl: './log-list.component.html',
  styleUrls: ['./log-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogListComponent implements OnInit {
  logs = new BehaviorSubject<pst.Log[]>([]);

  columnsToDisplay = ['icon', 'logID', 'block', 'type', 'details'];

  private network: string;
  private unsubscribeNewLogFn: null | (() => void);
  private destroyer: Subject<undefined> = new Subject();

  constructor(private ns: NetworkService,
              private pa: PolkadaptService) {
  }

  ngOnInit(): void {
    this.ns.currentNetwork
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe((network: string) => {
        this.network = network;
        this.unsubscribeNewLog();

        if (network) {
          this.subscribeNewLog();
          this.getLogs();
        }
      });
  }


  async subscribeNewLog(): Promise<void> {
    try {
      this.unsubscribeNewLogFn = await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.subscribeNewLog(
        (log: pst.Log) => {
          const logs = [...this.logs.value]
          if (!logs.some((l) => l.blockNumber === log.blockNumber && l.logIdx === log.logIdx)) {
            logs.splice(0, 0, log);
            logs.sort((a, b) => b.blockNumber - a.blockNumber || b.logIdx - a.logIdx);
            this.logs.next(logs);
          }
        });
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  unsubscribeNewLog(): void {
    if (this.unsubscribeNewLogFn) {
      this.unsubscribeNewLogFn();
      this.unsubscribeNewLogFn = null;
    }
  }


  async getLogs(): Promise<void> {
    try {
      const response: pst.ListResponse<pst.Log> =
        await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.getLogs();

      const logs = [...this.logs.value];
      response.objects
        .filter((log) => {
          return !logs.some((l) => l.blockNumber === log.blockNumber && l.logIdx === log.logIdx);
        })
        .forEach((log) => {
          logs.push(log);
        });

      logs.sort((a, b) => b.blockNumber - a.blockNumber || b.logIdx - a.logIdx);
      this.logs.next(logs);
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  track(i: any, event: pst.Log): string {
    return `${event.blockNumber}-${event.logIdx}`;
  }
}



