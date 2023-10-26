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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NetworkService } from '../../../../../services/network.service';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import {
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
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  combineLatestWith,
  EMPTY,
  Observable,
  of,
  Subject,
  take
} from 'rxjs';
import { DeriveStakingAccount } from '@polkadot/api-derive/types';
import { BN, BN_ZERO, isHex, isU8a, u8aToHex } from '@polkadot/util';
import { types as pst } from '@polkadapt/core';
import { decodeAddress, encodeAddress, ethereumEncode, validateAddress } from '@polkadot/util-crypto';
import { TooltipsService } from '../../../../../services/tooltips.service';


interface AccountBalance {
  total: BN;
  locked: BN;
  transferable: BN;
  bonded: BN;
  redeemable: BN;
  unbonding: BN;
}

@Component({
  selector: 'app-account-detail',
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountDetailComponent implements OnInit, OnDestroy {
  id: Observable<string | null>;
  accountAsHex = new BehaviorSubject<string | null>(null);
  account: Observable<pst.Account | null>;
  address: Observable<string>;
  subs: Observable<any>;
  identity: Observable<pst.AccountIdentity | null>;
  accountIndex: Observable<number | null>;
  accountNonce: Observable<number | null>
  subsOf: Observable<string[]>;
  subsNames: Observable<string[]>;
  parentId: Observable<string | null>;
  parentIdentity: Observable<any>;
  parentSubsOf: Observable<string[]>;
  accountInfo: Observable<pst.AccountInformation | null>;
  accountFlags: Observable<pst.AccountFlags | null>;
  AccountBalances: Observable<pst.AccountBalances | null>;
  stakingInfo: Observable<pst.AccountStaking | null>;
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
  tabIndex: number | null = null;

  private destroyer = new Subject<void>();

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
      // Only continue if a network is set.
      filter(network => !!network),
      // We don't have to wait for further changes to network, so terminate after first.
      first(),
      // Switch to the route param, from which we get the block number.
      switchMap(() => this.route.params),
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
          const accountIdHex = u8aToHex(decodeAddress(id));
          this.accountAsHex.next(accountIdHex);
          return id;
        }

        this.accountAsHex.next(null);
        return null;
      }),
      shareReplay({
        bufferSize: 1,
        refCount: true
      }),
      takeUntil(this.destroyer)
    ) as Observable<string | null>;

    // Remove all active subscriptions when id changes.
    idObservable.subscribe({
      next: (id) => {
        this.loadedTabs = {0: true};
        this.tabIndex = 0;
        this.errors.next(null);

        this.signedExtrinsics.next([]);

        if (id) {
          try {
            // Try to create the hex for accountId manually.
            const hex = this.accountAsHex.value;
            if (hex) {
              this.fetchAndSubscribeExtrinsics(hex);
              this.fetchTaggedAccounts(hex);
            }
          } catch (e) {
          }
        } else {
          // Not a valid address.
          this.errors.next('Unknown or invalid address.');
        }
      }
    });

    this.account = idObservable.pipe(
      switchMap((id) =>
        id
          ? this.pa.run({observableResults: false}).getAccount(id).pipe(
            startWith(null),
            map((account) => account ? account : null)
          )
          : of(null)),
      takeUntil(this.destroyer)
    );

    this.address = idObservable.pipe(
      combineLatestWith(this.networkProperties),
      map(([id, props]) => {
          if (id && props && (isU8a(id) || isHex(id))) {
            try {
              return encodeAddress(id, props.ss58Format);
            } catch (e) {
              // Ignore
            }

            try {
              return ethereumEncode(id);
            } catch (e) {
              // Ignore
            }
          }

          return id || '';
        }
      )
    )

    this.accountIndex = idObservable.pipe(
      switchMap((id) =>
        id
          ? this.pa.run({observableResults: false}).getIndexFromAccountId(id).pipe(
            startWith(null)
          )
          : of(null)
      ),
      takeUntil(this.destroyer)
    )

    this.accountNonce = this.account.pipe(
      map((account) => {
        if (account && Number.isInteger(account.nonce)) {
          return account.nonce as number;
        }
        return null;
      })
    );

    this.subsOf = idObservable.pipe(
      switchMap((id) => id
        ? this.pa.run({observableResults: false}).getAccountChildrenIds(id).pipe(
          startWith([])
        )
        : of([])),
      takeUntil(this.destroyer)
    );

    this.accountInfo = idObservable.pipe(
      switchMap((id) => id
        ? this.pa.run({observableResults: false}).getAccountInformation(id).pipe(
          startWith(null)
        )
        : of(null)),
      takeUntil(this.destroyer)
    );

    this.identity = this.accountInfo.pipe(
      map((info) => info ? info.identity : null)
    );

    this.accountFlags = idObservable.pipe(
      switchMap((id) => id
        ? this.pa.run({observableResults: false}).getAccountFlags(id).pipe(
          startWith(null)
        )
        : of(null)),
      takeUntil(this.destroyer)
    );

    this.AccountBalances = idObservable.pipe(
      switchMap((id) => id
        ? this.pa.run({observableResults: false}).getAccountBalances(id).pipe(
          startWith(null)
        )
        : of(null)),
      takeUntil(this.destroyer)

    );

    this.stakingInfo = idObservable.pipe(
      switchMap((id) => id
        ? this.pa.run({observableResults: false}).getAccountStaking(id).pipe(
          startWith(null)
        )
        : of(null)),
      takeUntil(this.destroyer)
    );

    this.accountBalances = combineLatest(
      this.AccountBalances.pipe(
        catchError(() => {
          return of(undefined);
        })),
      this.stakingInfo.pipe(
        catchError(() => {
          return of(undefined);
        }))
    ).pipe(
      map(([accountBalances, stakingInfo]) => {
        const balances: any = {};
        if (accountBalances) {
          balances.locked = accountBalances.lockedBalance;
          balances.total = accountBalances.freeBalance.add(accountBalances.reservedBalance);
          balances.transferable = accountBalances.availableBalance;
          balances.free = accountBalances.freeBalance;
          balances.reserved = accountBalances.reservedBalance;
        }
        if (stakingInfo) {
          balances.bonded = stakingInfo.bonded;
          balances.redeemable = stakingInfo.redeemable;
          balances.unbonding = stakingInfo.unbonding;
        }
        return balances;
      }),
      takeUntil(this.destroyer)
    );

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
      switchMap(([subsOfIds, parentSubsOfIds]) => {
        const subs = subsOfIds && subsOfIds.length ? subsOfIds : parentSubsOfIds && parentSubsOfIds.length ? parentSubsOfIds : [];
        const observables: Observable<any>[] = subs.map((subId: any) =>
          this.pa.run({observableResults: false}).getChildAccountName(subId)
        )

        return observables.length ? combineLatest(observables) : of([]);
      }),
      takeUntil(this.destroyer)
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
      map(([subsOf, parentSubsOf, subsNames]) => {
        const subs = subsOf.length ? subsOf : parentSubsOf.length ? parentSubsOf : [];
        const map = new Map();
        subs.forEach((sub: any, i: number) => {
          map.set(sub, subsNames[i]);
        })
        return map;
      }),
      takeUntil(this.destroyer)
    )

    this.accountJudgement = this.accountInfo.pipe(
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
    ),
    takeUntil(this.destroyer)
  }


  async fetchAndSubscribeExtrinsics(idHex: string): Promise<void> {
    let extrinsics: pst.Extrinsic[] = [];
    const listSize = this.listsSize || 50;

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
      switchMap((obs) => obs.length ? combineLatest(obs) : of([])),
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
      switchMap((obs) => obs),
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
      switchMap((obs) => obs ? obs : EMPTY),
      takeUntil(this.destroyer)
    ).subscribe({
      next: (account: pst.TaggedAccount) => this.polkascanAccountInfo.next(account)
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
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
    this.tabIndex = tabIndex;
    if (!this.loadedTabs[tabIndex]) {
      this.loadedTabs[tabIndex] = true;
    }
  }
}
