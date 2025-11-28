import React from 'react';
import { TradeSignal } from '../types';
import { TrendingUp, TrendingDown, MinusCircle, AlertCircle, Target, ShieldAlert, BadgePercent } from 'lucide-react';
import clsx from 'clsx';

interface SignalPanelProps {
  signal: TradeSignal | null;
  loading: boolean;
  onAnalyze: () => void;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ signal, loading, onAnalyze }) => {
  if (!signal) {
    return (
      <div className="bg-crypto-panel border border-crypto-accent rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="bg-crypto-accent p-4 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Ready to Scan</h3>
        <p className="text-gray-400 mb-6 max-w-xs">
          AI model loaded. Click below to analyze current market structure for high-probability setups.
        </p>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Analyzing...
            </>
          ) : (
            'Generate Signal'
          )}
        </button>
      </div>
    );
  }

  const isBuy = signal.type === 'BUY';
  const isSell = signal.type === 'SELL';
  const isHold = signal.type === 'HOLD';

  return (
    <div className="bg-crypto-panel border border-crypto-accent rounded-xl p-6 h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">AI Recommendation</h2>
          <div className="flex items-center gap-2">
            <span className={clsx(
              "text-3xl font-bold font-mono",
              isBuy && "text-signal-buy",
              isSell && "text-signal-sell",
              isHold && "text-gray-300"
            )}>
              {signal.type}
            </span>
            {isBuy && <TrendingUp className="w-8 h-8 text-signal-buy" />}
            {isSell && <TrendingDown className="w-8 h-8 text-signal-sell" />}
            {isHold && <MinusCircle className="w-8 h-8 text-gray-300" />}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Confidence</div>
          <div className="text-xl font-bold text-white">{signal.confidence}%</div>
        </div>
      </div>

      {!isHold ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-crypto-dark p-3 rounded-lg border border-crypto-accent">
            <div className="flex items-center gap-2 mb-1 text-gray-400 text-xs">
              <Target className="w-3 h-3" /> Entry Price
            </div>
            <div className="font-mono text-lg text-white font-bold">{signal.entryPrice.toFixed(2)}</div>
          </div>
          <div className="bg-crypto-dark p-3 rounded-lg border border-crypto-accent">
            <div className="flex items-center gap-2 mb-1 text-gray-400 text-xs">
              <BadgePercent className="w-3 h-3" /> R:R Ratio
            </div>
            <div className="font-mono text-lg text-blue-400 font-bold">{signal.riskRewardRatio}</div>
          </div>
          <div className="bg-crypto-dark p-3 rounded-lg border border-red-900/30">
            <div className="flex items-center gap-2 mb-1 text-red-400 text-xs">
              <ShieldAlert className="w-3 h-3" /> Stop Loss
            </div>
            <div className="font-mono text-lg text-red-400 font-bold">{signal.stopLoss.toFixed(2)}</div>
          </div>
          <div className="bg-crypto-dark p-3 rounded-lg border border-green-900/30">
            <div className="flex items-center gap-2 mb-1 text-green-400 text-xs">
              <Target className="w-3 h-3" /> Take Profit
            </div>
            <div className="font-mono text-lg text-green-400 font-bold">{signal.takeProfit.toFixed(2)}</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-crypto-dark rounded-lg border border-crypto-accent mb-6">
          <p className="text-gray-500 text-sm">Market conditions unclear. Wait for better setup.</p>
        </div>
      )}

      <div className="mt-auto">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Analysis Reasoning</h4>
        <p className="text-sm text-gray-300 leading-relaxed bg-crypto-dark p-3 rounded-lg border border-crypto-accent">
          {signal.reasoning}
        </p>
      </div>
      
      <button
          onClick={onAnalyze}
          disabled={loading}
          className="mt-4 w-full bg-crypto-accent hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors border border-gray-600 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Signal'}
        </button>
    </div>
  );
};