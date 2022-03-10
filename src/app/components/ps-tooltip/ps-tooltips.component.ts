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
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewEncapsulation
} from '@angular/core';
import { TooltipsService } from '../../services/tooltips.service';
import { Subscription } from 'rxjs';

@Component({
  template: '',
  selector: 'ps-tooltips',
  styleUrls: ['ps-tooltips.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PsTooltipsComponent implements OnInit, OnDestroy {
  private subscription: Subscription;

  constructor(private notificationService: TooltipsService,
              private hostElm: ElementRef,
              private renderer: Renderer2) {
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngOnInit(): void {
    this.notificationService.notify.subscribe((text: string) => {
      const element = this.renderer.createElement('div');
      this.renderer.addClass(element, 'ps-tooltip-item')
      this.renderer.setProperty(element, 'innerHTML', text);

      this.renderer.appendChild(this.hostElm.nativeElement, element);
      window.setTimeout(() => {
        this.renderer.removeChild(this.hostElm, element);
      }, 5000);
    });
  }
}
