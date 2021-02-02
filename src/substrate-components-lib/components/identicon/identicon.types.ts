
export interface Props {
  address: string;
  publicKey: string;
  size: number;
  className?: string;
  style?: string;
  isAlternative?: boolean;
}

export type IconTheme = 'beachball' | 'empty' | 'ethereum' | 'jdenticon' | 'polkadot' | 'substrate';
