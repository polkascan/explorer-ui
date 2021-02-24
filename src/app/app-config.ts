import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type NetworkConfig = {
  [network: string]: {
    substrateRpcUrl: string;
    polkascanApiUrl: string;
    polkascanWsUrl: string;
  };
};

@Injectable()
export class AppConfig {
  networks: NetworkConfig;

  constructor(private readonly http: HttpClient) {}
  public load(): Promise<void> {
    return this.http
      .get<NetworkConfig>('assets/config.json')
      .toPromise()
      .then(config => {
        this.networks = config;
      });
  }
}

export function initConfig(config: AppConfig): () => Promise<void> {
  return () => config.load();
}
