import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { networks } from './services/network.service';

type Config = {
  [network in keyof typeof networks]: {
    substrateRpcUrl: string;
    polkascanApiUrl: string;
    polkascanWsUrl: string;
  };
};

@Injectable()
export class AppConfig {
  networks: Config;

  constructor(private readonly http: HttpClient) {}
  public load(): Promise<void> {
    return this.http
      .get<Config>('assets/config.json')
      .toPromise()
      .then(config => {
        this.networks = config;
      });
  }
}

export function initConfig(config: AppConfig): () => Promise<void> {
  return () => config.load();
}
