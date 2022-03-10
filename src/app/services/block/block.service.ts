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
