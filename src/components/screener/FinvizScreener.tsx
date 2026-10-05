"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    Search,
    SlidersHorizontal,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Download,
    RotateCcw,
    TrendingUp,
    TrendingDown,
    Zap,
    Flame,
    DollarSign,
    Sparkles,
    ShieldCheck,
    Layers,
    Loader2,
    Clock,
    Activity,
    CheckCircle2,
    Pause,
    Play,
    Star
} from 'lucide-react';
import { toggleWatchlist, WATCHLIST_EVENT } from '@/lib/portfolioStorage';
import { ScreenerStock, ScreenerView, ScreenerFilters } from '@/types/screener';
import FinvizFilterMatrix from './FinvizFilterMatrix';
import { enrichStockWithFinvizData, DOW_30_SYMBOLS, NASDAQ_SYMBOLS } from '@/lib/finvizMeta';

const INITIAL_FILTERS: ScreenerFilters = {
    search: '',
    preset: 'ALL',
    filterTab: 'descriptive',

    // Descriptive Filters
    exchange: 'ALL',
    index: 'ALL',
    sector: 'ALL',
    industry: 'ALL',
    country: 'ALL',
    marketCapTier: 'ALL',
    dividendRange: 'ALL',
    shortFloat: 'ALL',
    analystRating: 'ALL',
    optionShort: 'ALL',
    earningsDate: 'ALL',
    avgVolume: 'ALL',
    relVolume: 'ALL',
    currentVolume: 'ALL',
    trades: 'ALL',
    priceRange: 'ALL',
    targetPrice: 'ALL',
    ipoDate: 'ALL',
    sharesOutstanding: 'ALL',
    floatShares: 'ALL',
    theme: 'ALL',
    subTheme: 'ALL',

    // Fundamental Filters
    peRange: 'ALL',
    forwardPeRange: 'ALL',
    pegRange: 'ALL',
    priceToBookRange: 'ALL',
    priceToSalesRange: 'ALL',
    priceToFcfRange: 'ALL',
    currentRatioRange: 'ALL',
    debtEquityRange: 'ALL',
    grossMarginRange: 'ALL',
    profitMarginRange: 'ALL',
    roeRange: 'ALL',
    payoutRange: 'ALL',
    insiderOwnRange: 'ALL',
    instOwnRange: 'ALL',

    // Technical Filters
    changeRange: 'ALL',
    sma50Filter: 'ALL',
    sma200Filter: 'ALL',
    fiftyTwoWeekFilter: 'ALL',
    rsiFilter: 'ALL',
    macdFilter: 'ALL',
    betaFilter: 'ALL',
    volatilityRange: 'ALL',
};

export default function FinvizScreener() {
    const [stocks, setStocks] = useState<ScreenerStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [watchlistSet, setWatchlistSet] = useState<Set<string>>(new Set());

    useEffect(() => {
        const updateWatchlistState = () => {
            try {
                const raw = localStorage.getItem('stockomp_watchlist');
                if (raw) {
                    const list = JSON.parse(raw);
                    setWatchlistSet(new Set(list.map((item: any) => item.symbol.toUpperCase())));
                } else {
                    setWatchlistSet(new Set());
                }
            } catch {}
        };
        updateWatchlistState();
        window.addEventListener(WATCHLIST_EVENT, updateWatchlistState);
        return () => window.removeEventListener(WATCHLIST_EVENT, updateWatchlistState);
    }, []);

    const handleToggleWatchlistRow = (s: ScreenerStock, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWatchlist({ symbol: s.symbol, name: s.companyName, sector: s.sector });
    };

    const [error, setError] = useState<string | null>(null);
    const [dbMeta, setDbMeta] = useState<{ source?: string; lastUpdated?: number; cacheAgeSeconds?: number }>({});
    const [syncInfo, setSyncInfo] = useState<{
        autoSyncEnabled?: boolean;
        isSyncing?: boolean;
        lastSyncTime?: number | null;
        lastDurationMs?: number | null;
        lastStocksUpdated?: number;
        secondsUntilNextSync?: number | null;
        market?: {
            isOpen: boolean;
            session: string;
            statusText: string;
            description: string;
            etTime: string;
            nextOpenOrClose: string;
        };
        totalInDb?: number;
    }>({});
    const [countdown, setCountdown] = useState<number | null>(null);

    const [view, setView] = useState<ScreenerView>('overview');
    const [filters, setFilters] = useState<ScreenerFilters>(INITIAL_FILTERS);
    const [sortCol, setSortCol] = useState<keyof ScreenerStock>('marketCap');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(50);

    // Fetch sync telemetry and market hours
    const fetchSyncTelemetry = async () => {
        try {
            const res = await fetch('/api/sync');
            if (res.ok) {
                const data = await res.json();
                setSyncInfo(data);
                if (data.secondsUntilNextSync !== null && data.secondsUntilNextSync !== undefined) {
                    setCountdown(data.secondsUntilNextSync);
                }
            }
        } catch {}
    };

    // Fetch data from API (with SQLite database caching)
    const loadScreenerData = async (forceRefresh = false) => {
        try {
            if (forceRefresh) setSyncing(true);
            else setLoading(true);

            const url = forceRefresh ? '/api/screener?refresh=true' : '/api/screener';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to load screener data');
            const data = await res.json();
            setStocks(data.stocks || []);
            setDbMeta({
                source: data.source,
                lastUpdated: data.lastUpdated,
                cacheAgeSeconds: data.cacheAgeSeconds,
            });
            fetchSyncTelemetry();
        } catch (err: any) {
            setError(err.message || 'Error loading screener');
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    };

    // Toggle background auto sync
    const toggleAutoSync = async () => {
        const nextState = !syncInfo.autoSyncEnabled;
        try {
            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggleAutoSync', enabled: nextState })
            });
            if (res.ok) {
                const data = await res.json();
                setSyncInfo(data.telemetry);
                if (!nextState) setCountdown(null);
            }
        } catch {}
    };

    useEffect(() => {
        loadScreenerData();
        fetchSyncTelemetry();

        // Telemetry status heartbeat every 10s
        const statusTimer = setInterval(fetchSyncTelemetry, 10000);
        return () => clearInterval(statusTimer);
    }, []);

    // Local 1-second countdown ticker
    useEffect(() => {
        if (countdown === null || countdown <= 0) return;
        const tick = setInterval(() => {
            setCountdown(prev => {
                if (prev === null || prev <= 1) {
                    loadScreenerData();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(tick);
    }, [countdown]);

    // Unique industries sorted
    const industries = useMemo(() => {
        const set = new Set<string>();
        stocks.forEach(s => {
            if (s.industry && s.industry.trim()) set.add(s.industry.trim());
        });
        return Array.from(set).sort();
    }, [stocks]);

    // Preset Handlers
    const applyPreset = (presetName: string) => {
        setPage(1);
        if (presetName === 'ALL') {
            setFilters(INITIAL_FILTERS);
            return;
        }

        const newF = { ...INITIAL_FILTERS, preset: presetName };

        switch (presetName) {
            case 'gainers':
                newF.changeRange = 'POS_2';
                setSortCol('changePercent');
                setSortOrder('desc');
                break;
            case 'losers':
                newF.changeRange = 'NEG_2';
                setSortCol('changePercent');
                setSortOrder('asc');
                break;
            case 'mega':
                newF.marketCapTier = 'Mega';
                setSortCol('marketCap');
                setSortOrder('desc');
                break;
            case 'value':
                newF.peRange = 'UNDER_20';
                setSortCol('pe');
                setSortOrder('asc');
                break;
            case 'tech_growth':
                newF.sector = 'Technology';
                setSortCol('marketCap');
                setSortOrder('desc');
                break;
            case 'high_dividend':
                newF.dividendRange = 'OVER_2';
                setSortCol('dividendYield');
                setSortOrder('desc');
                break;
            case '52w_high':
                newF.fiftyTwoWeekFilter = 'NEAR_HIGH_5';
                setSortCol('dist52WHigh');
                setSortOrder('desc');
                break;
            case 'above_200sma':
                newF.sma200Filter = 'ABOVE';
                setSortCol('sma200DiffPercent');
                setSortOrder('desc');
                break;
            case 'oversold':
                newF.rsiFilter = 'OS_30';
                setSortCol('rsi14');
                setSortOrder('asc');
                break;
            case 'overbought':
                newF.rsiFilter = 'OB_70';
                setSortCol('rsi14');
                setSortOrder('desc');
                break;
            case 'macd_bull':
                newF.macdFilter = 'BULL_HIST';
                setSortCol('macdHist');
                setSortOrder('desc');
                break;
            case 'low_beta':
                newF.betaFilter = 'LOW_08';
                setSortCol('beta');
                setSortOrder('asc');
                break;
            case 'high_beta':
                newF.betaFilter = 'HIGH_13';
                setSortCol('beta');
                setSortOrder('desc');
                break;
        }

        setFilters(newF);
    };

    const handleSort = (col: keyof ScreenerStock) => {
        if (sortCol === col) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortCol(col);
            setSortOrder(['changePercent', 'volume', 'relVolume', 'marketCap', 'price', 'dividendYield'].includes(col as string) ? 'desc' : 'asc');
        }
    };

    // Filter Logic
    const filteredStocks = useMemo(() => {
        return stocks.filter(rawStock => {
            const s = enrichStockWithFinvizData(rawStock);

            if (filters.preset === 'watchlist' && !watchlistSet.has(s.symbol.toUpperCase())) return false;

            // Search filter
            if (filters.search) {
                const term = filters.search.toLowerCase().trim();
                const matchSym = s.symbol.toLowerCase().includes(term);
                const matchName = s.companyName.toLowerCase().includes(term);
                if (!matchSym && !matchName) return false;
            }

            // --- Descriptive Filters ---
            // Exchange
            if (filters.exchange !== 'ALL' && s.exchange !== filters.exchange) {
                return false;
            }

            // Index
            if (filters.index !== 'ALL') {
                if (filters.index === 'DJIA' && !DOW_30_SYMBOLS.has(s.symbol.toUpperCase())) return false;
                if (filters.index === 'NASDAQ100' && (!NASDAQ_SYMBOLS.has(s.symbol.toUpperCase()) || s.marketCap < 80e9)) return false;
                if (filters.index === 'SP100' && s.marketCap < 120e9) return false;
            }

            // Sector
            if (filters.sector !== 'ALL' && s.sector !== filters.sector) {
                return false;
            }

            // Industry
            if (filters.industry !== 'ALL' && s.industry !== filters.industry) {
                return false;
            }

            // Country
            if (filters.country !== 'ALL') {
                if (filters.country === 'USA' && s.country && s.country !== 'USA' && s.country !== 'United States') return false;
                if (filters.country !== 'USA' && s.country !== filters.country) return false;
            }

            // Market Cap Tier
            if (filters.marketCapTier !== 'ALL') {
                if (filters.marketCapTier === 'Mega' && s.marketCap < 200e9) return false;
                if (filters.marketCapTier === 'Large' && (s.marketCap < 10e9 || s.marketCap >= 200e9)) return false;
                if (filters.marketCapTier === 'Mid' && (s.marketCap < 2e9 || s.marketCap >= 10e9)) return false;
                if (filters.marketCapTier === 'Small' && s.marketCap >= 2e9) return false;
            }

            // Short Float
            if (filters.shortFloat !== 'ALL') {
                const sf = s.shortFloat || 2.0;
                if (filters.shortFloat === 'LOW_5' && sf >= 5) return false;
                if (filters.shortFloat === 'MID_5_10' && (sf < 5 || sf > 10)) return false;
                if (filters.shortFloat === 'HIGH_10' && sf <= 10) return false;
                if (filters.shortFloat === 'VHIGH_20' && sf <= 20) return false;
            }

            // Analyst Recommendation
            if (filters.analystRating !== 'ALL') {
                const rec = (s.analystRating || '').toLowerCase();
                if (filters.analystRating === 'STRONG_BUY' && !rec.includes('strong buy')) return false;
                if (filters.analystRating === 'BUY' && !rec.includes('buy')) return false;
                if (filters.analystRating === 'HOLD' && !rec.includes('hold')) return false;
                if (filters.analystRating === 'SELL' && !rec.includes('sell') && !rec.includes('underperform')) return false;
            }

            // Theme & Sub-theme
            if (filters.theme !== 'ALL' && s.theme !== filters.theme) {
                return false;
            }
            if (filters.subTheme !== 'ALL' && s.subTheme !== filters.subTheme) {
                return false;
            }

            // Target Price
            if (filters.targetPrice !== 'ALL') {
                const tp = s.targetPrice || s.price;
                if (filters.targetPrice === 'ABOVE' && tp <= s.price) return false;
                if (filters.targetPrice === 'BELOW' && tp > s.price) return false;
                if (filters.targetPrice === 'ABOVE_10' && tp < s.price * 1.10) return false;
                if (filters.targetPrice === 'ABOVE_20' && tp < s.price * 1.20) return false;
            }

            // Average Volume / Current Volume
            if (filters.avgVolume !== 'ALL' || filters.currentVolume !== 'ALL') {
                const v = s.volume;
                const volFilter = filters.currentVolume !== 'ALL' ? filters.currentVolume : filters.avgVolume;
                if (volFilter === 'UNDER_500K' && v >= 500000) return false;
                if (volFilter === 'UNDER_1M' && v >= 1000000) return false;
                if (volFilter === 'OVER_500K' && v < 500000) return false;
                if (volFilter === 'OVER_1M' && v < 1000000) return false;
                if (volFilter === 'OVER_2M' && v < 2000000) return false;
                if (volFilter === 'OVER_5M' && v < 5000000) return false;
                if (volFilter === 'OVER_10M' && v < 10000000) return false;
                if (volFilter === 'OVER_20M' && v < 20000000) return false;
            }

            // Relative Volume
            if (filters.relVolume !== 'ALL') {
                const rv = s.relVolume || 1.0;
                if (filters.relVolume === 'OVER_1' && rv < 1.0) return false;
                if (filters.relVolume === 'OVER_1_5' && rv < 1.5) return false;
                if (filters.relVolume === 'OVER_2' && rv < 2.0) return false;
                if (filters.relVolume === 'UNDER_1' && rv >= 1.0) return false;
            }

            // Shares Outstanding
            if (filters.sharesOutstanding !== 'ALL') {
                const so = s.sharesOutstanding || (s.marketCap / s.price);
                if (filters.sharesOutstanding === 'UNDER_50M' && so >= 50e6) return false;
                if (filters.sharesOutstanding === 'UNDER_500M' && so >= 500e6) return false;
                if (filters.sharesOutstanding === 'OVER_100M' && so < 100e6) return false;
                if (filters.sharesOutstanding === 'OVER_500M' && so < 500e6) return false;
                if (filters.sharesOutstanding === 'OVER_1B' && so < 1e9) return false;
                if (filters.sharesOutstanding === 'OVER_5B' && so < 5e9) return false;
            }

            // Float Shares
            if (filters.floatShares !== 'ALL') {
                const fs = s.floatShares || (s.marketCap / s.price * 0.88);
                if (filters.floatShares === 'UNDER_50M' && fs >= 50e6) return false;
                if (filters.floatShares === 'UNDER_500M' && fs >= 500e6) return false;
                if (filters.floatShares === 'OVER_100M' && fs < 100e6) return false;
                if (filters.floatShares === 'OVER_500M' && fs < 500e6) return false;
                if (filters.floatShares === 'OVER_1B' && fs < 1e9) return false;
            }

            // Price Range
            if (filters.priceRange !== 'ALL') {
                if (filters.priceRange === 'UNDER_10' && s.price >= 10) return false;
                if (filters.priceRange === 'UNDER_20' && s.price >= 20) return false;
                if (filters.priceRange === 'UNDER_50' && s.price >= 50) return false;
                if (filters.priceRange === 'UNDER_100' && s.price >= 100) return false;
                if (filters.priceRange === 'OVER_50' && s.price < 50) return false;
                if (filters.priceRange === 'OVER_100' && s.price < 100) return false;
                if (filters.priceRange === 'OVER_200' && s.price < 200) return false;
            }

            // Dividend Yield
            if (filters.dividendRange !== 'ALL') {
                if (filters.dividendRange === 'NONE' && (s.dividendYield && s.dividendYield > 0)) return false;
                if (filters.dividendRange === 'POS' && (!s.dividendYield || s.dividendYield <= 0)) return false;
                if (filters.dividendRange === 'OVER_1_5' && (!s.dividendYield || s.dividendYield < 1.5)) return false;
                if (filters.dividendRange === 'OVER_2' && (!s.dividendYield || s.dividendYield < 2.0)) return false;
                if (filters.dividendRange === 'OVER_3' && (!s.dividendYield || s.dividendYield < 3.0)) return false;
                if (filters.dividendRange === 'OVER_5' && (!s.dividendYield || s.dividendYield < 5.0)) return false;
            }

            // --- Fundamental Filters ---
            // P/E Ratio
            if (filters.peRange !== 'ALL') {
                if (s.pe === null || s.pe === undefined) return false;
                if (filters.peRange === 'UNDER_15' && s.pe >= 15) return false;
                if (filters.peRange === 'UNDER_20' && s.pe >= 20) return false;
                if (filters.peRange === 'UNDER_30' && s.pe >= 30) return false;
                if (filters.peRange === 'OVER_30' && s.pe <= 30) return false;
            }

            // Forward P/E
            if (filters.forwardPeRange !== 'ALL') {
                if (s.forwardPe === null || s.forwardPe === undefined) return false;
                if (filters.forwardPeRange === 'UNDER_15' && s.forwardPe >= 15) return false;
                if (filters.forwardPeRange === 'UNDER_20' && s.forwardPe >= 20) return false;
                if (filters.forwardPeRange === 'UNDER_25' && s.forwardPe >= 25) return false;
                if (filters.forwardPeRange === 'OVER_25' && s.forwardPe <= 25) return false;
            }

            // Price / Book
            if (filters.priceToBookRange !== 'ALL') {
                if (s.priceToBook === null || s.priceToBook === undefined) return false;
                if (filters.priceToBookRange === 'UNDER_1' && s.priceToBook >= 1) return false;
                if (filters.priceToBookRange === 'UNDER_2' && s.priceToBook >= 2) return false;
                if (filters.priceToBookRange === 'UNDER_5' && s.priceToBook >= 5) return false;
                if (filters.priceToBookRange === 'OVER_5' && s.priceToBook <= 5) return false;
            }

            // --- Technical Filters ---
            // Change Range
            if (filters.changeRange !== 'ALL') {
                if (filters.changeRange === 'POS' && s.changePercent <= 0) return false;
                if (filters.changeRange === 'NEG' && s.changePercent >= 0) return false;
                if (filters.changeRange === 'POS_2' && s.changePercent < 2) return false;
                if (filters.changeRange === 'NEG_2' && s.changePercent > -2) return false;
                if (filters.changeRange === 'POS_5' && s.changePercent < 5) return false;
            }

            // SMA 50
            if (filters.sma50Filter !== 'ALL') {
                if (filters.sma50Filter === 'ABOVE' && (s.sma50DiffPercent === null || s.sma50DiffPercent <= 0)) return false;
                if (filters.sma50Filter === 'BELOW' && (s.sma50DiffPercent === null || s.sma50DiffPercent >= 0)) return false;
            }

            // SMA 200
            if (filters.sma200Filter !== 'ALL') {
                if (filters.sma200Filter === 'ABOVE' && (s.sma200DiffPercent === null || s.sma200DiffPercent <= 0)) return false;
                if (filters.sma200Filter === 'BELOW' && (s.sma200DiffPercent === null || s.sma200DiffPercent >= 0)) return false;
            }

            // 52W Proximity
            if (filters.fiftyTwoWeekFilter !== 'ALL') {
                if (filters.fiftyTwoWeekFilter === 'NEAR_HIGH_5' && (s.dist52WHigh === null || s.dist52WHigh < -5)) return false;
                if (filters.fiftyTwoWeekFilter === 'NEAR_HIGH_10' && (s.dist52WHigh === null || s.dist52WHigh < -10)) return false;
                if (filters.fiftyTwoWeekFilter === 'NEAR_LOW_10' && (s.dist52WLow === null || s.dist52WLow > 10)) return false;
            }

            // RSI (14) Filter
            if (filters.rsiFilter !== 'ALL') {
                if (s.rsi14 === null || s.rsi14 === undefined) return false;
                if (filters.rsiFilter === 'OS_30' && s.rsi14 >= 30) return false;
                if (filters.rsiFilter === 'OS_20' && s.rsi14 >= 20) return false;
                if (filters.rsiFilter === 'OB_70' && s.rsi14 <= 70) return false;
                if (filters.rsiFilter === 'OB_80' && s.rsi14 <= 80) return false;
                if (filters.rsiFilter === 'BULL_40_60' && (s.rsi14 < 40 || s.rsi14 > 60)) return false;
                if (filters.rsiFilter === 'NEUTRAL_30_70' && (s.rsi14 < 30 || s.rsi14 > 70)) return false;
            }

            // MACD Filter
            if (filters.macdFilter !== 'ALL') {
                if (filters.macdFilter === 'BULL_HIST' && (s.macdHist === null || s.macdHist <= 0)) return false;
                if (filters.macdFilter === 'BEAR_HIST' && (s.macdHist === null || s.macdHist >= 0)) return false;
                if (filters.macdFilter === 'BULL_CROSS' && (s.macd === null || s.macdSignal === null || s.macd < s.macdSignal)) return false;
                if (filters.macdFilter === 'BEAR_CROSS' && (s.macd === null || s.macdSignal === null || s.macd >= s.macdSignal)) return false;
            }

            // Beta (Volatility) Filter
            if (filters.betaFilter !== 'ALL') {
                if (s.beta === null || s.beta === undefined) return false;
                if (filters.betaFilter === 'LOW_08' && s.beta >= 0.8) return false;
                if (filters.betaFilter === 'MOD_08_13' && (s.beta < 0.8 || s.beta > 1.3)) return false;
                if (filters.betaFilter === 'HIGH_13' && s.beta <= 1.3) return false;
                if (filters.betaFilter === 'VERY_HIGH_18' && s.beta <= 1.8) return false;
            }

            return true;
        });
    }, [stocks, filters, watchlistSet]);

    // Sorting Logic
    const sortedStocks = useMemo(() => {
        return [...filteredStocks].sort((a, b) => {
            let aVal = a[sortCol];
            let bVal = b[sortCol];

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (typeof aVal === 'string') {
                return sortOrder === 'asc'
                    ? (aVal as string).localeCompare(bVal as string)
                    : (bVal as string).localeCompare(aVal as string);
            }

            return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });
    }, [filteredStocks, sortCol, sortOrder]);

    const totalPages = Math.ceil(sortedStocks.length / (pageSize === -1 ? sortedStocks.length || 1 : pageSize)) || 1;
    const paginatedStocks = useMemo(() => {
        if (pageSize === -1) return sortedStocks;
        const start = (page - 1) * pageSize;
        return sortedStocks.slice(start, start + pageSize);
    }, [sortedStocks, page, pageSize]);

    // CSV Exporter
    const exportCSV = () => {
        if (!sortedStocks.length) return;
        const headers = ['Symbol', 'Company', 'Sector', 'Industry', 'Price', 'Change%', 'Market Cap', 'P/E', 'Div Yield%', 'RSI 14', 'MACD', 'MACD Hist', 'Beta', '50 SMA%', '200 SMA%'];
        const rows = sortedStocks.map(s => [
            s.symbol,
            `"${s.companyName.replace(/"/g, '""')}"`,
            `"${s.sector}"`,
            `"${s.industry}"`,
            s.price,
            s.changePercent,
            s.marketCap,
            s.pe ?? '',
            s.dividendYield ?? '',
            s.rsi14 ?? '',
            s.macd ?? '',
            s.macdHist ?? '',
            s.beta ?? '',
            s.sma50DiffPercent ?? '',
            s.sma200DiffPercent ?? ''
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `stocKomp_screener_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper Formatters
    const formatCap = (cap: number) => {
        if (!cap) return '-';
        if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
        if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
        if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
        return `$${cap.toLocaleString()}`;
    };

    const formatVol = (v: number) => {
        if (!v) return '-';
        if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
        if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
        return v.toLocaleString();
    };

    const renderSortHeader = (label: string, col: keyof ScreenerStock, align: 'left' | 'right' = 'right') => {
        const isCurrent = sortCol === col;
        return (
            <th
                onClick={() => handleSort(col)}
                className={`px-3 py-2.5 text-xs font-semibold cursor-pointer select-none transition-colors hover:bg-muted/80 whitespace-nowrap ${
                    align === 'left' ? 'text-left' : 'text-right'
                } ${isCurrent ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}
            >
                <div className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    <span>{label}</span>
                    {isCurrent ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                    ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                    )}
                </div>
            </th>
        );
    };

    return (
        <div className="flex flex-col gap-5 w-full">
            {/* Screener Header Banner */}
            <div className="bg-card border rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Finviz Screener Matrix
                        </span>

                        {/* Market Hours Status Badge */}
                        {syncInfo.market && (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
                                syncInfo.market.session === 'REGULAR'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : syncInfo.market.session === 'PRE_MARKET' || syncInfo.market.session === 'AFTER_HOURS'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    : 'bg-muted text-muted-foreground border-border'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                    syncInfo.market.session === 'REGULAR'
                                        ? 'bg-emerald-500 animate-pulse'
                                        : syncInfo.market.session === 'PRE_MARKET' || syncInfo.market.session === 'AFTER_HOURS'
                                        ? 'bg-amber-500'
                                        : 'bg-muted-foreground/60'
                                }`} />
                                <span className="font-semibold">{syncInfo.market.statusText}</span>
                                <span className="text-[11px] opacity-80">({syncInfo.market.etTime})</span>
                            </span>
                        )}

                        {/* SQLite Database Status */}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-secondary text-secondary-foreground border flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>SQLite (503 Stocks)</span>
                        </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">S&P 500 Stock Screener</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Authentic Finviz multi-criteria screening matrix covering descriptive, fundamental, technical, and macro themes across all 503 constituents.
                    </p>
                </div>

                {/* Right Action Bar with Auto-Sync Controls & CSV */}
                <div className="flex items-center flex-wrap gap-2.5 self-stretch md:self-auto">
                    {/* Auto Sync Timer Pill */}
                    <div className="flex items-center bg-muted/60 border rounded-lg px-3 py-1.5 text-xs gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                {syncInfo.autoSyncEnabled ? 'Auto-Sync' : 'Auto-Sync Paused'}
                            </span>
                            <span className="font-mono font-semibold text-foreground">
                                {syncInfo.isSyncing
                                    ? 'Updating...'
                                    : countdown !== null && countdown > 0
                                    ? `Next: ${countdown}s`
                                    : 'Active'}
                            </span>
                        </div>
                        <button
                            onClick={toggleAutoSync}
                            title={syncInfo.autoSyncEnabled ? 'Pause background sync' : 'Resume background sync'}
                            className="ml-1 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {syncInfo.autoSyncEnabled ? (
                                <Pause className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                                <Play className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                        </button>
                    </div>

                    <button
                        onClick={() => loadScreenerData(true)}
                        disabled={syncing || loading}
                        className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 transition-all shadow-xs gap-1.5 disabled:opacity-50"
                    >
                        <RotateCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Live'}
                    </button>

                    <button
                        onClick={exportCSV}
                        className="inline-flex items-center justify-center rounded-lg text-xs font-semibold border bg-background hover:bg-muted h-9 px-3 transition-colors shadow-xs gap-1.5 text-foreground"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>

                    <button
                        onClick={() => setFilters(INITIAL_FILTERS)}
                        className="inline-flex items-center justify-center rounded-lg text-xs font-medium border bg-background hover:bg-muted h-9 px-3 transition-colors shadow-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        title="Reset all filters"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Quick Presets Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1 mr-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Presets:
                </span>
                {[
                    { id: 'ALL', label: 'All Stocks' },
                    { id: 'watchlist', label: '⭐ Watchlist' },
                    { id: 'gainers', label: '🔥 Top Gainers (> +2%)' },
                    { id: 'losers', label: '📉 Top Losers (< -2%)' },
                    { id: 'mega', label: '💎 Mega-Cap ($200B+)' },
                    { id: 'value', label: '🏷️ Value (P/E < 20)' },
                    { id: 'tech_growth', label: '🚀 Tech Leaders' },
                    { id: 'high_dividend', label: '💰 High Div (> 2%)' },
                    { id: '52w_high', label: '📈 Near 52W High' },
                    { id: 'above_200sma', label: '🛡️ Above 200 SMA' },
                    { id: 'oversold', label: '🟢 Oversold (RSI < 30)' },
                    { id: 'overbought', label: '🔴 Overbought (RSI > 70)' },
                    { id: 'macd_bull', label: '⚡ MACD Bullish' },
                    { id: 'low_beta', label: '🛡️ Low Beta (< 0.8)' },
                    { id: 'high_beta', label: '🚀 High Beta (> 1.3)' },
                ].map(p => (
                    <button
                        key={p.id}
                        onClick={() => applyPreset(p.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap border ${
                            filters.preset === p.id
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Authentic Finviz 5-Column Filter Matrix Component */}
            <FinvizFilterMatrix
                filters={filters}
                setFilters={setFilters}
                industries={industries}
                totalStocks={stocks.length}
                filteredCount={sortedStocks.length}
                onReset={() => setFilters(INITIAL_FILTERS)}
            />

            {/* Finviz View Tabs */}
            <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'valuation', label: 'Valuation' },
                        { id: 'financial', label: 'Financial & Dividends' },
                        { id: 'technical', label: 'Technical & Indicators' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id as ScreenerView)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                view === tab.id
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="text-xs text-muted-foreground">
                    Sorted by: <span className="font-semibold text-foreground">{String(sortCol)}</span> ({sortOrder})
                </div>
            </div>

            {/* Pagination & View Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Show per page:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                        }}
                        className="h-7 rounded border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="250">250</option>
                        <option value="-1">All ({sortedStocks.length})</option>
                    </select>
                    <span className="text-muted-foreground ml-2">
                        {sortedStocks.length > 0 ? (
                            `Showing ${(page - 1) * (pageSize === -1 ? sortedStocks.length : pageSize) + 1} - ${Math.min(
                                page * (pageSize === -1 ? sortedStocks.length : pageSize),
                                sortedStocks.length
                            )} of ${sortedStocks.length}`
                        ) : '0 stocks'}
                    </span>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-2.5 py-1 rounded border bg-background hover:bg-muted font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        >
                            Prev
                        </button>
                        <div className="flex items-center gap-1 px-1">
                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                let pNum = i + 1;
                                if (totalPages > 7) {
                                    if (page > 4 && page < totalPages - 2) {
                                        pNum = page - 3 + i;
                                    } else if (page >= totalPages - 2) {
                                        pNum = totalPages - 6 + i;
                                    }
                                }
                                return (
                                    <button
                                        key={pNum}
                                        onClick={() => setPage(pNum)}
                                        className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                                            page === pNum
                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {pNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-2.5 py-1 rounded border bg-background hover:bg-muted font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Table Container */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">Loading live quotes & calculating technicals...</p>
                    </div>
                ) : error ? (
                    <div className="py-16 text-center text-red-500 text-sm">
                        <p className="font-semibold">Error: {error}</p>
                        <button onClick={() => window.location.reload()} className="mt-3 underline text-xs">Retry</button>
                    </div>
                ) : sortedStocks.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center">
                        <Layers className="w-10 h-10 mb-2 opacity-30" />
                        <p className="font-semibold text-foreground text-sm">No stocks match your filter criteria</p>
                        <p className="text-xs text-muted-foreground mt-1">Try loosening filters or reset to view all stocks.</p>
                        <button
                            onClick={() => setFilters(INITIAL_FILTERS)}
                            className="mt-4 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-xs"
                        >
                            Reset All Filters
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/40 divide-x divide-border/40">
                                    <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground text-center w-12">No.</th>
                                    <th className="px-2 py-2.5 text-xs font-semibold text-muted-foreground text-center w-8">★</th>
                                    {renderSortHeader('Ticker', 'symbol', 'left')}
                                    {renderSortHeader('Company Name', 'companyName', 'left')}

                                    {view === 'overview' && (
                                        <>
                                            {renderSortHeader('Sector', 'sector', 'left')}
                                            {renderSortHeader('Industry', 'industry', 'left')}
                                            {renderSortHeader('Market Cap', 'marketCap')}
                                            {renderSortHeader('P/E', 'pe')}
                                            {renderSortHeader('Price', 'price')}
                                            {renderSortHeader('Change %', 'changePercent')}
                                            {renderSortHeader('Volume', 'volume')}
                                        </>
                                    )}

                                    {view === 'valuation' && (
                                        <>
                                            {renderSortHeader('Market Cap', 'marketCap')}
                                            {renderSortHeader('P/E (ttm)', 'pe')}
                                            {renderSortHeader('Fwd P/E', 'forwardPe')}
                                            {renderSortHeader('P/B', 'priceToBook')}
                                            {renderSortHeader('EPS (ttm)', 'eps')}
                                            {renderSortHeader('EPS Fwd', 'epsForward')}
                                            {renderSortHeader('Price', 'price')}
                                            {renderSortHeader('Change %', 'changePercent')}
                                        </>
                                    )}

                                    {view === 'financial' && (
                                        <>
                                            {renderSortHeader('Market Cap', 'marketCap')}
                                            {renderSortHeader('Dividend', 'dividendRate')}
                                            {renderSortHeader('Div Yield %', 'dividendYield')}
                                            {renderSortHeader('P/E', 'pe')}
                                            {renderSortHeader('Price', 'price')}
                                            {renderSortHeader('Change %', 'changePercent')}
                                            {renderSortHeader('Analyst Rating', 'analystRating', 'left')}
                                        </>
                                    )}

                                    {view === 'technical' && (
                                        <>
                                            {renderSortHeader('Price', 'price')}
                                            {renderSortHeader('Change %', 'changePercent')}
                                            {renderSortHeader('RSI (14)', 'rsi14')}
                                            {renderSortHeader('MACD (12,26,9)', 'macd')}
                                            {renderSortHeader('MACD Hist', 'macdHist')}
                                            {renderSortHeader('Beta', 'beta')}
                                            {renderSortHeader('vs 50 SMA %', 'sma50DiffPercent')}
                                            {renderSortHeader('vs 200 SMA %', 'sma200DiffPercent')}
                                            {renderSortHeader('from 52W High %', 'dist52WHigh')}
                                            {renderSortHeader('Rel Vol', 'relVolume')}
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 font-mono">
                                {paginatedStocks.map((s, idx) => {
                                    const actualIndex = pageSize === -1 ? idx + 1 : (page - 1) * pageSize + idx + 1;
                                    const isUp = s.changePercent >= 0;
                                    const isWatchlisted = watchlistSet.has(s.symbol.toUpperCase());

                                    return (
                                        <tr
                                            key={s.symbol}
                                            className="hover:bg-muted/50 transition-colors group divide-x divide-border/30"
                                        >
                                            <td className="px-3 py-2 text-center text-muted-foreground font-sans text-xs">
                                                {actualIndex}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <button
                                                    onClick={(e) => handleToggleWatchlistRow(s, e)}
                                                    title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                                                    className="p-1 hover:scale-125 transition-transform"
                                                >
                                                    <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40 hover:text-amber-400'}`} />
                                                </button>
                                            </td>
                                            <td className="px-3 py-2 font-bold font-sans">
                                                <Link
                                                    href={`/stock/${s.symbol}`}
                                                    className="text-primary hover:underline flex items-center gap-1 group-hover:text-blue-500"
                                                >
                                                    {s.symbol}
                                                </Link>
                                            </td>
                                            <td className="px-3 py-2 font-sans truncate max-w-[180px] text-foreground" title={s.companyName}>
                                                {s.companyName}
                                            </td>

                                            {/* Overview Tab Content */}
                                            {view === 'overview' && (
                                                <>
                                                    <td className="px-3 py-2 font-sans text-muted-foreground truncate max-w-[140px]">
                                                        {s.sector}
                                                    </td>
                                                    <td className="px-3 py-2 font-sans text-muted-foreground truncate max-w-[150px]">
                                                        {s.industry}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {formatCap(s.marketCap)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {s.pe !== null ? (
                                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                                                s.pe < 20 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                                s.pe <= 35 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                                                'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                            }`}>
                                                                {s.pe.toFixed(1)}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold">
                                                        ${s.price.toFixed(2)}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {isUp ? '+' : ''}{s.changePercent.toFixed(2)}%
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-muted-foreground">
                                                        {formatVol(s.volume)}
                                                    </td>
                                                </>
                                            )}

                                            {/* Valuation Tab Content */}
                                            {view === 'valuation' && (
                                                <>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {formatCap(s.marketCap)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {s.pe ? s.pe.toFixed(1) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-muted-foreground">
                                                        {s.forwardPe ? s.forwardPe.toFixed(1) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-muted-foreground">
                                                        {s.priceToBook ? s.priceToBook.toFixed(2) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {s.eps !== null ? `$${s.eps.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-muted-foreground">
                                                        {s.epsForward !== null ? `$${s.epsForward.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold">
                                                        ${s.price.toFixed(2)}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {isUp ? '+' : ''}{s.changePercent.toFixed(2)}%
                                                    </td>
                                                </>
                                            )}

                                            {/* Financial Tab Content */}
                                            {view === 'financial' && (
                                                <>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {formatCap(s.marketCap)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {s.dividendRate ? `$${s.dividendRate.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {s.dividendYield !== null && s.dividendYield > 0 ? `${s.dividendYield.toFixed(2)}%` : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {s.pe ? s.pe.toFixed(1) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold">
                                                        ${s.price.toFixed(2)}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {isUp ? '+' : ''}{s.changePercent.toFixed(2)}%
                                                    </td>
                                                    <td className="px-3 py-2 font-sans text-xs text-muted-foreground">
                                                        {s.analystRating || 'N/A'}
                                                    </td>
                                                </>
                                            )}

                                            {/* Technical Tab Content */}
                                            {view === 'technical' && (
                                                <>
                                                    <td className="px-3 py-2 text-right font-semibold">
                                                        ${s.price.toFixed(2)}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {isUp ? '+' : ''}{s.changePercent.toFixed(2)}%
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold">
                                                        {s.rsi14 !== null && s.rsi14 !== undefined ? (
                                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                                                s.rsi14 <= 30 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                                                                s.rsi14 >= 70 ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                                                                'text-foreground'
                                                            }`}>
                                                                {s.rsi14.toFixed(1)}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {s.macd !== null && s.macd !== undefined ? (
                                                            <span className={s.macd >= (s.macdSignal ?? 0) ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                                                {s.macd.toFixed(2)}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold">
                                                        {s.macdHist !== null && s.macdHist !== undefined ? (
                                                            <span className={s.macdHist >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                                {s.macdHist >= 0 ? '+' : ''}{s.macdHist.toFixed(2)}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {s.beta !== null && s.beta !== undefined ? (
                                                            <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                                                                s.beta > 1.3 ? 'bg-amber-500/15 text-amber-400 font-bold' :
                                                                s.beta < 0.8 ? 'bg-blue-500/15 text-blue-400' :
                                                                'text-foreground'
                                                            }`}>
                                                                {s.beta.toFixed(2)}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-medium ${
                                                        (s.sma50DiffPercent || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                                                    }`}>
                                                        {s.sma50DiffPercent !== null ? `${s.sma50DiffPercent >= 0 ? '+' : ''}${s.sma50DiffPercent.toFixed(2)}%` : '-'}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-medium ${
                                                        (s.sma200DiffPercent || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                                                    }`}>
                                                        {s.sma200DiffPercent !== null ? `${s.sma200DiffPercent >= 0 ? '+' : ''}${s.sma200DiffPercent.toFixed(2)}%` : '-'}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-semibold ${
                                                        (s.dist52WHigh || 0) >= -5 ? 'text-emerald-500' : 'text-muted-foreground'
                                                    }`}>
                                                        {s.dist52WHigh !== null ? `${s.dist52WHigh.toFixed(2)}%` : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-muted-foreground">
                                                        {s.relVolume ? `${s.relVolume.toFixed(2)}x` : '-'}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bottom status bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                <div>
                    Displaying <strong>{sortedStocks.length}</strong> matching companies
                </div>
                <div>
                    Click any stock row to view comprehensive valuation, charts, and financial statements.
                </div>
            </div>
        </div>
    );
}
