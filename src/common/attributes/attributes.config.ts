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

export const attributesConfig: {[key: string]: string} = {
  'Address': 'address',
  'T::Address': 'address',
  'AuthorityId': 'address',
  '<Lookup as StaticLookup>::Source': 'address',
  '<T::Lookup as StaticLookup>::Source': 'address',
  'AccountId': 'address',
  'T::AccountId': 'address',
  'LookupSource': 'address',
  'T::LookupSource': 'address',
  'PropIndex': 'proposal',
  'ReferendumIndex': 'referendum',
  'Compact<ReferendumIndex>': 'referendum',
  'SessionIndex': 'session',
  'BlockNumber': 'block',
  'AccountIndex': 'account',
  'EthereumAddress': 'ethereumAddress',
  'Balance': 'balance',
  'T::Balance': 'balance',
  'BalanceOf': 'balance',
  'BalanceOf<T>': 'balance',
  'BalanceOf<T, I>': 'balance',
  'T::BalanceOf': 'balance',
  'Compact<Balance>': 'balance',
  'Compact<BalanceOf>': 'balance',
  'RewardDestination<T::AccountId>': 'balance',
  'Moment': 'date',
  'Compact<Moment>': 'date',
  'Bytes': 'bytes',
  'DownloadableBytesHash': 'downloadable',
  'bool': 'boolean'
};
