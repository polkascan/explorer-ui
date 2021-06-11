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

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.interval = window.setInterval(async () => {
      const price = await this.pa.run(this.network as string).prices.getPrice(this.currency as string);
      this.price.next(price);
    }, 30000);

    const price = await this.pa.run(this.network as string).prices.getPrice(this.currency as string);
    if (this.interval) {
      // Only send price if not destroyed.
      this.price.next(price);
    }
  }


  async destroy(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.network = null;
    this.currency = null;
    this.price.next(null);
  }
}
