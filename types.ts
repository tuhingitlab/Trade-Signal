export type Asset = 'BTCUSD' | 'XAUUSD' | 'USOIL';

export interface Candle {
  time: string; // HH:mm
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SignalType = 'BUY' | 'SELL' | 'HOLD';

export interface TradeSignal {
  type: SignalType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number; // 0-100
  reasoning: string;
  timestamp: number;
  riskRewardRatio: string; // e.g., "1:2"
}

export interface MarketState {
  currentAsset: Asset;
  data: Candle[];
  lastSignal: TradeSignal | null;
  isAnalyzing: boolean;
  isLive: boolean; // Indicates if data is from live API or simulation
}