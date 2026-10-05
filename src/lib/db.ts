import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { ScreenerStock } from '@/types/screener';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'stocks.db');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
    if (!dbInstance) {
        dbInstance = new DatabaseSync(dbPath);
        initSchema(dbInstance);
    }
    return dbInstance;
}

function initSchema(db: DatabaseSync) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS stocks (
            symbol TEXT PRIMARY KEY,
            company_name TEXT,
            sector TEXT,
            industry TEXT,
            country TEXT,
            market_cap REAL,
            market_cap_tier TEXT,
            price REAL,
            change REAL,
            change_percent REAL,
            volume REAL,
            avg_volume REAL,
            rel_volume REAL,
            pe REAL,
            forward_pe REAL,
            price_to_book REAL,
            eps REAL,
            eps_forward REAL,
            dividend_rate REAL,
            dividend_yield REAL,
            sma50 REAL,
            sma50_diff_percent REAL,
            sma200 REAL,
            sma200_diff_percent REAL,
            fifty_two_week_high REAL,
            fifty_two_week_low REAL,
            dist_52w_high REAL,
            dist_52w_low REAL,
            analyst_rating TEXT,
            rsi14 REAL,
            macd REAL,
            macd_signal REAL,
            macd_hist REAL,
            beta REAL,
            updated_at INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
        CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap);
        CREATE INDEX IF NOT EXISTS idx_stocks_pe ON stocks(pe);
        CREATE INDEX IF NOT EXISTS idx_stocks_change_percent ON stocks(change_percent);
        CREATE INDEX IF NOT EXISTS idx_stocks_dividend_yield ON stocks(dividend_yield);
        CREATE INDEX IF NOT EXISTS idx_stocks_sma200_diff ON stocks(sma200_diff_percent);
        CREATE INDEX IF NOT EXISTS idx_stocks_dist_52w_high ON stocks(dist_52w_high);
        CREATE INDEX IF NOT EXISTS idx_stocks_rsi ON stocks(rsi14);
        CREATE INDEX IF NOT EXISTS idx_stocks_beta ON stocks(beta);
        CREATE INDEX IF NOT EXISTS idx_stocks_macd_hist ON stocks(macd_hist);

        CREATE TABLE IF NOT EXISTS sync_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER,
            duration_ms INTEGER,
            stocks_updated INTEGER,
            status TEXT,
            error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS key_value_cache (
            key TEXT PRIMARY KEY,
            value TEXT,
            expires_at INTEGER
        );
    `);

    // Migration for existing databases
    try {
        const columns = (db.prepare('PRAGMA table_info(stocks)').all() as any[]).map(c => c.name);
        if (!columns.includes('rsi14')) db.exec('ALTER TABLE stocks ADD COLUMN rsi14 REAL;');
        if (!columns.includes('macd')) db.exec('ALTER TABLE stocks ADD COLUMN macd REAL;');
        if (!columns.includes('macd_signal')) db.exec('ALTER TABLE stocks ADD COLUMN macd_signal REAL;');
        if (!columns.includes('macd_hist')) db.exec('ALTER TABLE stocks ADD COLUMN macd_hist REAL;');
        if (!columns.includes('beta')) db.exec('ALTER TABLE stocks ADD COLUMN beta REAL;');
    } catch (e) {
        console.error('Migration warning (columns may already exist):', e);
    }
}

export function saveStocksToDb(stocks: ScreenerStock[]) {
    const db = getDb();
    const insertOrUpdate = db.prepare(`
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
    for (const s of stocks) {
        insertOrUpdate.run(
            s.symbol, s.companyName, s.sector, s.industry, s.country,
            s.marketCap, s.marketCapTier, s.price, s.change, s.changePercent,
            s.volume, s.avgVolume, s.relVolume, s.pe, s.forwardPe,
            s.priceToBook, s.eps, s.epsForward, s.dividendRate, s.dividendYield,
            s.sma50, s.sma50DiffPercent, s.sma200, s.sma200DiffPercent,
            s.fiftyTwoWeekHigh, s.fiftyTwoWeekLow, s.dist52WHigh, s.dist52WLow,
            s.analystRating, s.rsi14, s.macd, s.macdSignal, s.macdHist, s.beta, now
        );
    }
}

export function getAllStocksFromDb(): ScreenerStock[] {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT * FROM stocks ORDER BY market_cap DESC').all();
    return rows.map((r, idx) => ({
        no: idx + 1,
        symbol: r.symbol,
        companyName: r.company_name,
        sector: r.sector,
        industry: r.industry,
        country: r.country,
        marketCap: r.market_cap,
        marketCapTier: r.market_cap_tier,
        price: r.price,
        change: r.change,
        changePercent: r.change_percent,
        volume: r.volume,
        avgVolume: r.avg_volume,
        relVolume: r.rel_volume,
        pe: r.pe,
        forwardPe: r.forward_pe,
        priceToBook: r.price_to_book,
        eps: r.eps,
        epsForward: r.eps_forward,
        dividendRate: r.dividend_rate,
        dividendYield: r.dividend_yield,
        sma50: r.sma50,
        sma50DiffPercent: r.sma50_diff_percent,
        sma200: r.sma200,
        sma200DiffPercent: r.sma200_diff_percent,
        fiftyTwoWeekHigh: r.fifty_two_week_high,
        fiftyTwoWeekLow: r.fifty_two_week_low,
        dist52WHigh: r.dist_52w_high,
        dist52WLow: r.dist_52w_low,
        analystRating: r.analyst_rating,
        rsi14: r.rsi14 !== undefined && r.rsi14 !== null ? Number(r.rsi14) : null,
        macd: r.macd !== undefined && r.macd !== null ? Number(r.macd) : null,
        macdSignal: r.macd_signal !== undefined && r.macd_signal !== null ? Number(r.macd_signal) : null,
        macdHist: r.macd_hist !== undefined && r.macd_hist !== null ? Number(r.macd_hist) : null,
        beta: r.beta !== undefined && r.beta !== null ? Number(r.beta) : null,
    }));
}

export function getDbStats() {
    const db = getDb();
    const countRow: any = db.prepare('SELECT COUNT(*) as count FROM stocks').get();
    const lastUpdatedRow: any = db.prepare('SELECT MAX(updated_at) as last_updated FROM stocks').get();
    const history: any[] = db.prepare('SELECT * FROM sync_history ORDER BY id DESC LIMIT 5').all();
    return {
        totalStocks: countRow?.count || 0,
        lastUpdated: lastUpdatedRow?.last_updated || null,
        history,
    };
}

export function getStocksBySymbols(symbols: string[]): ScreenerStock[] {
    if (!symbols || symbols.length === 0) return [];
    const db = getDb();
    const cleanSymbols = symbols.map(s => s.trim().toUpperCase()).filter(Boolean);
    if (cleanSymbols.length === 0) return [];

    const placeholders = cleanSymbols.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM stocks WHERE UPPER(symbol) IN (${placeholders})`);
    const rows: any[] = stmt.all(...cleanSymbols);

    return rows.map((r, idx) => ({
        no: idx + 1,
        symbol: r.symbol,
        companyName: r.company_name,
        sector: r.sector,
        industry: r.industry,
        country: r.country,
        marketCap: r.market_cap,
        marketCapTier: r.market_cap_tier,
        price: r.price,
        change: r.change,
        changePercent: r.change_percent,
        volume: r.volume,
        avgVolume: r.avg_volume,
        relVolume: r.rel_volume,
        pe: r.pe,
        forwardPe: r.forward_pe,
        priceToBook: r.price_to_book,
        eps: r.eps,
        epsForward: r.eps_forward,
        dividendRate: r.dividend_rate,
        dividendYield: r.dividend_yield,
        sma50: r.sma50,
        sma50DiffPercent: r.sma50_diff_percent,
        sma200: r.sma200,
        sma200DiffPercent: r.sma200_diff_percent,
        fiftyTwoWeekHigh: r.fifty_two_week_high,
        fiftyTwoWeekLow: r.fifty_two_week_low,
        dist52WHigh: r.dist_52w_high,
        dist52WLow: r.dist_52w_low,
        analystRating: r.analyst_rating,
        rsi14: r.rsi14 !== undefined && r.rsi14 !== null ? Number(r.rsi14) : null,
        macd: r.macd !== undefined && r.macd !== null ? Number(r.macd) : null,
        macdSignal: r.macd_signal !== undefined && r.macd_signal !== null ? Number(r.macd_signal) : null,
        macdHist: r.macd_hist !== undefined && r.macd_hist !== null ? Number(r.macd_hist) : null,
        beta: r.beta !== undefined && r.beta !== null ? Number(r.beta) : null,
    }));
}
