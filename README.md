# 📈 StocKomp — Comprehensive S&P 500 Stock Intelligence Platform

An institutional-grade stock research and analysis suite built with Next.js 16, TypeScript, Tailwind CSS, and SQLite. Featuring authentic Finviz-style screening, real-time S&P 500 market heatmaps, side-by-side stock comparison, custom watchlists, portfolio tracking, and automated background market synchronization.

---

## 🚀 Key Features

### 1. 🔍 Finviz-Style Stock Screener
- **Authentic 5-Column Filter Matrix**: Includes tabs for **Descriptive**, **Fundamental**, **Technical**, **News**, **ETF**, and **All**.
- **Multi-Attribute Filters**: Screen across Exchanges (NASDAQ/NYSE), Indices (S&P 500, S&P 100, DJIA, NASDAQ 100), Sectors, Industries, Market Cap Tiers, P/E, Forward P/E, PEG, P/B, P/S, Margins, Debt/Equity, Short Float %, Analyst Recommendations, and Market Themes (AI, Semis, Cloud, Cybersecurity, Fintech, Clean Energy).
- **Advanced Technical Indicators**: Real-time Wilder's smoothed **RSI (14)**, **MACD (12, 26, 9)** with signal lines and histograms, and covariance-based **Beta** volatility metrics.
- **Multiple Table Views**: Seamlessly switch between **Overview**, **Valuation**, **Financial & Dividends**, and **Technical & Indicators** views.
- **Instant CSV Export**: One-click download of filtered constituents with quotes, valuation metrics, and technical signals.

### 2. 🗺️ S&P 500 Market Heatmap (Finviz Map)
- **Nested Squarified Treemap**: Visualizes all 503 constituents sized by market capitalization and color-coded by daily percentage performance.
- **Sector & Industry Grouping**: Clean hierarchy across Technology, Financials, Healthcare, Consumer, Energy, and Industrials.
- **Timeframe Filtering**: Toggle between **1 Day**, **1 Week**, **1 Month**, and **1 Year** performance views.
- **Interactive Inspection**: Hover tooltips with real-time price, market cap, and daily change, with direct navigation to detailed stock breakdowns.

### 3. ⚖️ Side-by-Side Stock Comparison Tool (`/compare`)
- **Multi-Stock Benchmarking**: Compare up to 4 stocks simultaneously against each other and benchmark against the S&P 500 (`SPY`).
- **Normalized Relative Return Charts**: Multi-line comparative timeline charting percentage returns over 1M, 6M, 1Y, and 5Y horizons.
- **Financial Matrix & Visual Meters**: Side-by-side comparison of Market Cap, P/E, Forward P/E, PEG, P/B, EV/EBITDA, Profit Margins, ROE, ROA, Debt-to-Equity, and Analyst Consensus.
- **Quick-Fill Battle Presets**: Instant loadouts for **Mega-Cap Tech** (NVDA vs AAPL vs MSFT), **EV & Auto** (TSLA vs GM vs F), **Semiconductor Titans** (NVDA vs AMD vs INTC), and **Fintech / Payments** (V vs MA vs PYPL).

### 4. 💼 Custom Watchlists & Portfolio Tracker (`/portfolio`)
- **Quick Watchlist**: Star (`★`) any stock from the screener or individual stock pages for rapid tracking.
- **Portfolio Holding Management**: Track shares owned, cost basis per share, current market value, total dollar gain/loss, and unrealized return %.
- **Sector Allocation Breakdown**: Dynamic visual progress bar displaying portfolio exposure by industry sector.
- **Local Persistence & Real-Time Sync**: Instant local browser storage synchronized with live pricing quotes.

### 5. ⚡ Automated Background Market Sync & SQLite Caching
- **SQLite Database Architecture**: All 503 S&P 500 constituents cached locally in `data/stocks.db` with indexed technicals.
- **Market Hours Awareness**: Automatically detects **Pre-Market**, **Regular Trading (9:30 AM - 4:00 PM ET)**, **After-Hours**, and **Market Closed** sessions.
- **Adaptive Sync Intervals**: Polls quotes every 60 seconds during live market trading and conserves resources when the market is closed.
- **Daemon Worker**: Standalone background worker (`scripts/market-sync-daemon.js`) capable of running as an independent background service.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Database**: [Node.js SQLite](https://nodejs.org/api/sqlite.html) (`node:sqlite`)
- **Market Data Engine**: Yahoo Finance API integration (`yahoo-finance2`)

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/khazink/stockomp.git
   cd stockomp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 📂 Navigation & Routes

| Route | Description |
| :--- | :--- |
| `/` | Overview dashboard with live indices and market leaders |
| `/screener` | Full Finviz-style screener with 5-column filter matrix |
| `/map` | S&P 500 visual market heatmap (Finviz Map) |
| `/compare` | Side-by-side stock comparison and benchmarking |
| `/portfolio` | Custom watchlists and portfolio holding tracker |
| `/stock/[ticker]` | Comprehensive stock fundamentals, financials, and interactive charts |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
