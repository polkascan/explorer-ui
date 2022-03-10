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

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges,
  ViewEncapsulation,
  OnDestroy
} from '@angular/core';
import { IconTheme } from '../identicon/identicon.types';
import { Prefix } from '@polkadot/util-crypto/address/types';
import { encodeAddress } from '@polkadot/util-crypto';
import { HexString } from '@polkadot/util/types';
import { isHex, isU8a } from '@polkadot/util';
import { ActivatedRoute } from '@angular/router';
import { TooltipsService } from '../../app/services/tooltips.service';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { asObservable } from '../polkadapt-rxjs';
import { PolkadaptService } from '../../app/services/polkadapt.service';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { DeriveAccountInfo } from '@polkadot/api-derive/types';

@Component({
  selector: 'account-id',
  template: `
    <ng-container *ngIf="(encoded | async) as encodedAddress">

      <identicon *ngIf="!hideIdenticon" [value]="encodedAddress" [theme]="iconTheme" [size]="iconSize"
                 [prefix]="ss58Prefix" (copied)="copied($event)"></identicon>

      <ng-template #noAccount>
        <a class="account-id-address account-id-judgement-unknown" [routerLink]="'account/' + encodedAddress"
           [relativeTo]="relativeToRoute">
          <span class="account-id-address-ss58 mono">{{ encodedAddress }}</span>
        </a>
      </ng-template>

      <ng-container *ngIf="(derivedAccountInfo | async) as dai; else noAccount">
        <a class="account-id-address account-id-judgement-{{ (accountJudgement | async) || 'unknown' }}"
           [routerLink]="'account/' + encodedAddress" [relativeTo]="relativeToRoute">
          <ng-container *ngIf="$any(dai).identity as idn">
            <ng-container [ngSwitch]="!!(idn.displayParent || idn.display)">
              <ng-container *ngSwitchCase="true">
                <span class="account-id-labels">
                  <span class="material-icons account-id-badge">
                    <ng-container [ngSwitch]="accountJudgement | async">
                      <ng-container *ngSwitchCase="'isGood'">check_circle</ng-container>
                      <ng-container *ngSwitchDefault>remove_circle</ng-container>
                    </ng-container>
                  </span>
                  <span class="account-id-name-container">
                      <ng-container [ngSwitch]="!!idn.parent">
                        <ng-container *ngSwitchCase="true"><span
                          class="account-id-name">{{ idn.displayParent }}</span></ng-container>
                        <ng-container *ngSwitchDefault><span
                          class="account-id-name">{{ idn.display }}</span></ng-container>
                      </ng-container>
                      <ng-container *ngIf="idn.displayParent && idn.display"> / {{ idn.display }}</ng-container>
                  </span>
                </span>
              </ng-container>

              <ng-container *ngSwitchDefault>
                <span class="account-id-address-ss58 mono">{{ encodedAddress }}</span>
              </ng-container>

            </ng-container>
          </ng-container>
        </a>
      </ng-container>

    </ng-container>
  `,
  styles: [`
    account-id {
      display: flex;
      flex-wrap: nowrap;
      justify-content: flex-start;
      align-items: center;

      identicon {
        margin-right: 0.3rem;
      }
    }

    .account-id-address {
      text-decoration: none;
    }

    .account-id-labels {
      display: block;
    }

    .account-id-address-ss58,
    .account-id-name-container {
      color: #000;
      opacity: 66%;
      filter: grayscale(1);
      vertical-align: middle;
    }

    .account-id-badge {
      vertical-align: middle;
      margin-right: 0.2rem;
      font-size: 14px;
    }

    .account-id-judgement-unknown {
      filter: grayscale(1);
      opacity: 0.7;
    }

    .account-id-judgement-isGood {
      .account-id-name-container {
        opacity: 1;
      }

      .account-id-badge {
        color: var(--ps-badge-good-color);
      }
    }

    .account-id-judgement-isBad {
      .account-id-badge {
        color: var(--ps-badge-bad-color);
      }
    }

  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountIdCommonComponent implements OnInit, OnChanges, OnDestroy {
  @Input() address: HexString | Uint8Array | string;
  @Input() hideIdenticon?: boolean;
  @Input() iconTheme?: IconTheme;
  @Input() iconSize?: number;
  @Input() ss58Prefix?: Prefix;

  derivedAccountInfo: Observable<DeriveAccountInfo>;
  accountJudgement: Observable<string>;

  relativeToRoute: ActivatedRoute | undefined;
  encoded: BehaviorSubject<string> = new BehaviorSubject('');

  private destroyer: Subject<undefined> = new Subject();

  constructor(private route: ActivatedRoute,
              private pa: PolkadaptService,
              private ts: TooltipsService) {
  }

  ngOnInit(): void {
    const network = this.route.snapshot.paramMap && this.route.snapshot.paramMap.get('network');
    if (network) {
      this.relativeToRoute = this.route.pathFromRoot.find(routePart => routePart.snapshot.url[0]?.path === network);
    }

    this.derivedAccountInfo = this.encoded.pipe(
      switchMap((address: string) => {
        if (!address) {
          return of(null);
        }
        return asObservable(this.pa.run().derive.accounts.info, address).pipe(takeUntil(this.destroyer));
      })
    );

    this.accountJudgement = this.derivedAccountInfo.pipe(
      map((dai) => {
        if (dai && dai.identity && dai.identity.judgements) {
          const judgements = dai.identity.judgements.map((j) => j[1].toString());
          if (judgements.find((j) => j === 'LowQuality')) {
            return 'isBad';
          }

          if (judgements.find((j) => j === 'KnownGood' || j === 'Reasonable')) {
            return 'isGood';
          }
        }
        return '';
      }),
      catchError((e) => of(''))
    )
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['address']) {
      const value = changes['address'].currentValue;
      let address = '';

      if (value) {
        address = isU8a(value) || isHex(value)
          ? encodeAddress(value, this.ss58Prefix)
          : (value || '');
      }

      this.encoded.next(address);
    }
  }

  ngOnDestroy() {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }

  copied(address: string) {
    this.ts.notify.next(
      `Address copied.<br><span class="mono">${address}</span>`);
  }
}
