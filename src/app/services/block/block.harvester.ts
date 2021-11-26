/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2021 Polkascan Foundation (NL)
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

import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { AugmentedApi } from '../polkadapt.service';
import { Polkadapt } from '@polkadapt/core';
import { Header } from '@polkadot/types/interfaces';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { filter, first, timeoutWith } from 'rxjs/operators';

export type Block = Partial<pst.Block> & {
  status: 'new' | 'loading' | 'loaded',
  number: number,
  finalized: boolean,
  extrinsics: (pst.Extrinsic | undefined)[],
  events: (pst.Event | undefined)[]
};

export type BlockSubject = BehaviorSubject<Block>;

type BlockCache = { [nr: string]: BlockSubject };

export class BlockHarvester {
  private unsubscribeNewHeads: (() => void) | null;
  private unsubscribeNewBlocks: (() => void) | null;
  private readonly cache: BlockCache = {};
  headNumber = new BehaviorSubject<number>(0);
  finalizedNumber = new BehaviorSubject<number>(0);
  loadedNumber = new BehaviorSubject<number>(0);
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
        .polkascan.chain.subscribeNewBlock((block: pst.Block) => this.finalizedBlockHandler(block));
    }
  }

  private newHeadHandler(header: Header): void {
    const newNumber = header.number.toNumber();
    if (newNumber > this.headNumber.value) {
      this.headNumber.next(newNumber);
      // Preload block data.
      const block: Block = Object.assign({}, this.cache[newNumber].value);
      block.hash = header.hash.toString();
      block.parentHash = header.parentHash.toString();
      block.extrinsicsRoot = header.extrinsicsRoot.toString();
      block.stateRoot = header.stateRoot.toString();
      this.cache[newNumber].next(block);
      this.loadBlock(newNumber).then();
    }
  }

  private finalizedBlockHandler(block: pst.Block): void {
    if (!block || !block.number) {
      return;
    }
    const newNumber = block.number;
    if (newNumber > this.finalizedNumber.value) {
      // If a non-finalized cache entry exists for this number, update it.
      const cached = this.cache[newNumber];
      if (!cached.value.finalized) {
        cached.next(Object.assign({}, cached.value, block, {
          status: 'loaded',
          finalized: true,
          extrinsics: new Array(block.countExtrinsics),
          events: new Array(block.countEvents)
        }));
      }
      this.finalizedNumber.next(newNumber);
      if (newNumber > this.loadedNumber.value) {
        this.loadedNumber.next(newNumber);
      }
    }
  }

  private async loadBlock(nr: number): Promise<void> {
    const cached = this.cache[nr];
    // We need to know what the latest numbers are.
    const headNumber = this.headNumber.value;
    const finalizedNumber = this.finalizedNumber.value;
    if (headNumber || finalizedNumber) {
      let block = Object.assign({}, cached.value);
      if (block.number > headNumber || block.status !== 'new') {
        return;
      }
      block.status = 'loading';
      cached.next(block);

      if (block.number <= finalizedNumber) {
        // Load finalized data from Polkascan.
        block = Object.assign(block, await this.polkadapt.run({
          chain: this.network,
          adapters: ['substrate-rpc']
        }).polkascan.chain.getBlock(block.number));
        block.finalized = true;
        block.extrinsics = new Array(block.countExtrinsics);
        block.events = new Array(block.countEvents);
        block.status = 'loaded';
        cached.next(block);
      } else {
        // Load data from substrate rpc.
        if (!block.hash) {
          block.hash = (await this.polkadapt.run(this.network).rpc.chain.getBlockHash(block.number)).toString();
        }
        const [signedBlock, allEvents, timestamp] = await Promise.all([
          this.polkadapt.run({chain: this.network, adapters: ['substrate-rpc']}).rpc.chain.getBlock(block.hash),
          this.polkadapt.run(this.network).query.system.events.at(block.hash),
          this.polkadapt.run(this.network).query.timestamp.now.at(block.hash)
        ]);
        // If finalized data is already loaded into this block, ignore data from rpc node.
        if (cached.value.status !== 'loaded') {
          block.parentHash = signedBlock.block.header.parentHash.toString();
          block.extrinsicsRoot = signedBlock.block.header.extrinsicsRoot.toString();
          block.stateRoot = signedBlock.block.header.stateRoot.toString();
          block.datetime = timestamp.toString();
          block.extrinsics = new Array(signedBlock.block.extrinsics.length);
          block.events = new Array(allEvents.length);
          block.status = 'loaded';
          cached.next(block);
        }
      }
      if (nr > this.loadedNumber.value) {
        this.loadedNumber.next(nr);
      }
    }
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
    this.headNumber.next(0);
    this.finalizedNumber.next(0);
  }

  resume(): void {
    this.paused = false;
    this.subscribeNewBlocks().then();
  }

  async loadBlocksUntil(untilNumber: number | null, pageSize: number): Promise<void> {
    // Helper function to efficiently load a list of latest finalized blocks.
    // First mark these cached blocks for load, so other block loading mechanisms don't kick in.
    untilNumber = untilNumber || this.finalizedNumber.value;
    let loadBlocks = false;
    for (let nr = untilNumber; nr > untilNumber - pageSize; nr--) {
      if (this.cache[nr].value.status !== 'loaded') {
        this.cache[nr].next(Object.assign(this.cache[nr].value, {status: 'loading'}));
        loadBlocks = true;
      }
    }

    if (loadBlocks) {
      // Then, await the result from Polkascan and update our cached block data.
      const data: pst.ListResponse<pst.Block> =
        await this.polkadapt.run(this.network).polkascan.chain.getBlocksUntil(untilNumber, pageSize);

      if (data.objects) {
        for (const obj of data.objects) {
          const blockNr: number = obj.number;
          const cached: BehaviorSubject<Block> = this.cache[blockNr];
          if (!cached.value.finalized || cached.value.status !== 'loaded') {
            const block: Block = Object.assign({}, cached.value, obj, {
              status: 'loaded',
              finalized: true,
              extrinsics: new Array(obj.countExtrinsics),
              events: new Array(obj.countEvents)
            });
            cached.next(block);
          }
          if (blockNr > this.loadedNumber.value) {
            this.loadedNumber.next(blockNr);
          }
        }
      }
    }
  }

  destroy(): void {
    this.pause();
  }
}
