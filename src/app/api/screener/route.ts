import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { SCREENER_UNIVERSE } from '@/lib/screenerUniverse';
import { ScreenerStock } from '@/types/screener';
import { deriveTechnicals } from '@/lib/technicalCalculations';
import { getDb, saveStocksToDb, getAllStocksFromDb, getDbStats } from '@/lib/db';

const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });

const DB_CACHE_TTL_MS = 180 * 1000; // 3 minutes persistent cache

async function fetchAndSyncLiveStocks(): Promise<ScreenerStock[]> {
    const startTime = Date.now();
    const db = getDb();
    const symbols = SCREENER_UNIVERSE.map(item => item.symbol);

    try {
        // Chunk symbols into groups of 50 to avoid URL length or rate limits
        const CHUNK_SIZE = 50;
        const chunks: string[][] = [];
        for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
            chunks.push(symbols.slice(i, i + CHUNK_SIZE));
        }

        const quoteMap = new Map<string, any>();

        for (const chunk of chunks) {
            try {
                const quotes: any[] = await yahooFinance.quote(chunk);
                quotes.forEach(q => {
                    if (q && q.symbol) quoteMap.set(q.symbol, q);
                });
            } catch (err) {
                console.error('Error fetching chunk:', chunk.slice(0, 3), err);
            }
        }

        const stocks: ScreenerStock[] = SCREENER_UNIVERSE.map((item, index) => {
            const q = quoteMap.get(item.symbol) || {};
            const price = q.regularMarketPrice || q.postMarketPrice || 0;
            const change = q.regularMarketChange || 0;
            const changePercent = q.regularMarketChangePercent || 0;
            const marketCap = q.marketCap || 0;

            let marketCapTier: 'Mega' | 'Large' | 'Mid' | 'Small' = 'Mid';
            if (marketCap >= 200_000_000_000) marketCapTier = 'Mega';
            else if (marketCap >= 10_000_000_000) marketCapTier = 'Large';
            else if (marketCap >= 2_000_000_000) marketCapTier = 'Mid';
            else marketCapTier = 'Small';

            const volume = q.regularMarketVolume || 0;
            const avgVolume = q.averageDailyVolume3Month || q.averageDailyVolume10Day || volume;
            const relVolume = avgVolume > 0 ? Number((volume / avgVolume).toFixed(2)) : 1;

            const pe = q.trailingPE ? Number(q.trailingPE.toFixed(2)) : null;
            const forwardPe = q.forwardPE ? Number(q.forwardPE.toFixed(2)) : null;
            const priceToBook = q.priceToBook ? Number(q.priceToBook.toFixed(2)) : null;
            const eps = q.epsTrailingTwelveMonths !== undefined ? Number(q.epsTrailingTwelveMonths.toFixed(2)) : null;
            const epsForward = q.epsForward !== undefined ? Number(q.epsForward.toFixed(2)) : null;

            let divYield: number | null = null;
            if (q.dividendYield !== undefined && q.dividendYield !== null) {
                divYield = Number((q.dividendYield).toFixed(2));
            } else if (q.trailingAnnualDividendYield !== undefined && q.trailingAnnualDividendYield !== null) {
                divYield = Number((q.trailingAnnualDividendYield * 100).toFixed(2));
            }

            const dividendRate = q.dividendRate || q.trailingAnnualDividendRate || null;

            const sma50 = q.fiftyDayAverage ? Number(q.fiftyDayAverage.toFixed(2)) : null;
            const sma50DiffPercent = (price && sma50) ? Number((((price - sma50) / sma50) * 100).toFixed(2)) : null;

            const sma200 = q.twoHundredDayAverage ? Number(q.twoHundredDayAverage.toFixed(2)) : null;
            const sma200DiffPercent = (price && sma200) ? Number((((price - sma200) / sma200) * 100).toFixed(2)) : null;

            const fiftyTwoWeekHigh = q.fiftyTwoWeekHigh ? Number(q.fiftyTwoWeekHigh.toFixed(2)) : null;
            const fiftyTwoWeekLow = q.fiftyTwoWeekLow ? Number(q.fiftyTwoWeekLow.toFixed(2)) : null;

            const dist52WHigh = (price && fiftyTwoWeekHigh) ? Number((((price - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100).toFixed(2)) : null;
            const dist52WLow = (price && fiftyTwoWeekLow) ? Number((((price - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 100).toFixed(2)) : null;

            let analystRating: string | null = null;
            if (q.averageAnalystRating) {
                analystRating = String(q.averageAnalystRating).replace(/_/g, ' ');
            }

            const technicals = deriveTechnicals({
                price,
                changePercent,
                sma50DiffPercent,
                sma200DiffPercent,
                fiftyTwoWeekHigh,
                fiftyTwoWeekLow,
                sector: item.sector,
            });

            return {
                no: index + 1,
                symbol: item.symbol,
                companyName: q.shortName || q.longName || item.name,
                sector: item.sector,
                industry: item.industry,
                country: item.country,
                marketCap,
                marketCapTier,
                price: Number(price.toFixed(2)),
                change: Number(change.toFixed(2)),
                changePercent: Number(changePercent.toFixed(2)),
                volume,
                avgVolume,
                relVolume,
                pe,
                forwardPe,
                priceToBook,
                eps,
                epsForward,
                dividendRate: dividendRate ? Number(dividendRate.toFixed(2)) : null,
                dividendYield: divYield,
                sma50,
                sma50DiffPercent,
                sma200,
                sma200DiffPercent,
                fiftyTwoWeekHigh,
                fiftyTwoWeekLow,
                dist52WHigh,
                dist52WLow,
                analystRating,
                rsi14: technicals.rsi14,
                macd: technicals.macd,
                macdSignal: technicals.macdSignal,
                macdHist: technicals.macdHist,
                beta: technicals.beta,
            };
        });

        // Save into SQLite
        saveStocksToDb(stocks);

        // Record history
        const duration = Date.now() - startTime;
        db.prepare('INSERT INTO sync_history (timestamp, duration_ms, stocks_updated, status) VALUES (?, ?, ?, ?)').run(
            Date.now(), duration, stocks.length, 'SUCCESS'
        );

        return stocks;
    } catch (e: any) {
        console.error('Failed to sync live stocks:', e);
        db.prepare('INSERT INTO sync_history (timestamp, duration_ms, stocks_updated, status, error_message) VALUES (?, ?, ?, ?, ?)').run(
            Date.now(), Date.now() - startTime, 0, 'ERROR', e.message || 'Unknown error'
        );
        throw e;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    try {
        const stats = getDbStats();
        const now = Date.now();
        const isStale = !stats.lastUpdated || (now - stats.lastUpdated > DB_CACHE_TTL_MS);

        if (forceRefresh || stats.totalStocks < 100 || isStale) {
            const freshStocks = await fetchAndSyncLiveStocks();
            return NextResponse.json({
                source: 'live_synced_to_sqlite',
                cached: false,
                timestamp: now,
                lastUpdated: now,
                total: freshStocks.length,
                stocks: freshStocks,
            });
        }

        const cachedStocks = getAllStocksFromDb();
        return NextResponse.json({
            source: 'sqlite_cache',
            cached: true,
            timestamp: now,
            lastUpdated: stats.lastUpdated,
            cacheAgeSeconds: Math.floor((now - stats.lastUpdated) / 1000),
            total: cachedStocks.length,
            stocks: cachedStocks,
        });
    } catch (e: any) {
        const fallback = getAllStocksFromDb();
        if (fallback.length > 0) {
            return NextResponse.json({
                source: 'sqlite_fallback',
                cached: true,
                warning: 'Live update failed, serving cached SQLite database',
                total: fallback.length,
                stocks: fallback,
            });
        }
        return NextResponse.json({ error: 'Database and live sync failed', message: e.message }, { status: 500 });
    }
}

export async function POST() {
    try {
        const stocks = await fetchAndSyncLiveStocks();
        return NextResponse.json({
            success: true,
            message: 'Database refreshed with S&P 500 companies',
            total: stocks.length,
            timestamp: Date.now(),
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
