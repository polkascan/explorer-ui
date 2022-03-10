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

import { defer, Observable, ReplaySubject } from 'rxjs';
import { finalize } from 'rxjs/operators';


export function asObservable(fn: (...args: any[]) => Promise<() => void>, ...args: any[]) {
  let unsubscribeFn: (() => void) | null = null;
  let finalized = false;
  let subject: ReplaySubject<any>;
  let counter = 0;

  const deferred: Observable<any> = defer((): ReplaySubject<any> => {
    if (counter === 0) {
      subject = new ReplaySubject(1);

      let callback: ((...args: any[]) => any) | null = null;

      if (args) {
        // Convert callback to emitter function.
        args.forEach((arg, index) => {
          if (!callback && typeof arg === 'function') {
            callback = arg;
            args[index] = (value: any) => {
              if (!finalized) {
                arg(value);
                subject.next(value);
              }
            }
          }
        });
      }

      if (!callback) {
        args.push((value: any) => {
          subject.next(value);
        })
      }

      fn(...args).then(
        (response) => {
          if (typeof response === 'function') {
            unsubscribeFn = () => {
              response();
            }

            if (finalized) {
              // The observable is already completed, stop the listener immediately.
              if (typeof unsubscribeFn === 'function') {
                unsubscribeFn();
                unsubscribeFn = null;
              }
            }
          } else {
            // No error returned and not a function returned. Emit the response and close the subject.
            callback ? callback(response) : null;
            subject.next(response);
            subject.complete();
          }
        },
        (e) => {
          subject.error(e);
          subject.complete();
        });
    }
    counter++;
    return subject;
  }).pipe(
    finalize(() => {
      counter--;

      if (counter === 0) {
        finalized = true;
        if (typeof unsubscribeFn === 'function') {
          unsubscribeFn();
          unsubscribeFn = null;
        }
      }
    })
  );

  return deferred;
}
