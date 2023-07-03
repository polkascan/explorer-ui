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
import { PolkadaptService } from '../polkadapt.service';
import { types as pst } from '@polkadapt/core';
import { BehaviorSubject, combineLatest, of, take } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

type SpecVersion = number;


type RuntimeCache = {
  runtime: BehaviorSubject<pst.Runtime | null>;
};

type RuntimeCacheAttributes = {
  runtimeCalls?: BehaviorSubject<pst.RuntimeCall[]>;
  runtimeCallArguments?: BehaviorSubject<pst.RuntimeCallArgument[]>;
  runtimeConstants?: BehaviorSubject<pst.RuntimeConstant[]>;
  runtimeErrorMessages?: BehaviorSubject<pst.RuntimeErrorMessage[]>;
  runtimeEvents?: BehaviorSubject<pst.RuntimeEvent[]>;
  runtimeEventAttributes?: Map<string, BehaviorSubject<pst.RuntimeEventAttribute[]>>;
  runtimePallets?: BehaviorSubject<pst.RuntimePallet[]>;
  runtimeStorages?: BehaviorSubject<pst.RuntimeStorage[]>;
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

    this.pa.run({observableResults: false}).getLatestRuntime().pipe(
      take(1)
    ).subscribe({
      next: (runtime: pst.Runtime) => {
        // First cache the runtime, then broadcast it. This order is important.
        this.cacheRuntime(network, runtime);
        this.latestRuntimes[network].next(runtime);
      }
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
          take(1),
          switchMap((specName) =>
            this.pa.run({observableResults: false}).getRuntime(specName, specVersion).pipe(take(1))
          )
        ).subscribe({
        next: (runtime) => {
          if (!cachedRuntime.value) {
            // Only update cache if it's still empty.
            cachedRuntime.next(runtime);
          }
        },
        error: (errorResponse) => {
          cachedRuntime.error(errorResponse);
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
      error: (errorResponse) => {
        console.error(errorResponse);
      }
    });

    return bs;
  }


  private getRuntimeCache(network: string, specVersion: number): RuntimeCache & RuntimeCacheAttributes {
    if (!this.runtimes[network]
      || !this.runtimes[network].has(specVersion)
      || !(this.runtimes[network].get(specVersion) as RuntimeCache & RuntimeCacheAttributes).runtime.value) {
      throw new Error('There is no runtime loaded with this specVersion. Please load the runtime first.');
    }
    return this.runtimes[network].get(specVersion) as RuntimeCache & RuntimeCacheAttributes;
  }


  getRuntimePallets(network: string, specVersion: number): BehaviorSubject<pst.RuntimePallet[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimePallets')) {
      const runtimePallets = cache.runtimePallets = new BehaviorSubject([] as pst.RuntimePallet[]);
      this.pa.run({observableResults: false}).getRuntimePallets((cache.runtime.value as pst.Runtime).specName, specVersion).subscribe({
        next: (items) => runtimePallets.next(items),
        error: (e) => {
          console.error(e);
          delete cache.runtimePallets
        }
      });
    }
    return cache.runtimePallets!;
  }


  getRuntimeEvents(network: string, specVersion: number): BehaviorSubject<pst.RuntimeEvent[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeEvents')) {
      const runtimeEvents = cache.runtimeEvents = new BehaviorSubject([] as pst.RuntimeEvent[]);
      this.pa.run({observableResults: false}).getRuntimeEvents((cache.runtime.value as pst.Runtime).specName, specVersion).subscribe({
        next: (items) => runtimeEvents.next(items),
        error: (e) => {
          console.error(e);
          delete cache.runtimeEvents
        }
      });
    }

    return cache.runtimeEvents!;
  }


  getRuntimeEventAttributes(network: string, specVersion: number, eventModule: string, eventName: string): BehaviorSubject<pst.RuntimeEventAttribute[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeEventAttributes')) {
      cache.runtimeEventAttributes = new Map();
    }

    const id = `${eventModule}-${eventName}`;
    let attributesCache = cache.runtimeEventAttributes!.get(id);

    if (!attributesCache) {
      attributesCache = new BehaviorSubject([] as pst.RuntimeEventAttribute[]);
      cache.runtimeEventAttributes!.set(id, attributesCache);

      this.pa.run().getRuntimeEventAttributes((cache.runtime.value as pst.Runtime).specName, specVersion, eventModule, eventName).pipe(
        switchMap((obs) => obs.length ? combineLatest(obs) : of([]))
      ).subscribe({
        next: (items) => attributesCache!.next(items),
        error: (e) => {
          console.error(e);
          cache.runtimeEventAttributes?.delete(id)
        }
      });
    }

    return attributesCache;
  }


  getRuntimeCalls(network: string, specVersion: number): BehaviorSubject<pst.RuntimeCall[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeCalls')) {
      const runtimeCalls = cache.runtimeCalls = new BehaviorSubject([] as pst.RuntimeCall[]);
      this.pa.run({observableResults: false}).getRuntimeCalls((cache.runtime.value as pst.Runtime).specName, specVersion).subscribe({
        next: (items) => runtimeCalls.next(items),
        error: (e) => {
          console.error(e);
          delete cache.runtimeCalls
        }
      });
    }

    return cache.runtimeCalls!;
  }


  getRuntimeStorages(network: string, specVersion: number): BehaviorSubject<pst.RuntimeStorage[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeStorages')) {
      const runtimeStorages = cache.runtimeStorages = new BehaviorSubject([] as pst.RuntimeStorage[]);
      this.pa.run({observableResults: false}).getRuntimeStorages((cache.runtime.value as pst.Runtime).specName, specVersion).subscribe({
        next: (items) => runtimeStorages.next(items),
        error: (e) => {
          console.error(e);
          delete cache.runtimeStorages
        }
      });
    }

    return cache.runtimeStorages!;
  }


  getRuntimeConstants(network: string, specVersion: number): BehaviorSubject<pst.RuntimeConstant[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeConstants')) {
      const runtimeConstants = cache.runtimeConstants = new BehaviorSubject([] as pst.RuntimeConstant[]);
      this.pa.run({observableResults: false}).getRuntimeConstants((cache.runtime.value as pst.Runtime).specName, specVersion).subscribe({
        next: (items) => runtimeConstants.next(items),
        error: (e) => {
          console.error(e);
          delete cache.runtimeConstants
        }
      });
    }

    return cache.runtimeConstants!;
  }


  getRuntimeErrorMessages(network: string, specVersion: number): BehaviorSubject<pst.RuntimeErrorMessage[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeErrorMessages')) {
      const runtimeErrorMessages = cache.runtimeErrorMessages = new BehaviorSubject([] as pst.RuntimeErrorMessage[]);
      this.pa.run({observableResults: false}).getRuntimeErrorMessages((cache.runtime.value as pst.Runtime).specName, specVersion).subscribe({
        next: (items) => runtimeErrorMessages.next(items),
        error: (e) => {
          console.error(e);
          delete cache.runtimeErrorMessages
        }
      });
    }

    return cache.runtimeErrorMessages!;
  }
}
