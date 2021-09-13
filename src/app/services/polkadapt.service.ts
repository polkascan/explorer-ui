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
import { BehaviorSubject } from 'rxjs';

export type AugmentedApi = substrate.Api & polkascan.Api & coingecko.Api;

type AdapterName = 'substrateRPC' | 'polkascanAPI' | 'coingeckoAPI';

@Injectable({providedIn: 'root'})
export class PolkadaptService {
  polkadapt: Polkadapt<AugmentedApi>;
  run: (config?: PolkadaptRunConfig | string) => AugmentedApi;
  substrateRpcUrls = new BehaviorSubject<string[] | null>(null);
  substrateRpcUrl = new BehaviorSubject<string | null>(null);
  substrateRpcConnected = new BehaviorSubject(false);
  private availableAdapters: {
    [network: string]: {
      substrateRPC: substrate.Adapter,
      polkascanAPI: polkascan.Adapter,
      coingeckoAPI: coingecko.Adapter
    }
  } = {};
  private badAdapterUrls: { [network: string]: { [K in AdapterName]: string[] } } = {};
  private currentNetwork: string = '';

  constructor(private config: AppConfig) {
    this.setAvailableAdapters();
    this.polkadapt = new Polkadapt();
    this.run = this.polkadapt.run.bind(this.polkadapt);
  }

  setAvailableAdapters(): void {
    for (const network of Object.keys(this.config.networks)) {
      this.availableAdapters[network] = {
        substrateRPC: new substrate.Adapter({
          chain: network
        }),
        polkascanAPI: new polkascan.Adapter({
          chain: network
        }),
        coingeckoAPI: new coingecko.Adapter({
          chain: network,
          apiEndpoint: 'https://api.coingecko.com/api/v3/'
        })
      };
      this.badAdapterUrls[network] = {
        substrateRPC: [],
        polkascanAPI: [],
        coingeckoAPI: []
      };
    }
  }

  async setNetwork(network: string): Promise<void> {
    // Remove active adapters.
    this.clearNetwork();
    this.currentNetwork = network;

    if (!this.availableAdapters.hasOwnProperty(network)) {
      return Promise.reject(`There are no adapters for network '${network}'.`);
    }

    // Add new adapters. Use a (presumably) working URL, by using the last used or
    // skipping over the known bad ones.

    // Update the Substrate RPC url.
    await this.configureSubstrateRpcUrl();
    const substrateRpcAdapter = this.availableAdapters[network].substrateRPC;
    substrateRpcAdapter.on('error', () => this.substrateRpcWsErrorHandler());
    substrateRpcAdapter.on('connected', () => this.substrateRpcWsConnectedHandler());
    substrateRpcAdapter.on('disconnected', () => this.substrateRpcWsDisconnectedHandler());
    this.substrateRpcUrls.next(this.config.networks[network].substrateRpcUrlArray);

    // Update the Polkascan API url.
    const polkascanWsUrls = this.config.networks[network].polkascanWsUrlArray;
    let polkascanWsUrl = window.localStorage.getItem('lastUsedPolkascanWsUrl');
    if (!polkascanWsUrl || !polkascanWsUrls.includes(polkascanWsUrl)) {
      const badPolkascanWsUrl = this.badAdapterUrls[network].polkascanAPI;
      if (badPolkascanWsUrl.length === polkascanWsUrls.length) {
        // All url's are marked bad, so let's just try all of them again.
        badPolkascanWsUrl.length = 0;
      }
      polkascanWsUrl = polkascanWsUrls.filter(url => !badPolkascanWsUrl.includes(url))[0];
      window.localStorage.setItem('lastUsedPolkascanWsUrl', polkascanWsUrl);
    }
    await this.availableAdapters[network].polkascanAPI.setWsUrl(polkascanWsUrl);

    // Now that the adapters are set, register them in PolkADAPT.
    this.polkadapt.register(...Object.values(this.availableAdapters[network]));
    // Return a Promise that resolves when PolkADAPT has initialized all adapters.
    await this.polkadapt.ready();
  }

  clearNetwork(): void {
    if (this.currentNetwork) {
      this.polkadapt.unregister();
      const adapter = this.availableAdapters[this.currentNetwork].substrateRPC;
      adapter.off('error', this.substrateRpcWsErrorHandler);
      adapter.off('connected', this.substrateRpcWsConnectedHandler);
      adapter.off('disconnected', this.substrateRpcWsDisconnectedHandler);
      this.currentNetwork = '';
      this.substrateRpcUrls.next(null);
      this.substrateRpcUrl.next(null);
    }
  }

  configureSubstrateRpcUrl(): void {
    const network: string = this.currentNetwork;
    const substrateRpcUrls = this.config.networks[network].substrateRpcUrlArray;
    let substrateRpcUrl = window.localStorage.getItem('lastUsedSubstrateRpcUrl');
    if (!substrateRpcUrl || !substrateRpcUrls.includes(substrateRpcUrl)) {
      const badSubstrateRpcUrls = this.badAdapterUrls[network].substrateRPC;
      if (badSubstrateRpcUrls.length === substrateRpcUrls.length) {
        // All url's are marked bad, so let's just try all of them again.
        badSubstrateRpcUrls.length = 0;
      }
      substrateRpcUrl = substrateRpcUrls.filter(url => !badSubstrateRpcUrls.includes(url))[0];
      window.localStorage.setItem('lastUsedSubstrateRpcUrl', substrateRpcUrl);
    }
    this.availableAdapters[network].substrateRPC.setUrl(substrateRpcUrl);
    this.substrateRpcUrl.next(substrateRpcUrl);
  }

  substrateRpcWsErrorHandler(): void {
    console.log('errrrrrr');
    if (this.substrateRpcUrl.value) {
      this.badAdapterUrls[this.currentNetwork].substrateRPC.push(this.substrateRpcUrl.value);
      window.localStorage.removeItem('lastUsedSubstrateRpcUrl');
      this.configureSubstrateRpcUrl();
      this.availableAdapters[this.currentNetwork].substrateRPC.connect().then();
    }
  }

  substrateRpcWsConnectedHandler(): void {
    this.substrateRpcConnected.next(true);
  }

  substrateRpcWsDisconnectedHandler(): void {
    this.substrateRpcConnected.next(false);
  }

  async setSubstrateRpcUrl(url: string): Promise<void> {
    window.localStorage.setItem('lastUsedSubstrateRpcUrl', url);
    this.availableAdapters[this.currentNetwork].substrateRPC.setUrl(url);
    this.substrateRpcUrl.next(url);
    await this.availableAdapters[this.currentNetwork].substrateRPC.connect();
  }
}
