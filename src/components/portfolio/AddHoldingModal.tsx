"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { PortfolioHolding } from '@/types/portfolio';

interface AddHoldingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (holding: {
        id?: string;
        symbol: string;
        companyName: string;
        shares: number;
        buyPrice: number;
        buyDate: string;
        notes?: string;
    }) => void;
    initialData?: Partial<PortfolioHolding> | null;
}

export default function AddHoldingModal({ isOpen, onClose, onSave, initialData }: AddHoldingModalProps) {
    const [symbol, setSymbol] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [shares, setShares] = useState('');
    const [buyPrice, setBuyPrice] = useState('');
    const [buyDate, setBuyDate] = useState('');
    const [notes, setNotes] = useState('');
    const [currentMarketPrice, setCurrentMarketPrice] = useState<number | null>(null);
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const POPULAR_TICKERS = ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'V', 'LLY'];

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (initialData) {
                setSymbol(initialData.symbol || '');
                setCompanyName(initialData.companyName || '');
                setShares(initialData.shares !== undefined ? String(initialData.shares) : '');
                setBuyPrice(initialData.buyPrice !== undefined ? String(initialData.buyPrice) : '');
                setBuyDate(initialData.buyDate || new Date().toISOString().split('T')[0]);
                setNotes(initialData.notes || '');
                if (initialData.symbol) {
                    fetchQuoteForSymbol(initialData.symbol);
                }
            } else {
                setSymbol('');
                setCompanyName('');
                setShares('');
                setBuyPrice('');
                setBuyDate(new Date().toISOString().split('T')[0]);
                setNotes('');
                setCurrentMarketPrice(null);
            }
        }
    }, [isOpen, initialData]);

    const fetchQuoteForSymbol = async (tickerSymbol: string) => {
        const clean = tickerSymbol.trim().toUpperCase();
        if (!clean) return;
        setLoadingQuote(true);
        setError(null);

        try {
            const res = await fetch('/api/portfolio/quotes?symbols=' + clean);
            if (res.ok) {
                const data = await res.json();
                const q = data.bySymbol?.[clean];
                if (q) {
                    setCurrentMarketPrice(q.price);
                    if (!companyName || initialData?.symbol !== clean) {
                        setCompanyName(q.companyName || clean);
                    }
                    if (!buyPrice && !initialData) {
                        setBuyPrice(q.price.toFixed(2));
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching live quote for modal', e);
        } finally {
            setLoadingQuote(false);
        }
    };

    const handleSymbolBlur = () => {
        if (symbol.trim()) {
            fetchQuoteForSymbol(symbol);
        }
    };

    const handleSelectPopular = (ticker: string) => {
        setSymbol(ticker);
        fetchQuoteForSymbol(ticker);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanSymbol = symbol.trim().toUpperCase();
        const numShares = parseFloat(shares);
        const numPrice = parseFloat(buyPrice);

        if (!cleanSymbol) {
            setError('Please enter a stock symbol.');
            return;
        }
        if (isNaN(numShares) || numShares <= 0) {
            setError('Please enter a valid positive number of shares.');
            return;
        }
        if (isNaN(numPrice) || numPrice <= 0) {
            setError('Please enter a valid purchase price.');
            return;
        }

        onSave({
            id: initialData?.id,
            symbol: cleanSymbol,
            companyName: companyName || cleanSymbol,
            shares: numShares,
            buyPrice: numPrice,
            buyDate: buyDate || new Date().toISOString().split('T')[0],
            notes: notes.trim(),
        });

        onClose();
    };

    if (!isOpen) return null;

    const numShares = parseFloat(shares) || 0;
    const numPrice = parseFloat(buyPrice) || 0;
    const totalCost = numShares * numPrice;
    const currentEstValue = currentMarketPrice ? numShares * currentMarketPrice : null;
    const estGainLoss = currentEstValue !== null ? currentEstValue - totalCost : null;
    const estGainLossPercent = totalCost > 0 && estGainLoss !== null ? (estGainLoss / totalCost) * 100 : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-card border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">
                                {initialData?.id ? 'Edit Holding' : 'Add Stock Holding'}
                            </h2>
                            <p className="text-xs text-muted-foreground">Record shares owned and cost basis</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                            Ticker Symbol <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                onBlur={handleSymbolBlur}
                                placeholder="e.g. AAPL, NVDA, TSLA"
                                className="w-full h-10 px-3 pr-10 text-sm font-semibold tracking-wider uppercase rounded-lg border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                required
                            />
                            <div className="absolute right-3 top-2.5 text-muted-foreground">
                                {loadingQuote ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Search className="w-4 h-4" />}
                            </div>
                        </div>

                        {!initialData?.id && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                <span className="text-[11px] text-muted-foreground">Quick pick:</span>
                                {POPULAR_TICKERS.map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => handleSelectPopular(t)}
                                        className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors font-mono font-medium"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Company Name</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="e.g. Apple Inc."
                            className="w-full h-10 px-3 text-sm rounded-lg border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">
                                Shares Owned <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0.0001"
                                value={shares}
                                onChange={(e) => setShares(e.target.value)}
                                placeholder="e.g. 25"
                                className="w-full h-10 px-3 text-sm font-medium rounded-lg border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-foreground">
                                    Avg Buy Price ($) <span className="text-red-500">*</span>
                                </label>
                                {currentMarketPrice !== null && (
                                    <button
                                        type="button"
                                        onClick={() => setBuyPrice(currentMarketPrice.toFixed(2))}
                                        className="text-[10px] text-primary hover:underline"
                                    >
                                        Use Mkt (${currentMarketPrice.toFixed(2)})
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">$</span>
                                <input
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    value={buyPrice}
                                    onChange={(e) => setBuyPrice(e.target.value)}
                                    placeholder="e.g. 185.00"
                                    className="w-full h-10 pl-7 pr-3 text-sm font-medium rounded-lg border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Acquisition Date</label>
                        <input
                            type="date"
                            value={buyDate}
                            onChange={(e) => setBuyDate(e.target.value)}
                            className="w-full h-10 px-3 text-sm rounded-lg border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Notes / Strategy (Optional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Long-term DCA, Roth IRA, Swing Trade"
                            className="w-full h-10 px-3 text-sm rounded-lg border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                    </div>

                    {numShares > 0 && numPrice > 0 && (
                        <div className="p-3.5 rounded-xl border bg-muted/40 space-y-2 text-xs">
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>Total Cost Basis:</span>
                                <span className="font-semibold text-foreground font-mono">
                                    ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {currentMarketPrice !== null && (
                                <>
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Current Market Value:</span>
                                        <span className="font-semibold text-foreground font-mono">
                                            ${(currentEstValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-t pt-1.5 font-medium">
                                        <span>Estimated Gain/Loss:</span>
                                        <span className={'font-mono font-bold ' + ((estGainLoss || 0) >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                                            {((estGainLoss || 0) >= 0 ? '+' : '')}${(estGainLoss || 0).toFixed(2)} ({((estGainLossPercent || 0) >= 0 ? '+' : '')}{(estGainLossPercent || 0).toFixed(2)}%)
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium rounded-lg border bg-background hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                        >
                            {initialData?.id ? 'Save Changes' : 'Add Holding'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}