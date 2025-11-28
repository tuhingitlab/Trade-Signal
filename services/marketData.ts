import { Candle, Asset } from '../types';
import { MOCK_START_PRICES, VOLATILITY } from '../constants';

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// --- Mock Generation Logic (Fallback) ---

export const generateInitialMockData = (asset: Asset, count: number = 60): Candle[] => {
  const data: Candle[] = [];
  let currentPrice = MOCK_START_PRICES[asset];
  const now = new Date();
  
  // Align to nearest 5 min
  const coeff = 1000 * 60 * 5;
  const roundedNow = new Date(Math.floor(now.getTime() / coeff) * coeff);

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = roundedNow.getTime() - i * 5 * 60 * 1000;
    const vol = VOLATILITY[asset];
    
    const change = currentPrice * (Math.random() - 0.5) * vol * 2;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + (Math.random() * currentPrice * vol * 0.5);
    const low = Math.min(open, close) - (Math.random() * currentPrice * vol * 0.5);
    const volume = Math.floor(Math.random() * 1000) + 100;

    data.push({
      time: formatTime(timestamp),
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }
  return data;
};

export const updateMockData = (asset: Asset, currentData: Candle[]): Candle[] => {
  if (currentData.length === 0) return generateInitialMockData(asset);

  const lastCandle = currentData[currentData.length - 1];
  const now = Date.now();
  const candleDuration = 5 * 60 * 1000;
  
  // Check if we are still in the same 5-minute bucket
  const isSameBucket = Math.floor(now / candleDuration) === Math.floor(lastCandle.timestamp / candleDuration);

  const vol = VOLATILITY[asset];
  
  if (isSameBucket) {
    // Update the current candle (simulate live ticks)
    const drift = lastCandle.close * (Math.random() - 0.5) * (vol / 10);
    const newClose = lastCandle.close + drift;
    const newHigh = Math.max(lastCandle.high, newClose);
    const newLow = Math.min(lastCandle.low, newClose);
    
    const updatedCandle = {
      ...lastCandle,
      close: newClose,
      high: newHigh,
      low: newLow,
      volume: lastCandle.volume + Math.floor(Math.random() * 10),
    };

    return [...currentData.slice(0, -1), updatedCandle];
  } else {
    // Create new candle
    const open = lastCandle.close;
    const close = open; // Start at open
    const newTimestamp = lastCandle.timestamp + candleDuration;
    
    const newCandle: Candle = {
      time: formatTime(newTimestamp),
      timestamp: newTimestamp,
      open,
      high: open,
      low: open,
      close,
      volume: 0,
    };
    
    return [...currentData.slice(1), newCandle];
  }
};

// --- Helper: CORS Proxy Fetcher ---
const fetchWithProxy = async (targetUrl: string): Promise<Response> => {
  // Rotate proxies to ensure reliability
  const proxies = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`
  ];

  for (const createProxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per proxy

      const res = await fetch(createProxyUrl(targetUrl), { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (res.ok) return res;
    } catch (e) {
      // Siltently fail and try next proxy
    }
  }
  throw new Error('All CORS proxies failed');
};

// --- Real Market Data Fetching ---

// 1. Binance API for Crypto (BTC) and PAXG (Gold Fallback)
// Binance usually supports CORS directly
const fetchBinanceData = async (symbol: string): Promise<Candle[]> => {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=100`);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const rawData = await response.json();
    
    return rawData.map((d: any) => ({
      time: formatTime(d[0]),
      timestamp: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
    }));
  } catch (error) {
    console.warn(`Binance fetch error for ${symbol}:`, error);
    return [];
  }
};

// 2. Kraken API for Gold (XAUUSD)
// Requires Proxy due to CORS
const fetchKrakenData = async (): Promise<Candle[]> => {
  try {
    const url = `https://api.kraken.com/0/public/OHLC?pair=XAUUSD&interval=5`;
    const response = await fetchWithProxy(url);
    
    const data = await response.json();
    if (data.error && data.error.length > 0) throw new Error(data.error.join(', '));

    // Kraken result keys are dynamic (e.g., XAUUSD or XXAUZUSD). Get the first key in result.
    const resultKey = Object.keys(data.result).find(k => k !== 'last');
    if (!resultKey) throw new Error('No data key found in Kraken result');

    const list = data.result[resultKey];
    
    // Kraken: [time(s), open, high, low, close, vwap, vol, count]
    return list.slice(-100).map((d: any[]) => ({
      time: formatTime(d[0] * 1000),
      timestamp: d[0] * 1000,
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[6]),
    }));

  } catch (error) {
    console.warn("Kraken fetch error (will try fallback):", error);
    return [];
  }
};

// 3. Mexc API for Oil (USOIL)
// Wraps in proxy to be safe against CORS issues
const fetchMexcData = async (): Promise<Candle[]> => {
  try {
    const url = `https://contract.mexc.com/api/v1/contract/kline/USOIL_USDT?interval=Min5`;
    const response = await fetchWithProxy(url);

    // Some proxies might return HTML error pages with 200 OK status
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response from Mexc proxy");
    }

    if (!json.success || !json.data || !json.data.time) throw new Error('Mexc API error');

    const { time, open, close, high, low, vol } = json.data;
    
    // Mexc returns separate arrays for each field.
    const length = time.length;
    const candles: Candle[] = [];

    // We only need the last 100
    const startIdx = Math.max(0, length - 100);

    for (let i = startIdx; i < length; i++) {
      candles.push({
        time: formatTime(time[i] * 1000),
        timestamp: time[i] * 1000,
        open: open[i],
        high: high[i],
        low: low[i],
        close: close[i],
        volume: vol[i],
      });
    }

    return candles;
  } catch (error) {
    console.warn("Mexc fetch error (will try fallback):", error);
    return [];
  }
};

// Fallback: Yahoo Finance API (via CORS Proxy)
// Kept only as a backup
const fetchYahooData = async (symbol: string): Promise<Candle[]> => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d&includePrePost=false&useYfid=true&_=${Date.now()}`;

  try {
    const response = await fetchWithProxy(url);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return [];
    }

    const result = data.chart?.result?.[0];
    
    if (!result) return [];

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    if (!timestamps || !quote) return [];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] === null) continue;
        const ts = timestamps[i] * 1000;
        candles.push({
            time: formatTime(ts),
            timestamp: ts,
            open: parseFloat(quote.open[i].toFixed(2)),
            high: parseFloat(quote.high[i].toFixed(2)),
            low: parseFloat(quote.low[i].toFixed(2)),
            close: parseFloat(quote.close[i].toFixed(2)),
            volume: quote.volume[i] || 0
        });
    }
    if (candles.length > 0) return candles.slice(-60);
  } catch (error) {
    console.warn("Yahoo Fallback failed:", error);
  }
  return [];
};

// --- Main Service Function ---

export const getMarketData = async (asset: Asset, currentData: Candle[]): Promise<{ data: Candle[], isLive: boolean }> => {
  let newData: Candle[] = [];
  
  if (asset === 'BTCUSD') {
    newData = await fetchBinanceData('BTCUSDT');
  } else if (asset === 'XAUUSD') {
    // 1. Try Kraken (Spot Gold) via Proxy
    newData = await fetchKrakenData();
    
    // 2. Fallback: Binance PAXGUSDT (Paxos Gold) 
    // This is very reliable and almost 1:1 with XAUUSD price
    if (newData.length === 0) {
      newData = await fetchBinanceData('PAXGUSDT');
    }

    // 3. Fallback to Yahoo GC=F
    if (newData.length === 0) newData = await fetchYahooData('GC=F');

  } else if (asset === 'USOIL') {
    // 1. Try Mexc (USOIL_USDT Futures) via Proxy
    newData = await fetchMexcData();
    // 2. Fallback to Yahoo CL=F
    if (newData.length === 0) newData = await fetchYahooData('CL=F');
  }

  // If we got real data, return it
  if (newData.length > 0) {
    return { data: newData, isLive: true };
  }

  // Fallback: Simulation
  // If we have existing data and simulation is requested or network failed, continue sim
  if (currentData.length > 0) {
    return { data: updateMockData(asset, currentData), isLive: false };
  }
  
  return { data: generateInitialMockData(asset), isLive: false };
};
