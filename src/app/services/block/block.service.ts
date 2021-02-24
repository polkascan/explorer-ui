import { Injectable } from '@angular/core';
import { PolkadaptService } from '../polkadapt.service';
import { BlockHarvester } from './block.harvester';

@Injectable({providedIn: 'root'})
export class BlockService {
  private harvesters: {[network: string]: BlockHarvester} = {};

  constructor(private pa: PolkadaptService) {
  }

  getBlockHarvester(network: string, create = false): BlockHarvester {
    if (!this.harvesters[network] && create) {
      this.harvesters[network] = new BlockHarvester(this.pa.polkadapt, network);
    }
    return this.harvesters[network];
  }

  deleteBlockHarvester(network: string): void {
    if (this.harvesters[network]) {
      this.harvesters[network].destroy();
      delete this.harvesters[network];
    }
  }
}
