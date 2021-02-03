import { Injectable } from '@angular/core';
import { AdapterBase, Polkadapt } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import * as polkascan from '@polkadapt/polkascan';
import { Network } from './network.service';

type AugmentedApi = substrate.Api & polkascan.Api;

@Injectable({providedIn: 'root'})
export class PolkadaptService {
  polkadapt: Polkadapt<AugmentedApi>;
  run: (chain?: string, converter?: (results: any) => any) => AugmentedApi;
  availableAdapters: { [network: string]: { [source: string]: AdapterBase } } = {};

  constructor() {
    this.setAvailableAdapters();
    this.polkadapt = new Polkadapt();
    this.run = this.polkadapt.run.bind(this.polkadapt);
  }


  setAvailableAdapters(): void {
    this.availableAdapters.polkadot = {
      substrateRPC: new substrate.Adapter({
        chain: 'polkadot',
        providerURL: 'wss://rpc.polkadot.io'
      }),
      polkascanAPI: new polkascan.Adapter({
        chain: 'polkadot',
        apiEndpoint: 'https://explorer-31.polkascan.io/polkadot/api/v1/',
        wsEndpoint: 'ws://host-01.polkascan.io:8009/graphql-ws'
      })
    };

    this.availableAdapters.kusama = {
      substrateRPC: new substrate.Adapter({
        chain: 'kusama',
        providerURL: 'wss://kusama-rpc.polkadot.io'
      }),
      // polkascanAPI: new polkascan.Adapter({
      //   chain: 'kusama',
      //   apiEndpoint: 'https://explorer-31.polkascan.io/kusama/api/v1/',
      //   wsEndpoint: 'wss://explorer-31.polkascan.io/kusama/api/v1/'
      // })
    };
  }


  async setNetwork(network: Network): Promise<boolean> {
    if (this.polkadapt) {
      // Remove active adapters.
      this.polkadapt.unregister();

      if (!this.availableAdapters.hasOwnProperty(network)) {
        return Promise.reject(false);
      }

      // Add new adapters.
      this.polkadapt.register(...Object.values(this.availableAdapters[network]));

      return this.polkadapt.ready();
    }

    return Promise.reject(false);
  }
}
