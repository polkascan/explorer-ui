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
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AppConfig } from '../../app-config';
import { VariablesService } from '../../services/variables.service';

@Component({
  templateUrl: 'ps-top-bar.component.html',
  selector: 'ps-top-bar',
  styleUrls: ['ps-top-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PsTopBarComponent implements OnInit, OnDestroy {
  networks: string[];
  networkControl: FormControl = new FormControl('');
  languageControl: FormControl = new FormControl('');

  private destroyer = new Subject();

  constructor(private host: ElementRef,
              private renderer: Renderer2,
              private cd: ChangeDetectorRef,
              private router: Router,
              private config: AppConfig,
              public vars: VariablesService) {
  }

  ngOnInit(): void {
    this.networks = Object.keys(this.config.networks);

    this.networkControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroyer)
      )
      .subscribe((value) => {
        this.router.navigateByUrl(`/n/${value}`);
      });

    this.vars.network
      .pipe(
        takeUntil(this.destroyer),
        distinctUntilChanged()
      )
      .subscribe((network) => {
        if (network) {
          this.networkControl.setValue(network, {onlySelf: true, emitEvent: false});
        } else {
          this.networkControl.reset('', {onlySelf: true, emitEvent: false});
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
  }
}

