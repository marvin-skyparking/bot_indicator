import ccxt from 'ccxt';
import axios from 'axios';
import dotenv from 'dotenv';
import { calculateRSI, pivotLow, pivotHigh } from './utils/indicators';

dotenv.config();

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------
const fonnteToken  = process.env.FONNTE_TOKEN;
const fonnteTarget = process.env.FONNTE_TARGET;
const fonnteEndpoint = process.env.FONNTE_ENDPOINT || 'https://api.fonnte.com/send';

if (!fonnteToken || !fonnteTarget) {
  console.error('❌ Missing FONNTE_TOKEN or FONNTE_TARGET in .env');
  process.exit(1);
}

const timeframe = '1d';
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

// indicator parameters
const rsiPeriod   = 14;
const lbL         = 5;
const lbR         = 5;
const rangeLower  = 5;
const rangeUpper  = 60;

const runIntervalMillis = 30 * 1000; // 30 seconds

// -----------------------------------------------------------------------------
// HELPER - send message via Fonnte (GET style)
// -----------------------------------------------------------------------------
async function sendWhatsapp(message: string) {
  try {
    const url = `${fonnteEndpoint}?token=${fonnteToken}&target=${fonnteTarget}&message=${encodeURIComponent(message)}`;
    const response = await axios.get(url);

    console.log(`📩 Sent WhatsApp message: ${message}`);
    console.log('   Fonnte API response:', response.data);
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp:', error.response?.data || error.message);
  }
}

// -----------------------------------------------------------------------------
// MAIN LOGIC
// -----------------------------------------------------------------------------
async function runScan() {
  const binance = new ccxt.binance({
    enableRateLimit: true,
    timeout: 30000
  });

  for (const symbol of symbols) {
    try {
      const ohlc = await binance.fetchOHLCV(symbol, timeframe, undefined, 250);

      const closes = ohlc.map((c) => (c[4] !== undefined ? +c[4] : 0));
      const highs  = ohlc.map((c) => (c[2] !== undefined ? +c[2] : 0));
      const lows   = ohlc.map((c) => (c[3] !== undefined ? +c[3] : 0));

      const rsi = calculateRSI(closes, rsiPeriod);

      const lastIdx = closes.length - 1;
      const rsiIdx  = lastIdx - lbR;

      const plFound = pivotLow(rsi, lbL, lbR, rsiIdx);
      const phFound = pivotHigh(rsi, lbL, lbR, rsiIdx);

      let barsSincePl = 0;
      let barsSincePh = 0;
      for (let i = rsiIdx - 1; i >= 0; i--) {
        barsSincePl++;
        if (pivotLow(rsi, lbL, lbR, i)) break;
      }
      for (let i = rsiIdx - 1; i >= 0; i--) {
        barsSincePh++;
        if (pivotHigh(rsi, lbL, lbR, i)) break;
      }

      const inRangePl  = rangeLower <= barsSincePl && barsSincePl <= rangeUpper;
      const inRangePh  = rangeLower <= barsSincePh && barsSincePh <= rangeUpper;

      const prevRsiPl  = rsi[rsiIdx - barsSincePl];
      const prevLow    = lows[rsiIdx - barsSincePl];

      const prevRsiPh  = rsi[rsiIdx - barsSincePh];
      const prevHigh   = highs[rsiIdx - barsSincePh];

      const oscHL   = rsi[rsiIdx] > prevRsiPl && inRangePl;
      const priceLL = lows[rsiIdx] < prevLow;
      const bullAlert = plFound && oscHL && priceLL;

      const oscLH   = rsi[rsiIdx] < prevRsiPh && inRangePh;
      const priceHH = highs[rsiIdx] > prevHigh;
      const bearAlert = phFound && oscLH && priceHH;

      if (bullAlert) {
        await sendWhatsapp(`🟢 ${symbol} → Regular Bullish Divergence detected on ${timeframe}`);
      }
      if (bearAlert) {
        await sendWhatsapp(`🔴 ${symbol} → Regular Bearish Divergence detected on ${timeframe}`);
      }

    } catch (err) {
      console.error(`❌ Error scanning ${symbol}:`, err);
    }
  }
}

// -----------------------------------------------------------------------------
// START LOOP
// -----------------------------------------------------------------------------
(async () => {
  console.log('🚀 WhatsApp Divergence Bot started.');
  await runScan();

  setInterval(async () => {
    console.log('⏳ Running scheduled scan...');
    await runScan();
  }, runIntervalMillis);
})();
