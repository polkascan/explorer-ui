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

// Copied from Polkadot-js apps packages/apps-config/src/ui/identityIcons/index.ts
const identityNodes: Record<string, string> = [
  ['centrifuge chain', 'polkadot'],
  ['joystream-node', 'beachball'],
  ['parity-polkadot', 'polkadot']
].reduce((icons, [node, icon]): Record<string, string> => ({
  ...icons,
  [node.toLowerCase().replace(/-/g, ' ')]: icon
}), {});

// Copied from Polkadot-js apps packages/apps-config/src/ui/identityIcons/index.ts
const identitySpec: Record<string, string> = [
  ['kusama', 'polkadot'],
  ['polkadot', 'polkadot'],
  ['rococo', 'polkadot'],
  ['statemine', 'polkadot'],
  ['statemint', 'polkadot'],
  ['westend', 'polkadot'],
  ['westmint', 'polkadot']
].reduce((icons, [spec, icon]): Record<string, string> => ({
  ...icons,
  [spec.toLowerCase().replace(/-/g, ' ')]: icon
}), {});

// Copied from Polkadot-js apps packages/apps-config/src/ui/util.ts
function sanitize (value?: string): string {
  return value?.toLowerCase().replace(/-/g, ' ') || '';
}

// Copied from Polkadot-js apps packages/apps-config/src/ui/index.ts
export function getSystemIcon (systemName: string, specName: string): 'beachball' | 'polkadot' | 'substrate' {
  return (
    identityNodes[sanitize(systemName)] ||
    identitySpec[sanitize(specName)] ||
    'substrate'
  ) as 'substrate';
}
