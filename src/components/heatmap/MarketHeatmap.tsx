"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
    Sparkles,
    Zap,
    Download,
    Maximize2,
    Minimize2,
    Clock,
    CheckCircle2,
    Loader2,
    Filter,
    Layers,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { ScreenerStock } from '@/types/screener';
import { squarifyLayout, Rect, PlacedNode } from '@/lib/treemap';

type MetricMode = 'performance' | 'dist52w' | 'pe';

export default function MarketHeatmap() {
    const [stocks, setStocks] = useState<ScreenerStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [metricMode, setMetricMode] = useState<MetricMode>('performance');
    const [selectedSector, setSelectedSector] = useState<string>('ALL');
    const [hoveredStock, setHoveredStock] = useState<ScreenerStock | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [syncInfo, setSyncInfo] = useState<{
        market?: {
            isOpen: boolean;
            session: string;
            statusText: string;
            description: string;
            etTime: string;
            nextOpenOrClose: string;
        };
        lastUpdated?: number;
    }>({});

    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 1200, height: 750 });

    // Load stocks and market telemetry
    const loadData = async (forceRefresh = false) => {
        try {
            if (forceRefresh) setSyncing(true);
            else setLoading(true);

            const [screenerRes, syncRes] = await Promise.all([
                fetch(forceRefresh ? '/api/screener?refresh=true' : '/api/screener'),
                fetch('/api/sync')
            ]);

            if (!screenerRes.ok) throw new Error('Failed to load market data');
            const screenerData = await screenerRes.json();
            setStocks(screenerData.stocks || []);

            if (syncRes.ok) {
                const sData = await syncRes.json();
                setSyncInfo(sData);
            }
        } catch (err: any) {
            setError(err.message || 'Error loading heatmap data');
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Resize observer
    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 0) {
                    const targetHeight = isFullscreen ? window.innerHeight - 100 : Math.max(650, rect.width * 0.58);
                    setDimensions({
                        width: Math.floor(rect.width),
                        height: Math.floor(targetHeight)
                    });
                }
            }
        };

        updateSize();
        const ro = new ResizeObserver(updateSize);
        ro.observe(containerRef.current);
        window.addEventListener('resize', updateSize);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, [isFullscreen]);

    // Group stocks by Sector
    const sectorGroups = useMemo(() => {
        const groups = new Map<string, ScreenerStock[]>();

        for (const s of stocks) {
            const sec = s.sector || 'Other';
            if (selectedSector !== 'ALL' && sec !== selectedSector) continue;
            if (!groups.has(sec)) groups.set(sec, []);
            groups.get(sec)!.push(s);
        }

        return groups;
    }, [stocks, selectedSector]);

    // Two-level squarified layout
    const layout = useMemo(() => {
        const { width, height } = dimensions;
        if (width <= 0 || height <= 0 || sectorGroups.size === 0) return { sectors: [], stocks: [] };

        // Level 1: Sector tiles
        const sectorItems = Array.from(sectorGroups.entries()).map(([sector, sectorStocks]) => {
            const sectorCap = sectorStocks.reduce((sum, s) => sum + Math.max(1e8, s.marketCap || 1e8), 0);
            return {
                id: sector,
                value: sectorCap,
                data: { sector, stocks: sectorStocks }
            };
        });

        const placedSectors = squarifyLayout(sectorItems, { x: 0, y: 0, width, height });

        // Level 2: Stocks within each sector tile
        const placedStocks: { stock: ScreenerStock; sector: string; rect: Rect }[] = [];

        for (const pSector of placedSectors) {
            const { x, y, width: sW, height: sH } = pSector.rect;
            const sectorTitleHeight = 22;

            if (sW <= 10 || sH <= sectorTitleHeight) continue;

            const stockItems = pSector.item.data.stocks.map(s => ({
                id: s.symbol,
                value: Math.max(1e8, s.marketCap || 1e8),
                data: s
            }));

            // Inner rectangle for stocks leaving room for sector label header
            const stockBounds: Rect = {
                x: x + 2,
                y: y + sectorTitleHeight + 2,
                width: Math.max(0, sW - 4),
                height: Math.max(0, sH - sectorTitleHeight - 4)
            };

            const placedStockNodes = squarifyLayout(stockItems, stockBounds);
            for (const pStock of placedStockNodes) {
                placedStocks.push({
                    stock: pStock.item.data,
                    sector: pSector.item.id,
                    rect: pStock.rect
                });
            }
        }

        return { sectors: placedSectors, stocks: placedStocks };
    }, [sectorGroups, dimensions]);

    // Color Calculation (Finviz Green / Red Spectrum)
    const getColor = (s: ScreenerStock): { bg: string; text: string } => {
        if (metricMode === 'performance') {
            const chg = s.changePercent;
            if (chg >= 3.0) return { bg: '#15803d', text: '#ffffff' }; // strong emerald
            if (chg >= 1.5) return { bg: '#22c55e', text: '#000000' }; // bright green
            if (chg >= 0.2) return { bg: '#166534', text: '#ffffff' }; // dark green
            if (chg > -0.2) return { bg: '#334155', text: '#e2e8f0' }; // neutral slate
            if (chg > -1.5) return { bg: '#991b1b', text: '#ffffff' }; // soft dark red
            if (chg > -3.0) return { bg: '#dc2626', text: '#ffffff' }; // red
            return { bg: '#ef4444', text: '#ffffff' }; // bright red
        } else if (metricMode === 'dist52w') {
            const dist = s.dist52WHigh ?? -20;
            if (dist >= -2.0) return { bg: '#15803d', text: '#ffffff' }; // near high
            if (dist >= -5.0) return { bg: '#22c55e', text: '#000000' };
            if (dist >= -15.0) return { bg: '#166534', text: '#ffffff' };
            if (dist >= -25.0) return { bg: '#334155', text: '#e2e8f0' };
            if (dist >= -40.0) return { bg: '#991b1b', text: '#ffffff' };
            return { bg: '#dc2626', text: '#ffffff' };
        } else {
            // P/E Ratio
            const pe = s.pe;
            if (!pe) return { bg: '#334155', text: '#e2e8f0' };
            if (pe < 15) return { bg: '#15803d', text: '#ffffff' }; // Deep Value
            if (pe < 22) return { bg: '#22c55e', text: '#000000' }; // Fair Value
            if (pe <= 30) return { bg: '#334155', text: '#e2e8f0' }; // Moderate
            if (pe <= 45) return { bg: '#b45309', text: '#ffffff' }; // Premium
            return { bg: '#dc2626', text: '#ffffff' }; // High PE
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const formatCap = (cap: number) => {
        if (!cap) return '-';
        if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
        if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
        return `$${(cap / 1e6).toFixed(0)}M`;
    };

    return (
        <div className={`flex flex-col gap-5 w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : ''}`}>
            {/* Header Banner */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Finviz Style Map
                        </span>

                        {syncInfo.market && (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
                                syncInfo.market.session === 'REGULAR'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-muted text-muted-foreground border-border'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                    syncInfo.market.session === 'REGULAR' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/60'
                                }`} />
                                <span className="font-semibold">{syncInfo.market.statusText}</span>
                                <span className="text-[11px] opacity-80">({syncInfo.market.etTime})</span>
                            </span>
                        )}

                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-secondary text-secondary-foreground border flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>503 Companies</span>
                        </span>
                    </div>

                    <h1 className="text-3xl font-extrabold tracking-tight">S&P 500 Market Heatmap</h1>
                    <p className="text-sm text-muted-foreground">
                        Visual treemap representing all 503 S&P 500 companies sized by market capitalization and color-coded by daily performance.
                    </p>
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center flex-wrap gap-2.5 self-stretch md:self-auto">
                    {/* Metric Selector */}
                    <div className="flex items-center rounded-lg border bg-background p-1 text-xs">
                        <button
                            onClick={() => setMetricMode('performance')}
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                metricMode === 'performance' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Daily %
                        </button>
                        <button
                            onClick={() => setMetricMode('dist52w')}
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                metricMode === 'dist52w' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            52W High %
                        </button>
                        <button
                            onClick={() => setMetricMode('pe')}
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                metricMode === 'pe' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            P/E Ratio
                        </button>
                    </div>

                    {/* Sector Filter */}
                    <select
                        value={selectedSector}
                        onChange={(e) => setSelectedSector(e.target.value)}
                        className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                        <option value="ALL">All Sectors (S&P 500)</option>
                        <option value="Technology">Technology</option>
                        <option value="Financial Services">Financial Services</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Consumer Cyclical">Consumer Cyclical</option>
                        <option value="Consumer Defensive">Consumer Defensive</option>
                        <option value="Communication Services">Communication Services</option>
                        <option value="Industrials">Industrials</option>
                        <option value="Energy">Energy</option>
                        <option value="Basic Materials">Basic Materials</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Utilities">Utilities</option>
                    </select>

                    {/* Sync Button */}
                    <button
                        onClick={() => loadData(true)}
                        disabled={syncing || loading}
                        className="inline-flex items-center justify-center rounded-lg text-xs font-semibold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 h-9 px-3 transition-colors shadow-xs gap-1.5 disabled:opacity-50"
                        title="Force sync latest quotes"
                    >
                        {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        {syncing ? 'Syncing...' : 'Sync Live'}
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="inline-flex items-center justify-center rounded-lg text-xs font-medium border bg-background hover:bg-muted h-9 px-3 transition-colors shadow-xs gap-1"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Treemap Container */}
            <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                className="relative w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none shadow-md"
                style={{ height: dimensions.height }}
            >
                {loading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">Computing S&P 500 Market Treemap...</p>
                    </div>
                ) : error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-red-400 text-sm">
                        <p>Error: {error}</p>
                        <button onClick={() => loadData()} className="mt-3 underline text-xs">Retry</button>
                    </div>
                ) : (
                    <>
                        {/* Sector Boundaries & Headers */}
                        {layout.sectors.map((sNode) => {
                            const { x, y, width, height } = sNode.rect;
                            if (width < 30 || height < 30) return null;
                            return (
                                <div
                                    key={sNode.item.id}
                                    className="absolute border border-slate-700/60 pointer-events-none"
                                    style={{
                                        left: x,
                                        top: y,
                                        width,
                                        height,
                                    }}
                                >
                                    <div
                                        className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 truncate bg-slate-900/90 text-slate-300 border-b border-slate-700/50"
                                        style={{ height: 22 }}
                                    >
                                        {sNode.item.id}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Individual Stock Tiles */}
                        {layout.stocks.map(({ stock, rect }) => {
                            const { x, y, width, height } = rect;
                            if (width < 6 || height < 6) return null;

                            const { bg, text } = getColor(stock);
                            const isTiny = width < 42 || height < 32;
                            const isSmall = width < 65 || height < 48;
                            const isLarge = width >= 90 && height >= 65;

                            return (
                                <Link
                                    key={stock.symbol}
                                    href={`/stock/${stock.symbol}`}
                                    onMouseEnter={() => setHoveredStock(stock)}
                                    onMouseLeave={() => setHoveredStock(null)}
                                    className="absolute border border-black/40 hover:border-white hover:z-20 transition-all duration-75 flex flex-col items-center justify-center text-center overflow-hidden group cursor-pointer"
                                    style={{
                                        left: x,
                                        top: y,
                                        width,
                                        height,
                                        backgroundColor: bg,
                                        color: text,
                                    }}
                                >
                                    <span className={`font-extrabold tracking-tight font-sans leading-none ${
                                        isTiny ? 'text-[9px]' : isSmall ? 'text-xs' : isLarge ? 'text-base' : 'text-sm'
                                    }`}>
                                        {stock.symbol}
                                    </span>

                                    {!isTiny && (
                                        <span className={`font-mono font-semibold leading-tight mt-0.5 ${
                                            isSmall ? 'text-[10px]' : 'text-xs'
                                        }`}>
                                            {metricMode === 'performance' && (
                                                `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(1)}%`
                                            )}
                                            {metricMode === 'dist52w' && (
                                                `${stock.dist52WHigh !== null ? `${stock.dist52WHigh.toFixed(0)}%` : '-'}`
                                            )}
                                            {metricMode === 'pe' && (
                                                `${stock.pe ? stock.pe.toFixed(0) : '-'}`
                                            )}
                                        </span>
                                    )}

                                    {isLarge && (
                                        <span className="text-[10px] opacity-80 truncate max-w-[90%] font-sans mt-0.5">
                                            ${stock.price.toFixed(1)}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </>
                )}

                {/* Floating Rich Tooltip */}
                {hoveredStock && (
                    <div
                        className="fixed pointer-events-none z-50 bg-slate-900/95 text-slate-100 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md transition-transform duration-75 text-xs"
                        style={{
                            left: Math.min(window.innerWidth - 240, mousePos.x + 14),
                            top: Math.min(window.innerHeight - 200, mousePos.y + 14),
                            minWidth: 220,
                        }}
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                            <div>
                                <span className="font-extrabold text-base text-white">{hoveredStock.symbol}</span>
                                <span className="text-slate-400 text-xs ml-1.5 truncate max-w-[120px] inline-block align-bottom">{hoveredStock.companyName}</span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {hoveredStock.sector}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
                            <span className="text-slate-400 font-sans">Price:</span>
                            <span className="text-right font-bold text-white">${hoveredStock.price.toFixed(2)}</span>

                            <span className="text-slate-400 font-sans">Today Change:</span>
                            <span className={`text-right font-bold ${hoveredStock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {hoveredStock.changePercent >= 0 ? '+' : ''}{hoveredStock.changePercent.toFixed(2)}%
                            </span>

                            <span className="text-slate-400 font-sans">Market Cap:</span>
                            <span className="text-right text-slate-200">{formatCap(hoveredStock.marketCap)}</span>

                            <span className="text-slate-400 font-sans">P/E (ttm):</span>
                            <span className="text-right text-slate-200">{hoveredStock.pe ? hoveredStock.pe.toFixed(1) : 'N/A'}</span>

                            <span className="text-slate-400 font-sans">from 52W High:</span>
                            <span className="text-right text-slate-200">
                                {hoveredStock.dist52WHigh !== null ? `${hoveredStock.dist52WHigh.toFixed(1)}%` : 'N/A'}
                            </span>

                            <span className="text-slate-400 font-sans">Dividend Yield:</span>
                            <span className="text-right text-emerald-400">
                                {hoveredStock.dividendYield ? `${hoveredStock.dividendYield.toFixed(2)}%` : '0.00%'}
                            </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-primary flex items-center justify-between font-sans">
                            <span>Click to view VIC memo & chart</span>
                            <span>&rarr;</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Legend Bar (Finviz Style) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border rounded-xl p-4 shadow-xs text-xs">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground">Color Scale:</span>
                    <div className="flex items-center rounded overflow-hidden border">
                        <span className="px-2 py-0.5 font-mono text-[10px] font-bold text-white bg-[#ef4444]">-3%</span>
                        <span className="px-2 py-0.5 font-mono text-[10px] font-bold text-white bg-[#dc2626]">-2%</span>
                        <span className="px-2 py-0.5 font-mono text-[10px] font-bold text-white bg-[#991b1b]">-1%</span>
                        <span className="px-2 py-0.5 font-mono text-[10px] font-bold text-slate-200 bg-[#334155]">0%</span>
                        <span className="px-2 py-0.5 font-mono text-[10px] font-bold text-white bg-[#166534]">+1%</span>
                        <span className="px-2 py-0.5 font-mono text-[10px] font-bold text-black bg-[#22c55e]">+2%</span>
                        <span className="px-2 py-0.5 font-mono text-[10px] font-bold text-white bg-[#15803d]">+3%+</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-muted-foreground text-xs">
                    <span>Tile Area = <strong>Market Cap</strong></span>
                    <span>•</span>
                    <span>Click any stock to open comprehensive analysis</span>
                    <span>•</span>
                    <Link href="/screener" className="text-primary hover:underline font-medium">
                        Open Screener Table &rarr;
                    </Link>
                </div>
            </div>
        </div>
    );
}
