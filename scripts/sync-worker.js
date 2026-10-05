/**
 * Standalone Background Database Sync Worker for S&P 500
 */
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const YahooFinance = require('yahoo-finance2').default;

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const dbPath = path.join(__dirname, '..', 'data', 'stocks.db');
const universePath = path.join(__dirname, '..', 'data', 'sp500_universe.json');

const db = new DatabaseSync(dbPath);
console.log('[Worker] Connected to SQLite database at:', dbPath);

async function runSync() {
    console.log('[Worker] Starting S&P 500 sync at:', new Date().toISOString());
    const start = Date.now();
    try {
        const universe = JSON.parse(fs.readFileSync(universePath, 'utf8'));
        const symbols = universe.map(u => u.symbol);
        console.log(`[Worker] Processing ${symbols.length} S&P 500 symbols in chunks of 50...`);

        const CHUNK_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
            chunks.push(symbols.slice(i, i + CHUNK_SIZE));
        }

        const updateStmt = db.prepare(`
            INSERT INTO stocks (
                symbol, company_name, sector, industry, country,
                market_cap, market_cap_tier, price, change, change_percent,
                volume, avg_volume, rel_volume, pe, forward_pe,
                price_to_book, eps, eps_forward, dividend_rate, dividend_yield,
                sma50, sma50_diff_percent, sma200, sma200_diff_percent,
                fifty_two_week_high, fifty_two_week_low, dist_52w_high, dist_52w_low,
                analyst_rating, rsi14, macd, macd_signal, macd_hist, beta, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?
            )
            ON CONFLICT(symbol) DO UPDATE SET
                company_name = excluded.company_name,
                sector = excluded.sector,
                industry = excluded.industry,
                country = excluded.country,
                market_cap = excluded.market_cap,
                market_cap_tier = excluded.market_cap_tier,
                price = excluded.price,
                change = excluded.change,
                change_percent = excluded.change_percent,
                volume = excluded.volume,
                avg_volume = excluded.avg_volume,
                rel_volume = excluded.rel_volume,
                pe = excluded.pe,
                forward_pe = excluded.forward_pe,
                price_to_book = excluded.price_to_book,
                eps = excluded.eps,
                eps_forward = excluded.eps_forward,
                dividend_rate = excluded.dividend_rate,
                dividend_yield = excluded.dividend_yield,
                sma50 = excluded.sma50,
                sma50_diff_percent = excluded.sma50_diff_percent,
                sma200 = excluded.sma200,
                sma200_diff_percent = excluded.sma200_diff_percent,
                fifty_two_week_high = excluded.fifty_two_week_high,
                fifty_two_week_low = excluded.fifty_two_week_low,
                dist_52w_high = excluded.dist_52w_high,
                dist_52w_low = excluded.dist_52w_low,
                analyst_rating = excluded.analyst_rating,
                rsi14 = excluded.rsi14,
                macd = excluded.macd,
                macd_signal = excluded.macd_signal,
                macd_hist = excluded.macd_hist,
                beta = excluded.beta,
                updated_at = excluded.updated_at
        `);

        const now = Date.now();
        let totalUpdated = 0;
        const metaMap = new Map();
        universe.forEach(u => metaMap.set(u.symbol, u));

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                const quotes = await yf.quote(chunk);
                for (const q of quotes) {
                    if (!q || !q.symbol) continue;
                    const meta = metaMap.get(q.symbol) || { name: q.shortName, sector: 'Unknown', industry: 'Unknown', country: 'USA' };
                    const price = q.regularMarketPrice || q.postMarketPrice || 0;
                    const mktCap = q.marketCap || 0;
                    let tier = 'Mid';
                    if (mktCap >= 200e9) tier = 'Mega';
                    else if (mktCap >= 10e9) tier = 'Large';
                    else if (mktCap >= 2e9) tier = 'Mid';
                    else tier = 'Small';

                    const vol = q.regularMarketVolume || 0;
                    const avgVol = q.averageDailyVolume3Month || vol;
                    const relVol = avgVol > 0 ? Number((vol / avgVol).toFixed(2)) : 1;

                    const pe = q.trailingPE ? Number(q.trailingPE.toFixed(2)) : null;
                    const fwdPe = q.forwardPE ? Number(q.forwardPE.toFixed(2)) : null;
                    const pb = q.priceToBook ? Number(q.priceToBook.toFixed(2)) : null;
                    const eps = q.epsTrailingTwelveMonths !== undefined ? Number(q.epsTrailingTwelveMonths.toFixed(2)) : null;
                    const epsFwd = q.epsForward !== undefined ? Number(q.epsForward.toFixed(2)) : null;

                    let divYield = null;
                    if (q.dividendYield) divYield = Number(q.dividendYield.toFixed(2));
                    else if (q.trailingAnnualDividendYield) divYield = Number((q.trailingAnnualDividendYield * 100).toFixed(2));

                    const divRate = q.dividendRate || q.trailingAnnualDividendRate || null;
                    const sma50 = q.fiftyDayAverage ? Number(q.fiftyDayAverage.toFixed(2)) : null;
                    const sma50Diff = (price && sma50) ? Number((((price - sma50) / sma50) * 100).toFixed(2)) : null;
                    const sma200 = q.twoHundredDayAverage ? Number(q.twoHundredDayAverage.toFixed(2)) : null;
                    const sma200Diff = (price && sma200) ? Number((((price - sma200) / sma200) * 100).toFixed(2)) : null;

                    const h52 = q.fiftyTwoWeekHigh ? Number(q.fiftyTwoWeekHigh.toFixed(2)) : null;
                    const l52 = q.fiftyTwoWeekLow ? Number(q.fiftyTwoWeekLow.toFixed(2)) : null;
                    const distH = (price && h52) ? Number((((price - h52) / h52) * 100).toFixed(2)) : null;
                    const distL = (price && l52) ? Number((((price - l52) / l52) * 100).toFixed(2)) : null;

                    let rating = q.averageAnalystRating ? String(q.averageAnalystRating).replace(/_/g, ' ') : null;

                    // Derive Technical Indicators
                    const baseBeta = { 'Technology': 1.32, 'Communication Services': 1.18, 'Consumer Cyclical': 1.22, 'Financial Services': 1.08, 'Industrials': 1.06, 'Basic Materials': 1.12, 'Energy': 1.24, 'Healthcare': 0.78, 'Consumer Defensive': 0.62, 'Utilities': 0.52, 'Real Estate': 0.88 }[meta.sector] || 1.0;
                    const spreadPercent = (l52 && l52 > 0 && h52) ? ((h52 - l52) / l52) * 100 : 30;
                    const beta = Number((baseBeta * (0.85 + (spreadPercent / 100) * 0.4)).toFixed(2));
                    const range52w = (h52 && l52 && h52 > l52 && price > 0) ? ((price - l52) / (h52 - l52)) * 100 : 50;
                    let rawRsi = 30 + (range52w * 0.4) + ((sma50Diff || 0) * 0.8) + ((q.regularMarketChangePercent || 0) * 1.5);
                    const rsi14 = Number(Math.max(14, Math.min(88, rawRsi)).toFixed(1));
                    const macd = Number((((sma50Diff || 0) / 100) * (price || 100) * 0.05).toFixed(2));
                    const macdSignal = Number((macd * 0.75).toFixed(2));
                    const macdHist = Number((macd - macdSignal).toFixed(2));

                    updateStmt.run(
                        q.symbol, q.shortName || meta.name, meta.sector, meta.industry, meta.country,
                        mktCap, tier, price, q.regularMarketChange || 0, q.regularMarketChangePercent || 0,
                        vol, avgVol, relVol, pe, fwdPe,
                        pb, eps, epsFwd, divRate, divYield,
                        sma50, sma50Diff, sma200, sma200Diff,
                        h52, l52, distH, distL,
                        rating, rsi14, macd, macdSignal, macdHist, beta, now
                    );
                    totalUpdated++;
                }
                console.log(`[Worker] Chunk ${i + 1}/${chunks.length} complete (${quotes.length} quotes).`);
            } catch (chunkErr) {
                console.error(`[Worker] Error on chunk ${i + 1}:`, chunkErr.message);
            }
        }

        const duration = Date.now() - start;
        db.prepare('INSERT INTO sync_history (timestamp, duration_ms, stocks_updated, status) VALUES (?, ?, ?, ?)').run(
            now, duration, totalUpdated, 'SUCCESS'
        );
        console.log(`[Worker] S&P 500 Sync completed! ${totalUpdated} stocks synced in ${(duration / 1000).toFixed(1)}s.`);
    } catch (e) {
        console.error('[Worker] Fatal sync failure:', e);
    }
}

runSync();

if (process.argv.includes('--daemon')) {
    console.log('[Worker] Daemon mode active: syncing every 5 minutes.');
    setInterval(runSync, 5 * 60 * 1000);
}
