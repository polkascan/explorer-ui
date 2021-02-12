import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PolkadaptService } from './polkadapt.service';

export type Block = {
  number: number,
  extrinsics: number[],
  events: number[]
  hash?: string,
};

type BlockCache = {[nr: string]: BehaviorSubject<Block>};

export const networks = {
  rococo: 'rococo'
};

export type Network = typeof networks[keyof typeof networks];

@Injectable({providedIn: 'root'})
export class NetworkService {
  currentNetwork: BehaviorSubject<Network> = new BehaviorSubject('');
  private unsubscribeNewHeads: null | (() => void) = null;
  headNumber = new BehaviorSubject<number>(0);
  private cachedBlocks: {[network: string]: BlockCache} = {};
  private blockProxy: BlockCache = {};

  constructor(private pa: PolkadaptService) {
  }

  async setNetwork(network: Network): Promise<void> {
    if (network === this.currentNetwork.value) {
      return;
    }
    this.currentNetwork.next(network);
    try {
      if (this.unsubscribeNewHeads !== null) {
        this.unsubscribeNewHeads();
        this.unsubscribeNewHeads = null;
      }
      await this.pa.setNetwork(network);
      this.setCacheToNetwork(network);
      const noAwait = this.subscribeNewBlocks();
    } catch {
      this.currentNetwork.next('');
      console.error('[NetworkService] Could not switch network'); // TODO Temporary alert.
    }
  }

  private setCacheToNetwork(network: string): void {
    if (!network) {
      this.blockProxy = {};
      return;
    }
    if (!this.cachedBlocks[network]) {
      this.cachedBlocks[network] = {};
    }
    this.blockProxy = new Proxy(this.cachedBlocks[network], {
        get: (cache, nr: number) => {
          let cached = cache[nr];
          if (!cached) {
            cached = cache[nr] = new BehaviorSubject<Block>({number: nr, extrinsics: [], events: []});
            const noAwait = this.loadBlock(cached);
          }
          return cached;
        }
    });
  }

  private async subscribeNewBlocks(): Promise<void> {
    this.unsubscribeNewHeads = await this.pa.run().rpc.chain.subscribeNewHeads((header) => {
      const newNumber = header.number.toNumber();
      if (newNumber === this.headNumber.value) {
        return;
      }
      this.headNumber.next(newNumber);
    });
  }

  get blocks(): BlockCache {
    if (this.currentNetwork.value === '') {
      return {};
    }
    return this.blockProxy;
  }

  private async loadBlock(blockSubject: BehaviorSubject<Block>): Promise<void> {
    const block = Object.assign({}, blockSubject.value);
    if (!block.hash) {
      block.hash = (await this.pa.run().rpc.chain.getBlockHash(block.number)).toHex();
    }
    const signedBlock = await this.pa.run().rpc.chain.getBlock(block.hash);
    const allEvents = await this.pa.run().query.system.events.at(block.hash);
    block.extrinsics = signedBlock.block.extrinsics.map((_, i) => i);
    block.events = allEvents.map((_, i) => i);
    blockSubject.next(block);
    // TODO We probably want to end the Subject at some point: blockSubject.complete();
  }

  destroy(): void {
    if (this.unsubscribeNewHeads !== null) {
      this.unsubscribeNewHeads();
      this.unsubscribeNewHeads = null;
    }
    this.currentNetwork.next('');
    this.pa.polkadapt.unregister();
  }
}
