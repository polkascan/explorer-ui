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

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewEncapsulation
} from '@angular/core';
import { BehaviorSubject, catchError, combineAll, combineLatestWith, Observable, of, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AppConfig, NetworkConfig } from '../../app-config';
import { VariablesService } from '../../services/variables.service';
import { PolkadaptService } from '../../services/polkadapt.service';
import { NetworkService } from '../../services/network.service';
import { MatDialog } from '@angular/material/dialog';
import { PsConnectionDialogComponent } from '../ps-connection-dialog/ps-connection-dialog.component';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { validateAddress } from '@polkadot/util-crypto';

@Component({
  templateUrl: 'ps-top-bar.component.html',
  selector: 'ps-top-bar',
  styleUrls: ['ps-top-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PsTopBarComponent implements OnInit, OnDestroy {
  networks: string[];
  networkConfig: NetworkConfig;
  networkLabel = new BehaviorSubject('');
  searchForm = new FormGroup({
    search: new FormControl('')
  })
  searchPreviewItems = new BehaviorSubject<{type: string, value: string, display?: string}[]>([]);
  searching = new BehaviorSubject(false);
  searchPreviewShowing = false;
  showPreview = new BehaviorSubject(false);

  private destroyer = new Subject<void>();

  constructor(private router: Router,
              private config: AppConfig,
              public pa: PolkadaptService,
              public ns: NetworkService,
              public vars: VariablesService,
              public dialog: MatDialog) {
  }

  ngOnInit(): void {
    this.networks = Object.keys(this.config.networks);
    this.networkConfig = this.config.networks;
    this.vars.network
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroyer)
      )
      .subscribe({
        next: (network) => {
          this.searchForm.controls['search'].setValue('');
          if (network) {
            this.networkLabel.next(this.config.networks[network].name || network);
          } else {
            this.networkLabel.next('Network');
          }
        }
      });

    this.searchForm.controls.search.valueChanges.pipe(
      map(value => value ? value.trim() : value),
      distinctUntilChanged(),
      tap(value => {
        this.searchPreviewItems.next([]);
        if (value) {
          this.searching.next(true);
        }
      }),
      debounceTime(400),
      switchMap(value => of(value).pipe(
        combineLatestWith(value ? this.ns.blockHarvester.headNumber.pipe(first()) : of(-1))
      )),
      switchMap(([value, headNumber]): Observable<[string | null, ...{type: string, value: string, display?: string}[][]]> => {
        if (value) {
          const findAccountsByIdentity = this.pa.run({observableResults: false}).findAccountsByIdentity(value).pipe(
              map(accounts => accounts.map(a => ({type: 'account', value: a.id, display: `${a.id.slice(0, 7)}...${a.id.slice(-5)} ${a.identity.display}`})))
          );
          const couldBeBlockNumber = /^\d+-?$/.test(value);
          if (couldBeBlockNumber) {
            const num = parseInt(value, 10);
            if (num <= headNumber + 10) {
              // Acceptable block number.
              return of(value).pipe(
                combineLatestWith(
                  of([{type: 'block', value: num.toString()}]),
                  findAccountsByIdentity  // Number could also be part of an identity.
                )
              );
            }
          } else {
            const couldBeEventOrExtrinsicId = /^\d+-\d+$/.test(value)
            if (couldBeEventOrExtrinsicId) {
              const [num, idx] = value.split('-').map(v => parseInt(v, 10));
              if (num <= headNumber) {
                // Find extrinsic or event.
                return of(value).pipe(
                  combineLatestWith(
                    this.pa.run({observableResults: false}).getExtrinsic(num, idx).pipe(
                      map(extrinsic => [{type: 'extrinsic', value: `${extrinsic.blockNumber}-${extrinsic.extrinsicIdx}`}]),
                      catchError(() => of([]))
                    ),
                    this.pa.run({observableResults: false}).getEvent(num, idx).pipe(
                      map(event => [{type: 'event', value: `${event.blockNumber}-${event.eventIdx}`}]),
                      catchError(() => of([]))
                    )
                  )
                );
              }
            }
            const isHash = value.startsWith('0x') && value.length === 66;
            if (isHash) {
              // Find block or extrinsic.
              return of(value).pipe(
                combineLatestWith(
                  this.pa.run({observableResults: false}).getBlock(value).pipe(
                    map(block => [{type: 'block', value: block.number.toString()}]),
                    catchError(() => of([]))
                  ),
                  this.pa.run({observableResults: false}).getExtrinsic(value).pipe(
                    map(extrinsic => [{type: 'extrinsic', value: `${extrinsic.blockNumber}-${extrinsic.extrinsicIdx}`}]),
                    catchError(() => of([]))
                  )
                )
              );
            } else {
              let validAddress: boolean;
              try {
                validAddress = validateAddress(value);
              } catch (e) {
                validAddress = false;
              }
              if (validAddress) {
                // Check if address belongs to this network/chain.
                try {
                  validateAddress(value, false, this.ns.currentNetworkProperties.value?.ss58Format);
                  return of(value).pipe(
                    combineLatestWith(
                      of([{type: 'account', value}]),
                      findAccountsByIdentity  // Number could also be part of an identity.
                    )
                  );
                } catch (e) {
                  return of(value).pipe(
                    combineLatestWith(
                      of([{type: 'account-other-network', value}]),
                      findAccountsByIdentity  // Number could also be part of an identity.
                    )
                  );
                }
              } else {
                // Just look for identities.
                return of(value).pipe(
                  combineLatestWith(findAccountsByIdentity)
                );
              }
            }
          }
        }
        return of([value]);
      }),
      takeUntil(this.destroyer)
    ).subscribe((values) => {
      if (this.searching.value) {
        let items: {type: string, value: string, display?: string}[] = [];
        const value = values[0];
        if (values[1]) {
          // Found stuff. Flatten the Arrays to one list.
          items = (values.slice(1) as {type: string, value: string, display?: string}[][]).flat();
          this.showPreview.next(true);
        }
        this.searchPreviewItems.next(items);
        this.searching.next(false);
      }
    });

    this.router.events.pipe(
      takeUntil(this.destroyer)
    ).subscribe(() => {
      this.clearSearch();
    });

    function findElementWithClassInDirection(elements: Element[], startElement: Element, className: string, direction: 'forward' | 'backward' = 'forward'): HTMLElement | null {
      // Find the position of the starting element
      const startIndex = elements.indexOf(startElement);

      if (direction === 'forward') {
        // Loop through the elements after the starting element
        for (let i = startIndex + 1; i < elements.length; i++) {
          if (elements[i].classList.contains(className)) {
            return elements[i] as HTMLElement;
          }
        }
      } else if (direction === 'backward') {
        // Loop through the elements before the starting element
        for (let i = startIndex - 1; i >= 0; i--) {
          if (elements[i].classList.contains(className)) {
            return elements[i] as HTMLElement;
          }
        }
      } else {
        throw new Error("Invalid direction. Please use 'forward' or 'backward'.");
      }

      return null; // No element found with the desired class
    }

    const previewKeyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const input = document.querySelector('.ps-top-bar-search .mat-mdc-input-element') as HTMLInputElement;
        input.focus();
        this.showPreview.next(false);
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const className = 'ps-top-bar-search-preview-item';
        const allElements = Array.from(document.querySelectorAll('*'));
        switch (event.key) {
          case 'ArrowUp':
            const lastElement = allElements[allElements.length - 1];
            let prev = findElementWithClassInDirection(allElements, document.activeElement || lastElement, className, 'backward');
            if (!prev) {
              if (document.activeElement && document.activeElement.classList.contains(className)) {
                // First item. Go back to search input.
                prev = document.querySelector('.ps-top-bar-search .mat-mdc-input-element');
              } else {
                prev = findElementWithClassInDirection(allElements, lastElement, className, 'backward');
              }
            }
            if (prev) {
              prev.focus();
              if (prev.tagName === 'INPUT') {
                const input = prev as HTMLInputElement;
                setTimeout(() => {input.select();});
              }
            }
            break;
          case 'ArrowDown':
            let next = findElementWithClassInDirection(allElements, document.activeElement || document.body, className);
            if (!next) {
              next = findElementWithClassInDirection(allElements, document.body, className);
            }
            if (next) {
              next.focus();
            }
            break;
        }
      }
    };

    const previewMouseAndFocusListener = (event: MouseEvent | FocusEvent) => {
      const searchZone = document.querySelector('.ps-top-bar-search-form');
      if (searchZone) {
        if (!searchZone.contains(event.target as Node)) {
          // Clicked or focused outside the search zone. Remove the preview.
          this.showPreview.next(false);
        }
      }
    };

    this.searchPreviewItems.pipe(
      takeUntil(this.destroyer)
    ).subscribe(items => {
      if (!this.searchPreviewShowing && items.length) {
        this.searchPreviewShowing = true;
        document.addEventListener('keydown', previewKeyListener);
        document.addEventListener('mousedown', previewMouseAndFocusListener);
        document.addEventListener('focusin', previewMouseAndFocusListener);
      } else if (this.searchPreviewShowing && !items.length) {
        this.searchPreviewShowing = false;
        document.removeEventListener('keydown', previewKeyListener);
        document.removeEventListener('mousedown', previewMouseAndFocusListener);
        document.removeEventListener('focusin', previewMouseAndFocusListener);
      }
    })
  }

  ngOnDestroy(): void {
    this.destroyer.next();
  }

  setNetwork(network: string): void {
    this.router.navigateByUrl(`/${network}`);
  }

  openConnectionDialog(): void {
    this.dialog.open(PsConnectionDialogComponent, {
      width: '600px'
    });
  }

  submitSearch() {
    if (this.searchPreviewItems.value.length > 0) {
      const firstItem = this.searchPreviewItems.value[0]
      this.router.navigate([this.ns.currentNetwork.value, firstItem.type, firstItem.value]);
    } else {
      if (this.searchForm.valid) {
        const value = (this.searchForm.value.search)!.trim();
        if (value) {
          if (/^\d+-\d+$/.test(value)) {
            this.router.navigate([this.ns.currentNetwork.value, 'extrinsic', value]);
          } else if (/^\d+$/.test(value) || value.startsWith('0x') && value.length === 66) {
            const blockValue: string | number = value.length === 66 ? value : Number(value);
            this.pa.run({observableResults: false}).getBlock(blockValue).subscribe({
              next: block => {
                this.router.navigate([this.ns.currentNetwork.value, 'block', block.number]);
              },
              error: () => {
                this.router.navigate([this.ns.currentNetwork.value, 'extrinsic', value]);
              }
            });
          } else {
            let validAddress: boolean;
            try {
              validAddress = validateAddress(value, false,
                this.ns.currentNetworkProperties.value?.ss58Format);
            } catch (e) {
              validAddress = false;
            }
            if (validAddress) {
              this.router.navigate([this.ns.currentNetwork.value, 'account', value]);
            }
          }
        }
      }
    }
  }

  clearSearch() {
    this.searching.next(false);
    this.searchForm.controls.search.setValue('');
    this.searchForm.controls.search.markAsPristine();
  }

  resetSearchIfEmpty() {
    if (this.searchForm.controls.search.value === '') {
      this.searchForm.controls.search.markAsPristine();
    }
  }

  showPreviewIfMissing() {
    this.showPreview.next(true);
  }
}

