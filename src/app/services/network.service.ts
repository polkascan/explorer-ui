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
import { BehaviorSubject, skip, take } from 'rxjs';
import { PolkadaptService } from './polkadapt.service';
import { BlockHarvester } from './block/block.harvester';
import { BlockService } from './block/block.service';
import { RuntimeService } from './runtime/runtime.service';
import { PricingService } from './pricing.service';
import { VariablesService } from './variables.service';
import { ChainProperties } from '@polkadot/types/interfaces';
import { defaults as addressDefaults } from '@polkadot/util-crypto/address/defaults';
import { IconTheme } from '../../common/identicon/identicon.types';
import { getSystemIcon } from '../../common/identicon/polkadot-js';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';


export interface NetworkProperties {
  ss58Format: number;
  tokenSymbol: string;
  tokenDecimals: number;
  systemName?: string;
  specName?: string;
  systemVersion?: string;
  iconTheme: IconTheme;
}


@Injectable({providedIn: 'root'})
export class NetworkService {
  private settingNetwork: string;
  private settingNonce = 0;
  currentNetwork = new BehaviorSubject<string>('');
  currentNetworkProperties = new BehaviorSubject<NetworkProperties | undefined>(undefined);
  blockHarvester: BlockHarvester
  online: BehaviorSubject<boolean>;

  private defaultDecimals = 12;
  private defaultSS58 = addressDefaults.prefix;
  private defaultSymbol = 'UNIT';

  constructor(private pa: PolkadaptService,
              private bs: BlockService,
              private rs: RuntimeService,
              private ps: PricingService,
              private vs: VariablesService) {
    this.online = new BehaviorSubject(navigator.onLine);
    window.addEventListener('online', () => this.online.next(true));
    window.addEventListener('offline', () => this.online.next(false));
  }

  async setNetwork(network: string): Promise<void> {
    // Only if we set a new network, we will continue.
    if (!network || network === this.settingNetwork) {
      return;
    }

    const nonce: number = this.settingNonce = this.settingNonce + 1;
    this.settingNetwork = network;
    if (this.currentNetworkProperties.value) {
      this.currentNetworkProperties.next(undefined);
    }

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

    const runOnRPC = {chain: network, adapters: ['substrate-rpc']};

    // Only the last of concurring calls to this function will continue on the code below.
    if (network) {
      this.blockHarvester = this.bs.getBlockHarvester(network, true);
      if (this.blockHarvester.paused) {
        this.blockHarvester.resume();
      }

      this.ps.initialize(network, this.vs.currency.value);
      this.rs.initialize(network);

      let chainSS58: number | undefined;
      let chainDecimals: number[] | undefined;
      let chainTokens: string[] | undefined;
      let systemName: string | undefined;
      let specName: string | undefined;
      let systemVersion: string | undefined;
      let properties: ChainProperties | undefined;

      try {
        chainSS58 = await this.pa.run(runOnRPC).registry.chainSS58;
        chainDecimals = await this.pa.run(runOnRPC).registry.chainDecimals;
        chainTokens = await this.pa.run(runOnRPC).registry.chainTokens;
      } catch (e) {
        console.error(e);
      }

      try {
        systemName = (await this.pa.run(runOnRPC).rpc.system.name())?.toString();
        specName = await this.pa.run(runOnRPC).runtimeVersion.specName?.toString();
        systemVersion = (await this.pa.run(runOnRPC).rpc.system.version())?.toString();
      } catch (e) {
        console.error(e);
      }

      try {
        properties = await this.pa.run(runOnRPC).rpc.system.properties();
        if (properties) {
          chainSS58 = chainSS58 ?? ((properties.ss58Format || (properties as any).ss58Prefix).isSome
            ? (properties.ss58Format || (properties as any).ss58Prefix).toJSON() as number
            : undefined);
          chainTokens = chainTokens ?? ((properties.tokenSymbol && properties.tokenSymbol.isSome)
            ? properties.tokenSymbol.toJSON() as string[]
            : undefined);
          chainDecimals = chainDecimals ?? ((properties.tokenDecimals && properties.tokenDecimals.isSome)
            ? properties.tokenDecimals.toJSON() as number[]
            : undefined);
        }

      } catch (e) {
        console.error(e);
      }

      const ss58Format: number = chainSS58 ?? this.defaultSS58;
      const tokenSymbol: string = (chainTokens && chainTokens[0]) ?? this.defaultSymbol;
      const tokenDecimals: number = (chainDecimals && chainDecimals[0]) ?? this.defaultDecimals;
      const iconTheme: IconTheme = systemName && specName && getSystemIcon(systemName, specName) || 'substrate';

      this.currentNetworkProperties.next({
        ss58Format: ss58Format,
        tokenSymbol: tokenSymbol,
        tokenDecimals: tokenDecimals,
        systemName: systemName,
        specName: specName,
        systemVersion: systemVersion,
        iconTheme: iconTheme
      });
    }

    this.currentNetwork.next(network);

    // Check if blocks are coming in at the expected block time. If not, trigger reload connection.
    try {
      const expectedBlockTime = await this.pa.run(runOnRPC).consts.babe.expectedBlockTime;
      const blockTime: number = (expectedBlockTime as any).toNumber();
      if (Number.isInteger(blockTime)) {
        this.blockHarvester.headNumber.pipe(
          skip(1), // Ignore the initial value (or first block)
          debounceTime((blockTime + 10000)), // 10 seconds after the last expected block
          takeUntil(this.currentNetwork.pipe( // Stop the subscription when the network changes.
            filter((n: string) => network !== n),
            take(1))
          )
        ).subscribe(this.pa.triggerReconnect)
      }
    } catch (e) {
      // The expected block time is unknown. No need to do anything.
    }
  }

  destroy(): void {
    this.ps.destroy();
    this.pa.clearNetwork();
    this.currentNetwork.next('');
    this.settingNetwork = '';
  }
}
