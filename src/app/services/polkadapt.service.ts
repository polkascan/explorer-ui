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

import { Injectable } from '@angular/core';
import { AdapterBase, Polkadapt, PolkadaptRunConfig } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import * as polkascan from '@polkadapt/polkascan';
import * as coingecko from '@polkadapt/coingecko';
import { AppConfig } from '../app-config';

export type AugmentedApi = substrate.Api & polkascan.Api & coingecko.Api;

@Injectable({providedIn: 'root'})
export class PolkadaptService {
  polkadapt: Polkadapt<AugmentedApi>;
  run: (config?: PolkadaptRunConfig | string) => AugmentedApi;
  availableAdapters: { [network: string]: { [source: string]: AdapterBase } } = {};

  constructor(private config: AppConfig) {
    this.setAvailableAdapters();
    this.polkadapt = new Polkadapt();
    this.run = this.polkadapt.run.bind(this.polkadapt);
  }

  setAvailableAdapters(): void {
    for (const network of Object.keys(this.config.networks)) {
      this.availableAdapters[network] = {
        substrateRPC: new substrate.Adapter({
          chain: network,
          providerURL: this.config.networks[network].substrateRpcUrl
        }),
        polkascanAPI: new polkascan.Adapter({
          chain: network,
          apiEndpoint: this.config.networks[network].polkascanApiUrl,
          wsEndpoint: this.config.networks[network].polkascanWsUrl
        }),
        coingeckoAPI: new coingecko.Adapter({
          chain: network,
          apiEndpoint: 'https://api.coingecko.com/api/v3/'
        })
      };
    }
  }

  async setNetwork(network: string): Promise<boolean> {
    if (this.polkadapt) {  // TODO Why this check? Can we remove it?
      // Remove active adapters.
      this.clearNetwork();

      if (!this.availableAdapters.hasOwnProperty(network)) {
        return Promise.reject(`There are no adapters for network '${network}'.`);
      }

      // Add new adapters.
      this.polkadapt.register(...Object.values(this.availableAdapters[network]));
      return this.polkadapt.ready();
    }

    return Promise.reject(false);
  }

  clearNetwork(): void {
    this.polkadapt.unregister();
  }
}
