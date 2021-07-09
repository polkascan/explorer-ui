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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { ListResponse } from '../../../../../../../polkadapt/projects/polkascan/src/lib/polkascan.types';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { ListComponentBase } from '../../../../../components/list-base/list.component.base';


@Component({
  selector: 'app-extrinsic-list',
  templateUrl: './extrinsic-list.component.html',
  styleUrls: ['./extrinsic-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicListComponent extends ListComponentBase implements OnInit, OnDestroy {
  extrinsics = new BehaviorSubject<pst.Extrinsic[]>([]);

  signedControl: FormControl = new FormControl(true);
  filtersFormGroup: FormGroup = new FormGroup({
    signed: this.signedControl,
  });

  nextPage: string | null = null;
  columnsToDisplay = ['icon', 'extrinsicID', 'block', 'pallet', 'call', 'signed', 'details'];

  private unsubscribeNewExtrinsicFn: null | (() => void);

  constructor(private ns: NetworkService,
              private pa: PolkadaptService) {
    super(ns);
  }

  ngOnInit(): void {
    this.filtersFormGroup.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe((values) => {
        this.unsubscribeNewExtrinsic();
        this.extrinsics.next([]);

        this.subscribeNewExtrinsic();
        this.getExtrinsics();
      });
  }


  onNetworkChange(network: string): void {
    this.unsubscribeNewExtrinsic();

    if (network) {
      this.subscribeNewExtrinsic();
      this.getExtrinsics();
    }
  }


  ngOnDestroy(): void {
    super.ngOnDestroy();
    this.unsubscribeNewExtrinsic();
  }


  async subscribeNewExtrinsic(): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      this.unsubscribeNewExtrinsic();
      return;
    }

    const filters: any = {};
    if (this.signedControl.value === true) {
      // If true, singed only is being set. There is no need for a not signed check.
      filters.signed = 1;
    }

    try {
      this.unsubscribeNewExtrinsicFn =
        await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.subscribeNewExtrinsic(
          filters,
          (extrinsic: pst.Extrinsic) => {
            if (!this.onDestroyCalled) {
              const extrinsics = [...this.extrinsics.value];
              if (!extrinsics.some((e) =>
                e.blockNumber === extrinsic.blockNumber && e.extrinsicIdx === extrinsic.extrinsicIdx
              )) {
                extrinsics.splice(0, 0, extrinsic);
                extrinsics.sort((a, b) =>
                  b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx
                );
                this.extrinsics.next(extrinsics);
              }
            } else {
              // If still listening but component is already destroyed.
              this.unsubscribeNewExtrinsic();
            }
          });
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  unsubscribeNewExtrinsic(): void {
    if (this.unsubscribeNewExtrinsicFn) {
      this.unsubscribeNewExtrinsicFn();
      this.unsubscribeNewExtrinsicFn = null;
    }
  }


  async getExtrinsics(pageKey?: string): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      return;
    }

    this.loading++;

    const filters: any = {};
    if (this.signedControl.value === true) {
      // If true, singed only is being set. There is no need for a not signed check.
      filters.signed = 1;
    }

    try {
      const response: ListResponse<pst.Extrinsic> =
        await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.getExtrinsics(filters, 100, pageKey);
      if (!this.onDestroyCalled) {
        const extrinsics = [...this.extrinsics.value];
        response.objects
          .filter((extrinsic) => {
            return !extrinsics.some((e) =>
              e.blockNumber === extrinsic.blockNumber && e.extrinsicIdx === extrinsic.extrinsicIdx
            );
          })
          .forEach((extrinsic) => {
            extrinsics.push(extrinsic);
          });

        this.nextPage = response.pageInfo ? response.pageInfo.pageNext || null : null;

        extrinsics.sort((a, b) =>
          b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx
        );
        this.extrinsics.next(extrinsics);
        this.loading--;
      }
    } catch (e) {
      this.loading--;
      console.error(e);
      // Ignore for now...
    }
  }


  async getNextPage(): Promise<void> {
    if (this.nextPage) {
      this.getExtrinsics(this.nextPage);
    }
  }


  track(i: any, extrinsic: pst.Extrinsic): string {
    return `${extrinsic.blockNumber}-${extrinsic.extrinsicIdx}`;
  }
}
