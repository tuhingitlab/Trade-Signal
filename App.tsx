import React, { useState, useEffect, useRef } from 'react';
import { Asset, MarketState, Candle } from './types';
import { getMarketData } from './services/marketData';
import { analyzeMarket } from './services/geminiService';
import { Chart } from './components/Chart';
import { SignalPanel } from './components/SignalPanel';
import { AssetSelector } from './components/AssetSelector';
import { BrainCircuit, History, RefreshCcw, Activity, Bell, BellOff, Globe, Wifi, WifiOff } from 'lucide-react';
import { AI_ACCURACY_MAP } from './constants';
import clsx from 'clsx';

const App: React.FC = () => {
  const [marketState, setMarketState] = useState<MarketState>({
    currentAsset: 'BTCUSD',
    data: [],
    lastSignal: null,
    isAnalyzing: false,
    isLive: true,
  });

  // Track the raw browser permission
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );

  // Track the user's preference within the app
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(false);

  // Initialize alertsEnabled based on existing permission
  useEffect(() => {
    if (browserPermission === 'granted') {
      setAlertsEnabled(true);
    }
  }, []);

  // Main Data Polling Effect
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const { data: newData, isLive } = await getMarketData(marketState.currentAsset, marketState.data);
        if (isMounted) {
          setMarketState(prev => ({ ...prev, data: newData, isLive }));
        }
      } catch (error) {
        console.error("Failed to fetch market data", error);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every 3 seconds for faster updates on live data
    const interval = setInterval(fetchData, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [marketState.currentAsset]); // Dependency on currentAsset ensures we reset/refetch on switch

  // Clear signal and data when switching assets to avoid showing stale data briefly
  useEffect(() => {
    setMarketState(prev => ({ ...prev, data: [], lastSignal: null, isLive: true }));
  }, [marketState.currentAsset]);

  // Signal Notification Effect
  useEffect(() => {
    const signal = marketState.lastSignal;
    
    // Check both: Valid signal AND User wants alerts
    if (signal && signal.type !== 'HOLD' && alertsEnabled && browserPermission === 'granted') {
      const title = `🚨 ENTRY HIT: ${signal.type} ${marketState.currentAsset}`;
      const body = `Entry: ${signal.entryPrice.toFixed(2)}\nTP: ${signal.takeProfit.toFixed(2)}\nSL: ${signal.stopLoss.toFixed(2)}`;
      
      try {
        new Notification(title, {
          body: body,
          tag: `signal-${signal.timestamp}`, // Prevent duplicate notifications for same signal
          renotify: true,
          requireInteraction: true,
          icon: '/favicon.ico'
        } as any);
      } catch (e) {
        console.error("Notification failed:", e);
      }
    }
  }, [marketState.lastSignal, alertsEnabled, browserPermission, marketState.currentAsset]);


  const handleAssetSelect = (asset: Asset) => {
    if (asset === marketState.currentAsset) return;
    setMarketState(prev => ({ ...prev, currentAsset: asset }));
  };

  const handleAnalyze = async () => {
    if (marketState.isAnalyzing || marketState.data.length === 0) return;

    setMarketState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const signal = await analyzeMarket(marketState.currentAsset, marketState.data);
      setMarketState(prev => ({
        ...prev,
        lastSignal: signal,
        isAnalyzing: false,
      }));
    } catch (e) {
      console.error(e);
      setMarketState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    // Case 1: Already granted, just toggle the boolean switch
    if (browserPermission === 'granted') {
      setAlertsEnabled(prev => !prev);
      return;
    }

    // Case 2: Denied previously
    if (browserPermission === 'denied') {
      alert("Notifications are blocked in your browser settings. Please click the lock icon in your address bar to enable them for this site.");
      return;
    }

    // Case 3: Default (Need to ask)
    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      
      if (permission === 'granted') {
        setAlertsEnabled(true);
        new Notification("AlphaSignal AI", { body: "Live Trading Alerts are now ACTIVE." });
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  // Helper to determine data source text
  const getDataSourceLabel = (asset: Asset, isLive: boolean) => {
    if (!isLive) return 'Simulated (Offline)';
    if (asset === 'BTCUSD') return 'Binance Live Feed';
    if (asset === 'XAUUSD') return 'Kraken Live Feed';
    if (asset === 'USOIL') return 'Mexc Live Feed';
    return 'Live Feed';
  };

  // --- Metrics Calculation Logic ---

  const calculateTrend = (data: Candle[]) => {
    // Need at least a few candles to determine trend
    if (data.length < 5) return { direction: 'Neutral', strength: 0 };
    
    // Look back 20 periods or length of data
    const period = Math.min(data.length, 20);
    const startPrice = data[data.length - period].close;
    const endPrice = data[data.length - 1].close;
    
    const changePercent = ((endPrice - startPrice) / startPrice) * 100;
    const absChange = Math.abs(changePercent);
    
    // Simple heuristic for 5-min timeframe strength
    // 1% move in 20 bars (100 mins) is very strong
    const strength = Math.min(Math.round(absChange * 80), 100); 
    
    let direction = 'Neutral';
    if (strength > 10) {
       direction = changePercent > 0 ? 'Bullish' : 'Bearish';
    }

    return { direction, strength };
  };

  const calculateVolatility = (data: Candle[]) => {
    if (data.length < 5) return { label: 'Low', value: '0.00%' };

    // Calculate average true range percent over last 10 candles
    const subset = data.slice(-10);
    const sumPctRange = subset.reduce((acc, c) => {
      const range = c.high - c.low;
      const pct = (range / c.open);
      return acc + pct;
    }, 0);
    
    const avgPct = (sumPctRange / subset.length) * 100;
    
    let label = 'Low';
    if (avgPct > 0.35) label = 'High';
    else if (avgPct > 0.15) label = 'Medium';

    return { label, value: avgPct.toFixed(2) + '%' };
  };

  // Derived state for UI
  const currentCandle = marketState.data.length > 0 ? marketState.data[marketState.data.length - 1] : null;
  const currentPrice = currentCandle ? currentCandle.close : 0;
  
  // To calculate change, we need the candle before the current one, or the open of the current one if it's the only one
  const previousCandle = marketState.data.length > 1 ? marketState.data[marketState.data.length - 2] : null;
  // Use previous candle close for 24h style change, or just Open of current candle for intraday feel
  const referencePrice = previousCandle ? previousCandle.close : (currentCandle ? currentCandle.open : 0);
  
  const priceChange = currentPrice - referencePrice;
  const percentChange = referencePrice !== 0 ? (priceChange / referencePrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Calculated Metrics
  const trendMetrics = calculateTrend(marketState.data);
  const volatilityMetrics = calculateVolatility(marketState.data);
  const accuracyMetric = AI_ACCURACY_MAP[marketState.currentAsset];

  return (
    <div className="min-h-screen bg-crypto-dark text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-crypto-accent bg-crypto-dark/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">AlphaSignal AI</h1>
              <p className="text-xs text-blue-400 font-mono">QUANT_MODEL_V2.5</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 md:space-x-6">
             <button 
               onClick={toggleNotifications}
               className={clsx(
                 "flex items-center gap-2 text-sm transition-colors px-3 py-1.5 rounded-full border",
                 alertsEnabled 
                   ? "border-green-900/50 bg-green-900/20 text-green-400 hover:bg-green-900/30" 
                   : "border-gray-700 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
               )}
               title={
                 browserPermission === 'denied' 
                  ? "Notifications blocked by browser" 
                  : alertsEnabled ? "Click to Mute Alerts" : "Click to Enable Alerts"
               }
             >
                {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                <span className="hidden md:inline">
                  {browserPermission === 'denied' ? "Alerts Blocked" : (alertsEnabled ? "Alerts On" : "Enable Alerts")}
                </span>
             </button>

             <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                System Operational
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Asset Selector */}
        <AssetSelector 
          currentAsset={marketState.currentAsset} 
          onSelect={handleAssetSelect} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Asset Price Header */}
            <div className="flex items-center justify-between bg-crypto-panel p-5 rounded-xl border border-crypto-accent shadow-lg">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {marketState.currentAsset}
                  </h2>
                  <span className="text-xs font-semibold text-gray-400 bg-crypto-dark px-2 py-1 rounded border border-crypto-accent">5m Interval</span>
                </div>
                <div className="flex items-end gap-3 mt-2">
                  <span className={clsx("text-4xl font-mono font-bold tracking-tight", isPositive ? "text-signal-buy" : "text-signal-sell")}>
                    {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className={clsx("flex items-center pb-1.5 text-sm font-medium", isPositive ? "text-signal-buy" : "text-signal-sell")}>
                    {isPositive ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)} ({Math.abs(percentChange).toFixed(2)}%)
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end justify-between h-full">
                <div className={clsx(
                  "flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border",
                  marketState.isLive 
                    ? "border-green-900/50 bg-green-900/10 text-green-400" 
                    : "border-yellow-900/50 bg-yellow-900/10 text-yellow-500"
                )}>
                   {marketState.isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                   {getDataSourceLabel(marketState.currentAsset, marketState.isLive)}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                   <RefreshCcw className="w-3 h-3 animate-spin" />
                   Updating
                </div>
              </div>
            </div>
            
            <Chart data={marketState.data} signal={marketState.lastSignal} />
            
            <div className="grid grid-cols-3 gap-4 mt-4">
               {/* Volatility */}
               <div className="bg-crypto-panel border border-crypto-accent rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Volatility (5m)</div>
                  <div className="font-mono text-sm text-white">
                    {volatilityMetrics.label} <span className="text-gray-500 text-xs">({volatilityMetrics.value})</span>
                  </div>
               </div>
               {/* Trend Strength */}
               <div className="bg-crypto-panel border border-crypto-accent rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Trend Strength</div>
                  <div className={clsx("font-mono text-sm", 
                    trendMetrics.direction === 'Bullish' ? "text-green-400" : 
                    trendMetrics.direction === 'Bearish' ? "text-red-400" : "text-gray-300"
                  )}>
                    {trendMetrics.direction} {trendMetrics.strength}%
                  </div>
               </div>
               {/* AI Accuracy */}
               <div className="bg-crypto-panel border border-crypto-accent rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">AI Accuracy</div>
                  <div className="font-mono text-sm text-blue-400">{accuracyMetric} (Last 100)</div>
               </div>
            </div>
          </div>

          {/* Signal Panel */}
          <div className="lg:col-span-1">
             <SignalPanel 
               signal={marketState.lastSignal} 
               loading={marketState.isAnalyzing}
               onAnalyze={handleAnalyze}
             />
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 text-center text-xs text-gray-600 max-w-2xl mx-auto leading-relaxed">
           <p>
             <strong>Disclaimer:</strong> This application is for demonstration and educational purposes only. 
             BTCUSD data sourced from Binance. XAUUSD (Gold) sourced from Kraken Public API. USOIL data sourced from Mexc.
             If live data is unavailable, the system reverts to a high-fidelity market simulation.
             The signals are generated by an AI model and should not be taken as financial advice.
           </p>
        </div>
      </main>
    </div>
  );
};

export default App;