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

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PolkadaptService } from '../../services/polkadapt.service';
import { MatDialogRef } from '@angular/material/dialog';
import { VariablesService } from '../../services/variables.service';
import { NetworkService } from '../../services/network.service';

@Component({
  templateUrl: 'ps-connection-dialog.component.html',
  selector: 'ps-connection-dialog',
  styleUrls: ['ps-connection-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PsConnectionDialogComponent implements OnInit, OnDestroy {
  substrateRpcUrlForm = new FormGroup({
    url: new FormControl('')
  });
  explorerWsUrlForm = new FormGroup({
    url: new FormControl('')
  });

  private destroyer = new Subject();

  constructor(
    public dialogRef: MatDialogRef<PsConnectionDialogComponent>,
    public pa: PolkadaptService,
    public ns: NetworkService,
    public vars: VariablesService
  ) {}

  ngOnInit(): void {
    this.pa.substrateRpcUrl.pipe(takeUntil(this.destroyer)).subscribe(url => {
      this.substrateRpcUrlForm.setValue({url});
    });

    this.pa.explorerWsUrl.pipe(takeUntil(this.destroyer)).subscribe(url => {
      this.explorerWsUrlForm.setValue({url});
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
  }

  async submitSubstrateRpcUrl(): Promise<void> {
    await this.pa.setSubstrateRpcUrl(this.substrateRpcUrlForm.value.url);
  }

  async submitExplorerWsUrl(): Promise<void> {
    await this.pa.setExplorerWsUrl(this.explorerWsUrlForm.value.url);
  }
}
