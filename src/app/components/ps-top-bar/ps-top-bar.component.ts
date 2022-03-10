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
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewEncapsulation
} from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AppConfig } from '../../app-config';
import { VariablesService } from '../../services/variables.service';
import { PolkadaptService } from '../../services/polkadapt.service';
import { NetworkService } from '../../services/network.service';
import { MatDialog } from '@angular/material/dialog';
import { PsConnectionDialogComponent } from '../ps-connection-dialog/ps-connection-dialog.component';

@Component({
  templateUrl: 'ps-top-bar.component.html',
  selector: 'ps-top-bar',
  styleUrls: ['ps-top-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PsTopBarComponent implements OnInit, OnDestroy {
  networks: string[];
  networkLabel = new BehaviorSubject('');

  private destroyer = new Subject();

  constructor(private host: ElementRef,
              private renderer: Renderer2,
              private cd: ChangeDetectorRef,
              private router: Router,
              private config: AppConfig,
              public pa: PolkadaptService,
              public ns: NetworkService,
              public vars: VariablesService,
              public dialog: MatDialog) {
  }

  ngOnInit(): void {
    this.networks = Object.keys(this.config.networks);
    this.vars.network
      .pipe(
        takeUntil(this.destroyer),
        distinctUntilChanged()
      )
      .subscribe((network) => {
        if (network) {
          this.networkLabel.next('Network');
        } else {
          this.networkLabel.next(network);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
  }

  setNetwork(network: string): void {
    this.router.navigateByUrl(`/${network}`);
  }

  openConnectionDialog(): void {
    this.dialog.open(PsConnectionDialogComponent, {
      width: '600px'
    });
  }
}

