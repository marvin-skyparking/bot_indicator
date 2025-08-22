import ccxt from 'ccxt';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // <-- load .env

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------
const timeframe = process.env.TIMEFRAME || '1d';
const runIntervalMillis = parseInt(process.env.RUN_INTERVAL || '43200000', 10); // default 12h

const symbols = [
  'BNB/USDT',
  'ETH/USDT',
  'ADA/USDT',
  'TRX/USDT',
  'DOGE/USDT',
  'DOT/USDT',
  'TON/USDT',
  'LUNC/USDT',
  'LINK/USDT'
];

const fonnteToken  = process.env.FONNTE_TOKEN;
const fonnteEndpoint = process.env.FONNTE_ENDPOINT || 'https://api.fonnte.com/send';

// Targets can be comma-separated in .env
const fonnteTargets = process.env.FONNTE_TARGETS
  ? process.env.FONNTE_TARGETS.split(',').map((t) => t.trim())
  : [];

if (!fonnteToken || fonnteTargets.length === 0) {
  console.error('❌ Missing FONNTE_TOKEN or FONNTE_TARGETS in .env');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// HELPER - send message via Fonnte (GET style)
// -----------------------------------------------------------------------------
async function sendWhatsapp(message: string, targets: string[]) {
  try {
    for (const target of targets) {
      const url = `${fonnteEndpoint}?token=${fonnteToken}&target=${target}&message=${encodeURIComponent(message)}`;
      const response = await axios.get(url);
      console.log(`📩 Sent WhatsApp message to ${target}: ${message}`);
      console.log('   Fonnte API response:', response.data);
    }
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp:', error.response?.data || error.message);
  }
}

// -----------------------------------------------------------------------------
// INDICATOR SETTINGS
// -----------------------------------------------------------------------------
const rsiPeriod = 14;
const lbL = 5;
const lbR = 5;
const rangeLower = 5;
const rangeUpper = 60;

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS (RSI + Pivots)
// -----------------------------------------------------------------------------
function calculateRSI(closes: number[], period: number) {
  const rsi: number[] = [];
  let gainSum = 0, lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gainSum += diff;
    if (diff < 0) lossSum += Math.abs(diff);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    let gain = diff > 0 ? diff : 0;
    let loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function pivotLow(series: number[], left: number, right: number, index: number): boolean {
  for (let i = 1; i <= left; i++) if (series[index] >= series[index - i]) return false;
  for (let i = 1; i <= right; i++) if (series[index] >= series[index + i]) return false;
  return true;
}

function pivotHigh(series: number[], left: number, right: number, index: number): boolean {
  for (let i = 1; i <= left; i++) if (series[index] <= series[index - i]) return false;
  for (let i = 1; i <= right; i++) if (series[index] <= series[index + i]) return false;
  return true;
}

// -----------------------------------------------------------------------------
// MAIN LOGIC
// -----------------------------------------------------------------------------
async function runScan() {
  const binance = new ccxt.binance();

  for (const symbol of symbols) {
    try {
      const ohlc = await binance.fetchOHLCV(symbol, timeframe, undefined, 250);
      const closes = ohlc.map((c) => c[4]);
      const highs = ohlc.map((c) => c[2]);
      const lows  = ohlc.map((c) => c[3]);
      const rsi   = calculateRSI(closes, rsiPeriod);

      const lastIdx = closes.length - 1;
      const rsiIdx  = lastIdx - lbR;

      const plFound = pivotLow(rsi, lbL, lbR, rsiIdx);
      const phFound = pivotHigh(rsi, lbL, lbR, rsiIdx);

      let barsSincePl = 0, barsSincePh = 0;
      for (let i = rsiIdx - 1; i >= 0; i--) { barsSincePl++; if (pivotLow(rsi, lbL, lbR, i)) break; }
      for (let i = rsiIdx - 1; i >= 0; i--) { barsSincePh++; if (pivotHigh(rsi, lbL, lbR, i)) break; }

      const inRangePl = rangeLower <= barsSincePl && barsSincePl <= rangeUpper;
      const inRangePh = rangeLower <= barsSincePh && barsSincePh <= rangeUpper;

      const prevRsiPl = rsi[rsiIdx - barsSincePl];
      const prevLow   = lows[rsiIdx - barsSincePl];

      const prevRsiPh = rsi[rsiIdx - barsSincePh];
      const prevHigh  = highs[rsiIdx - barsSincePh];

      const oscHL = rsi[rsiIdx] > prevRsiPl && inRangePl;
      const priceLL = lows[rsiIdx] < prevLow;
      const bullAlert = plFound && oscHL && priceLL;

      const oscLH = rsi[rsiIdx] < prevRsiPh && inRangePh;
      const priceHH = highs[rsiIdx] > prevHigh;
      const bearAlert = phFound && oscLH && priceHH;

      if (bullAlert) {
        await sendWhatsapp(`🟢 ${symbol} → Regular Bullish Divergence detected on ${timeframe}`, fonnteTargets);
      }
      if (bearAlert) {
        await sendWhatsapp(`🔴 ${symbol} → Regular Bearish Divergence detected on ${timeframe}`, fonnteTargets);
      }

    } catch (err) {
      console.error(`Error scanning ${symbol}:`, err);
    }
  }
}

// -----------------------------------------------------------------------------
// LOOP EXECUTION
// -----------------------------------------------------------------------------
(async () => {
  console.log('🚀 Divergence Scanner started...');
  await runScan();
  setInterval(runScan, runIntervalMillis);
})();
