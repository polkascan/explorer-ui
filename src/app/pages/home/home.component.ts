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

import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AppConfig, NetworkConfig, NetworkSpecs } from '../../app-config';

type Parachains = {[paraChainSlug: string]: NetworkSpecs};

@Component({
  templateUrl: 'home.component.html',
  styleUrls: ['home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {
  groups: {[relayChainSlug: string] : {
    relayChain: NetworkSpecs;
    parachains: Parachains;
  }};
  others: NetworkConfig;

  constructor(private config: AppConfig) {
  }

  ngOnInit(): void {
    // Look for relay chains first.
    for (const network of Object.values(this.config.networks)) {
      if (network.relayChain && this.config.networks[network.relayChain] && (!this.groups || !this.groups[network.relayChain])) {
        if (!this.groups) {
          this.groups = {};
        }
        this.groups[network.relayChain] = {
          relayChain: this.config.networks[network.relayChain],
          parachains: {}
        }
      }
    }
    // Now process each network.
    for (const [slug, network] of Object.entries(this.config.networks)) {
      if (network.relayChain) {
        this.groups[network.relayChain].parachains[slug] = network;
      } else if (!this.groups[slug]) {
        if (!this.others) {
          this.others = {};
        }
        this.others[slug] = network;
      }
    }
  }

  returnZero() {
    return 0;
  }
}
