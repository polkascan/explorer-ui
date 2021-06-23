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
import { FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import { debounceTime, filter, first, takeUntil } from 'rxjs/operators';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';


@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionListComponent implements OnInit, OnDestroy {
  transactions = new BehaviorSubject<pst.Extrinsic[]>([]);
  filters = new Map();

  palletControl: FormControl = new FormControl('');
  callNameControl: FormControl = new FormControl('');
  filtersFormGroup: FormGroup = new FormGroup({
    eventModule: this.palletControl,
    callName: this.callNameControl
  });

  columnsToDisplay = ['icon', 'transactionID', 'from', 'block', 'pallet', 'call', 'success', 'details'];

  private network: string;
  private unsubscribeNewTransactionFn: null | (() => void);
  private destroyer: Subject<undefined> = new Subject();
  private onDestroyCalled = false;

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private rs: RuntimeService,
              private cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.filtersFormGroup.valueChanges
      .pipe(
        debounceTime(100),  // Also to make sure eventControl reset has taken place
        takeUntil(this.destroyer)
      )
      .subscribe((values) => {
        this.unsubscribeNewTransaction();
        this.transactions.next([]);

        this.subscribeNewTransaction();
        this.getTransactions();
      });

    this.palletControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.callNameControl.reset('', {emitEvent: false});
      });

    this.ns.currentNetwork
      .pipe(
        debounceTime(100),
        takeUntil(this.destroyer)
      )
      .subscribe((network: string) => {
        this.filtersFormGroup.reset({
          eventModule: '',
          callName: ''
        }, {emitEvent: false});

        this.network = network;
        this.unsubscribeNewTransaction();

        if (network) {
          this.subscribeNewTransaction();
          this.getTransactions();

          this.rs.getRuntime(network)
            .pipe(
              takeUntil(this.destroyer),
              filter((r) => r !== null),
              first()
            )
            .subscribe(async (runtime): Promise<void> => {
                const pallets = await this.rs.getRuntimePallets(network, (runtime as pst.Runtime).specVersion);
                const calls = await this.rs.getRuntimeCalls(network, (runtime as pst.Runtime).specVersion);

                if (pallets) {
                  pallets.forEach((pallet) => {
                    this.filters.set(pallet, calls ? calls.filter((call) => pallet.pallet === call.pallet).sort() : []);
                  });
                  this.cd.markForCheck();
                }
            });
        }
      });
  }


  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
    this.unsubscribeNewTransaction();
  }


  async subscribeNewTransaction(): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      this.unsubscribeNewTransaction();
      return;
    }

    const filters: any = {
      signed: 1
    };

    if (this.palletControl.value) {
      filters.callModule = this.palletControl.value;
    }
    if (this.callNameControl.value) {
      filters.callName = this.callNameControl.value;
    }

    try {
      this.unsubscribeNewTransactionFn =
        await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.subscribeNewExtrinsic(
          filters,
          (extrinsic: pst.Extrinsic) => {
            if (!this.onDestroyCalled) {
              const transactions = [...this.transactions.value]
              if (!transactions.some((e) =>
                e.blockNumber === extrinsic.blockNumber && e.extrinsicIdx === extrinsic.extrinsicIdx
              )) {
                transactions.splice(0, 0, extrinsic);
                transactions.sort((a, b) =>
                  b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx
                );
                this.transactions.next(transactions);
              }
            } else {
              // If still listening but component is already destroyed.
              this.unsubscribeNewTransaction();
            }
          });
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  unsubscribeNewTransaction(): void {
    if (this.unsubscribeNewTransactionFn) {
      this.unsubscribeNewTransactionFn();
      this.unsubscribeNewTransactionFn = null;
    }
  }


  async getTransactions(): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      return;
    }

    const filters: any = {
      signed: 1
    };

    if (this.palletControl.value) {
      filters.callModule = this.palletControl.value;
    }
    if (this.callNameControl.value) {
      filters.callName = this.callNameControl.value;
    }

    try {
      const response: pst.ListResponse<pst.Extrinsic> =
        await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.getExtrinsics(filters, 100);
      if (!this.onDestroyCalled) {
        const transactions = [...this.transactions.value];
        response.objects
          .filter((extrinsic: pst.Extrinsic) => {
            return !transactions.some((e) =>
              e.blockNumber === extrinsic.blockNumber && e.extrinsicIdx === extrinsic.extrinsicIdx
            );
          })
          .forEach((extrinsic: pst.Extrinsic) => {
            transactions.push(extrinsic);
          });

        transactions.sort((a, b) =>
          b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx
        );
        this.transactions.next(transactions);
      }
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  track(i: any, transaction: pst.Extrinsic): string {
    return `${transaction.blockNumber}-${transaction.extrinsicIdx}`;
  }
}
