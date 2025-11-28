import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Candle, TradeSignal } from '../types';

// NOTE: In a production app, never expose API keys on the client.
// This is a demo/prototype running in a controlled environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeMarket = async (
  asset: Asset,
  data: Candle[]
): Promise<TradeSignal> => {
  // Take last 20 candles for context
  const recentData = data.slice(-20);
  const currentPrice = recentData[recentData.length - 1].close;

  const prompt = `
    Analyze the following OHLC (Open, High, Low, Close) market data for ${asset} on a 5-minute timeframe.
    
    Data (JSON):
    ${JSON.stringify(recentData.map(c => ({ t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume })))}

    You are an expert high-frequency quantitative trader with 80% historical accuracy.
    Your task:
    1. Identify the immediate trend and key support/resistance levels.
    2. Generate a TRADING SIGNAL: BUY, SELL, or HOLD.
    3. If BUY or SELL:
       - Entry Price: ${currentPrice} (Current Market Price)
       - Stop Loss (SL): Must be placed logically below support (Buy) or above resistance (Sell).
       - Take Profit (TP): MUST be calculated to achieve exactly a 1:2 Risk:Reward ratio relative to the SL distance.
       - Risk:Reward Ratio must be "1:2".
    4. Provide a brief, technical reasoning (max 2 sentences).
    5. Confidence score (0-100). If the setup isn't clear, output HOLD with 0 entry/sl/tp.

    Return JSON strictly matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD"] },
            entryPrice: { type: Type.NUMBER },
            stopLoss: { type: Type.NUMBER },
            takeProfit: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            riskRewardRatio: { type: Type.STRING },
          },
          required: ["type", "entryPrice", "stopLoss", "takeProfit", "confidence", "reasoning", "riskRewardRatio"],
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      type: result.type,
      entryPrice: result.entryPrice || 0,
      stopLoss: result.stopLoss || 0,
      takeProfit: result.takeProfit || 0,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || "Market uncertain.",
      riskRewardRatio: result.riskRewardRatio || "N/A",
      timestamp: Date.now(),
    };

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Fallback safe signal
    return {
      type: 'HOLD',
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      confidence: 0,
      reasoning: "Analysis service temporarily unavailable.",
      riskRewardRatio: "N/A",
      timestamp: Date.now(),
    };
  }
};