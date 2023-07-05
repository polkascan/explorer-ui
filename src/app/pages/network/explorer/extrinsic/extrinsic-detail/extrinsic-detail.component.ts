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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import {
  BehaviorSubject,
  combineAll,
  combineLatest,
  combineLatestAll,
  Observable,
  of,
  Subject,
  takeLast,
  tap
} from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { catchError, filter, first, map, shareReplay, switchMap, takeUntil } from 'rxjs/operators';
import { types as pst } from '@polkadapt/core';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';


@Component({
  selector: 'app-extrinsic-detail',
  templateUrl: './extrinsic-detail.component.html',
  styleUrls: ['./extrinsic-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicDetailComponent implements OnInit, OnDestroy {
  extrinsic: Observable<pst.Extrinsic | null>;
  callArguments: Observable<any>;
  events: Observable<pst.Event[]>;
  networkProperties = this.ns.currentNetworkProperties;
  fetchExtrinsicStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  fetchEventsStatus: BehaviorSubject<any> = new BehaviorSubject(null);
  visibleColumns = ['eventId', 'pallet', 'event', 'details']

  private destroyer = new Subject<void>();
  private onDestroyCalled = false;

  constructor(private router: Router,
              private route: ActivatedRoute,
              private cd: ChangeDetectorRef,
              private pa: PolkadaptService,
              private ns: NetworkService,
              private rs: RuntimeService
  ) {
  }

  ngOnInit(): void {
    const paramsObservable = this.ns.currentNetwork.pipe(
      takeUntil(this.destroyer),
      // Network must be set.
      filter(network => !!network),
      // Only need to load once.
      first(),
      // Switch over to the route param from which we extract the extrinsic keys.
      switchMap(() => this.route.params.pipe(
        takeUntil(this.destroyer),
        map(params => params['id'].split('-').map((v: string) => parseInt(v, 10)))
      ))
    )

    this.extrinsic = paramsObservable.pipe(
      tap(() => this.fetchExtrinsicStatus.next('loading')),
      switchMap(([blockNr, extrinsicIdx]) => {
        const subject = new Subject<pst.Extrinsic>();
        this.pa.run().getExtrinsic(blockNr, extrinsicIdx).pipe(
          switchMap((obs) => obs),
          takeUntil(this.destroyer)
        ).subscribe({
          next: (inherent) => {
            if (inherent) {
              subject.next(inherent);
              this.fetchExtrinsicStatus.next(null);
            } else {
              subject.error('Extrinsic not found.');
            }
          }
          ,
          error: (e) => {
            console.error(e);
            subject.error(e);
          }
        });
        return subject.pipe(takeUntil(this.destroyer))
      }),
      catchError((e) => {
        this.fetchExtrinsicStatus.next('error');
        return of(null);
      })
    );

    this.events = paramsObservable.pipe(
      tap(() => this.fetchEventsStatus.next('loading')),
      switchMap(([blockNr, extrinsicIdx]) => {
        const subject = new Subject<pst.Event[]>();
        this.pa.run().getEvents({blockNumber: blockNr, extrinsicIdx: extrinsicIdx}, 100)
          .pipe(
            switchMap((obs) => obs.length ? combineLatest(obs) : of([])),
            takeUntil(this.destroyer)
          ).subscribe({
          next: (items) => {
            if (Array.isArray(items)) {
              subject.next(items);
              this.fetchEventsStatus.next(null)
            } else {
              subject.error('Invalid response.')
            }
          }
          ,
          error: (e) => {
            console.error(e);
            subject.error(e)
          }
        });
        return subject.pipe(shareReplay(1), takeUntil(this.destroyer));
      }),
      catchError((e) => {
        this.fetchEventsStatus.next('error');
        return of([]);
      })
    );

    this.callArguments = this.extrinsic.pipe(
      switchMap((extrinsic) => {
        if (!extrinsic) {
          return of('');
        }

        if (!(extrinsic.specVersion && extrinsic.callModule && extrinsic.callName)) {
          return of(extrinsic.callArguments);
        }

        return combineLatest([
          of(extrinsic).pipe(
            switchMap((extrinsic) => {
              // Find defined types in data returned by subsquid. Fetch the runtimeCallArguments for these found types.
              // Wait until all found runtimeCallArguments are available.

              const foundTypes: [string, string, Observable<pst.RuntimeCallArgument[]>][] = []
              const findTypes = (item: any) => {
                if (Object.prototype.toString.call(item) === '[object Object]') {
                  if (item && item['__kind'] && item.value && item.value['__kind']) {
                    foundTypes.push([
                      item['__kind'],
                      item.value['__kind'],
                      this.rs.getRuntimeCallArguments(
                        this.ns.currentNetwork.value,
                        extrinsic.specVersion!,
                        item['__kind'],
                        item.value['__kind']).pipe(
                        takeLast(1)
                      )]
                    )
                  } else {
                    findTypes(Object.entries(item).map(([k, v]) => v));
                  }
                } else if (Array.isArray(item)) {
                  item.forEach((v) => findTypes(v));
                }
              }
              findTypes(extrinsic.callArguments)

              if (foundTypes.length) {
                return combineLatest(foundTypes.map((t) => t[2])).pipe(
                  switchMap((types) => of([
                    extrinsic,
                    foundTypes.map((t, i) => [t[0], t[1], types[i]])
                  ])),
                  catchError(() => of([extrinsic, []]))
                );
              }

              return of([extrinsic, []])
            })
          ),
          // Get extrinsic main call's call arguments.
          this.rs.getRuntimeCallArguments(
            this.ns.currentNetwork.value,
            extrinsic.specVersion,
            extrinsic.callModule,
            extrinsic.callName
          )
        ]).pipe(
          map(([[extrinsic, collectedCallArguments], callArgumentsMeta]) => {
            // Parse callArguments JSON or copy callArguments.
            let parsed: any = (extrinsic as pst.Extrinsic).callArguments;
            if (typeof parsed === 'string') {
              parsed = JSON.parse(parsed);
            } else if (parsed) {
              parsed = JSON.parse(JSON.stringify(parsed)); // make a copy.
            }
            return [extrinsic, parsed, collectedCallArguments, callArgumentsMeta] as [pst.Extrinsic, any, [string, string, pst.RuntimeCallArgument[]][], pst.RuntimeCallArgument[]];
          }),
          map(([extrinsic, callArguments, collectedCallArguments, callArgumentsMeta]) => {

            let attributesFromObject: any[] | undefined;
            if (Array.isArray(callArguments)) {
              attributesFromObject = callArguments;
            } else if (Object.prototype.toString.call(callArguments) === '[object Object]') {
              attributesFromObject = [];

              // In case of subsquid data. Removes redundant '__kind' properties at the first level.
              (Object.entries(callArguments) as [key: string, attr: any][]).forEach(([key, attr]) => {
                if (attr && attr['__kind']) {
                  if (attr.value && attr.value['__kind']) {
                    // Sublevel type found. Leave as is.
                    return;
                  } else {
                    callArguments[key] = attr.value || attr;
                  }
                }
              })

              // Loop through the call arguments metadata. These are indexed.
              // Find values for each call argument and add it to the attributesFromObject array.
              if (callArgumentsMeta) {
                callArgumentsMeta.forEach((meta) => {

                  if (meta.name) {
                    const camelCaseKey = meta.name.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
                    const snakeCaseKey = meta.name.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
                    if (callArguments.hasOwnProperty(camelCaseKey) || callArguments.hasOwnProperty(snakeCaseKey)) {
                      attributesFromObject!.push({
                        name: meta.name,
                        type: meta.scaleType,
                        value: callArguments[meta.name]
                      })
                      // Value has been added to the array.
                      // Remove it from the original object to prevent it being added a second time in a later stage.
                      delete callArguments[meta.name];
                    }
                  }
                })

                // Add leftover values that have not been added while looping the call arguments.
                Object.entries(callArguments).forEach(([key, attr]) => {
                  attributesFromObject!.push({
                    name: key,
                    value: attr
                  })
                })
              }
            }

            // The below code in the if statement is specifically to convert JSON that came from a subsquid archive node.
            // Find values recursively in the attributes object to match with other (pallet) call arguments.
            if (attributesFromObject) {
              const convertSubquidTypedValues = (arrayOrObject: any) => {
                if (Array.isArray(arrayOrObject)) {
                  arrayOrObject.forEach((value, index) => {

                    if (value['__kind'] && value.value && value.value['__kind']) {
                      const subArgsMeta = collectedCallArguments.find(
                        (v) => v[0] === value['__kind'] && v[1] === value.value['__kind']
                      );

                      if (subArgsMeta) {
                        const subCallArgs: any[] = [];
                        const unknownSubCallArgs: any[] = [];

                        Object.entries(value.value).forEach(([key, attr]) => {
                          if (key === '__kind') {
                            return;
                          }

                          let i: number | undefined;
                          const subArgMeta = subArgsMeta[2].find((a, ii) => {
                            const camelCaseKey = key.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
                            const snakeCaseKey = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
                            if (camelCaseKey === a.name || snakeCaseKey === a.name) {
                              i = ii;
                              return true;
                            }
                            return false;
                          });

                          if (subArgMeta) {
                            subCallArgs[i!] = {
                              name: subArgMeta.name,
                              type: subArgMeta.scaleType,
                              value: attr
                            }
                          } else {
                            unknownSubCallArgs!.push({
                              name: key,
                              value: attr
                            })
                          }
                        })

                        // Add values that have not been added by an indexed call argument
                        const resultSubCallArgs = [...subCallArgs.filter((a) => !!a), ...unknownSubCallArgs]
                        convertSubquidTypedValues(resultSubCallArgs);

                        arrayOrObject[index] = {
                          'call_module': value['__kind'],
                          'call_function': value.value['__kind'],
                          'call_args': resultSubCallArgs
                        }
                      }
                    } else if (value['__kind'] && value.value) {
                      value[value['__kind']] = value.value;
                      delete value['__kind'];
                      convertSubquidTypedValues(value.value)
                    } else if (value.value) {
                      convertSubquidTypedValues(value.value);
                    }
                  })
                } else if (Object.prototype.toString.call(arrayOrObject) === '[object Object]') {
                  if (arrayOrObject['__kind'] && arrayOrObject.value) {
                    if (!arrayOrObject.value['__kind']) {
                      arrayOrObject[arrayOrObject['__kind']] = arrayOrObject.value;
                      delete arrayOrObject['__kind'];
                    }
                  }
                  Object.entries(arrayOrObject).forEach(([k, v]) => convertSubquidTypedValues(v))
                }
              }

              convertSubquidTypedValues(attributesFromObject);
            }

            return attributesFromObject || extrinsic.callArguments;
          })
        )
      }),
      catchError((e) => {
        return of('');
      })
    )
  }

  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
  }

  trackEvent(i: any, event: pst.Event): string {
    return `${event.blockNumber}-${event.eventIdx}`;
  }
}
