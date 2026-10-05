/**
 * Standalone Automated Market Sync Daemon
 * Periodically updates the SQLite database with live Yahoo Finance data,
 * intelligently adjusting sync frequency based on U.S. market hours.
 *
 * Usage:
 *   node scripts/market-sync-daemon.js
 */

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const YahooFinance = require('yahoo-finance2').default;

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const dbPath = path.join(__dirname, '..', 'data', 'stocks.db');
const universePath = path.join(__dirname, '..', 'data', 'sp500_universe.json');

const db = new DatabaseSync(dbPath);

console.log('====================================================');
console.log('  StocKomp - Automated Background Market Sync Daemon');
console.log('====================================================');
console.log('[Daemon] Database: ' + dbPath);

function getMarketHoursInfo() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
    });
    const parts = formatter.formatToParts(now);
    const m = {};
    for (const p of parts) m[p.type] = p.value;

    const weekday = m.weekday;
    const hour = parseInt(m.hour, 10);
    const minute = parseInt(m.minute, 10);
    const totalMinutes = hour * 60 + minute;
    const etTimeStr = `${weekday} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ET`;

    if (weekday === 'Sat' || weekday === 'Sun') {
        return {
            status: 'CLOSED_WEEKEND',
            label: 'Market Closed (Weekend)',
            intervalMs: 60 * 60 * 1000, // 1 hour
            etTime: etTimeStr,
        };
    }

    if (totalMinutes >= 570 && totalMinutes < 960) {
        // 9:30 AM to 4:00 PM ET
        return {
            status: 'REGULAR',
            label: 'Market Open (Regular Trading)',
            intervalMs: 5 * 60 * 1000, // 5 minutes
            etTime: etTimeStr,
        };
    } else if (totalMinutes >= 240 && totalMinutes < 570) {
        // 4:00 AM to 9:30 AM ET
        return {
            status: 'PRE_MARKET',
            label: 'Pre-Market Session',
            intervalMs: 15 * 60 * 1000, // 15 minutes
            etTime: etTimeStr,
        };
    } else if (totalMinutes >= 960 && totalMinutes < 1200) {
        // 4:00 PM to 8:00 PM ET
        return {
            status: 'AFTER_HOURS',
            label: 'After-Hours Session',
            intervalMs: 15 * 60 * 1000, // 15 minutes
            etTime: etTimeStr,
        };
    } else {
        return {
            status: 'CLOSED_OVERNIGHT',
            label: 'Market Closed (Overnight)',
            intervalMs: 60 * 60 * 1000, // 1 hour
            etTime: etTimeStr,
        };
    }
}

async function performSync() {
    const market = getMarketHoursInfo();
    const startTime = Date.now();
    console.log(`\n[${new Date().toLocaleTimeString()}] ${market.label} (${market.etTime})`);
    console.log(`[Daemon] Starting S&P 500 sync...`);

    try {
        const universe = JSON.parse(fs.readFileSync(universePath, 'utf8'));
        const symbols = universe.map(u => u.symbol);
        const metaMap = new Map();
        universe.forEach(u => metaMap.set(u.symbol, u));

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
                analyst_rating, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?
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
                updated_at = excluded.updated_at
        `);

        const now = Date.now();
        let totalCount = 0;

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

                    updateStmt.run(
                        q.symbol, q.shortName || meta.name, meta.sector, meta.industry, meta.country,
                        mktCap, tier, price, q.regularMarketChange || 0, q.regularMarketChangePercent || 0,
                        vol, avgVol, relVol, pe, fwdPe,
                        pb, eps, epsFwd, divRate, divYield,
                        sma50, sma50Diff, sma200, sma200Diff,
                        h52, l52, distH, distL,
                        rating, now
                    );
                    totalCount++;
                }
            } catch (chunkErr) {
                console.error(`[Daemon] Error on chunk ${i + 1}:`, chunkErr.message);
            }
        }

        const duration = Date.now() - startTime;
        db.prepare('INSERT INTO sync_history (timestamp, duration_ms, stocks_updated, status) VALUES (?, ?, ?, ?)').run(
            now, duration, totalCount, 'SUCCESS'
        );

        console.log(`[Daemon] Sync successful: ${totalCount} stocks updated in ${(duration / 1000).toFixed(1)}s`);
    } catch (err) {
        console.error('[Daemon] Sync failed:', err);
    }

    // Schedule next sync based on current market condition
    const nextMarket = getMarketHoursInfo();
    const nextIntervalMins = Math.round(nextMarket.intervalMs / 60000);
    console.log(`[Daemon] Next sync in ${nextIntervalMins} minute(s) (${nextMarket.label})`);
    setTimeout(performSync, nextMarket.intervalMs);
}

// Start daemon loop
performSync();
