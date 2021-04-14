import { Injectable } from '@angular/core';
import { PolkadaptService } from '../polkadapt.service';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { BehaviorSubject } from 'rxjs';
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
  runtimeTypes?: pst.RuntimeType[];
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

  async initialize(network: string): Promise<void> {
    if (!network) {
      throw new Error(`[RuntimeService] initialize: network was not provided.`);
    }

    if (this.latestRuntimes[network]) {
      // TODO probably check if we are waiting for a response, if not, request again.
      return;
    } else {
      this.latestRuntimes[network] = new BehaviorSubject<pst.Runtime | null>(null);
    }

    const runtime = await this.pa.run().polkascan.state.getLatestRuntime();

    this.latestRuntimes[network].next(runtime);
    this.cacheRuntime(network, runtime);
    // TODO what more to prefetch?
  }


  cacheRuntime(network: string, runtime: pst.Runtime): void {
    const version = runtime.specVersion;
    const cache: RuntimeCacheMap = this.runtimes[network] = this.runtimes[network] || new Map();

    if (!cache.has(version)) {
      cache.set(version, {runtime: new BehaviorSubject<pst.Runtime | null>(runtime)});
    } else {
      (cache.get(version) as RuntimeCache).runtime.next(runtime);
    }
  }


  getRuntime(network: string, specVersion?: number): BehaviorSubject<pst.Runtime | null> {
    if (typeof specVersion !== 'number' || specVersion < 0) {
      // Without given specVersion, return latest runtime.
      this.initialize(network).then();
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
    }

    this.latestRuntimes[network]
    .pipe(
      filter(r => r !== null),
      map((r: pst.Runtime | null): string => (r as pst.Runtime).specName),
      first()
    ).subscribe(async (specName) => {
      const runtime = await this.pa.run().polkascan.state.getRuntime(specName, specVersion);
      cachedRuntime.next(runtime);
    });

    return cachedRuntime;
  }


  getRuntimes(network: string): BehaviorSubject<pst.Runtime[]> {
    const bs = new BehaviorSubject<pst.Runtime[]>([]);

    if (this.runtimes[network]) {
      bs.next([...this.runtimes[network].values()]
        .filter((r) => !!r.runtime.value)
        .map((r) => r.runtime.value as pst.Runtime));
    }

    this.pa.run().polkascan.state.getRuntimes().then(
      (response: pst.ListResponse<pst.Runtime>) => {
        bs.next(response.objects);
      },
      (errorResponse: any) => {
        console.error(errorResponse);
      });

    return bs;
  }


  private async getRuntimeCache(network: string, specVersion: number): Promise<RuntimeCache & RuntimeCacheAttributes> {
    if (!this.runtimes[network] && !this.runtimes[network].has(specVersion)) {
      throw new Error('There is no runtime loading with this specVersion. Please initiate loading of the runtime first.');
    }

    const cache = this.runtimes[network].get(specVersion) as RuntimeCache & RuntimeCacheAttributes;

    if (!cache.runtime.value) {
      throw new Error('There is no runtime loaded with this specVersion yet. Please wait and try again or re-initiate loading of the runtime.');
    }

    return cache;
  }


  async getRuntimePallets(network: string, specVersion: number): Promise<pst.RuntimePallet[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimePallets')) {
      const response = await this.pa.run().polkascan.state.getRuntimePallets((cache.runtime.value as pst.Runtime).specName, specVersion);
      cache.runtimePallets = response.objects;
    }

    return cache.runtimePallets as pst.RuntimePallet[];
  }


  async getRuntimeEvents(network: string, specVersion: number): Promise<pst.RuntimeEvent[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeEvents')) {
      const response = await this.pa.run().polkascan.state.getRuntimeEvents((cache.runtime.value as pst.Runtime).specName, specVersion);
      cache.runtimeEvents = response.objects;
    }

    return cache.runtimeEvents as pst.RuntimeEvent[];
  }


  async getRuntimeCalls(network: string, specVersion: number): Promise<pst.RuntimeCall[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeCalls')) {
      const response = await this.pa.run().polkascan.state.getRuntimeCalls((cache.runtime.value as pst.Runtime).specName, specVersion);
      cache.runtimeCalls = response.objects;
    }

    return cache.runtimeCalls as pst.RuntimeCall[];
  }


  async getRuntimeStorages(network: string, specVersion: number): Promise<pst.RuntimeStorage[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeStorage')) {
      const response = await this.pa.run().polkascan.state.getRuntimeStorages((cache.runtime.value as pst.Runtime).specName, specVersion);
      cache.runtimeStorages = response.objects;
    }

    return cache.runtimeStorages as pst.RuntimeStorage[];
  }


  async getRuntimeConstants(network: string, specVersion: number): Promise<pst.RuntimeConstant[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeConstant')) {
      const response = await this.pa.run().polkascan.state.getRuntimeConstants((cache.runtime.value as pst.Runtime).specName, specVersion);
      cache.runtimeConstants = response.objects;
    }

    return cache.runtimeConstants as pst.RuntimeConstant[];
  }


  async getRuntimeErrorMessages(network: string, specVersion: number): Promise<pst.RuntimeErrorMessage[]> {
    const cache = await this.getRuntimeCache(network, specVersion);

    if (!cache.hasOwnProperty('runtimeErrorMessages')) {
      const response = await this.pa.run().polkascan.state.getRuntimeErrorMessages(
        (cache.runtime.value as pst.Runtime).specName, specVersion);
      cache.runtimeErrorMessages = response.objects;
    }

    return cache.runtimeErrorMessages as pst.RuntimeErrorMessage[];
  }
}
