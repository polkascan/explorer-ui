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

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-account-list',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountListComponent implements OnInit {

  constructor(private router: Router,
              private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    let explorerRoute: ActivatedRoute | undefined;
    const network = this.route.snapshot.paramMap && this.route.snapshot.paramMap.get('network');
    if (network) {
      explorerRoute = this.route.pathFromRoot.find(routePart => routePart.snapshot.url[0]?.path === network);
    }

    if (explorerRoute) {
      this.router.navigate(['.'], {relativeTo: explorerRoute});
    }
  }
}
