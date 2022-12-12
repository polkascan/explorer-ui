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
import { PolkadaptService } from './polkadapt.service';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { VariablesService } from './variables.service';


@Injectable({providedIn: 'root'})
export class PricingService {
  price: Subject<null | number> = new ReplaySubject(1);

  currency: string | null;
  network: string | null;
  interval: number | null;

  dailyHistoricPrices = new BehaviorSubject<[number, number][]>([]);

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

    this.startPriceWatch();
    if (this.interval) {
      this.fetchAndSetPrice(this.interval);
      this.fetchDailyHistoricPrices(this.interval);
    }
  }


  async destroy(): Promise<void> {
    this.stopPriceWatch();
    this.network = null;
    this.currency = null;
    this.price.next(null);
    this.dailyHistoricPrices.next([]);
  }


  async startPriceWatch(): Promise<void> {
    let storedDate = new Date().getUTCDate();
    this.interval = window.setInterval(async () => {
      if (this.interval) {
        // Get the latest price.
        this.fetchAndSetPrice(this.interval);

        // Check if a new day has started and update the historic prices array.
        const date = new Date().getUTCDate();
        if (storedDate !== date) {
          storedDate = date;
          void this.addLatestHistoricPrice(this.interval);
        }
      }
    }, 60000);
  }


  stopPriceWatch(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }


  async fetchAndSetPrice(interval: number): Promise<void> {
    try {
      const adapterAvailable = await this.pa.availableAdapters[this.network as string].coingeckoApi.isReady;
      if (adapterAvailable) {
        const price = await this.pa.run(this.network as string).prices.getPrice(this.currency as string);

        if (this.interval === interval) { // Check if interval has not been destroyed.
          this.price.next(price as number);
        }
      }
    } catch (e) {
      this.price.next(null);
      // console.error(e);
    }
  }

  async fetchDailyHistoricPrices(interval: number): Promise<void> {
    try {
      const adapterAvailable = await this.pa.availableAdapters[this.network as string].coingeckoApi.isReady;
      if (adapterAvailable) {
        const history = await this.pa.run(this.network as string).prices.getHistoricalPrices(this.currency as string, 'max');
        if (this.interval === interval && history) { // Check if interval has not been destroyed.
          this.dailyHistoricPrices.next(history);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async addLatestHistoricPrice(interval: number): Promise<void | number> {
    const adapterAvailable = await this.pa.availableAdapters[this.network as string].coingeckoApi.isReady;
    if (adapterAvailable) {
      const history = await this.pa.run(this.network as string).prices.getHistoricalPrices(this.currency as string, 1);
      if (this.interval === interval && history) { // Check if interval has not been destroyed.
        const prices = this.dailyHistoricPrices.value;
        if (prices.find((p) => p[0] === history[0][0]) === undefined) {
          this.dailyHistoricPrices.next([...prices, history[0]]);
          return history[0][0];
        }
      }
    }
  }
}
