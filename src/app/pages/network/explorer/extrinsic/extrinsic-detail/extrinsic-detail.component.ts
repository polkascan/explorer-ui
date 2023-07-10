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
import { BehaviorSubject, combineLatest, Observable, of, Subject, takeLast, tap } from 'rxjs';
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
  fetchAttributesStatus: BehaviorSubject<any> = new BehaviorSubject(null);
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
      takeUntil(this.destroyer),
      tap({
        subscribe: () => this.fetchExtrinsicStatus.next('loading')
      }),
      switchMap(([blockNr, extrinsicIdx]) =>
        this.pa.run().getExtrinsic(blockNr, extrinsicIdx).pipe(
          switchMap((obs) => obs),
          map((inherent) => {
            if (inherent) {
              this.fetchExtrinsicStatus.next(null);
              return inherent;
            }
            throw new Error('Extrinsic not found.')
          })
        )
      ),
      catchError((e) => {
        this.fetchExtrinsicStatus.next('error');
        return of(null);
      })
    );

    this.events = paramsObservable.pipe(
      takeUntil(this.destroyer),
      tap({
        subscribe: () => this.fetchEventsStatus.next('loading')
      }),
      switchMap(([blockNr, extrinsicIdx]) =>
        this.pa.run().getEvents({blockNumber: blockNr, extrinsicIdx: extrinsicIdx}, 100)
          .pipe(
            switchMap((obs) => obs.length ? combineLatest(obs) : of([])),
            map((items) => {
              if (Array.isArray(items)) {
                this.fetchEventsStatus.next(null)
                return items;
              }
              throw new Error('Invalid response.');
            })
          )
      ),
      catchError((e) => {
        this.fetchEventsStatus.next('error');
        return of([]);
      }),
      shareReplay({
        refCount: true,
        bufferSize: 1
      })
    );

    this.callArguments = this.extrinsic.pipe(
      tap({
        subscribe: () => {
          this.fetchAttributesStatus.next('loading')
        }
      }),
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

              const foundTypes: [string, string, Observable<pst.RuntimeCallArgument[] | null>][] = []
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
                        takeUntil(this.destroyer),
                        catchError(() => of(null)),
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
                    foundTypes
                      .filter((t, i) => types[i] !== null)
                      .map((t, i) => [t[0], t[1], types[i]])
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
          ).pipe(
            takeUntil(this.destroyer),
            takeLast(1)
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
                        value: callArguments[camelCaseKey] || callArguments[snakeCaseKey]
                      })
                      // Value has been added to the array.
                      // Remove it from the original object to prevent it being added a second time in a later stage.
                      delete callArguments[camelCaseKey];
                      delete callArguments[snakeCaseKey];
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
                        (v) => {
                          const camelCaseParentKey = (value['__kind'] as string).replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
                          const snakeCaseParentKey = (value['__kind'] as string).replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
                          const camelCaseSubKey = (value.value['__kind'] as string).replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
                          const snakeCaseSubKey = (value.value['__kind'] as string).replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
                          return (v[0] === camelCaseParentKey || v[0] === snakeCaseParentKey)
                            && (v[1] === camelCaseSubKey || v[1] === snakeCaseSubKey)
                        }
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
                            if ((attr as any)['__kind'] && (attr as any).value && !(attr as any).value['__kind']) {
                              if (Object.keys((attr as any)).length === 2) {
                                // The real value is one level deeper.
                                attr = (attr as any).value;
                              }
                            }

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
                    if (arrayOrObject.value['__kind']) {
                      const subArgsMeta = collectedCallArguments.find(
                        (v) => {
                          const camelCaseParentKey = (arrayOrObject['__kind'] as string).replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
                          const snakeCaseParentKey = (arrayOrObject['__kind'] as string).replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
                          const camelCaseSubKey = (arrayOrObject.value['__kind'] as string).replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
                          const snakeCaseSubKey = (arrayOrObject.value['__kind'] as string).replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
                          return (v[0] === camelCaseParentKey || v[0] === snakeCaseParentKey)
                            && (v[1] === camelCaseSubKey || v[1] === snakeCaseSubKey)
                        }
                      );
                      if (!subArgsMeta) {
                        arrayOrObject[arrayOrObject['__kind']] = arrayOrObject.value;
                        delete arrayOrObject['__kind'];
                        delete arrayOrObject.value;
                      }
                    } else {
                      arrayOrObject[arrayOrObject['__kind']] = arrayOrObject.value;
                      delete arrayOrObject['__kind'];
                      delete arrayOrObject.value;
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
        this.fetchAttributesStatus.next('error');
        return of('');
      }),
      tap({
        next: () => this.fetchAttributesStatus.next(null)
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
