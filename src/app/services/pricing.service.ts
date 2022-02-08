import { Injectable } from '@angular/core';
import { PolkadaptService } from './polkadapt.service';
import { ReplaySubject, Subject } from 'rxjs';
import { VariablesService } from './variables.service';

@Injectable({providedIn: 'root'})
export class PricingService {
  price: Subject<null | number> = new ReplaySubject(1);

  currency: string | null;
  network: string | null;
  interval: number | null;

  constructor(private pa: PolkadaptService,
              private vs: VariablesService) {
    this.price.subscribe(this.vs.price);

    window.addEventListener('online', () => this.startPriceWatch());
    window.addEventListener('offline', () => this.stopPriceWatch());
  }


  async initialize(network: string, currency: string): Promise<void> {
    if (!network) {
      throw new Error(`[PricingService] initialize: network was not provided.`);
    }

    if (!currency) {
      throw new Error(`[PricingService] initialize: currency was not provided.`);
    }

    this.network = network;
    this.currency = currency;
    this.price.next(null);

    this.fetchAndSetPrice();
    this.startPriceWatch();
  }


  async destroy(): Promise<void> {
    this.stopPriceWatch();
    this.network = null;
    this.currency = null;
    this.price.next(null);
  }


  async startPriceWatch(): Promise<void> {
      this.interval = window.setInterval(async () => {
        this.fetchAndSetPrice();
      }, 15000);
  }


  stopPriceWatch(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }


  async fetchAndSetPrice(): Promise<void> {
    try {
      const adapterAvailable = await this.pa.availableAdapters[this.network as string].coingeckoApi.isReady;
      if (adapterAvailable) {
        const price = await this.pa.run(this.network as string).prices.getPrice(this.currency as string);

        if (this.interval) {
          // Only set price if not destroyed.
          this.price.next(price);
        }
      }
    } catch (e) {
      this.price.next(null);
      // console.error(e);
    }
  }
}
