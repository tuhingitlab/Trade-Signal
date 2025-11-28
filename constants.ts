import { Asset } from './types';

export const ASSETS: { id: Asset; name: string; icon: string; color: string }[] = [
  { id: 'BTCUSD', name: 'Bitcoin', icon: '₿', color: '#f7931a' },
  { id: 'XAUUSD', name: 'Gold', icon: '⚱️', color: '#ffd700' },
  { id: 'USOIL', name: 'US Oil', icon: '🛢️', color: '#ff4d4d' },
];

export const MOCK_START_PRICES = {
  BTCUSD: 91000,
  XAUUSD: 2715, // Updated to realistic current gold price
  USOIL: 68.50, // Updated to realistic current oil price
};

export const VOLATILITY = {
  BTCUSD: 0.002, // 0.2% per 5 min
  XAUUSD: 0.0008, // 0.08%
  USOIL: 0.0015, // 0.15%
};

export const AI_ACCURACY_MAP: Record<Asset, string> = {
  BTCUSD: '82.4%',
  XAUUSD: '79.1%',
  USOIL: '84.7%',
};