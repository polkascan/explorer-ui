import { BehaviorSubject } from 'rxjs';
import { AugmentedApi } from '../polkadapt.service';
import { Polkadapt } from '@polkadapt/core';
import { Header } from '@polkadot/types/interfaces';
import * as polkascanTypes from '@polkadapt/polkascan/lib/polkascan.types';

export type Block = {
  status: 'new' | 'loading' | 'loaded',
  number: number,
  finalized: boolean,
  extrinsics: number[],
  events: number[]
  hash?: string,
};

export type BlockSubject = BehaviorSubject<Block>;

type BlockCache = {[nr: string]: BlockSubject};

export class BlockHarvester {
  private unsubscribeNewHeads: (() => void) | null;
  private unsubscribeNewBlocks: (() => void) | null;
  private readonly cache: BlockCache = {};
  headNumber = new BehaviorSubject<number>(0);
  finalizedNumber = new BehaviorSubject<number>(0);
  blocks: BlockCache;
  paused = false;

  constructor(public polkadapt: Polkadapt<AugmentedApi>, public network: string) {
    // Create a block cache where data is lazy loaded when you get an item.
    const cacheTarget: BlockCache = {};
    this.cache = new Proxy(cacheTarget, {
      get: (cache, nr: string) => {
          let cached = cache[nr];
          if (!cached) {
            cached = cache[nr] = new BehaviorSubject<Block>({
              status: 'new', number: parseInt(nr, 10), finalized: false, extrinsics: [], events: []
            });
          }
          return cached;
        }
    });
    this.blocks = new Proxy(this.cache, {
        get: (cache, prop: string) => {
          const nr = parseInt(prop, 10);
          const cached = cache[nr];
          if (cached.value.status === 'new') {
            this.loadBlock(cached.value.number).then();
          }
          return cached;
        }
    });

    this.subscribeNewBlocks().then();
  }

  private async subscribeNewBlocks(): Promise<void> {
    if (!this.unsubscribeNewHeads) {
      // Subscribe to new blocks *without finality*.
      this.unsubscribeNewHeads = await this.polkadapt.run(this.network).rpc.chain.subscribeNewHeads(
        (header: Header) => this.newHeadHandler(header)
      );
    }

    if (!this.unsubscribeNewBlocks) {
      // Subscribe to new finalized blocks from Polkascan.
      this.unsubscribeNewBlocks = await this.polkadapt.run(this.network)
        .polkascan.subscribeNewBlock((block: polkascanTypes.Block) => this.finalizedBlockHandler(block));
    }
  }

  private newHeadHandler(header: Header): void {
    const newNumber = header.number.toNumber();
    if (newNumber > this.headNumber.value) {
      this.headNumber.next(newNumber);
      // Preload block data.
      const block: Block = Object.assign({}, this.cache[newNumber].value);
      block.hash = header.hash.toString();
      this.cache[newNumber].next(block);
      this.loadBlock(newNumber).then();
    }
  }

  private finalizedBlockHandler(block: polkascanTypes.Block): void {
    if (!block || !block.number) {
      return;
    }
    const newNumber = block.number;
    if (newNumber > this.finalizedNumber.value) {
      // If a non-finalized cache entry exists for this number, update it.
      const cached = this.cache[newNumber];
      if (!cached.value.finalized) {
        cached.next({
          status: 'loaded',
          finalized: true,
          number: newNumber,
          hash: block.hash,
          extrinsics: new Array(block.countExtrinsics),
          events: new Array(block.countEvents),
        });
      }
      this.finalizedNumber.next(newNumber);
    }
  }

  private async loadBlock(nr: number): Promise<void> {
    const block = Object.assign({}, this.cache[nr].value);
    if (block.status === 'loading') {
      return;
    }
    block.status = 'loading';
    this.cache[nr].next(block);
    if (block.number <= this.finalizedNumber.value) {
      // Load finalized data from Polkascan.
      const data = await this.polkadapt.run(this.network).polkascan.getBlock(block.number);
      block.finalized = true;
      block.hash = data.hash;
      block.extrinsics = new Array(data.countExtrinsics);
      block.events = new Array(data.countEvents);
    } else {
      // Load data from rpc node.
      if (!block.hash) {
        block.hash = (await this.polkadapt.run(this.network).rpc.chain.getBlockHash(block.number)).toHex();
      }
      const [signedBlock, allEvents] = await Promise.all([
        this.polkadapt.run({chain: this.network, adapters: ['substrate-rpc']}).rpc.chain.getBlock(block.hash),
        this.polkadapt.run(this.network).query.system.events.at(block.hash)
      ]);
      block.extrinsics = new Array(signedBlock.block.extrinsics.length);
      block.events = new Array(allEvents.length);
    }
    block.status = 'loaded';
    this.cache[nr].next(block);
  }

  private unsubscribeHeads(): void {
    if (this.unsubscribeNewHeads) {
      this.unsubscribeNewHeads();
      this.unsubscribeNewHeads = null;
    }
    if (this.unsubscribeNewBlocks) {
      this.unsubscribeNewBlocks();
      this.unsubscribeNewBlocks = null;
    }
  }

  pause(): void {
    this.paused = true;
    this.unsubscribeHeads();
  }

  resume(): void {
    this.paused = false;
    this.subscribeNewBlocks().then();
  }

  async loadLatestBlocks(pageSize = 100): Promise<void> {
    // Helper function to efficiently load a list of latest finalized blocks.
    // First mark these cached blocks for load, so other block loading mechanisms don't kick in.
    const lastNr: number = this.finalizedNumber.value;
    for (let nr = lastNr; nr > lastNr - pageSize; nr--) {
      this.cache[nr].next(Object.assign(this.cache[nr].value, {status: 'loading'}));
    }
    // Then, await the result from Polkascan and update our cached block data.
    const data: {objects: polkascanTypes.Block[], pageInfo: any} = await this.polkadapt.run(this.network)
      .polkascan.getBlocksFrom(this.finalizedNumber.value, pageSize);
    const loaded: number[] = [];
    if (data.objects) {
      for (const obj of data.objects) {
        const blockData: Block = {
          status: 'loaded',
          finalized: true,
          number: obj.number,
          hash: obj.hash,
          extrinsics: new Array(obj.countExtrinsics),
          events: new Array(obj.countEvents)
        };
        loaded.push(obj.number);
        this.cache[obj.number].next(blockData);
      }
    }
    // Any blocks that weren't loaded need to be set to 'new' again.
    for (let nr = lastNr; nr > lastNr - pageSize; nr--) {
      if (!loaded.includes(nr)) {
        this.cache[nr].next(Object.assign(this.cache[nr].value, {status: 'new'}));
      }
    }
  }

  destroy(): void {
    this.unsubscribeHeads();
  }
}
