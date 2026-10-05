"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, Swords, Plus, Trash2, TrendingUp, TrendingDown, Sparkles, ArrowUpDown, Search } from 'lucide-react';
import { WatchlistItem, LiveQuoteItem } from '@/types/portfolio';

interface WatchlistTableProps {
    watchlist: WatchlistItem[];
    quotesMap: Record<string, LiveQuoteItem>;
    onRemove: (symbol: string) => void;
    onAddTicker: (symbol: string) => void;
    onAddToPortfolio: (symbol: string, price: number, name: string) => void;
    onLoadPresets: (preset: 'mag7' | 'ai' | 'dividend') => void;
}

type WatchlistSort = 'symbol' | 'price' | 'changePercent' | 'marketCap' | 'pe';

export default function WatchlistTable({
    watchlist,
    quotesMap,
    onRemove,
    onAddTicker,
    onAddToPortfolio,
    onLoadPresets
}: WatchlistTableProps) {
    const [quickTicker, setQuickTicker] = useState('');
    const [sortField, setSortField] = useState<WatchlistSort>('changePercent');
    const [sortAsc, setSortAsc] = useState(false);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = quickTicker.trim().toUpperCase();
        if (!clean) return;
        onAddTicker(clean);
        setQuickTicker('');
    };

    const handleSort = (field: WatchlistSort) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    const formatCap = (cap: number) => {
        if (!cap) return '-';
        if (cap >= 1e12) return '$' + (cap / 1e12).toFixed(2) + 'T';
        if (cap >= 1e9) return '$' + (cap / 1e9).toFixed(2) + 'B';
        if (cap >= 1e6) return '$' + (cap / 1e6).toFixed(2) + 'M';
        return '$' + cap.toLocaleString();
    };

    // Sort items
    const sortedList = [...watchlist].sort((a, b) => {
        const qA = quotesMap[a.symbol.toUpperCase()];
        const qB = quotesMap[b.symbol.toUpperCase()];
        let valA = 0;
        let valB = 0;

        if (sortField === 'symbol') {
            return sortAsc ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
        } else if (sortField === 'price') {
            valA = qA?.price || 0;
            valB = qB?.price || 0;
        } else if (sortField === 'changePercent') {
            valA = qA?.changePercent || 0;
            valB = qB?.changePercent || 0;
        } else if (sortField === 'marketCap') {
            valA = qA?.marketCap || 0;
            valB = qB?.marketCap || 0;
        } else if (sortField === 'pe') {
            valA = qA?.pe || 9999;
            valB = qB?.pe || 9999;
        }
        return sortAsc ? valA - valB : valB - valA;
    });

    // Calculate Watchlist stats
    const totalItems = watchlist.length;
    let avgDayChange = 0;
    let topGainer: { symbol: string; changePercent: number } | null = null;
    if (totalItems > 0) {
        let totalChange = 0;
        let validQuotes = 0;
        for (const item of watchlist) {
            const q = quotesMap[item.symbol.toUpperCase()];
            if (q) {
                totalChange += q.changePercent;
                validQuotes++;
                if (!topGainer || q.changePercent > topGainer.changePercent) {
                    topGainer = { symbol: item.symbol, changePercent: q.changePercent };
                }
            }
        }
        if (validQuotes > 0) avgDayChange = totalChange / validQuotes;
    }

    return (
        <div className="space-y-4">
            {/* Top Toolbar: Quick Add Input + Presets */}
            <div className="bg-card border rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Quick Add Form */}
                <form onSubmit={handleAddSubmit} className="flex items-center gap-2 max-w-sm w-full">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                        <input
                            type="text"
                            value={quickTicker}
                            onChange={(e) => setQuickTicker(e.target.value.toUpperCase())}
                            placeholder="Add ticker to watchlist (e.g. AMD, PLTR)..."
                            className="w-full h-9 pl-8 pr-3 text-xs uppercase font-semibold rounded-lg border bg-background placeholder:normal-case placeholder:font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!quickTicker.trim()}
                        className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0 inline-flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                    </button>
                </form>

                {/* Watchlist Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground mr-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Presets:</span>
                    </span>
                    <button
                        onClick={() => onLoadPresets('mag7')}
                        className="text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-muted font-medium transition-colors"
                    >
                        Magnificent 7
                    </button>
                    <button
                        onClick={() => onLoadPresets('ai')}
                        className="text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-muted font-medium transition-colors"
                    >
                        AI & Chips
                    </button>
                    <button
                        onClick={() => onLoadPresets('dividend')}
                        className="text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-muted font-medium transition-colors"
                    >
                        Dividend Kings
                    </button>
                </div>
            </div>

            {/* Watchlist Summary Bar */}
            {totalItems > 0 && (
                <div className="flex items-center justify-between text-xs px-2 text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <span>Watching <strong className="text-foreground">{totalItems}</strong> stocks</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>
                            Avg Today: {' '}
                            <strong className={'font-mono ' + (avgDayChange >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                                {(avgDayChange >= 0 ? '+' : '') + avgDayChange.toFixed(2) + '%'}
                            </strong>
                        </span>
                        {topGainer && (
                            <>
                                <span className="text-muted-foreground/50">•</span>
                                <span>
                                    Top Gainer: <strong className="text-foreground">{topGainer.symbol}</strong> ({'+' + topGainer.changePercent.toFixed(2) + '%'})
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Table or Empty State */}
            {totalItems === 0 ? (
                <div className="bg-card border rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                        <Star className="w-8 h-8 fill-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">Your Watchlist is Empty</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Star any stock from the Screener, Heatmap, or stock analysis page to monitor live price action.
                    </p>
                    <div className="flex items-center gap-2 mt-6">
                        <button
                            onClick={() => onLoadPresets('mag7')}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors"
                        >
                            Load Magnificent 7
                        </button>
                        <Link
                            href="/screener"
                            className="px-4 py-2 rounded-xl border bg-background hover:bg-muted font-medium text-xs transition-colors"
                        >
                            Explore Finviz Screener
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/40 divide-x divide-border/30">
                                    <th className="px-3 py-3 w-10 text-center text-muted-foreground">★</th>
                                    <th
                                        onClick={() => handleSort('symbol')}
                                        className="px-3 py-3 text-left font-semibold cursor-pointer select-none text-muted-foreground hover:text-foreground"
                                    >
                                        <div className="inline-flex items-center gap-1">
                                            <span>Ticker & Company</span>
                                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Sector</th>
                                    <th
                                        onClick={() => handleSort('price')}
                                        className="px-3 py-3 text-right font-semibold cursor-pointer select-none text-muted-foreground hover:text-foreground"
                                    >
                                        <div className="inline-flex items-center gap-1 justify-end w-full">
                                            <span>Price</span>
                                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('changePercent')}
                                        className="px-3 py-3 text-right font-semibold cursor-pointer select-none text-muted-foreground hover:text-foreground"
                                    >
                                        <div className="inline-flex items-center gap-1 justify-end w-full">
                                            <span>Change %</span>
                                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground min-w-[140px]">
                                        52-Week Range
                                    </th>
                                    <th
                                        onClick={() => handleSort('pe')}
                                        className="px-3 py-3 text-right font-semibold cursor-pointer select-none text-muted-foreground hover:text-foreground"
                                    >
                                        <div className="inline-flex items-center gap-1 justify-end w-full">
                                            <span>P/E</span>
                                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('marketCap')}
                                        className="px-3 py-3 text-right font-semibold cursor-pointer select-none text-muted-foreground hover:text-foreground"
                                    >
                                        <div className="inline-flex items-center gap-1 justify-end w-full">
                                            <span>Market Cap</span>
                                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {sortedList.map(item => {
                                    const q = quotesMap[item.symbol.toUpperCase()];
                                    const price = q ? q.price : 0;
                                    const change = q ? q.change : 0;
                                    const changePercent = q ? q.changePercent : 0;
                                    const isUp = changePercent >= 0;
                                    const low = (q && q.fiftyTwoWeekLow != null) ? q.fiftyTwoWeekLow : 0;
                                    const high = (q && q.fiftyTwoWeekHigh != null) ? q.fiftyTwoWeekHigh : 0;
                                    const rangePercent = high > low && price > 0 ? ((price - low) / (high - low)) * 100 : 50;

                                    return (
                                        <tr
                                            key={item.symbol}
                                            className="hover:bg-muted/40 transition-colors group divide-x divide-border/20"
                                        >
                                            {/* Star Unstar Toggle */}
                                            <td className="px-3 py-2.5 text-center">
                                                <button
                                                    onClick={() => onRemove(item.symbol)}
                                                    className="text-amber-500 hover:text-muted-foreground transition-colors p-1"
                                                    title="Remove from watchlist"
                                                >
                                                    <Star className="w-4 h-4 fill-amber-500" />
                                                </button>
                                            </td>

                                            {/* Symbol & Name */}
                                            <td className="px-3 py-2.5 font-sans">
                                                <Link
                                                    href={'/stock/' + item.symbol}
                                                    className="font-bold text-sm text-primary hover:underline"
                                                >
                                                    {item.symbol}
                                                </Link>
                                                <div className="text-[11px] text-muted-foreground truncate max-w-[170px]" title={q?.companyName || item.name}>
                                                    {q?.companyName || item.name}
                                                </div>
                                            </td>

                                            {/* Sector */}
                                            <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[130px]">
                                                {q?.sector || item.sector || 'Equities'}
                                            </td>

                                            {/* Price */}
                                            <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                                                {price > 0 ? '$' + price.toFixed(2) : '-'}
                                            </td>

                                            {/* Change & % */}
                                            <td className="px-3 py-2.5 text-right">
                                                <div className={'font-mono font-bold ' + (isUp ? 'text-emerald-500' : 'text-red-500')}>
                                                    {(isUp ? '+' : '') + '$' + change.toFixed(2)}
                                                </div>
                                                <div className={'text-[11px] font-mono font-semibold ' + (isUp ? 'text-emerald-500' : 'text-red-500')}>
                                                    {(isUp ? '+' : '') + changePercent.toFixed(2) + '%'}
                                                </div>
                                            </td>

                                            {/* 52W Range */}
                                            <td className="px-3 py-2.5 text-center">
                                                {low > 0 && high > 0 ? (
                                                    <div className="flex flex-col items-center gap-1 w-full max-w-[120px] mx-auto">
                                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden relative">
                                                            <div
                                                                className="h-full bg-primary rounded-full absolute"
                                                                style={{ width: Math.min(100, Math.max(0, rangePercent)) + '%' }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between w-full text-[10px] text-muted-foreground font-mono">
                                                            <span>{'$' + low.toFixed(0)}</span>
                                                            <span className="font-semibold text-foreground">{rangePercent.toFixed(0) + '%'}</span>
                                                            <span>{'$' + high.toFixed(0)}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>

                                            {/* P/E */}
                                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                                                {q?.pe !== null && q?.pe !== undefined ? q.pe.toFixed(1) : '-'}
                                            </td>

                                            {/* Market Cap */}
                                            <td className="px-3 py-2.5 text-right font-mono font-medium text-foreground">
                                                {formatCap(q?.marketCap || 0)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2.5 text-center">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        onClick={() => onAddToPortfolio(item.symbol, price, q?.companyName || item.name)}
                                                        className="px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] transition-colors inline-flex items-center gap-1"
                                                        title="Add to portfolio"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        <span>Portfolio</span>
                                                    </button>
                                                    <Link
                                                        href={'/compare?tickers=' + item.symbol + ',AAPL'}
                                                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors"
                                                        title="Compare stock"
                                                    >
                                                        <Swords className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}