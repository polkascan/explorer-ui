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
import { PolkadaptService } from '../polkadapt.service';
import { types as pst } from '@polkadapt/core';
import { BehaviorSubject, take } from 'rxjs';
import { filter, first, map } from 'rxjs/operators';

type SpecVersion = number;


type RuntimeCache = {
  runtime: BehaviorSubject<pst.Runtime | null>;
};

type RuntimeCacheAttributes = {
  runtimeCalls?: pst.RuntimeCall[];
  runtimeCallArguments?: pst.RuntimeCallArgument[];
  runtimeConstants?: pst.RuntimeConstant[];
  runtimeErrorMessages?: pst.RuntimeErrorMessage[];
  runtimeEvents?: pst.RuntimeEvent[];
  runtimeEventAttributes?: pst.RuntimeEventAttribute[];
  runtimePallets?: pst.RuntimePallet[];
  runtimeStorages?: pst.RuntimeStorage[];
};

type RuntimeCacheMap = Map<SpecVersion, RuntimeCache & RuntimeCacheAttributes>;


@Injectable({providedIn: 'root'})
export class RuntimeService {

  private latestRuntimes: {
    [network: string]: BehaviorSubject<pst.Runtime | null>;
  } = {};

  private runtimes: {
    [network: string]: RuntimeCacheMap
  } = {};

  constructor(private pa: PolkadaptService) {
  }

  initialize(network: string): void {
    if (!network) {
      throw new Error(`[RuntimeService] initialize: network was not provided.`);
    }

    if (this.latestRuntimes[network]) {
      // TODO probably check if we are waiting for a response, if not, request again.
      return;
    } else {
      this.latestRuntimes[network] = new BehaviorSubject<pst.Runtime | null>(null);
    }

    const runtime = this.pa.run({observableResults: false}).getLatestRuntime().pipe(
      take(1)
    ).subscribe((runtime: pst.Runtime) => {
      // First cache the runtime, then broadcast it. This order is important.
      this.cacheRuntime(network, runtime);
      this.latestRuntimes[network].next(runtime);
    });
  }


  cacheRuntime(network: string, runtime: pst.Runtime): void {
    const version = runtime.specVersion;
    const cache: RuntimeCacheMap = this.runtimes[network] = this.runtimes[network] || new Map();

    if (!cache.has(version)) {
      cache.set(version, {runtime: new BehaviorSubject<pst.Runtime | null>(runtime)});
    } else {
      const versionCache = cache.get(version) as RuntimeCache;
      if (!versionCache.runtime.value) {
        // Only update cache if it's still empty.
        versionCache.runtime.next(runtime);
      }
    }
  }


  getRuntime(network: string, specVersion?: number): BehaviorSubject<pst.Runtime | null> {
    if (!this.latestRuntimes[network]) {
      // We need the BehaviorSubject for the latest runtime, because it tells us which specName to use.
      this.initialize(network);
    }

    if (typeof specVersion !== 'number' || specVersion < 0) {
      // Without given specVersion, return latest runtime.
      return this.latestRuntimes[network] as BehaviorSubject<pst.Runtime | null>;
    }

    // Get or create cache entry for current network.
    const cache: RuntimeCacheMap = this.runtimes[network] = this.runtimes[network] || new Map();
    let cachedRuntime: BehaviorSubject<pst.Runtime | null>;

    if (cache.has(specVersion)) {
      // If it's already in cache, it's either currently loading or loaded, so return the cached BehaviorSubject.
      return (cache.get(specVersion) as RuntimeCache).runtime;
    } else {
      // Create a new BehaviorSubject in cache, so we can fill it with the loaded runtime later ons
      cachedRuntime = new BehaviorSubject<pst.Runtime | null>(null);
      cache.set(specVersion, {runtime: cachedRuntime});

      this.latestRuntimes[network]
        .pipe(
          filter(r => r !== null),
          map((r: pst.Runtime | null): string => (r as pst.Runtime).specName),
          first()
        ).subscribe(async (specName) => {
        try {
          const runtime = await this.pa.run({observableResults: false}).getRuntime(specName, specVersion).toPromise();
          if (!cachedRuntime.value) {
            // Only update cache if it's still empty.
            cachedRuntime.next(runtime as pst.Runtime);
          }
        } catch (e) {
          cachedRuntime.error(e);
        }
      });

      return cachedRuntime;
    }
  }


  getRuntimes(network: string): BehaviorSubject<pst.Runtime[]> {
    const bs = new BehaviorSubject<pst.Runtime[]>([]);

    if (this.runtimes[network]) {
      bs.next(
        [...this.runtimes[network].values()]
          .filter((r) => !!r.runtime.value)
          .map((r) => r.runtime.value as pst.Runtime)
      );
    }

    this.pa.run({observableResults: false}).getRuntimes().pipe(
      take(1)
    ).subscribe({
      next: (items) => {
        if (items) {
          bs.next(items);
        }
      },
      error: (errorResponse: any) => {
        console.error(errorResponse);
      }
    });

    return bs;
  }


  private async getRuntimeCache(network: string, specVersion: number): Promise<RuntimeCache & RuntimeCacheAttributes> {
    if (!this.runtimes[network]
      || !this.runtimes[network].has(specVersion)
      || !(this.runtimes[network].get(specVersion) as RuntimeCache & RuntimeCacheAttributes).runtime.value) {
      throw new Error('There is no runtime loaded with this specVersion. Please load the runtime first.');
    }
    return this.runtimes[network].get(specVersion) as RuntimeCache & RuntimeCacheAttributes;
  }


  async getRuntimePallets(network: string, specVersion: number): Promise<pst.RuntimePallet[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimePallets')) {
      const items = await this.pa.run({observableResults: false}).getRuntimePallets(
        (cache.runtime.value as pst.Runtime).specName, specVersion).toPromise();
      cache.runtimePallets = items;
    }

    return cache.runtimePallets as pst.RuntimePallet[];
  }


  async getRuntimeEvents(network: string, specVersion: number): Promise<pst.RuntimeEvent[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeEvents')) {
      const items = await this.pa.run({observableResults: false}).getRuntimeEvents(
        (cache.runtime.value as pst.Runtime).specName, specVersion).toPromise();
      cache.runtimeEvents = items;
    }

    return cache.runtimeEvents as pst.RuntimeEvent[];
  }


  async getRuntimeCalls(network: string, specVersion: number): Promise<pst.RuntimeCall[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeCalls')) {
      const items = await this.pa.run({observableResults: false}).getRuntimeCalls(
        (cache.runtime.value as pst.Runtime).specName, specVersion).toPromise();
      cache.runtimeCalls = items;
    }

    return cache.runtimeCalls as pst.RuntimeCall[];
  }


  async getRuntimeStorages(network: string, specVersion: number): Promise<pst.RuntimeStorage[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeStorage')) {
      const items = await this.pa.run({observableResults: false}).getRuntimeStorages(
        (cache.runtime.value as pst.Runtime).specName, specVersion).toPromise();
      cache.runtimeStorages = items;
    }

    return cache.runtimeStorages as pst.RuntimeStorage[];
  }


  async getRuntimeConstants(network: string, specVersion: number): Promise<pst.RuntimeConstant[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeConstant')) {
      const items = await this.pa.run({observableResults: false}).getRuntimeConstants(
        (cache.runtime.value as pst.Runtime).specName, specVersion).toPromise();
      cache.runtimeConstants = items;
    }

    return cache.runtimeConstants as pst.RuntimeConstant[];
  }


  async getRuntimeErrorMessages(network: string, specVersion: number): Promise<pst.RuntimeErrorMessage[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeErrorMessages')) {
      const items = await this.pa.run({observableResults: false}).getRuntimeErrorMessages(
        (cache.runtime.value as pst.Runtime).specName, specVersion).toPromise();
      cache.runtimeErrorMessages = items;
    }

    return cache.runtimeErrorMessages as pst.RuntimeErrorMessage[];
  }
}
