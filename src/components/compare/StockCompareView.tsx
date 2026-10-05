"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, X, Swords, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import ComparativeChart from './ComparativeChart';
import ComparisonMatrix from './ComparisonMatrix';
import { ComparisonResponse } from '@/types/compare';

const POPULAR_RIVALRIES = [
    { label: '⚔️ AI Chips', tickers: ['NVDA', 'AMD'] },
    { label: '⚔️ Tech Titans', tickers: ['AAPL', 'MSFT', 'GOOGL'] },
    { label: '⚔️ Payments', tickers: ['V', 'MA'] },
    { label: '⚔️ Beverages', tickers: ['KO', 'PEP'] },
    { label: '⚔️ Big Oil', tickers: ['XOM', 'CVX'] },
    { label: '⚔️ Retail Giants', tickers: ['WMT', 'COST', 'AMZN'] },
];

export default function StockCompareView() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const initialTickers = (searchParams.get('tickers') || 'NVDA,AMD')
        .split(',')
        .map(t => t.trim().toUpperCase())
        .filter(Boolean);

    const [selectedTickers, setSelectedTickers] = useState<string[]>(initialTickers);
    const [inputTicker, setInputTicker] = useState('');
    const [timeframe, setTimeframe] = useState('1Y');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);

    // Fetch comparison data
    const fetchComparison = async (tickers: string[], tf: string) => {
        if (tickers.length < 2) {
            setError('Please select at least 2 stocks to compare.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/compare?tickers=${tickers.join(',')}&timeframe=${tf}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to compare stocks');
            }
            const data: ComparisonResponse = await res.json();
            setComparisonData(data);
        } catch (err: any) {
            setError(err.message || 'Error loading comparison');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComparison(selectedTickers, timeframe);
        // Sync URL query
        router.replace(`/compare?tickers=${selectedTickers.join(',')}&timeframe=${timeframe}`, { scroll: false });
    }, [selectedTickers, timeframe]);

    const handleAddTicker = (e: React.FormEvent) => {
        e.preventDefault();
        const sym = inputTicker.trim().toUpperCase();
        if (!sym) return;
        if (selectedTickers.includes(sym)) {
            setInputTicker('');
            return;
        }
        if (selectedTickers.length >= 4) {
            alert('You can compare up to 4 stocks at a time.');
            return;
        }
        setSelectedTickers([...selectedTickers, sym]);
        setInputTicker('');
    };

    const handleRemoveTicker = (sym: string) => {
        if (selectedTickers.length <= 2) {
            alert('At least 2 stocks are required for comparison.');
            return;
        }
        setSelectedTickers(selectedTickers.filter(t => t !== sym));
    };

    const handleSelectRivalry = (tickers: string[]) => {
        setSelectedTickers(tickers);
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Header Banner */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                            <Swords className="w-3 h-3" /> Head-to-Head Comparison
                        </span>
                        <span className="text-xs text-muted-foreground">Up to 4 stocks simultaneously</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Stock Comparison Tool</h1>
                    <p className="text-sm text-muted-foreground">
                        Compare valuation multiples, growth, profitability, and normalized chart returns head-to-head.
                    </p>
                </div>

                {/* Add Stock Input */}
                <form onSubmit={handleAddTicker} className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={inputTicker}
                            onChange={(e) => setInputTicker(e.target.value)}
                            placeholder="Add ticker (e.g. GOOGL)..."
                            className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!inputTicker.trim() || selectedTickers.length >= 4}
                        className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                </form>
            </div>

            {/* Currently Selected Stocks Chips & Rivalry Presets */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground mr-1">Active Stocks:</span>
                    {selectedTickers.map((sym) => (
                        <div
                            key={sym}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold shadow-xs"
                        >
                            <span>{sym}</span>
                            {selectedTickers.length > 2 && (
                                <button
                                    onClick={() => handleRemoveTicker(sym)}
                                    className="hover:text-red-500 rounded-full p-0.5 transition-colors"
                                    title={`Remove ${sym}`}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-muted-foreground mr-1">Rivalry Presets:</span>
                    {POPULAR_RIVALRIES.map((r) => (
                        <button
                            key={r.label}
                            onClick={() => handleSelectRivalry(r.tickers)}
                            className="px-3 py-1 rounded-full border bg-card hover:bg-muted font-medium transition-colors text-muted-foreground hover:text-foreground"
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Fetching multi-stock quotes, balance sheets & historical curves...</p>
                </div>
            ) : error ? (
                <div className="bg-card border rounded-2xl p-8 text-center text-rose-500 flex flex-col items-center gap-2">
                    <p className="font-bold text-sm">{error}</p>
                    <button
                        onClick={() => setSelectedTickers(['NVDA', 'AMD'])}
                        className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                    >
                        Reset to NVDA vs AMD
                    </button>
                </div>
            ) : comparisonData ? (
                <div className="flex flex-col gap-6">
                    {/* Comparative Performance Chart */}
                    <ComparativeChart
                        data={comparisonData.normalizedHistory}
                        symbols={selectedTickers}
                        timeframe={timeframe}
                        onTimeframeChange={setTimeframe}
                    />

                    {/* Side-by-Side Detailed Matrix */}
                    <ComparisonMatrix
                        stocks={comparisonData.stocks}
                        verdict={comparisonData.verdict}
                    />
                </div>
            ) : null}
        </div>
    );
}
