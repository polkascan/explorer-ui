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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import {
  catchError, distinctUntilChanged, filter, first, map, shareReplay, startWith, switchMap, takeUntil
} from 'rxjs/operators';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import {
  DeriveAccountFlags,
  DeriveAccountInfo,
  DeriveBalancesAll,
  DeriveStakingAccount
} from '@polkadot/api-derive/types';
import { BN, BN_ZERO, u8aToHex, u8aToString } from '@polkadot/util';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { AccountId, AccountIndex } from '@polkadot/types/interfaces';
import { Codec } from '@polkadot/types/types';
import { decodeAddress, validateAddress } from '@polkadot/util-crypto';
import { AccountInfo } from '@polkadot/types/interfaces/system/types';
import { asObservable } from '../../../../../../common/polkadapt-rxjs';
import { TooltipsService } from '../../../../../services/tooltips.service';


interface AccountBalance {
  total: BN;
  locked: BN;
  transferable: BN;
  bonded: BN;
  redeemable: BN;
  unbonding: BN;
}

// From account.txs PolkadotJS apps Page-accounts
function calcUnbonding(stakingInfo?: DeriveStakingAccount) {
  if (!stakingInfo?.unlocking) {
    return BN_ZERO;
  }

  const filtered = stakingInfo.unlocking
    .filter(({remainingEras, value}) => value.gt(BN_ZERO) && remainingEras.gt(BN_ZERO))
    .map((unlock) => unlock.value);
  const total = filtered.reduce((total, value) => total.iadd(value), new BN(0));

  return total;
}


// From address-info.txs PolkadotJS apps Page-accounts
function calcBonded(stakingInfo?: DeriveStakingAccount, bonded?: boolean | BN[]): [BN, BN[]] {
  let other: BN[] = [];
  let own = BN_ZERO;

  if (Array.isArray(bonded)) {
    other = bonded
      .filter((_, index) => index !== 0)
      .filter((value) => value.gt(BN_ZERO));

    own = bonded[0];
  } else if (stakingInfo && stakingInfo.stakingLedger && stakingInfo.stakingLedger.active && stakingInfo.accountId.eq(stakingInfo.stashId)) {
    own = stakingInfo.stakingLedger.active.unwrap();
  }

  return [own, other];
}


@Component({
  selector: 'app-account-detail',
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountDetailComponent implements OnInit, OnDestroy {
  id: Observable<string | null>;
  account: Observable<AccountInfo>;
  subs: Observable<any>;
  identity: Observable<any>;
  indices: Observable<any[]>;
  accountIndex: Observable<AccountIndex | undefined>;
  accountId: Observable<AccountId | undefined>;
  accountNonce: Observable<number | undefined>
  superOf: Observable<Codec | undefined>;
  subsOf: Observable<any>;
  subsNames: Observable<string[]>;
  parent: Observable<any>;
  parentIdentity: Observable<any>;
  parentSubsOf: Observable<any>;
  derivedAccountInfo: Observable<DeriveAccountInfo>;
  derivedAccountFlags: Observable<DeriveAccountFlags>;
  derivedBalancesAll: Observable<DeriveBalancesAll>;
  stakingInfo: Observable<DeriveStakingAccount>;
  accountBalances: Observable<Partial<AccountBalance>>;
  accountJudgement: Observable<string>;
  errors = new BehaviorSubject<string | null>(null);

  networkProperties = this.ns.currentNetworkProperties;

  fromBalanceTransfers = new BehaviorSubject<pst.Transfer[]>([]);
  toBalanceTransfers = new BehaviorSubject<pst.Transfer[]>([]);
  balanceTransfers: Observable<pst.Transfer[]>;
  signedExtrinsics = new BehaviorSubject<pst.Extrinsic[]>([]);

  balanceTransferColumns = ['icon', 'block', 'from', 'to', 'value', 'details']
  signedExtrinsicsColumns = ['icon', 'extrinsicID', 'block', 'pallet', 'call', 'details'];

  private listsSize = 50;

  private unsubscribeFns: Map<string, (() => void)> = new Map();
  private destroyer: Subject<undefined> = new Subject();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ns: NetworkService,
    private pa: PolkadaptService,
    private ts: TooltipsService
  ) {
  }

  ngOnInit(): void {
    // Wait for network to be set.
    const idObservable = this.id = this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      // Only continue if a network is set.
      filter(network => !!network),
      // We don't have to wait for further changes to network, so terminate after first.
      first(),
      // Switch to the route param, from which we get the block number.
      switchMap(() => this.route.params.pipe(
        takeUntil(this.destroyer)
      )),
      map(params => params['id']),
      filter(id => !!id),
      distinctUntilChanged(),
      switchMap((id: string) => {
        const n = parseInt(id, 10);
        if (id === n.toString() && Number.isInteger(n)) {
          return asObservable(this.pa.run().query.indices.accounts, n).pipe(
            takeUntil(this.destroyer),
            map((indices) => {
              if (indices && indices.isSome) {
                indices = indices.toJSON();
                if (indices && indices[0]) {
                  return indices[0] as string; // This is the ss58.
                }
              }
              return null;
            })
          )
        } else {
          return of(id);
        }
      }),
      shareReplay(1)
    );

    // Remove all active subscriptions when id changes.
    idObservable.subscribe((id) => {
      this.errors.next(null);
      // Try to create the hex for accountId manually.
      this.unsubscribeFns.forEach((unsub) => unsub());
      this.unsubscribeFns.clear();

      this.fromBalanceTransfers.next([]);
      this.toBalanceTransfers.next([]);
      this.signedExtrinsics.next([]);

      if (id) {
        let validAddress: boolean;
        try {
          validAddress = validateAddress(id);
        } catch (e) {
          validAddress = false;
        }
        if (validAddress) {
          // Check if address belongs to this network/chain.
          try {
            validateAddress(id, false, this.networkProperties.value?.ss58Format);
          } catch (e) {
            validAddress = false;
          }
        }
        if (validAddress) {
          try {
            const accountIdHex = u8aToHex(decodeAddress(id));
            this.fetchAndSubscribeFromTransfers(accountIdHex);
            this.fetchAndSubscribeToTransfers(accountIdHex);
            this.fetchAndSubscribeExtrinsics(accountIdHex);
          } catch (e) {
          }
        } else {
          // Not a valid address.
          this.errors.next('Not a valid address.');
        }
      } else {
        // Account not found.
        this.errors.next('Account not found.');
      }
    });

    this.account = idObservable.pipe(
      switchMap((id) => asObservable(this.pa.run().query.system.account, id).pipe(startWith(undefined), takeUntil(this.destroyer))),
      map((account) => account ? account : undefined)
    );

    const idAndIndexObservable = idObservable.pipe(
      switchMap((id) => asObservable(this.pa.run().derive.accounts.idAndIndex, id).pipe(takeUntil(this.destroyer)))
    );

    this.accountId = idAndIndexObservable.pipe(
      map((val) => val && val[0] ? val[0] : undefined)
    );

    this.accountIndex = idAndIndexObservable.pipe(
      map((val) => val && val[1] ? val[1] : undefined)
    );

    this.accountNonce = this.account.pipe(
      map((account: AccountInfo) => account && account.nonce ? account.nonce.toNumber() : undefined)
    );

    this.indices = this.accountIndex.pipe(
      switchMap((accountIndex) => accountIndex
        ? asObservable(this.pa.run().query.indices.accounts, accountIndex.toNumber()).pipe(takeUntil(this.destroyer))
        : of(undefined)),
    )

    this.superOf = idObservable.pipe(
      switchMap((id) => id ? asObservable(this.pa.run().query.identity.superOf, id).pipe(takeUntil(this.destroyer)) : of(null))
    );

    this.identity = idObservable.pipe(
      switchMap((id) => id ? asObservable(this.pa.run().query.identity.identityOf, id).pipe(takeUntil(this.destroyer)): of(null))
    );

    this.subsOf = idObservable.pipe(
      switchMap((id) => id ? asObservable(this.pa.run().query.identity.subsOf, id).pipe(takeUntil(this.destroyer)) : of(null))
    );

    this.derivedAccountInfo = idObservable.pipe(
      switchMap((id) => id ? asObservable(this.pa.run().derive.accounts.info, id).pipe(takeUntil(this.destroyer)) : of(null))
    );

    this.derivedAccountFlags = idObservable.pipe(
      switchMap((id) => id ? asObservable(this.pa.run().derive.accounts.flags, id).pipe(takeUntil(this.destroyer)) : of(null))
    );

    this.derivedBalancesAll = idObservable.pipe(
      switchMap((id) => id ? asObservable(this.pa.run().derive.balances.all, id).pipe(takeUntil(this.destroyer)) : of(null))
    );

    this.stakingInfo = idObservable.pipe(
      switchMap((id) => id ? asObservable(this.pa.run().derive.staking.account, id).pipe(takeUntil(this.destroyer)) : of(null))
    );

    this.accountBalances = combineLatest(
      this.derivedBalancesAll.pipe(
        catchError(() => {
          return of(undefined);
        })),
      this.stakingInfo.pipe(
        catchError(() => {
          return of(undefined);
        }))
    ).pipe(
      takeUntil(this.destroyer),
      map(([derivedBalancesAll, stakingInfo]) => {
        const balances: any = {};
        if (derivedBalancesAll) {
          balances.locked = derivedBalancesAll.lockedBalance;
          balances.total = derivedBalancesAll.freeBalance.add(derivedBalancesAll.reservedBalance);
          balances.transferable = derivedBalancesAll.availableBalance;
          balances.free = derivedBalancesAll.freeBalance;
          balances.reserved = derivedBalancesAll.reservedBalance;
        }
        if (stakingInfo) {
          balances.bonded = stakingInfo.stakingLedger.active.unwrap() ?? BN_ZERO;
          balances.redeemable = stakingInfo.redeemable ?? BN_ZERO;
          balances.unbonding = calcUnbonding(stakingInfo);
        }
        return balances;
      })
    );

    this.parent = this.superOf.pipe(
      switchMap((val: any) => {
        return val && val.value && val.value[0]
          ? asObservable(this.pa.run().query.system.account, val.value[0]).pipe(takeUntil(this.destroyer))
          : of(undefined)
      })
    )

    this.parentIdentity = this.superOf.pipe(
      switchMap((val: any) => val && val.value && val.value[0]
        ? asObservable(this.pa.run().query.identity.identityOf, val.value[0]).pipe(takeUntil(this.destroyer))
        : of(undefined)),
    )

    this.parentSubsOf = this.superOf.pipe(
      switchMap((val: any) => val && val.value && val.value[0]
        ? asObservable(this.pa.run().query.identity.subsOf, val.value[0]).pipe(takeUntil(this.destroyer))
        : of(undefined))
    )

    this.subsNames = combineLatest(
      this.subsOf.pipe(
        map((subsOf: any) => subsOf && subsOf[1] || [])
      ),
      this.parentSubsOf.pipe(
        map((parentSubsOf: any) => parentSubsOf && parentSubsOf[1] || [])
      )
    ).pipe(
      takeUntil(this.destroyer),
      switchMap(([subsOf, parentSubsOf]) => {
        const subs = subsOf && subsOf.length ? subsOf : parentSubsOf && parentSubsOf.length ? parentSubsOf : [];
        const observables: Observable<any>[] = subs.map((sub: any) => asObservable(this.pa.run().query.identity.superOf, sub).pipe(takeUntil(this.destroyer)))

        if (observables.length > 0) {
          return combineLatest(observables);
        } else {
          return of([]);
        }
      }),
      map((subsSuperOf: any[]) => {
        return subsSuperOf.map((subSuperOf: any) => {
          if (subSuperOf && subSuperOf.value && subSuperOf.value[1]) {
            const value = subSuperOf.value[1];
            return value.isRaw
              ? u8aToString(value.asRaw.toU8a(true))
              : value.isNone
                ? undefined
                : value.toHex();
          } else {
            return '';
          }
        });
      })
    );

    this.subs = combineLatest(
      this.subsOf.pipe(
        map((subsOf: any) => subsOf && subsOf[1] || [])
      ),
      this.parentSubsOf.pipe(
        map((parentSubsOf: any) => parentSubsOf && parentSubsOf[1] || [])
      ),
      this.subsNames
    ).pipe(
      takeUntil(this.destroyer),
      map(([subsOf, parentSubsOf, subsNames]) => {
        const subs = subsOf.length ? subsOf : parentSubsOf.length ? parentSubsOf : [];
        const map = new Map();
        subs.forEach((sub: any, i: number) => {
          map.set(sub, subsNames[i]);
        })
        return map;
      })
    )

    this.balanceTransfers = combineLatest(
      this.toBalanceTransfers,
      this.fromBalanceTransfers
    ).pipe(
      takeUntil(this.destroyer),
      map(([to, from]) => [...to, ...from]
        .sort((a, b) => b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx)
        .slice(0, this.listsSize))
    )

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


  async fetchAndSubscribeExtrinsics(idHex: string): Promise<void> {
    const extrinsics = await this.pa.run().polkascan.chain.getExtrinsics(
      {
        signed: 1,
        multiAddressAccountId: idHex
      }, this.listsSize);

    this.signedExtrinsics.next(extrinsics.objects);

    const signedExtrinsicsUnsubscribeFn = await this.pa.run().polkascan.chain.subscribeNewExtrinsic(
      {
        signed: 1,
        multiAddressAccountId: idHex
      },
      (extrinsic: pst.Extrinsic) => {
        const extrinsics = this.signedExtrinsics.value;
        if (extrinsics && extrinsics.some((e) => e.blockNumber === extrinsic.blockNumber && e.extrinsicIdx === extrinsic.extrinsicIdx) === false) {
          const merged = [extrinsic, ...extrinsics];
          merged.sort((a: pst.Extrinsic, b: pst.Extrinsic) => {
            return b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx;
          });
          merged.length = this.listsSize;
          this.signedExtrinsics.next([extrinsic].concat(extrinsics));
        }
      });

    this.unsubscribeFns.set('signedExtrinsicsUnsubscribeFn', signedExtrinsicsUnsubscribeFn);
  }


  async fetchAndSubscribeFromTransfers(idHex: string): Promise<void> {
    const fromTransfers = await this.pa.run().polkascan.chain.getTransfers(
      {
        fromMultiAddressAccountId: idHex
      }, this.listsSize);
    this.fromBalanceTransfers.next(fromTransfers.objects);
    const fromBalanceTransfersUnsubscribeFn = await this.pa.run().polkascan.chain.subscribeNewTransfer(
      {
        fromMultiAddressAccountId: idHex
      },
      (transfer: pst.Transfer) => {
        const transfers = this.fromBalanceTransfers.value;
        if (transfers && transfers.some((t) => t.blockNumber !== transfer.blockNumber && t.eventIdx !== transfer.eventIdx) === false) {
          const result = [transfer,  ...transfers];
          result.sort((a: pst.Transfer, b: pst.Transfer) => {
            return b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx;
          });
          result.length = this.listsSize
          this.fromBalanceTransfers.next(result);
        }
      });

    this.unsubscribeFns.set('fromBalanceTransfersUnsubscribeFn', fromBalanceTransfersUnsubscribeFn);
  }


  async fetchAndSubscribeToTransfers(idHex: string): Promise<void> {
    const toTransfers = await this.pa.run().polkascan.chain.getTransfers({
      toMultiAddressAccountId: idHex
    }, this.listsSize);
    this.toBalanceTransfers.next(toTransfers.objects);
    const toBalanceTransfersUnsubscribeFn = await this.pa.run().polkascan.chain.subscribeNewTransfer(
      {
        toMultiAddressAccountId: idHex
      },
      (transfer: pst.Transfer) => {
        const transfers = this.toBalanceTransfers.value;
        if (transfers && transfers.some((t) => t.blockNumber !== transfer.blockNumber && t.eventIdx !== transfer.eventIdx) === false) {
          const result = [transfer, ...transfers];
          result.sort((a: pst.Transfer, b: pst.Transfer) => {
            return b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx;
          });
          result.length = this.listsSize
          this.toBalanceTransfers.next(result);
        }
      });

    this.unsubscribeFns.set('toBalanceTransfersUnsubscribeFn', toBalanceTransfersUnsubscribeFn);
  }


  ngOnDestroy(): void {
    this.unsubscribeFns.forEach((unsub) => unsub());
    this.unsubscribeFns.clear();
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }


  signedExtrinsicTrackBy(i: any, extrinsic: pst.Extrinsic): string {
    return `${extrinsic.blockNumber}-${extrinsic.extrinsicIdx}`;
  }


  balanceTransfersTrackBy(i: any, transfer: pst.Transfer): string {
    return `${transfer.blockNumber}-${transfer.eventIdx}`;
  }


  copied(address: string) {
    this.ts.notify.next(
      `Address copied.<br><span class="mono">${address}</span>`);
  }
}
