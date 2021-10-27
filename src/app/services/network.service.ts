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

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PolkadaptService } from './polkadapt.service';
import { BlockHarvester } from './block/block.harvester';
import { BlockService } from './block/block.service';
import { RuntimeService } from './runtime/runtime.service';
import { PricingService } from './pricing.service';
import { VariablesService } from './variables.service';


@Injectable({providedIn: 'root'})
export class NetworkService {
  private settingNetwork: string;
  private settingNonce = 0;
  currentNetwork = new BehaviorSubject<string>('');
  blockHarvester: BlockHarvester
  tokenSymbol: string;
  tokenDecimals: number;

  constructor(private pa: PolkadaptService,
              private bs: BlockService,
              private rs: RuntimeService,
              private ps: PricingService,
              private vs: VariablesService) {
  }

  async setNetwork(network: string): Promise<void> {
    // Only if we set a new network, we will continue.
    if (!network || network === this.settingNetwork) {
      return;
    }

    const nonce: number = this.settingNonce = this.settingNonce + 1;
    this.settingNetwork = network;

    if (this.blockHarvester) {
      // Pause the harvester of the previous network.
      this.blockHarvester.pause();
    }

    try {
      await this.pa.setNetwork(network);
    } catch (e) {
      this.currentNetwork.next('');
      console.error('[NetworkService] Could not switch network.');
    }
    if (network !== this.settingNetwork || this.settingNonce !== nonce) {
      // If network or nonce has changed intermittently (before the 'await' above is resolved), we'll just ignore the
      // rest of this call.
      return;
    }

    // Only the last of concurring calls to this function will continue on the code below.
    if (network) {
      this.blockHarvester = this.bs.getBlockHarvester(network, true);
      if (this.blockHarvester.paused) {
        this.blockHarvester.resume();
      }

      this.ps.initialize(network, this.vs.currency.value);
      this.rs.initialize(network);

      try {
        const props = (await this.pa.run(network).rpc.system.properties()).toHuman();
        this.tokenSymbol = props.tokenSymbol && (props.tokenSymbol as string[])[0] || '';
        this.tokenDecimals = props.tokenDecimals && (props.tokenDecimals as number[])[0] || 0;
      } catch (e) {
        console.error(e);
        this.tokenSymbol = '';
        this.tokenDecimals = 0;
      }
    }

    this.currentNetwork.next(network);
  }

  destroy(): void {
    this.ps.destroy();
    this.pa.clearNetwork();
    this.currentNetwork.next('');
    this.settingNetwork = '';
  }
}
