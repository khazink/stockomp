import YahooFinance from 'yahoo-finance2';
import { SCREENER_UNIVERSE } from '@/lib/screenerUniverse';
import { ScreenerStock } from '@/types/screener';
import { deriveTechnicals } from '@/lib/technicalCalculations';
import { getDb, saveStocksToDb, getDbStats } from '@/lib/db';
import { getMarketStatus, MarketStatus } from '@/lib/marketHours';

const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });

interface SyncManagerState {
    initialized: boolean;
    autoSyncEnabled: boolean;
    isSyncing: boolean;
    lastSyncTime: number | null;
    lastDurationMs: number | null;
    lastStocksUpdated: number;
    lastError: string | null;
    nextSyncTime: number | null;
    timerId: any | null;
}

// Preserve state across Next.js dev server hot module reloads
const globalKey = Symbol.for('stockomp.backgroundSync');
const globalObj = globalThis as unknown as { [globalKey]?: SyncManagerState };

if (!globalObj[globalKey]) {
    globalObj[globalKey] = {
        initialized: false,
        autoSyncEnabled: true,
        isSyncing: false,
        lastSyncTime: null,
        lastDurationMs: null,
        lastStocksUpdated: 0,
        lastError: null,
        nextSyncTime: null,
        timerId: null,
    };
}

const state = globalObj[globalKey]!;

export async function executeMarketSync(): Promise<{ success: boolean; count: number; durationMs: number; error?: string }> {
    if (state.isSyncing) {
        return { success: false, count: 0, durationMs: 0, error: 'A sync is already in progress' };
    }

    state.isSyncing = true;
    state.lastError = null;
    const startTime = Date.now();
    const db = getDb();
    const symbols = SCREENER_UNIVERSE.map(item => item.symbol);

    try {
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
            } catch (chunkErr: any) {
                console.error('[BackgroundSync] Error fetching chunk:', chunkErr.message);
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

        // Save to SQLite
        saveStocksToDb(stocks);

        const duration = Date.now() - startTime;
        state.lastSyncTime = Date.now();
        state.lastDurationMs = duration;
        state.lastStocksUpdated = stocks.length;

        // Record history
        db.prepare('INSERT INTO sync_history (timestamp, duration_ms, stocks_updated, status) VALUES (?, ?, ?, ?)').run(
            Date.now(), duration, stocks.length, 'SUCCESS'
        );

        console.log(`[BackgroundSync] Synced ${stocks.length} stocks in ${duration}ms`);
        return { success: true, count: stocks.length, durationMs: duration };
    } catch (err: any) {
        state.lastError = err.message || 'Unknown error';
        console.error('[BackgroundSync] Sync failed:', err);
        return { success: false, count: 0, durationMs: Date.now() - startTime, error: state.lastError ?? undefined };
    } finally {
        state.isSyncing = false;
        scheduleNextSync();
    }
}

function scheduleNextSync() {
    if (!state.autoSyncEnabled) {
        state.nextSyncTime = null;
        return;
    }

    if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
    }

    const market = getMarketStatus();
    const intervalMs = market.recommendedIntervalMs;
    state.nextSyncTime = Date.now() + intervalMs;

    state.timerId = setTimeout(async () => {
        if (state.autoSyncEnabled) {
            console.log(`[BackgroundSync] Timer triggered auto-sync (${market.statusText})`);
            await executeMarketSync();
        }
    }, intervalMs);
}

export function ensureBackgroundSyncRunning() {
    if (!state.initialized) {
        state.initialized = true;
        console.log('[BackgroundSync] Initializing background market sync scheduler...');
        const stats = getDbStats();
        // If DB has no stocks or stale, trigger immediately, otherwise schedule next
        if (stats.totalStocks === 0 || !stats.lastUpdated || (Date.now() - stats.lastUpdated > 180000)) {
            executeMarketSync().catch(console.error);
        } else {
            state.lastSyncTime = stats.lastUpdated;
            state.lastStocksUpdated = stats.totalStocks;
            scheduleNextSync();
        }
    }
}

export function setAutoSync(enabled: boolean) {
    state.autoSyncEnabled = enabled;
    if (enabled) {
        scheduleNextSync();
    } else {
        if (state.timerId) {
            clearTimeout(state.timerId);
            state.timerId = null;
        }
        state.nextSyncTime = null;
    }
}

export function getSyncTelemetry() {
    const market = getMarketStatus();
    const stats = getDbStats();

    return {
        autoSyncEnabled: state.autoSyncEnabled,
        isSyncing: state.isSyncing,
        lastSyncTime: state.lastSyncTime || stats.lastUpdated,
        lastDurationMs: state.lastDurationMs,
        lastStocksUpdated: state.lastStocksUpdated || stats.totalStocks,
        lastError: state.lastError,
        nextSyncTime: state.nextSyncTime,
        secondsUntilNextSync: state.nextSyncTime ? Math.max(0, Math.floor((state.nextSyncTime - Date.now()) / 1000)) : null,
        market,
        totalInDb: stats.totalStocks,
        recentSyncLogs: stats.history || [],
    };
}
