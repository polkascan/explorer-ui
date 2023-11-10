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

import { Injectable } from '@angular/core';
import { Polkadapt, PolkadaptRunArgument, RecursiveObservableWrapper } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import * as explorer from '@polkadapt/polkascan-explorer';
import * as coingecko from '@polkadapt/coingecko';
import * as subsquid from '@polkadapt/subsquid';
import { AppConfig } from '../app-config';
import { BehaviorSubject, Subject, Subscription, throttleTime } from 'rxjs';

export type AugmentedApi = substrate.Api & explorer.Api & coingecko.Api & subsquid.Api;

type AdapterName = 'substrateRpc' | 'explorerApi' | 'coingeckoApi';

type AvailableAdapters = {
  substrateRpc?: substrate.Adapter;
  explorerApi?: explorer.Adapter;
  coingeckoApi?: coingecko.Adapter;
  subsquid?: subsquid.Adapter;
};

@Injectable({providedIn: 'root'})
export class PolkadaptService {
  polkadapt: Polkadapt<AugmentedApi>;
  run: <P extends PolkadaptRunArgument>(config?: P) => P extends {observableResults: false} ? AugmentedApi : RecursiveObservableWrapper<AugmentedApi>;
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
  subsquidRegistered = new BehaviorSubject(false);
  availableAdapters: {
    [network: string]: AvailableAdapters;
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
    for (const [network, config] of Object.entries(this.config.networks)) {
      const aa: AvailableAdapters = this.availableAdapters[network] = {};
      if (config.substrateRpcUrlArray && config.substrateRpcUrlArray.length) {
        aa.substrateRpc = new substrate.Adapter({
          chain: network
        });
      }
      if (config.explorerWsUrlArray && config.explorerWsUrlArray.length) {
        aa.explorerApi = new explorer.Adapter({
          chain: network
        });
      }
      if (config.subsquid && Object.keys(config.subsquid).length) {
        aa.subsquid = new subsquid.Adapter({
          chain: network,
          giantSquidExplorerUrl: this.config.networks[network].subsquid?.giantSquidExplorerUrl,
          giantSquidMainUrl: this.config.networks[network].subsquid?.giantSquidMainUrl,
          giantSquidStatsUrl: this.config.networks[network].subsquid?.giantSquidStatsUrl,
          metaDataUrl: this.config.networks[network].subsquid?.metaDataUrl
        });
      }
      if (config.coingecko && config.coingecko.coinId) {
        aa.coingeckoApi = new coingecko.Adapter({
          chain: network,
          apiEndpoint: 'https://api.coingecko.com/api/v3/',
          coinId: config.coingecko.coinId
        });
      }

      this.badAdapterUrls[network] = {
        substrateRpc: [],
        explorerApi: [],
        coingeckoApi: []
      };
    }
  }

  setNetwork(network: string): void {
    // Remove active adapters.
    this.clearNetwork();
    this.currentNetwork = network;
    const aa = this.availableAdapters[network];

    if (!aa || !Object.keys(aa).length) {
      throw new Error(`There are no adapters for network '${network}'.`);
    }

    // Add new adapters. Use a (presumably) working URL, by using the last used or
    // skipping over the known bad ones.

    if (aa.substrateRpc) {
      // Update the Substrate RPC url.
      this.configureSubstrateRpcUrl();
      this.substrateRpcWsErrorHandler = () => {
        this.reconnectSubstrateRpc();
      };
      aa.substrateRpc.on('error', this.substrateRpcWsErrorHandler);

      this.substrateRpcWsConnectedHandler = () => {
        this.substrateRpcConnected.next(true);
      };
      aa.substrateRpc.on('connected', this.substrateRpcWsConnectedHandler);

      this.substrateRpcWsDisconnectedHandler = () => {
        this.substrateRpcConnected.next(false);
      };
      aa.substrateRpc.on('disconnected', this.substrateRpcWsDisconnectedHandler);

      this.substrateRpcUrls.next(this.config.networks[network].substrateRpcUrlArray);
      this.substrateRpcRegistered.next(true);
    }

    if (aa.explorerApi) {
      // Update the Polkascan API url.
      this.configureExplorerWsUrl();
      this.explorerWsUrls.next(this.config.networks[network].explorerWsUrlArray);
      this.explorerRegistered.next(true);
    }

    if (aa.subsquid) {
      this.subsquidRegistered.next(true);
    }

    // Now that the adapters are set, register them in PolkADAPT which will connect() them.
    this.polkadapt.register(...Object.values(this.availableAdapters[network]));

    if (aa.explorerApi) {
      // After polkascan adapter has connected, we can listen to the events on the socket.
      if (aa.explorerApi.socket) {
        this.exporerWsErrorHandler = () => {
          console.error('Polkascan Explorer API web socket error, try reconnect');
          this.explorerWsConnected.next(false);
          this.reconnectExplorerApi();
        };
        aa.explorerApi.socket.on('socketError', this.exporerWsErrorHandler);

        this.explorerDataErrorHandler = (e) => {
          const error = {
            url: this.explorerWsUrl.value || '',
            error: e
          };
          this.explorerDataErrors.next(this.explorerDataErrors.value.concat([error]));
        };
        aa.explorerApi.socket.on('dataError', this.explorerDataErrorHandler);

        this.explorerWsConnectedHandler = () => {
          console.info('Polkascan Explorer API connected');
          this.explorerWsConnected.next(true);
        };
        aa.explorerApi.socket.on('open', this.explorerWsConnectedHandler);

        this.explorerWsDisconnectedHandler = () => {
          // This can happen when internet connection went down.
          console.info('Polkascan Explorer API disconnected');
          this.explorerWsConnected.next(false);
        };
        aa.explorerApi.socket.on('close', this.explorerWsDisconnectedHandler);
      }
    }

    // Reconnect on sleep and/or online event.
    if (this.sleepDetectorWorker) {
      this.sleepDetectorWorker.postMessage('start');
    }
    window.addEventListener('online', this.onlineHandler);

    // Throttle the reconnect trigger (can also be triggered from outside this service).
    this.triggerReconnectSubscription = this.triggerReconnect
      .pipe(throttleTime(5000))
      .subscribe({
        next: () => this.forceReconnect()
      });
  }

  clearNetwork(): void {
    if (this.currentNetwork) {
      this.polkadapt.unregister();
      const aa = this.availableAdapters[this.currentNetwork];
      if (aa.substrateRpc) {
        this.substrateRpcRegistered.next(false);
        aa.substrateRpc.off('error', this.substrateRpcWsErrorHandler);
        aa.substrateRpc.off('connected', this.substrateRpcWsConnectedHandler);
        aa.substrateRpc.off('disconnected', this.substrateRpcWsDisconnectedHandler);
      }
      if (aa.explorerApi) {
        this.explorerRegistered.next(false);
        if (aa.explorerApi.socket) {
          aa.explorerApi.socket.off('socketError', this.exporerWsErrorHandler);
          aa.explorerApi.socket.off('dataError', this.explorerDataErrorHandler);
          aa.explorerApi.socket.off('open', this.explorerWsConnectedHandler);
          aa.explorerApi.socket.off('close', this.explorerWsDisconnectedHandler);
        }
      }
      if (aa.subsquid) {
        this.subsquidRegistered.next(false);
      }

      if (this.sleepDetectorWorker) {
        this.sleepDetectorWorker.postMessage('stop');
      }
      window.removeEventListener('online', this.onlineHandler);
      this.triggerReconnectSubscription.unsubscribe();

      this.currentNetwork = '';
      if (aa.substrateRpc) {
        this.substrateRpcUrls.next(null);
        this.substrateRpcUrl.next(null);
      }
      if (aa.explorerApi) {
        this.explorerWsUrls.next(null);
        this.explorerWsUrl.next(null);
      }
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
    this.availableAdapters[network].substrateRpc!.setUrl(substrateRpcUrl);
    this.substrateRpcUrl.next(substrateRpcUrl);
  }

  reconnectSubstrateRpc(): void {
    if (this.substrateRpcUrl.value) {
      const badSubstrateRpcUrls = this.badAdapterUrls[this.currentNetwork].substrateRpc;
      badSubstrateRpcUrls.push(this.substrateRpcUrl.value as string);
      window.localStorage.removeItem(`lastUsedSubstrateRpcUrl-${this.currentNetwork}`);
      this.configureSubstrateRpcUrl();
      if (this.explorerRegistered.value) {
        this.availableAdapters[this.currentNetwork].substrateRpc?.connect();
      } else {
        this.polkadapt.register(this.availableAdapters[this.currentNetwork].substrateRpc!);
      }
    }
  }

  setSubstrateRpcUrl(url: string): void {
    window.localStorage.setItem(`lastUsedSubstrateRpcUrl-${this.currentNetwork}`, url);
    this.availableAdapters[this.currentNetwork].substrateRpc!.setUrl(url);
    this.substrateRpcUrl.next(url);
    if (this.substrateRpcRegistered.value) {
      this.availableAdapters[this.currentNetwork].substrateRpc!.connect();
    } else {
      // Not registered, so let's try this url as well as the others again.
      this.badAdapterUrls[this.currentNetwork].substrateRpc.length = 0;
      this.polkadapt.register(this.availableAdapters[this.currentNetwork].substrateRpc!);
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
    this.availableAdapters[network].explorerApi!.setWsUrl(explorerWsUrl);
    this.explorerWsUrl.next(explorerWsUrl);
  }

  reconnectExplorerApi(): void {
    if (this.explorerWsUrl.value) {
      const badExplorerWsUrls = this.badAdapterUrls[this.currentNetwork].explorerApi;
      badExplorerWsUrls.push(this.explorerWsUrl.value as string);
      window.localStorage.removeItem(`lastUsedExplorerWsUrl-${this.currentNetwork}`);
      this.configureExplorerWsUrl();
      if (this.explorerRegistered.value) {
        this.availableAdapters[this.currentNetwork].explorerApi!.connect();
      } else {
        this.polkadapt.register(this.availableAdapters[this.currentNetwork].explorerApi!);
      }
    }
  }

  setExplorerWsUrl(url: string): void {
    window.localStorage.setItem(`lastUsedExplorerWsUrl-${this.currentNetwork}`, url);
    this.availableAdapters[this.currentNetwork].explorerApi!.setWsUrl(url);
    this.explorerWsUrl.next(url);
    if (this.explorerRegistered.value) {
      this.availableAdapters[this.currentNetwork].explorerApi!.connect();
    } else {
      // Not registered, so let's try this url as well as the others again.
      this.badAdapterUrls[this.currentNetwork].explorerApi.length = 0;
      this.polkadapt.register(this.availableAdapters[this.currentNetwork].explorerApi!);
      this.explorerRegistered.next(true);
    }
  }

  forceReconnect(): void {
    this.reconnectSubstrateRpc();
    this.reconnectExplorerApi();
  }
}
