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
    Component,
    Input,
    OnChanges,
    SimpleChanges,
    ViewEncapsulation
} from '@angular/core';
import { IconTheme } from '../identicon/identicon.types';
import { Prefix } from '@polkadot/util-crypto/address/types';
import { types as pst } from '@polkadapt/core';
import { attributesConfig as attrConfig } from './attributes.config';
import { BehaviorSubject } from 'rxjs';

@Component({
    selector: 'attributes',
    templateUrl: 'attributes.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributesComponent implements OnChanges {
    @Input() attributes: any[] | string;
    @Input() iconTheme: IconTheme;
    @Input() iconSize: number;
    @Input() tokenDecimals: number;
    @Input() tokenSymbol: string;
    @Input() ss58Prefix: Prefix;
    @Input() runtimeEventAttributes: pst.RuntimeEventAttribute[] | null | undefined;
    @Input() runtimeCallArguments: pst.RuntimeCallArgument[] | null | undefined;

    isArray = new BehaviorSubject<boolean>(false);

    parsedAttributes: any[] = [];
    attributesConfig = attrConfig;

    constructor() {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['attributes'] || changes['runtimeEventAttributes'] || changes['runtimeCallArguments']) {
            let attrs = [];
            const currentValue = this.attributes;

            if (currentValue) {
                if (typeof currentValue === 'string') {
                    try {
                        const parsed = JSON.parse(currentValue);
                        if (Array.isArray(parsed)) {
                            attrs = parsed;
                            this.isArray.next(true);
                        } else if (typeof parsed === 'object' && Object.keys(parsed).length) {
                            attrs = [parsed];
                        }
                    } catch (e) {
                        // Do nothing
                    }
                } else if (Array.isArray(currentValue)) {
                    this.isArray.next(true);
                    attrs = currentValue;
                } else if (typeof currentValue === 'object') {
                    attrs = [currentValue];
                }

                if (Array.isArray(this.runtimeEventAttributes) || Array.isArray(this.runtimeCallArguments)) {
                    attrs = attrs.map((value, i) => {
                        if (value.type) {
                            return value;
                        }

                        if (typeof value === 'object' && !Array.isArray(value)) {
                            // This is an Object with (sub)attribute names and values.
                            value = Object.entries(value).map(([subName, subValue]) => {
                                const camelCase = subName.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
                                const snakeCase = subName.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());

                                let eventAttribute: pst.RuntimeEventAttribute | undefined;
                                if (this.runtimeEventAttributes) {
                                    eventAttribute = (this.runtimeEventAttributes as pst.RuntimeEventAttribute[]).find(
                                        (ea) => ea.eventAttributeName === subName
                                            || ea.eventAttributeName === camelCase
                                            || ea.eventAttributeName === snakeCase
                                    );
                                }

                                let callArgument: pst.RuntimeCallArgument | undefined;
                                if (this.runtimeCallArguments) {
                                    callArgument = (this.runtimeCallArguments as pst.RuntimeCallArgument[]).find(
                                        (ea) => ea.callName === subName
                                            || ea.callName === camelCase
                                            || ea.callName === snakeCase
                                    );
                                }

                                if (eventAttribute && eventAttribute.scaleType) {
                                    return {
                                        name: subName,
                                        type: eventAttribute.scaleType,
                                        composition: eventAttribute.scaleTypeComposition,
                                        value: subValue
                                    };
                                } else if (callArgument && callArgument.scaleType) {
                                    return {
                                        name: subName,
                                        type: callArgument.scaleType,
                                        composition: callArgument.scaleTypeComposition,
                                        value: subValue
                                    };
                                } else {
                                    if (subName) {
                                        return {name: subName, value: subValue};
                                    } else {
                                        return subValue;
                                    }
                                }
                            });
                        }


                        if (this.runtimeEventAttributes) {
                            return {
                                name: (this.runtimeEventAttributes as pst.RuntimeEventAttribute[])[i].eventAttributeName,
                                type: (this.runtimeEventAttributes as pst.RuntimeEventAttribute[])[i].scaleType,
                                composition: (this.runtimeEventAttributes as pst.RuntimeEventAttribute[])[i].scaleTypeComposition,
                                value: value
                            }

                        } else if (this.runtimeCallArguments) {
                            return {
                                name: (this.runtimeCallArguments as pst.RuntimeCallArgument[])[i].name,
                                type: (this.runtimeCallArguments as pst.RuntimeCallArgument[])[i].scaleType,
                                composition: (this.runtimeCallArguments as pst.RuntimeCallArgument[])[i].scaleTypeComposition,
                                value: value
                            }
                        }
                    });
                    if (attrs.length === 1 && Array.isArray(attrs[0])) {
                        attrs = attrs[0];
                    }
                }
            }
            this.parsedAttributes = attrs;
        }
    }
}
