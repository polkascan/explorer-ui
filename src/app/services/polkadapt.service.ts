import { Injectable } from '@angular/core';
import { AdapterBase, Polkadapt, PolkadaptRunConfig } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import * as polkascan from '@polkadapt/polkascan';
import { Network } from './network.service';
import { AppConfig } from '../app-config';

type AugmentedApi = substrate.Api & polkascan.Api;

@Injectable({providedIn: 'root'})
export class PolkadaptService {
  polkadapt: Polkadapt<AugmentedApi>;
  run: (config?: PolkadaptRunConfig) => AugmentedApi;
  availableAdapters: { [network: string]: { [source: string]: AdapterBase } } = {};

  constructor(private config: AppConfig) {
    this.setAvailableAdapters();
    this.polkadapt = new Polkadapt();
    this.run = this.polkadapt.run.bind(this.polkadapt);
  }


  setAvailableAdapters(): void {
    // this.availableAdapters.polkadot = {
    //   substrateRPC: new substrate.Adapter({
    //     chain: 'polkadot',
    //     providerURL: this.config.networks.polkadot.substrateRpcUrl
    //   }),
    //   polkascanAPI: new polkascan.Adapter({
    //     chain: 'polkadot',
    //     apiEndpoint: this.config.networks.polkadot.polkascanApiUrl,
    //     wsEndpoint: this.config.networks.polkadot.polkascanWsUrl
    //   })
    // };

    // this.availableAdapters.kusama = {
    //   substrateRPC: new substrate.Adapter({
    //     chain: 'kusama',
    //     providerURL: this.config.networks.kusama.substrateRpcUrl
    //   }),
    //   polkascanAPI: new polkascan.Adapter({
    //     chain: 'kusama',
    //     apiEndpoint: this.config.networks.kusama.polkascanApiUrl,
    //     wsEndpoint: this.config.networks.kusama.polkascanWsUrl
    //   })
    // };

    this.availableAdapters.rococo = {
      substrateRPC: new substrate.Adapter({
        chain: 'rococo',
        providerURL: this.config.networks.rococo.substrateRpcUrl
      }),
      polkascanAPI: new polkascan.Adapter({
        chain: 'rococo',
        apiEndpoint: this.config.networks.rococo.polkascanApiUrl,
        wsEndpoint: this.config.networks.rococo.polkascanWsUrl
      })
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
