import { BehaviorSubject } from 'rxjs';
import { AugmentedApi } from '../polkadapt.service';
import { Polkadapt } from '@polkadapt/core';
import { Header } from '@polkadot/types/interfaces';
import * as polkascanTypes from '@polkadapt/polkascan/lib/polkascan.types';

export type Block = {
  number: number,
  finalized: boolean,
  extrinsics: number[],
  events: number[]
  hash?: string,
};

export type BlockSubject = BehaviorSubject<Block>;

type BlockCache = { [nr: string]: BlockSubject };

export class BlockHarvester {
  private unsubscribeNewHeads: (() => void) | null;
  private unsubscribeNewBlocks: (() => void) | null;
  private cache: BlockCache = {};
  headNumber = new BehaviorSubject<number>(0);
  finalizedNumber = new BehaviorSubject<number>(0);
  blocks: BlockCache;
  paused = false;

  constructor(public polkadapt: Polkadapt<AugmentedApi>, public network: string) {
    // Create a block cache where data is lazy loaded when you get an item.
    this.blocks = new Proxy(this.cache, {
      get: (cache, nr: string) => {
        let cached = cache[nr];
        if (!cached) {
          cached = cache[nr] = new BehaviorSubject<Block>({
            number: parseInt(nr, 10), finalized: false, extrinsics: [], events: []
          });
          this.loadBlock(cached).then(block => {
            cached.next(block);
          });
        }
        return cached;
      }
    });

    // Get latest finalized block.
    this.polkadapt.run(network).polkascan.getBlock().then((block: polkascanTypes.Block) => this.finalizedBlockHandler(block));

    this.subscribeNewBlocks();
  }

  private subscribeNewBlocks(): void {
    if (!this.unsubscribeNewHeads) {
      // Subscribe to new blocks *without finality*.
      this.polkadapt.run(this.network).rpc.chain.subscribeNewHeads((header: Header) => {
        const newNumber = header.number.toNumber();
        if (newNumber > this.headNumber.value) {
          this.headNumber.next(newNumber);
        }
      }).then((unsub: () => void) => {
        this.unsubscribeNewHeads = unsub;
      });
    }

    if (!this.unsubscribeNewBlocks) {
      // Subscribe to new finalized blocks from Polkascan.
      this.polkadapt.run(this.network)
        .polkascan.subscribeNewBlock((block: polkascanTypes.Block) => this.finalizedBlockHandler(block)).then((unsub: () => void) => {
        this.unsubscribeNewBlocks = unsub;
      });
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
      if (cached && !cached.value.finalized) {
        cached.next({
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

  private async loadBlock(blockSubject: BlockSubject): Promise<Block> {
    const block = Object.assign({}, blockSubject.value);
    if (!block.finalized && block.number <= this.finalizedNumber.value) {
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
    return block;
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

  public pause(): void {
    this.paused = true;
    this.unsubscribeHeads();
  }

  public resume(): void {
    this.paused = false;
    this.subscribeNewBlocks();
  }

  public async loadLatestNewBlocks(pageSize = 100): Promise<void> {
    // Helper function to efficiently load a list of latest finalized blocks.
    const data: {blocks: polkascanTypes.Block[], pageInfo: any} = await this.polkadapt.run(this.network)
      .polkascan.getBlocksFrom(this.finalizedNumber.value, pageSize);
    if (data.blocks) {
      for (const item of data.blocks) {
        const blockData: Block = {
          finalized: true,
          number: item.number,
          hash: item.hash,
          extrinsics: new Array(item.countExtrinsics),
          events: new Array(item.countEvents)
        };
        this.blocks[item.number].next(blockData);
      }
    }
  }

  destroy(): void {
    this.unsubscribeHeads();
  }
}
