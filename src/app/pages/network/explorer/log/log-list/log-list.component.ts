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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { types as pst } from '@polkadapt/core';
import { PaginatedListComponentBase } from '../../../../../../common/list-base/paginated-list-component-base.directive';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-log-list',
  templateUrl: './log-list.component.html',
  styleUrls: ['./log-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogListComponent extends PaginatedListComponentBase<pst.Log> {
  listSize = 100;
  blockNumberIdentifier = 'blockNumber'
  visibleColumns = ['icon', 'logID', 'age', 'block', 'type', 'details'];
  logsNotAvailable = new BehaviorSubject<boolean>(false);

  constructor(private ns: NetworkService,
              private pa: PolkadaptService) {
    super(ns);
  }


  createGetItemsRequest(untilBlockNumber?: number): Observable<Observable<pst.Log>[]> {
    const filters = untilBlockNumber ? { blockRangeEnd: untilBlockNumber } : undefined;
    return this.pa.run(this.network).getLogs(filters, this.listSize).pipe(
      catchError((e) => {
        this.logsNotAvailable.next(true);
        return throwError(e)
      })
    );
  }


  createNewItemSubscription(): Observable<Observable<pst.Log>> {
    return this.pa.run(this.network).subscribeNewLog();
  }


  sortCompareFn(a: pst.Log, b: pst.Log): number {
    return b.blockNumber - a.blockNumber || b.logIdx - a.logIdx;
  }


  equalityCompareFn(a: pst.Log, b: pst.Log): boolean {
    return a.blockNumber === b.blockNumber && a.logIdx === b.logIdx;
  }


  trackFn(i: any, event: pst.Log): string {
    return `${event.blockNumber}-${event.logIdx}`;
  }
}
