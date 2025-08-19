# Crypto Trading Bot Indicator

A Discord bot that scans cryptocurrency markets for RSI divergence patterns and sends alerts to a specified Discord channel.

## Features

- Monitors multiple cryptocurrency pairs on Binance
- Detects regular bullish and bearish RSI divergences
- Sends alerts to a Discord channel
- Configurable parameters for RSI and divergence detection
- Runs scans at configurable intervals

## Setup

### Prerequisites

- Node.js (v14 or higher)
- Yarn or npm
- A Discord bot token (see [Discord Developer Portal](https://discord.com/developers/applications))
- A Discord channel ID where alerts will be sent

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   yarn install
   ```
   or
   ```
   npm install
   ```
3. Configure environment variables:
   - Copy the `.env` file and update with your Discord bot token and channel ID
   ```
   DISCORD_BOT_TOKEN=your_discord_bot_token_here
   DISCORD_CHANNEL_ID=your_channel_id_here
   ```

### Configuration

You can modify the following parameters in `src/bots.ts`:

- `timeframe`: The candlestick timeframe to analyze (default: '1d')
- `symbols`: The cryptocurrency pairs to monitor
- `rsiPeriod`: The period for RSI calculation (default: 14)
- `lbL` and `lbR`: Left and right lookback periods for pivot detection
- `rangeLower` and `rangeUpper`: Range limits for divergence detection
- `runIntervalMillis`: How often to run the scan (default: 12 hours)

### Running the Bot

Build and run the project:

```
yarn tsc
node dist/bots.js
```

or using ts-node-dev for development:

```
yarn ts-node-dev src/bots.ts
```

## How It Works

The bot uses the RSI (Relative Strength Index) indicator to detect divergences between price action and the indicator. When a divergence is detected, it sends an alert to the specified Discord channel.

- **Regular Bullish Divergence**: Occurs when price makes a lower low, but RSI makes a higher low
- **Regular Bearish Divergence**: Occurs when price makes a higher high, but RSI makes a lower high

## License

MIT