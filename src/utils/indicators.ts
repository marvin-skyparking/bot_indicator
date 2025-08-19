export function calculateRSI(closes: number[], period: number) {
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
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

export function pivotLow(series: number[], left: number, right: number, index: number): boolean {
  for (let i = 1; i <= left; i++) if (series[index] >= series[index - i]) return false;
  for (let i = 1; i <= right; i++) if (series[index] >= series[index + i]) return false;
  return true;
}

export function pivotHigh(series: number[], left: number, right: number, index: number): boolean {
  for (let i = 1; i <= left; i++) if (series[index] <= series[index - i]) return false;
  for (let i = 1; i <= right; i++) if (series[index] <= series[index + i]) return false;
  return true;
}
