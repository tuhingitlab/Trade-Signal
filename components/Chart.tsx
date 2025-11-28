import React from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Candle, TradeSignal } from '../types';

interface ChartProps {
  data: Candle[];
  signal: TradeSignal | null;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const candle = payload[0].payload;
    const isGreen = candle.close >= candle.open;
    return (
      <div className="bg-crypto-panel border border-crypto-accent p-3 rounded-md shadow-lg text-xs font-mono z-50">
        <p className="font-bold text-gray-300 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="flex justify-between gap-4"><span className="text-gray-500">Open:</span> <span className="text-gray-200">{candle.open.toFixed(2)}</span></p>
          <p className="flex justify-between gap-4"><span className="text-gray-500">High:</span> <span className="text-gray-200">{candle.high.toFixed(2)}</span></p>
          <p className="flex justify-between gap-4"><span className="text-gray-500">Low:</span> <span className="text-gray-200">{candle.low.toFixed(2)}</span></p>
          <p className="flex justify-between gap-4"><span className="text-gray-500">Close:</span> <span className={isGreen ? "text-signal-buy" : "text-signal-sell"}>{candle.close.toFixed(2)}</span></p>
          <p className="flex justify-between gap-4"><span className="text-gray-500">Vol:</span> <span className="text-gray-200">{candle.volume}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export const Chart: React.FC<ChartProps> = ({ data, signal }) => {
  // Guard against empty data to prevent crash
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] bg-crypto-dark rounded-xl border border-crypto-accent p-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
           <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
           <span className="text-gray-500 font-mono text-sm">Initializing Market Data...</span>
        </div>
      </div>
    );
  }

  // Calculate nice Y-axis domain with padding
  const minPrice = Math.min(...data.map(d => d.low));
  const maxPrice = Math.max(...data.map(d => d.high));
  const padding = (maxPrice - minPrice) * 0.1; // 10% padding for better visual
  const domain = [minPrice - padding, maxPrice + padding];

  return (
    <div className="w-full h-[400px] bg-crypto-dark rounded-xl border border-crypto-accent p-4 relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2b3139" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#848e9c" 
            tick={{ fontSize: 11 }} 
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis 
            domain={domain} 
            stroke="#848e9c" 
            tick={{ fontSize: 11 }}
            orientation="right"
            tickFormatter={(val) => val.toFixed(2)}
            width={60}
          />
          <Tooltip 
             content={<CustomTooltip />} 
             cursor={{ stroke: '#2b3139', strokeDasharray: '3 3' }}
             isAnimationActive={false}
          />
          
          <Area 
            type="monotone" 
            dataKey="close" 
            stroke="#3b82f6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorClose)" 
            isAnimationActive={false}
          />

          {/* Signal Lines */}
          {signal && signal.type !== 'HOLD' && (
             <ReferenceLine y={signal.entryPrice} stroke="#fbbf24" strokeDasharray="3 3" label={{ position: 'left', value: 'ENTRY', fill: '#fbbf24', fontSize: 10 }} />
          )}
          {signal && signal.type !== 'HOLD' && (
             <ReferenceLine y={signal.stopLoss} stroke="#f6465d" strokeDasharray="3 3" label={{ position: 'left', value: 'SL', fill: '#f6465d', fontSize: 10 }} />
          )}
          {signal && signal.type !== 'HOLD' && (
             <ReferenceLine y={signal.takeProfit} stroke="#0ecb81" strokeDasharray="3 3" label={{ position: 'left', value: 'TP', fill: '#0ecb81', fontSize: 10 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
