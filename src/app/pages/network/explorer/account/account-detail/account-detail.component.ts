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
  catchError,
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { BehaviorSubject, combineLatest, Observable, of, Subject, take } from 'rxjs';
import {
  DeriveAccountFlags,
  DeriveAccountInfo,
  DeriveBalancesAll,
  DeriveStakingAccount
} from '@polkadot/api-derive/types';
import { BN, BN_ZERO, u8aToHex } from '@polkadot/util';
import { types as pst } from '@polkadapt/core';
import { decodeAddress, validateAddress } from '@polkadot/util-crypto';
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
  validAddress = new BehaviorSubject<string | null>(null);
  account: Observable<pst.Account | null>;
  subs: Observable<any>;
  identity: Observable<any>;
  accountIndex: Observable<number | null>;
  accountNonce: Observable<number | null>
  subsOf: Observable<string[]>;
  subsNames: Observable<string[]>;
  parentId: Observable<string | null>;
  parentIdentity: Observable<any>;
  parentSubsOf: Observable<string[]>;
  derivedAccountInfo: Observable<DeriveAccountInfo>;
  derivedAccountFlags: Observable<DeriveAccountFlags>;
  derivedBalancesAll: Observable<DeriveBalancesAll>;
  stakingInfo: Observable<DeriveStakingAccount>;
  accountBalances: Observable<Partial<AccountBalance>>;
  accountJudgement: Observable<string>;
  errors = new BehaviorSubject<string | null>(null);

  networkProperties = this.ns.currentNetworkProperties;

  signedExtrinsics = new BehaviorSubject<pst.Extrinsic[]>([]);
  signedExtrinsicsLoading = new BehaviorSubject<boolean>(false);

  fetchAccountInfoStatus = new BehaviorSubject<any>(null);
  polkascanAccountInfo = new BehaviorSubject<pst.TaggedAccount | null>(null);

  balanceTransferColumns = ['icon', 'block', 'from', 'to', 'value', 'details']
  signedExtrinsicsColumns = ['icon', 'extrinsicID', 'block', 'pallet', 'call', 'details'];

  listsSize = 50;
  loadedTabs: { [index: number]: boolean } = {0: true};

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
          // id is an index
          return this.pa.run({observableResults: false}).getAccountIdFromIndex(n).pipe(take(1));
        } else {
          return of(id);
        }
      }),
      map((id) => {
        let validAddress: boolean | undefined;
        if (id) {
          try {
            validAddress = validateAddress(id);
          } catch (e) {
            validAddress = false;
          }
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
          return id;
        }

        return null;
      }),
      shareReplay({
        bufferSize: 1,
        refCount: true
      })
    ) as Observable<string | null>;

    // Remove all active subscriptions when id changes.
    idObservable.subscribe((id) => {
      this.loadedTabs = {0: true};
      this.errors.next(null);
      // Try to create the hex for accountId manually.
      this.unsubscribeFns.forEach((unsub) => unsub());
      this.unsubscribeFns.clear();

      this.signedExtrinsics.next([]);

      if (id) {
        try {
          const accountIdHex = u8aToHex(decodeAddress(id));
          this.validAddress.next(accountIdHex);
          this.fetchAndSubscribeExtrinsics(accountIdHex);
          this.fetchTaggedAccounts(accountIdHex);
        } catch (e) {
        }
      } else {
        // Not a valid address.
        this.validAddress.next(null);
        this.errors.next('Unknown or invalid address.');
      }
    });

    this.account = idObservable.pipe(
      switchMap((id) =>
        id
          ? this.pa.run({observableResults: false}).getAccount(id).pipe(
            takeUntil(this.destroyer),
            startWith(null),
            map((account) => account ? account : null)
          )
          : of(null))
    );

    this.accountIndex = idObservable.pipe(
      switchMap((id) =>
        id
          ? this.pa.run({observableResults: false}).getIndexFromAccountId(id).pipe(
            takeUntil(this.destroyer),
            startWith(null)
          )
          : of(null)
      )
    )

    this.accountNonce = this.account.pipe(
      map((account) => account && account.nonce ? account.nonce : null)
    );

    this.identity = idObservable.pipe(
      switchMap((id) => id
        ? this.pa.run({observableResults: false}).getIdentity(id)
        : of(null))
    );

    this.subsOf = idObservable.pipe(
      switchMap((id) => id
        ? this.pa.run({observableResults: false}).getAccountChildrenIds(id)
        : of([]))
    );

    // this.derivedAccountInfo = idObservable.pipe(
    //   switchMap((id) => id
    //     ? from(apiPromise).pipe(
    //       takeUntil(this.destroyer),
    //       switchMap((api) => api.derive.accounts.info(id).pipe(takeUntil(this.destroyer)))
    //     )
    //     : of(null))
    // ) as Observable<DeriveAccountInfo>;
    //
    // this.derivedAccountFlags = idObservable.pipe(
    //   switchMap((id) => id
    //     ? from(apiPromise).pipe(
    //       takeUntil(this.destroyer),
    //       switchMap((api) => api.derive.accounts.flags(id).pipe(takeUntil(this.destroyer)))
    //     )
    //     : of(null))
    // ) as Observable<DeriveAccountFlags>;
    //
    // this.derivedBalancesAll = idObservable.pipe(
    //   switchMap((id) => id
    //     ? from(apiPromise).pipe(
    //       takeUntil(this.destroyer),
    //       switchMap((api) => api.derive.balances.all(id).pipe(takeUntil(this.destroyer)))
    //     )
    //     : of(null))
    // ) as Observable<DeriveBalancesAll>;
    //
    // this.stakingInfo = idObservable.pipe(
    //   switchMap((id) => id
    //     ? from(apiPromise).pipe(
    //       takeUntil(this.destroyer),
    //       switchMap((api) => api.derive.staking.account(id).pipe(takeUntil(this.destroyer)))
    //     )
    //     : of(null))
    // ) as Observable<DeriveStakingAccount>;
    //
    // this.accountBalances = combineLatest(
    //   this.derivedBalancesAll.pipe(
    //     catchError(() => {
    //       return of(undefined);
    //     })),
    //   this.stakingInfo.pipe(
    //     catchError(() => {
    //       return of(undefined);
    //     }))
    // ).pipe(
    //   takeUntil(this.destroyer),
    //   map(([derivedBalancesAll, stakingInfo]) => {
    //     const balances: any = {};
    //     if (derivedBalancesAll) {
    //       balances.locked = derivedBalancesAll.lockedBalance;
    //       balances.total = derivedBalancesAll.freeBalance.add(derivedBalancesAll.reservedBalance);
    //       balances.transferable = derivedBalancesAll.availableBalance;
    //       balances.free = derivedBalancesAll.freeBalance;
    //       balances.reserved = derivedBalancesAll.reservedBalance;
    //     }
    //     if (stakingInfo) {
    //       balances.bonded = stakingInfo.stakingLedger.active.unwrap() ?? BN_ZERO;
    //       balances.redeemable = stakingInfo.redeemable ?? BN_ZERO;
    //       balances.unbonding = calcUnbonding(stakingInfo);
    //     }
    //     return balances;
    //   })
    // );

    this.parentId = idObservable.pipe(
      switchMap((id) => id
        ? this.pa.run({observableResults: false}).getAccountParentId(id)
        : of(null)
      )
    );

    this.parentIdentity = this.parentId.pipe(
      switchMap((id) => id
        ? this.pa.run({observableResults: false}).getIdentity(id)
        : of(null))
    )

    this.parentSubsOf = this.parentId.pipe(
      switchMap((parentId: any) => parentId
        ? this.pa.run({observableResults: false}).getAccountChildrenIds(parentId)
        : of([]))
    )

    this.subsNames = combineLatest(
      this.subsOf,
      this.parentSubsOf
    ).pipe(
      takeUntil(this.destroyer),
      switchMap(([subsOfIds, parentSubsOfIds]) => {
        const subs = subsOfIds && subsOfIds.length ? subsOfIds : parentSubsOfIds && parentSubsOfIds.length ? parentSubsOfIds : [];
        const observables: Observable<any>[] = subs.map((subId: any) =>
          this.pa.run({observableResults: false}).getChildAccountName(subId)
        )

        if (observables.length > 0) {
          return combineLatest(observables);
        } else {
          return of([]);
        }
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

    // this.accountJudgement = this.derivedAccountInfo.pipe(
    //   map((dai) => {
    //     if (dai && dai.identity && dai.identity.judgements) {
    //       const judgements = dai.identity.judgements.map((j) => j[1].toString());
    //       if (judgements.find((j) => j === 'LowQuality')) {
    //         return 'isBad';
    //       }
    //
    //       if (judgements.find((j) => j === 'KnownGood' || j === 'Reasonable')) {
    //         return 'isGood';
    //       }
    //     }
    //     return '';
    //   }),
    //   catchError((e) => of(''))
    // )
  }


  async fetchAndSubscribeExtrinsics(idHex: string): Promise<void> {
    let extrinsics: pst.Extrinsic[] = [];
    const listSize = this.listsSize || 50;

    this.signedExtrinsicsLoading.next(true);

    const subscription = this.pa.run().getExtrinsics({
      signed: 1,
      multiAddressAccountId: idHex
    }, listSize).pipe(
      tap({
        subscribe: () => {
          this.signedExtrinsicsLoading.next(true);
        },
        finalize: () => {
          this.signedExtrinsicsLoading.next(false);
        }
      }),
      takeUntil(this.destroyer)
    ).subscribe({
      next: (items) => {
        extrinsics = [
          ...extrinsics,
          ...items.filter((extrinsic) => extrinsics.some((e) => e.blockNumber === extrinsic.blockNumber && e.extrinsicIdx === extrinsic.extrinsicIdx) === false)
        ];

        if (extrinsics.length > listSize) {
          // List size has been reached. List is done, limit to listsize.
          extrinsics.length = listSize;
          subscription.unsubscribe();
        }

        this.signedExtrinsics.next(extrinsics);
      }
    });

    this.pa.run().subscribeNewExtrinsic(
      {
        signed: 1,
        multiAddressAccountId: idHex
      }).pipe(
      takeUntil(this.destroyer)
    ).subscribe({
      next: (extrinsic: pst.Extrinsic) => {
        const extrinsics = this.signedExtrinsics.value;
        if (extrinsics && extrinsics.some((e) => e.blockNumber === extrinsic.blockNumber && e.extrinsicIdx === extrinsic.extrinsicIdx) === false) {
          const merged = [extrinsic, ...extrinsics];
          merged.sort((a: pst.Extrinsic, b: pst.Extrinsic) => {
            return b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx;
          });
          merged.length = this.listsSize;
          this.signedExtrinsics.next([extrinsic].concat(extrinsics));
        }
      }
    });
  }

  fetchTaggedAccounts(accountIdHex: string): void {
    this.pa.run().getTaggedAccount(accountIdHex).pipe(
      takeUntil(this.destroyer)
    ).subscribe((account: pst.TaggedAccount) => this.polkascanAccountInfo);
  }

  ngOnDestroy(): void {
    this.destroyer.next(undefined);
    this.destroyer.complete();
  }


  signedExtrinsicTrackBy(i: any, extrinsic: pst.Extrinsic): string {
    return `${extrinsic.blockNumber}-${extrinsic.extrinsicIdx}`;
  }


  copied(address: string) {
    this.ts.notify.next(
      `Address copied.<br><span class="mono">${address}</span>`);
  }


  tabChange(tabIndex: number): void {
    if (!this.loadedTabs[tabIndex]) {
      this.loadedTabs[tabIndex] = true;
    }
  }
}
