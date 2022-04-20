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

import { Injectable } from '@angular/core';
import { Polkadapt, PolkadaptRunConfig } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import * as explorer from '@polkadapt/polkascan-explorer';
import * as coingecko from '@polkadapt/coingecko';
import { AppConfig } from '../app-config';
import { BehaviorSubject, Subject, Subscription, throttleTime } from 'rxjs';

export type AugmentedApi = substrate.Api & explorer.Api & coingecko.Api;

type AdapterName = 'substrateRpc' | 'explorerApi' | 'coingeckoApi';

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
  explorerWsUrls = new BehaviorSubject<string[] | null>(null)
  explorerWsUrl = new BehaviorSubject<string | null>(null)
  explorerWsConnected = new BehaviorSubject(false);
  explorerRegistered = new BehaviorSubject(false);
  exporerWsErrorHandler: () => void;
  explorerWsConnectedHandler: () => void;
  explorerWsDisconnectedHandler: () => void;
  explorerDataErrorHandler: (e: any) => void;
  explorerDataErrors = new BehaviorSubject<{url: string, error: any}[]>([]);
  availableAdapters: {
    [network: string]: {
      substrateRpc: substrate.Adapter,
      explorerApi: explorer.Adapter,
      coingeckoApi: coingecko.Adapter
    }
  } = {};
  badAdapterUrls: { [network: string]: { [K in AdapterName]: string[] } } = {};
  private currentNetwork: string = '';

  private sleepDetectorWorker: Worker;
  triggerReconnect: Subject<any> = new Subject();
  private triggerReconnectSubscription: Subscription;

  private onlineHandler: EventListener = (ev) => {
    // In case the browser comes online, try and reconnect websockets.
    this.triggerReconnect.next(null);
  };

  constructor(private config: AppConfig) {
    this.setAvailableAdapters();
    this.polkadapt = new Polkadapt();
    this.run = this.polkadapt.run.bind(this.polkadapt);

    // Create a detector for suspended computers.
    // A web worker will keep running, even if the browser tab is inactive, therefor the timer that runs in
    // the worker will only take longer if the computer is suspended or the browser got stalled.
    if (typeof Worker !== 'undefined') {
      this.sleepDetectorWorker = new Worker(new URL('./polkadapt.worker', import.meta.url));
      this.sleepDetectorWorker.onmessage = ({ data }) => {
        if (data === 'wake') {
          // Detected a suspended computer or stalled browser. Try and reconnect websockets.
          this.triggerReconnect.next(null);
        }
      };
    } else {
      // Web workers are not supported in this environment.
    }
  }

  setAvailableAdapters(): void {
    for (const network of Object.keys(this.config.networks)) {
      this.availableAdapters[network] = {
        substrateRpc: new substrate.Adapter({
          chain: network
        }),
        explorerApi: new explorer.Adapter({
          chain: network
        }),
        coingeckoApi: new coingecko.Adapter({
          chain: network,
          apiEndpoint: 'https://api.coingecko.com/api/v3/'
        })
      };
      this.badAdapterUrls[network] = {
        substrateRpc: [],
        explorerApi: [],
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
    this.configureExplorerWsUrl();
    const pAdapter = this.availableAdapters[network].explorerApi;
    this.explorerWsUrls.next(this.config.networks[network].explorerWsUrlArray);

    // Now that the adapters are set, register them in PolkADAPT which will connect() them.
    this.substrateRpcRegistered.next(true);
    this.explorerRegistered.next(true);
    this.polkadapt.register(...Object.values(this.availableAdapters[network]));

    // After polkascan adapter has connected, we can listen to the events on the socket.
    if (pAdapter.socket) {
      this.exporerWsErrorHandler = () => {
        console.error('Polkascan Explorer API web socket error, try reconnect');
        this.explorerWsConnected.next(false);
        this.reconnectExplorerApi();
      };
      pAdapter.socket.on('socketError', this.exporerWsErrorHandler);

      this.explorerDataErrorHandler = (e) => {
        const error = {
          url: this.explorerWsUrl.value || '',
          error: e
        };
        this.explorerDataErrors.next(this.explorerDataErrors.value.concat([error]));
      };
      pAdapter.socket.on('dataError', this.explorerDataErrorHandler);

      this.explorerWsConnectedHandler = () => {
        console.info('Polkascan Explorer API connected');
        this.explorerWsConnected.next(true);
      };
      pAdapter.socket.on('open', this.explorerWsConnectedHandler);

      this.explorerWsDisconnectedHandler = () => {
        // This can happen when internet connection went down.
        console.info('Polkascan Explorer API disconnected');
        this.explorerWsConnected.next(false);
      };
      pAdapter.socket.on('close', this.explorerWsDisconnectedHandler);
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

    // Reconnect on sleep and/or online event.
    if (this.sleepDetectorWorker) {
      this.sleepDetectorWorker.postMessage('start');
    }
    window.addEventListener('online', this.onlineHandler);

    // Throttle the reconnect trigger (can also be triggered from outside this service).
    this.triggerReconnectSubscription = this.triggerReconnect
      .pipe(throttleTime(5000))
      .subscribe(() => this.forceReconnect());

    // Wait until PolkADAPT has initialized at least the substrate rpc adapters.
    await sAdapter.isReady;
  }

  clearNetwork(): void {
    if (this.currentNetwork) {
      this.polkadapt.unregister();
      this.substrateRpcRegistered.next(false);
      this.explorerRegistered.next(false);
      const sAdapter = this.availableAdapters[this.currentNetwork].substrateRpc;
      sAdapter.off('error', this.substrateRpcWsErrorHandler);
      sAdapter.off('connected', this.substrateRpcWsConnectedHandler);
      sAdapter.off('disconnected', this.substrateRpcWsDisconnectedHandler);
      const pAdapter = this.availableAdapters[this.currentNetwork].explorerApi;
      if (pAdapter.socket) {
        pAdapter.socket.off('socketError', this.exporerWsErrorHandler);
        pAdapter.socket.off('dataError', this.explorerDataErrorHandler);
        pAdapter.socket.off('open', this.explorerWsConnectedHandler);
        pAdapter.socket.off('close', this.explorerWsDisconnectedHandler);
      }

      if (this.sleepDetectorWorker) {
        this.sleepDetectorWorker.postMessage('stop');
      }
      window.removeEventListener('online', this.onlineHandler);
      this.triggerReconnectSubscription.unsubscribe();

      this.currentNetwork = '';
      this.substrateRpcUrls.next(null);
      this.substrateRpcUrl.next(null);
      this.explorerWsUrls.next(null);
      this.explorerWsUrl.next(null);
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
      if (this.explorerRegistered.value) {
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
      this.explorerRegistered.next(true);
    }
  }

  configureExplorerWsUrl(): void {
    const network: string = this.currentNetwork;
    const explorerWsUrls = this.config.networks[network].explorerWsUrlArray;
    let explorerWsUrl = window.localStorage.getItem(`lastUsedExplorerWsUrl-${network}`);
    if (!explorerWsUrl) {
      const badExplorerWsUrls = this.badAdapterUrls[network].explorerApi;
      if (badExplorerWsUrls.length >= explorerWsUrls.length) {
        // All url's are marked bad, so let's just try all of them again.
        badExplorerWsUrls.length = 0;
      }
      explorerWsUrl = explorerWsUrls.filter(url => !badExplorerWsUrls.includes(url))[0];
      window.localStorage.setItem(`lastUsedExplorerWsUrl-${network}`, explorerWsUrl);
    }
    this.availableAdapters[network].explorerApi.setWsUrl(explorerWsUrl);
    this.explorerWsUrl.next(explorerWsUrl);
  }

  reconnectExplorerApi(): void {
    if (this.explorerWsUrl.value) {
      const badExplorerWsUrls = this.badAdapterUrls[this.currentNetwork].explorerApi;
      badExplorerWsUrls.push(this.explorerWsUrl.value as string);
      window.localStorage.removeItem(`lastUsedExplorerWsUrl-${this.currentNetwork}`);
      this.configureExplorerWsUrl();
      if (this.explorerRegistered.value) {
        this.availableAdapters[this.currentNetwork].explorerApi.connect();
      } else {
        this.polkadapt.register(this.availableAdapters[this.currentNetwork].explorerApi);
      }
    }
  }

  async setExplorerWsUrl(url: string): Promise<void> {
    window.localStorage.setItem(`lastUsedExplorerWsUrl-${this.currentNetwork}`, url);
    this.availableAdapters[this.currentNetwork].explorerApi.setWsUrl(url);
    this.explorerWsUrl.next(url);
    if (this.explorerRegistered.value) {
      this.availableAdapters[this.currentNetwork].explorerApi.connect();
    } else {
      // Not registered, so let's try this url as well as the others again.
      this.badAdapterUrls[this.currentNetwork].explorerApi.length = 0;
      this.polkadapt.register(this.availableAdapters[this.currentNetwork].explorerApi);
      this.explorerRegistered.next(true);
    }
  }

  forceReconnect(): void {
    this.reconnectSubstrateRpc();
    this.reconnectExplorerApi();
  }
}
