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
import { Polkadapt, PolkadaptRunConfig } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import * as polkascan from '@polkadapt/polkascan';
import * as coingecko from '@polkadapt/coingecko';
import { AppConfig } from '../app-config';
import { BehaviorSubject } from 'rxjs';

export type AugmentedApi = substrate.Api & polkascan.Api & coingecko.Api;

type AdapterName = 'substrateRpc' | 'polkascanApi' | 'coingeckoApi';

@Injectable({providedIn: 'root'})
export class PolkadaptService {
  polkadapt: Polkadapt<AugmentedApi>;
  run: (config?: PolkadaptRunConfig | string) => AugmentedApi;
  substrateRpcUrls = new BehaviorSubject<string[] | null>(null);
  substrateRpcUrl = new BehaviorSubject<string | null>(null);
  substrateRpcConnected = new BehaviorSubject(false);
  substrateRpcRegistered = new BehaviorSubject(false);
  substrateRpcWsErrorHandler: () => void;
  substrateRpcWsConnectedHandler: () => void;
  substrateRpcWsDisconnectedHandler: () => void;
  polkascanWsUrls = new BehaviorSubject<string[] | null>(null)
  polkascanWsUrl = new BehaviorSubject<string | null>(null)
  polkascanWsConnected = new BehaviorSubject(false);
  polkascanRegistered = new BehaviorSubject(false);
  polkascanWsErrorHandler: () => void;
  polkascanWsConnectedHandler: () => void;
  polkascanWsDisconnectedHandler: () => void;
  polkascanDataErrorHandler: (e: any) => void;
  polkascanDataErrors = new BehaviorSubject<{url: string, error: any}[]>([]);
  availableAdapters: {
    [network: string]: {
      substrateRpc: substrate.Adapter,
      polkascanApi: polkascan.Adapter,
      coingeckoApi: coingecko.Adapter
    }
  } = {};
  badAdapterUrls: { [network: string]: { [K in AdapterName]: string[] } } = {};
  private currentNetwork: string = '';
  private onlineHandler: EventListener = (ev) => {
    this.reconnectPolkscanApi();
  };

  constructor(private config: AppConfig) {
    this.setAvailableAdapters();
    this.polkadapt = new Polkadapt();
    this.run = this.polkadapt.run.bind(this.polkadapt);
  }

  setAvailableAdapters(): void {
    for (const network of Object.keys(this.config.networks)) {
      this.availableAdapters[network] = {
        substrateRpc: new substrate.Adapter({
          chain: network
        }),
        polkascanApi: new polkascan.Adapter({
          chain: network
        }),
        coingeckoApi: new coingecko.Adapter({
          chain: network,
          apiEndpoint: 'https://api.coingecko.com/api/v3/'
        })
      };
      this.badAdapterUrls[network] = {
        substrateRpc: [],
        polkascanApi: [],
        coingeckoApi: []
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
    this.configureSubstrateRpcUrl();
    const sAdapter = this.availableAdapters[network].substrateRpc;

    this.substrateRpcWsErrorHandler = () => {
      this.reconnectSubstrateRpc();
    };
    sAdapter.on('error', this.substrateRpcWsErrorHandler);

    this.substrateRpcWsConnectedHandler = () => {
      this.substrateRpcConnected.next(true);
    };
    sAdapter.on('connected', this.substrateRpcWsConnectedHandler);

    this.substrateRpcWsDisconnectedHandler = () => {
      this.substrateRpcConnected.next(false);
    };
    sAdapter.on('disconnected', this.substrateRpcWsDisconnectedHandler);

    this.substrateRpcUrls.next(this.config.networks[network].substrateRpcUrlArray);

    // Update the Polkascan API url.
    this.configurePolkascanWsUrl();
    const pAdapter = this.availableAdapters[network].polkascanApi;
    this.polkascanWsUrls.next(this.config.networks[network].polkascanWsUrlArray);

    // Now that the adapters are set, register them in PolkADAPT which will connect() them.
    this.substrateRpcRegistered.next(true);
    this.polkascanRegistered.next(true);
    this.polkadapt.register(...Object.values(this.availableAdapters[network]));

    // After polkascan adapter has connected, we can listen to the events on the socket.
    if (pAdapter.socket) {
      this.polkascanWsErrorHandler = () => {
        console.error('Polkascan API web socket error, try reconnect');
        this.polkascanWsConnected.next(false);
        this.reconnectPolkscanApi();
      };
      pAdapter.socket.on('socketError', this.polkascanWsErrorHandler);

      this.polkascanDataErrorHandler = (e) => {
        const error = {
          url: this.polkascanWsUrl.value || '',
          error: e
        };
        this.polkascanDataErrors.next(this.polkascanDataErrors.value.concat([error]));
      };
      pAdapter.socket.on('dataError', this.polkascanDataErrorHandler);

      this.polkascanWsConnectedHandler = () => {
        console.info('Polkascan API connected');
        this.polkascanWsConnected.next(true);
      };
      pAdapter.socket.on('open', this.polkascanWsConnectedHandler);

      this.polkascanWsDisconnectedHandler = () => {
        // This can happen when internet connection went down.
        console.info('Polkascan API disconnected');
        this.polkascanWsConnected.next(false);
      };
      pAdapter.socket.on('close', this.polkascanWsDisconnectedHandler);
    }

    const cAdapter = this.availableAdapters[network].coingeckoApi;
    try {
      await cAdapter.isReady;
    } catch (e) {
      // Coingecko adapter could not initialize.
      // For now we unregister the adapter.
      this.polkadapt.unregister(cAdapter);
      console.error('Coingecko adapter could not be initialized, it is now unregistered from PolkAdapt.', e);
    }

    window.addEventListener('online', this.onlineHandler);
    // Wait until PolkADAPT has initialized all adapters.
    await this.polkadapt.ready();
  }

  clearNetwork(): void {
    if (this.currentNetwork) {
      this.polkadapt.unregister();
      this.substrateRpcRegistered.next(false);
      this.polkascanRegistered.next(false);
      const sAdapter = this.availableAdapters[this.currentNetwork].substrateRpc;
      sAdapter.off('error', this.substrateRpcWsErrorHandler);
      sAdapter.off('connected', this.substrateRpcWsConnectedHandler);
      sAdapter.off('disconnected', this.substrateRpcWsDisconnectedHandler);
      const pAdapter = this.availableAdapters[this.currentNetwork].polkascanApi;
      if (pAdapter.socket) {
        pAdapter.socket.off('socketError', this.polkascanWsErrorHandler);
        pAdapter.socket.off('dataError', this.polkascanDataErrorHandler);
        pAdapter.socket.off('open', this.polkascanWsConnectedHandler);
        pAdapter.socket.off('close', this.polkascanWsDisconnectedHandler);
      }
      window.removeEventListener('online', this.onlineHandler);
      this.currentNetwork = '';
      this.substrateRpcUrls.next(null);
      this.substrateRpcUrl.next(null);
      this.polkascanWsUrls.next(null);
      this.polkascanWsUrl.next(null);
    }
  }

  configureSubstrateRpcUrl(): void {
    const network: string = this.currentNetwork;
    const substrateRpcUrls = this.config.networks[network].substrateRpcUrlArray;
    let substrateRpcUrl = window.localStorage.getItem(`lastUsedSubstrateRpcUrl-${network}`);
    if (!substrateRpcUrl) {
      const badSubstrateRpcUrls = this.badAdapterUrls[network].substrateRpc;
      if (badSubstrateRpcUrls.length >= substrateRpcUrls.length) {
        // All url's are marked bad, so let's just try all of them again.
        badSubstrateRpcUrls.length = 0;
      }
      substrateRpcUrl = substrateRpcUrls.filter(url => !badSubstrateRpcUrls.includes(url))[0];
      window.localStorage.setItem(`lastUsedSubstrateRpcUrl-${network}`, substrateRpcUrl);
    }
    this.availableAdapters[network].substrateRpc.setUrl(substrateRpcUrl);
    this.substrateRpcUrl.next(substrateRpcUrl);
  }

  reconnectSubstrateRpc(): void {
    if (this.substrateRpcUrl.value) {
      const badSubstrateRpcUrls = this.badAdapterUrls[this.currentNetwork].substrateRpc;
      badSubstrateRpcUrls.push(this.substrateRpcUrl.value as string);
      window.localStorage.removeItem(`lastUsedSubstrateRpcUrl-${this.currentNetwork}`);
      this.configureSubstrateRpcUrl();
      if (this.polkascanRegistered.value) {
        this.availableAdapters[this.currentNetwork].substrateRpc.connect();
      } else {
        this.polkadapt.register(this.availableAdapters[this.currentNetwork].substrateRpc);
      }
    }
  }

  async setSubstrateRpcUrl(url: string): Promise<void> {
    window.localStorage.setItem(`lastUsedSubstrateRpcUrl-${this.currentNetwork}`, url);
    this.availableAdapters[this.currentNetwork].substrateRpc.setUrl(url);
    this.substrateRpcUrl.next(url);
    if (this.substrateRpcRegistered.value) {
      await this.availableAdapters[this.currentNetwork].substrateRpc.connect();
    } else {
      // Not registered, so let's try this url as well as the others again.
      this.badAdapterUrls[this.currentNetwork].substrateRpc.length = 0;
      this.polkadapt.register(this.availableAdapters[this.currentNetwork].substrateRpc);
      this.polkascanRegistered.next(true);
    }
  }

  configurePolkascanWsUrl(): void {
    const network: string = this.currentNetwork;
    const polkascanWsUrls = this.config.networks[network].polkascanWsUrlArray;
    let polkascanWsUrl = window.localStorage.getItem(`lastUsedPolkascanWsUrl-${network}`);
    if (!polkascanWsUrl) {
      const badPolkascanWsUrls = this.badAdapterUrls[network].polkascanApi;
      if (badPolkascanWsUrls.length >= polkascanWsUrls.length) {
        // All url's are marked bad, so let's just try all of them again.
        badPolkascanWsUrls.length = 0;
      }
      polkascanWsUrl = polkascanWsUrls.filter(url => !badPolkascanWsUrls.includes(url))[0];
      window.localStorage.setItem(`lastUsedPolkascanWsUrl-${network}`, polkascanWsUrl);
    }
    this.availableAdapters[network].polkascanApi.setWsUrl(polkascanWsUrl);
    this.polkascanWsUrl.next(polkascanWsUrl);
  }

  reconnectPolkscanApi(): void {
    if (this.polkascanWsUrl.value) {
      const badPolkascanWsUrls = this.badAdapterUrls[this.currentNetwork].polkascanApi;
      badPolkascanWsUrls.push(this.polkascanWsUrl.value as string);
      window.localStorage.removeItem(`lastUsedPolkascanWsUrl-${this.currentNetwork}`);
      this.configurePolkascanWsUrl();
      if (this.polkascanRegistered.value) {
        this.availableAdapters[this.currentNetwork].polkascanApi.connect();
      } else {
        this.polkadapt.register(this.availableAdapters[this.currentNetwork].polkascanApi);
      }
    }
  }

  async setPolkascanWsUrl(url: string): Promise<void> {
    window.localStorage.setItem(`lastUsedPolkascanWsUrl-${this.currentNetwork}`, url);
    this.availableAdapters[this.currentNetwork].polkascanApi.setWsUrl(url);
    this.polkascanWsUrl.next(url);
    if (this.polkascanRegistered.value) {
      this.availableAdapters[this.currentNetwork].polkascanApi.connect();
    } else {
      // Not registered, so let's try this url as well as the others again.
      this.badAdapterUrls[this.currentNetwork].polkascanApi.length = 0;
      this.polkadapt.register(this.availableAdapters[this.currentNetwork].polkascanApi);
      this.polkascanRegistered.next(true);
    }
  }
}
