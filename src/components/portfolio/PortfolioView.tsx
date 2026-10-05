"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Briefcase, Star, Plus, Download, RefreshCw, Sparkles, Trash2, Loader2, ArrowUpRight } from 'lucide-react';
import { PortfolioHolding, WatchlistItem, LiveQuoteItem, HoldingValuation, PortfolioSummary } from '@/types/portfolio';
import {
    getHoldings,
    addHolding,
    updateHolding,
    deleteHolding,
    clearHoldings,
    loadSamplePortfolio,
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    clearWatchlist,
    loadSampleWatchlist,
    calculateValuations,
    exportHoldingsToCsv,
    WATCHLIST_EVENT,
    PORTFOLIO_EVENT,
} from '@/lib/portfolioStorage';
import PortfolioSummaryCards from './PortfolioSummaryCards';
import PortfolioAllocationBar from './PortfolioAllocationBar';
import HoldingsTable from './HoldingsTable';
import WatchlistTable from './WatchlistTable';
import AddHoldingModal from './AddHoldingModal';

export default function PortfolioView() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') === 'watchlist' ? 'watchlist' : 'portfolio';
    const initialAddTicker = searchParams.get('add');
    const initialAddPrice = searchParams.get('price');

    const [activeTab, setActiveTab] = useState<'portfolio' | 'watchlist'>(initialTab);
    const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [quotesMap, setQuotesMap] = useState<Record<string, LiveQuoteItem>>({});
    const [loadingQuotes, setLoadingQuotes] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);

    // Load local storage data
    const reloadLocalData = useCallback(() => {
        const h = getHoldings();
        const w = getWatchlist();
        setHoldings(h);
        setWatchlist(w);
    }, []);

    // Fetch batch quotes for all holdings and watchlist symbols
    const fetchBatchQuotes = useCallback(async (hList?: PortfolioHolding[], wList?: WatchlistItem[]) => {
        const currH = hList || getHoldings();
        const currW = wList || getWatchlist();
        const allSymbols = Array.from(
            new Set([
                ...currH.map(h => h.symbol.toUpperCase()),
                ...currW.map(w => w.symbol.toUpperCase())
            ])
        );

        if (allSymbols.length === 0) {
            setQuotesMap({});
            return;
        }

        setLoadingQuotes(true);
        try {
            const res = await fetch('/api/portfolio/quotes?symbols=' + allSymbols.join(','));
            if (res.ok) {
                const data = await res.json();
                if (data.bySymbol) {
                    setQuotesMap(data.bySymbol);
                    setLastUpdated(new Date());
                }
            }
        } catch (err) {
            console.error('Error fetching portfolio quotes:', err);
        } finally {
            setLoadingQuotes(false);
        }
    }, []);

    // Initial mount
    useEffect(() => {
        reloadLocalData();
        fetchBatchQuotes();

        // Check if user came with ?add=AAPL parameter
        if (initialAddTicker) {
            setEditingHolding({
                id: '',
                symbol: initialAddTicker.toUpperCase(),
                companyName: initialAddTicker.toUpperCase(),
                shares: 10,
                buyPrice: initialAddPrice ? parseFloat(initialAddPrice) : 0,
                buyDate: new Date().toISOString().split('T')[0],
            });
            setIsAddModalOpen(true);
        }

        // Listen for cross-tab or component updates
        const handleWatchlistChange = () => {
            const w = getWatchlist();
            setWatchlist(w);
            fetchBatchQuotes(undefined, w);
        };
        const handlePortfolioChange = () => {
            const h = getHoldings();
            setHoldings(h);
            fetchBatchQuotes(h, undefined);
        };

        window.addEventListener(WATCHLIST_EVENT, handleWatchlistChange);
        window.addEventListener(PORTFOLIO_EVENT, handlePortfolioChange);

        return () => {
            window.removeEventListener(WATCHLIST_EVENT, handleWatchlistChange);
            window.removeEventListener(PORTFOLIO_EVENT, handlePortfolioChange);
        };
    }, [reloadLocalData, fetchBatchQuotes, initialAddTicker, initialAddPrice]);

    // Compute valuations & summary
    const { valuations, summary } = calculateValuations(holdings, quotesMap);

    // Modal handlers
    const handleOpenAddModal = (initial?: Partial<PortfolioHolding>) => {
        setEditingHolding(initial ? (initial as PortfolioHolding) : null);
        setIsAddModalOpen(true);
    };

    const handleSaveHolding = (data: {
        id?: string;
        symbol: string;
        companyName: string;
        shares: number;
        buyPrice: number;
        buyDate: string;
        notes?: string;
    }) => {
        if (data.id) {
            updateHolding(data.id, data);
        } else {
            addHolding(data);
        }
        reloadLocalData();
        fetchBatchQuotes();
    };

    const handleDeleteHolding = (id: string) => {
        deleteHolding(id);
        reloadLocalData();
    };

    const handleLoadSamplePortfolio = () => {
        loadSamplePortfolio();
        reloadLocalData();
        fetchBatchQuotes();
    };

    // Watchlist actions
    const handleRemoveFromWatchlist = (symbol: string) => {
        removeFromWatchlist(symbol);
        reloadLocalData();
    };

    const handleAddTickerToWatchlist = (symbol: string) => {
        addToWatchlist({ symbol });
        reloadLocalData();
        fetchBatchQuotes();
    };

    const handleAddToPortfolioFromWatchlist = (symbol: string, price: number, name: string) => {
        setEditingHolding({
            id: '',
            symbol,
            companyName: name,
            shares: 10,
            buyPrice: price > 0 ? price : 100,
            buyDate: new Date().toISOString().split('T')[0],
        });
        setIsAddModalOpen(true);
    };

    const handleLoadWatchlistPresets = (preset: 'mag7' | 'ai' | 'dividend') => {
        let list: string[] = [];
        if (preset === 'mag7') {
            list = ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA'];
        } else if (preset === 'ai') {
            list = ['NVDA', 'AMD', 'AVGO', 'TSM', 'ASML', 'MSFT', 'PLTR'];
        } else if (preset === 'dividend') {
            list = ['KO', 'JNJ', 'PG', 'PEP', 'MMM', 'CVX', 'O'];
        }
        list.forEach(sym => addToWatchlist({ symbol: sym }));
        reloadLocalData();
        fetchBatchQuotes();
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
            {/* Top Hub Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Portfolio & Watchlists
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Live valuation, unrealized P&L, asset allocation, and starred stock trackers
                    </p>
                </div>

                {/* Global Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => fetchBatchQuotes()}
                        disabled={loadingQuotes}
                        className="h-9 px-3 rounded-lg border bg-background hover:bg-muted text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                        title="Refresh live quotes from SQLite / Yahoo"
                    >
                        <RefreshCw className={'w-3.5 h-3.5 ' + (loadingQuotes ? 'animate-spin text-primary' : 'text-muted-foreground')} />
                        <span>{loadingQuotes ? 'Updating...' : 'Refresh'}</span>
                    </button>

                    {activeTab === 'portfolio' && valuations.length > 0 && (
                        <button
                            onClick={() => exportHoldingsToCsv(valuations)}
                            className="h-9 px-3 rounded-lg border bg-background hover:bg-muted text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                            title="Export portfolio to CSV"
                        >
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>CSV</span>
                        </button>
                    )}

                    <button
                        onClick={() => handleOpenAddModal()}
                        className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs inline-flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Holding</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation Switcher */}
            <div className="flex items-center gap-2 border-b pb-3">
                <button
                    onClick={() => setActiveTab('portfolio')}
                    className={'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border ' + (
                        activeTab === 'portfolio'
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                    )}
                >
                    <Briefcase className="w-4 h-4" />
                    <span>My Portfolio</span>
                    <span className={'px-1.5 py-0.2 rounded-full text-[11px] ' + (
                        activeTab === 'portfolio' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                        {holdings.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('watchlist')}
                    className={'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border ' + (
                        activeTab === 'watchlist'
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                    )}
                >
                    <Star className={'w-4 h-4 ' + (activeTab === 'watchlist' ? 'fill-current' : '')} />
                    <span>Watchlist</span>
                    <span className={'px-1.5 py-0.2 rounded-full text-[11px] ' + (
                        activeTab === 'watchlist' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                        {watchlist.length}
                    </span>
                </button>
            </div>

            {/* Main Content Area */}
            {activeTab === 'portfolio' ? (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    {holdings.length > 0 && <PortfolioSummaryCards summary={summary} />}

                    {/* Allocation Bar */}
                    {valuations.length > 0 && <PortfolioAllocationBar valuations={valuations} />}

                    {/* Holdings Table */}
                    <HoldingsTable
                        valuations={valuations}
                        onEdit={(holding) => handleOpenAddModal(holding)}
                        onDelete={handleDeleteHolding}
                        onAddClick={() => handleOpenAddModal()}
                        onLoadSample={handleLoadSamplePortfolio}
                    />
                </div>
            ) : (
                /* Watchlist Tab */
                <WatchlistTable
                    watchlist={watchlist}
                    quotesMap={quotesMap}
                    onRemove={handleRemoveFromWatchlist}
                    onAddTicker={handleAddTickerToWatchlist}
                    onAddToPortfolio={handleAddToPortfolioFromWatchlist}
                    onLoadPresets={handleLoadWatchlistPresets}
                />
            )}

            {/* Add / Edit Holding Modal */}
            <AddHoldingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveHolding}
                initialData={editingHolding}
            />
        </div>
    );
}