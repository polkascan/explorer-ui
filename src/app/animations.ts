/*
 * PolkADAPT
 *
 * Copyright 2021 Stichting Polkascan (Polkascan Foundation)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { animate, animation, group, query, stagger, style, transition, trigger } from '@angular/animations';

export const rowsAnimationByCounter = trigger('rowsAnimationByCounter', [
  transition(':increment', group([
    query(':enter',
      [
        style({height: 0, opacity: 0}),
        animate('400ms',
          style({height: '*', opacity: 1})
        )
      ],
      {optional: true}
    ),
    query(':leave',
      animate('400ms',
        style({opacity: 0})
      ),
      {optional: true}
    )
  ]))
]);
