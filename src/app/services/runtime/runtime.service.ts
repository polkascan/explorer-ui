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
import { types } from '@polkadapt/core';
import { BehaviorSubject, combineLatest, last, merge, of, ReplaySubject, take } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

type SpecVersion = number;


type RuntimeCache = {
  runtime: BehaviorSubject<types.Runtime | null>;
};

type RuntimeCacheAttributes = {
  runtimeCalls?: ReplaySubject<types.RuntimeCall[]>;
  runtimeCallArguments?: Map<string, ReplaySubject<types.RuntimeCallArgument[]>>;
  runtimeConstants?: ReplaySubject<types.RuntimeConstant[]>;
  runtimeErrorMessages?: ReplaySubject<types.RuntimeErrorMessage[]>;
  runtimeEvents?: ReplaySubject<types.RuntimeEvent[]>;
  runtimeEventAttributes?: Map<string, ReplaySubject<types.RuntimeEventAttribute[]>>;
  runtimePallets?: ReplaySubject<types.RuntimePallet[]>;
  runtimeStorages?: ReplaySubject<types.RuntimeStorage[]>;
};

type RuntimeCacheMap = Map<SpecVersion, RuntimeCache & RuntimeCacheAttributes>;


@Injectable({providedIn: 'root'})
export class RuntimeService {

  private latestRuntimes: {
    [network: string]: BehaviorSubject<types.Runtime | null>;
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
      this.latestRuntimes[network] = new BehaviorSubject<types.Runtime | null>(null);
    }

    this.pa.run({observableResults: false}).getLatestRuntime().pipe(
      take(1)
    ).subscribe({
      next: (runtime: types.Runtime) => {
        // First cache the runtime, then broadcast it. This order is important.
        this.cacheRuntime(network, runtime);
        this.latestRuntimes[network].next(runtime);
      }
    });
  }


  cacheRuntime(network: string, runtime: types.Runtime): void {
    const version = runtime.specVersion;
    const cache: RuntimeCacheMap = this.runtimes[network] = this.runtimes[network] || new Map();

    if (!cache.has(version)) {
      cache.set(version, {runtime: new BehaviorSubject<types.Runtime | null>(runtime)});
    } else {
      const versionCache = cache.get(version) as RuntimeCache;
      if (!versionCache.runtime.value) {
        // Only update cache if it's still empty.
        versionCache.runtime.next(runtime);
      }
    }
  }


  getRuntime(network: string, specVersion?: number): BehaviorSubject<types.Runtime | null> {
    if (!this.latestRuntimes[network]) {
      // We need the BehaviorSubject for the latest runtime, because it tells us which specName to use.
      this.initialize(network);
    }

    if (typeof specVersion !== 'number' || specVersion < 0) {
      // Without given specVersion, return latest runtime.
      return this.latestRuntimes[network] as BehaviorSubject<types.Runtime | null>;
    }

    // Get or create cache entry for current network.
    const cache: RuntimeCacheMap = this.runtimes[network] = this.runtimes[network] || new Map();
    let cachedRuntime: BehaviorSubject<types.Runtime | null>;

    if (cache.has(specVersion)) {
      // If it's already in cache, it's either currently loading or loaded, so return the cached BehaviorSubject.
      return (cache.get(specVersion) as RuntimeCache).runtime;
    } else {
      // Create a new BehaviorSubject in cache, so we can fill it with the loaded runtime later ons
      cachedRuntime = new BehaviorSubject<types.Runtime | null>(null);
      cache.set(specVersion, {runtime: cachedRuntime});

      this.latestRuntimes[network]
        .pipe(
          filter(r => r !== null),
          map((r: types.Runtime | null): string => (r as types.Runtime).specName),
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


  getRuntimes(network: string): BehaviorSubject<types.Runtime[]> {
    const bs = new BehaviorSubject<types.Runtime[]>([]);

    if (this.runtimes[network]) {
      bs.next(
        [...this.runtimes[network].values()]
          .filter((r) => !!r.runtime.value)
          .map((r) => r.runtime.value as types.Runtime)
      );
    }

    this.pa.run({observableResults: false}).getRuntimes().pipe(
      take(1)
    ).subscribe({
      next: (items: types.Runtime[]) => {
        if (items) {
          bs.next(items);
          if (items.length > 0 && items[0].countPallets === undefined) {
            combineLatest(items.map(
              runtime => this.pa.run().getRuntime(runtime.specName, runtime.specVersion)
            )).pipe(
              switchMap(runtimes => merge(...runtimes.map(r => r.pipe(
                  filter((runtime) => runtime.countPallets !== undefined),
                  take(1)
              )))),
            ).subscribe((runtime: types.Runtime) => {
              bs.getValue().forEach(r => {
                if (r.specName === runtime.specName && r.specVersion === runtime.specVersion) {
                  Object.assign(r, runtime);
                }
              });
              bs.next(bs.getValue());
            });
          }
        }
      },
      error: (errorResponse: Error) => {
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


  getRuntimePallets(network: string, specVersion: number): ReplaySubject<types.RuntimePallet[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimePallets')) {
      const runtimePallets = cache.runtimePallets = new ReplaySubject(1);
      this.pa.run({observableResults: false}).getRuntimePallets((cache.runtime.value as types.Runtime).specName, specVersion).subscribe({
        next: (items) => {
          runtimePallets.next(items);
          runtimePallets.complete();
        },
        error: (e) => {
          console.error(e);
          delete cache.runtimePallets
        }
      });
    }
    return cache.runtimePallets!;
  }


  getRuntimeEvents(network: string, specVersion: number): ReplaySubject<types.RuntimeEvent[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeEvents')) {
      const runtimeEvents = cache.runtimeEvents = new ReplaySubject(1);
      this.pa.run({observableResults: false}).getRuntimeEvents((cache.runtime.value as types.Runtime).specName, specVersion).subscribe({
        next: (items) => {
          runtimeEvents.next(items);
          runtimeEvents.complete();
        },
        error: (e) => {
          console.error(e);
          delete cache.runtimeEvents
        }
      });
    }

    return cache.runtimeEvents!;
  }


  getRuntimeEventAttributes(network: string, specVersion: number, eventModule: string, eventName: string): ReplaySubject<types.RuntimeEventAttribute[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeEventAttributes')) {
      cache.runtimeEventAttributes = new Map();
    }

    const id = `${eventModule}-${eventName}`;
    let attributesCache = cache.runtimeEventAttributes!.get(id);

    if (!attributesCache) {
      attributesCache = new ReplaySubject(1);
      cache.runtimeEventAttributes!.set(id, attributesCache);

      this.pa.run().getRuntimeEventAttributes((cache.runtime.value as types.Runtime).specName, specVersion, eventModule, eventName).pipe(
        switchMap((obs) => obs.length ? combineLatest(obs) : of([]))
      ).subscribe({
        next: (items) => {
          attributesCache!.next(items);
          attributesCache!.complete();
        },
        error: (e) => {
          console.error(e);
          attributesCache?.error(e);
          cache.runtimeEventAttributes?.delete(id);
        }
      });
    }

    return attributesCache;
  }


  getRuntimeCalls(network: string, specVersion: number): ReplaySubject<types.RuntimeCall[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeCalls')) {
      const runtimeCalls = cache.runtimeCalls = new ReplaySubject(1);
      this.pa.run({observableResults: false}).getRuntimeCalls((cache.runtime.value as types.Runtime).specName, specVersion).subscribe({
        next: (items) => {
          runtimeCalls.next(items);
          runtimeCalls.complete();
        },
        error: (e) => {
          console.error(e);
          delete cache.runtimeCalls;
        }
      });
    }

    return cache.runtimeCalls!;
  }


  getRuntimeCallArguments(network: string, specVersion: number, callModule: string, callName: string): ReplaySubject<types.RuntimeCallArgument[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeCallArguments')) {
      cache.runtimeCallArguments = new Map();
    }

    const id = `${callModule}-${callName}`;
    let argumentsCache = cache.runtimeCallArguments!.get(id);

    if (!argumentsCache) {
      argumentsCache = new ReplaySubject<types.RuntimeCallArgument[]>(1);
      cache.runtimeCallArguments!.set(id, argumentsCache);

      this.pa.run().getRuntimeCallArguments((cache.runtime.value as types.Runtime).specName, specVersion, callModule, callName).pipe(
        switchMap((obs) => obs.length ? combineLatest(obs) : of([]))
      ).subscribe({
        next: (items) => {
          argumentsCache?.next(items);
          argumentsCache?.complete();
        },
        error: (e) => {
          console.error(e);
          argumentsCache?.error(e);
          cache.runtimeCallArguments?.delete(id);
        }
      });
    }

    return argumentsCache;
  }


  getRuntimeStorages(network: string, specVersion: number): ReplaySubject<types.RuntimeStorage[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeStorages')) {
      const runtimeStorages = cache.runtimeStorages = new ReplaySubject(1);
      this.pa.run({observableResults: false}).getRuntimeStorages((cache.runtime.value as types.Runtime).specName, specVersion).subscribe({
        next: (items) => {
          runtimeStorages.next(items);
          runtimeStorages.complete();
        },
        error: (e) => {
          console.error(e);
          delete cache.runtimeStorages
        }
      });
    }

    return cache.runtimeStorages!;
  }


  getRuntimeConstants(network: string, specVersion: number): ReplaySubject<types.RuntimeConstant[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeConstants')) {
      const runtimeConstants = cache.runtimeConstants = new ReplaySubject(1);
      this.pa.run({observableResults: false}).getRuntimeConstants((cache.runtime.value as types.Runtime).specName, specVersion).subscribe({
        next: (items) => {
          runtimeConstants.next(items);
          runtimeConstants.complete();
        },
        error: (e) => {
          console.error(e);
          delete cache.runtimeConstants
        }
      });
    }

    return cache.runtimeConstants!;
  }


  getRuntimeErrorMessages(network: string, specVersion: number): ReplaySubject<types.RuntimeErrorMessage[]> {
    const cache = this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeErrorMessages')) {
      const runtimeErrorMessages = cache.runtimeErrorMessages = new ReplaySubject(1);
      this.pa.run({observableResults: false}).getRuntimeErrorMessages((cache.runtime.value as types.Runtime).specName, specVersion).subscribe({
        next: (items) => {
          runtimeErrorMessages.next(items);
          runtimeErrorMessages.complete();
        },
        error: (e) => {
          console.error(e);
          delete cache.runtimeErrorMessages
        }
      });
    }

    return cache.runtimeErrorMessages!;
  }
}
