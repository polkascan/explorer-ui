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
import { BehaviorSubject, debounceTime, filter, skip, take } from 'rxjs';
import { PolkadaptService } from './polkadapt.service';
import { BlockHarvester } from './block/block.harvester';
import { BlockService } from './block/block.service';
import { RuntimeService } from './runtime/runtime.service';
import { PricingService } from './pricing.service';
import { VariablesService } from './variables.service';
import { defaults as addressDefaults } from '@polkadot/util-crypto/address/defaults';
import { IconTheme } from '../../common/identicon/identicon.types';
import { getSystemIcon } from '../../common/identicon/polkadot-js';
import { types } from '@polkadapt/core'
import { takeUntil } from 'rxjs/operators';


export interface NetworkProperties {
  ss58Format: number;
  tokenSymbol: string;
  tokenDecimals: number;
  systemName: string | null;
  specName: string | null;
  iconTheme: IconTheme;
  blockTime?: number | null;
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

  setNetwork(network: string): void {
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
      this.pa.setNetwork(network);
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

      this.currentNetwork.next(network);
      this.rs.initialize(network);
      this.ps.initialize(network, this.vs.currency.value);

      this.pa.run({observableResults: false}).getChainProperties()
        .pipe(
          filter((properties) => Boolean((properties.systemName) && properties.specName))
        ).subscribe({
        next: (properties: types.ChainProperties) => {
          const name: string = properties.systemName as string;
          const ss58Format: number = properties.chainSS58 ?? this.defaultSS58;
          const tokenSymbol: string = (properties.chainTokens && properties.chainTokens[0]) ?? this.defaultSymbol;
          const tokenDecimals: number = (properties.chainDecimals && properties.chainDecimals[0]) ?? this.defaultDecimals;
          const iconTheme: IconTheme = name && properties.specName && getSystemIcon(name, properties.specName) || 'substrate';

          this.currentNetworkProperties.next({
            ss58Format: ss58Format,
            tokenSymbol: tokenSymbol,
            tokenDecimals: tokenDecimals,
            systemName: name,
            specName: properties.specName,
            iconTheme: iconTheme,
            blockTime: properties.blockTime,
          });

          // Check if blocks are coming in at the expected block time. If not, trigger reload connection.
          try {
            if (Number.isInteger(properties.blockTime)) {
              this.blockHarvester.headNumber.pipe(
                skip(1), // Ignore the initial value (or first block)
                debounceTime((properties.blockTime! + 10000)), // 10 seconds after the last expected block
                takeUntil(this.currentNetwork.pipe( // Stop the subscription when the network changes.
                  filter((n: string) => network !== n),
                  take(1))
                )
              ).subscribe({
                next: (v) => this.pa.triggerReconnect.next(v)
              })
            }
          } catch (e) {
            // The expected block time is unknown. No need to do anything.
          }
        }
      });
    }
  }

  destroy(): void {
    this.ps.destroy();
    this.pa.clearNetwork();
    this.currentNetwork.next('');
    this.settingNetwork = '';
  }
}
