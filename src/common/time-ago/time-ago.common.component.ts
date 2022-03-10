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
  Input,
  OnChanges, OnDestroy, OnInit,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;

@Component({
  selector: 'time-ago',
  template: `
    <ng-container [ngSwitch]="!!ago">
      <ng-container *ngSwitchCase="true">
        {{ago}}
      </ng-container>
      <ng-container *ngSwitchDefault>
        <ng-container *ngIf="value">
            {{ value | date : 'dd-MM-yyyy HH:mm:ss' }}
        </ng-container>
      </ng-container>
    </ng-container>
  `,
  styles: [`
    balance {
      white-space: nowrap;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeAgoCommonComponent implements OnInit, OnChanges, OnDestroy {
  @Input() value: Date | string | number | null | undefined = null;
  ago: string;
  interval: number | undefined;
  delay: number | undefined;
  difference = -1;

  constructor(private cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    if (this.value) {
      this.initDifference(this.value);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.value) {
      this.initDifference(changes.value.currentValue, changes.value.previousValue);
    }
  }

  ngOnDestroy(): void {
    if (this.delay) {
      clearTimeout(this.delay);
    }
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  initDifference(currentValue: any, previousValue?: any): void {
    const today = new Date().getTime();
    let date: Date;
    this.difference = -1;

    if (this.delay) {
      clearTimeout(this.delay);
    }
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    if (currentValue && currentValue !== previousValue) {
      date = new Date(currentValue);

      if (Number.isNaN(date.valueOf())) {
        date = new Date(parseInt(currentValue, 10));
      }

      if (Number.isNaN(date.valueOf())) {
        this.ago = '';
        this.cd.markForCheck();
        return;
      }

      const diff: number = today - date.getTime();
      this.difference = Math.ceil(diff / 1000);

      this.delay = window.setTimeout(() => {
        this.interval = window.setInterval(() => {
          this.difference++;
          this.setAgo();
        }, 1000);
      }, 1000 - today % 1000);
    }

    this.setAgo();
    this.cd.markForCheck();
  }

  setAgo(): void {
    const prev = this.ago;
    if (this.difference >= WEEK) {
      this.ago = '';
    } else if (this.difference >= DAY) {
      this.ago = `${Math.floor(this.difference / DAY)} days ago`;
    } else if (this.difference >= HOUR) {
      this.ago = `${Math.floor(this.difference / HOUR)} hrs ago`;
    } else if (this.difference >= MINUTE) {
      this.ago = `${Math.floor(this.difference / MINUTE)} mins ago`;
    } else if (this.difference >= 5) {
      this.ago = `${this.difference} secs ago`;
    } else if (this.difference >= 0) {
      this.ago = 'just now';
    } else {
      this.ago = '';
    }

    if (prev !== this.ago) {
      this.cd.markForCheck();
    }
  }
}
