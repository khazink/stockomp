import { WatchlistItem, PortfolioHolding, HoldingValuation, PortfolioSummary, LiveQuoteItem } from '@/types/portfolio';

const WATCHLIST_KEY = 'stockomp_watchlist';
const PORTFOLIO_KEY = 'stockomp_portfolio';

export const WATCHLIST_EVENT = 'stockomp_watchlist_update';
export const PORTFOLIO_EVENT = 'stockomp_portfolio_update';

function notifyWatchlistUpdate() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT));
    }
}

function notifyPortfolioUpdate() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PORTFOLIO_EVENT));
    }
}

// -------------------------------------------------------------
// Watchlist Management
// -------------------------------------------------------------

export function getWatchlist(): WatchlistItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(WATCHLIST_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to parse watchlist from localStorage', e);
        return [];
    }
}

export function isWatchlisted(symbol: string): boolean {
    if (!symbol) return false;
    const list = getWatchlist();
    const clean = symbol.trim().toUpperCase();
    return list.some(item => item.symbol.toUpperCase() === clean);
}

export function addToWatchlist(item: { symbol: string; name?: string; sector?: string; notes?: string }): boolean {
    const list = getWatchlist();
    const clean = item.symbol.trim().toUpperCase();
    if (list.some(i => i.symbol.toUpperCase() === clean)) {
        return false; // already present
    }

    const newItem: WatchlistItem = {
        symbol: clean,
        name: item.name || clean,
        sector: item.sector || 'General',
        addedAt: new Date().toISOString(),
        notes: item.notes || '',
    };

    list.unshift(newItem);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    notifyWatchlistUpdate();
    return true;
}

export function removeFromWatchlist(symbol: string): void {
    const list = getWatchlist();
    const clean = symbol.trim().toUpperCase();
    const filtered = list.filter(i => i.symbol.toUpperCase() !== clean);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(filtered));
    notifyWatchlistUpdate();
}

export function toggleWatchlist(item: { symbol: string; name?: string; sector?: string }): boolean {
    if (isWatchlisted(item.symbol)) {
        removeFromWatchlist(item.symbol);
        return false; // removed
    } else {
        addToWatchlist(item);
        return true; // added
    }
}

export function clearWatchlist(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(WATCHLIST_KEY);
    notifyWatchlistUpdate();
}

export function loadSampleWatchlist(): void {
    const samples: WatchlistItem[] = [
        { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', addedAt: new Date().toISOString() },
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', addedAt: new Date().toISOString() },
        { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', addedAt: new Date().toISOString() },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', addedAt: new Date().toISOString() },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', addedAt: new Date().toISOString() },
        { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', addedAt: new Date().toISOString() },
        { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', addedAt: new Date().toISOString() },
    ];
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(samples));
    notifyWatchlistUpdate();
}

// -------------------------------------------------------------
// Portfolio Holdings Management
// -------------------------------------------------------------

export function getHoldings(): PortfolioHolding[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(PORTFOLIO_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to parse portfolio holdings from localStorage', e);
        return [];
    }
}

export function addHolding(holding: Omit<PortfolioHolding, 'id'>): PortfolioHolding {
    const list = getHoldings();
    const newHolding: PortfolioHolding = {
        ...holding,
        id: 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        symbol: holding.symbol.trim().toUpperCase(),
        shares: Number(holding.shares),
        buyPrice: Number(holding.buyPrice),
        buyDate: holding.buyDate || new Date().toISOString().split('T')[0],
    };

    list.push(newHolding);
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(list));
    notifyPortfolioUpdate();
    return newHolding;
}

export function updateHolding(id: string, updates: Partial<PortfolioHolding>): void {
    const list = getHoldings();
    const index = list.findIndex(h => h.id === id);
    if (index !== -1) {
        list[index] = {
            ...list[index],
            ...updates,
            symbol: updates.symbol ? updates.symbol.trim().toUpperCase() : list[index].symbol,
            shares: updates.shares !== undefined ? Number(updates.shares) : list[index].shares,
            buyPrice: updates.buyPrice !== undefined ? Number(updates.buyPrice) : list[index].buyPrice,
        };
        localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(list));
        notifyPortfolioUpdate();
    }
}

export function deleteHolding(id: string): void {
    const list = getHoldings();
    const filtered = list.filter(h => h.id !== id);
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(filtered));
    notifyPortfolioUpdate();
}

export function clearHoldings(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PORTFOLIO_KEY);
    notifyPortfolioUpdate();
}

export function loadSamplePortfolio(): void {
    const sampleHoldings: PortfolioHolding[] = [
        {
            id: 'sample_nvda',
            symbol: 'NVDA',
            companyName: 'NVIDIA Corporation',
            shares: 20,
            buyPrice: 112.50,
            buyDate: '2024-05-15',
            notes: 'AI Infrastructure leader',
        },
        {
            id: 'sample_aapl',
            symbol: 'AAPL',
            companyName: 'Apple Inc.',
            shares: 25,
            buyPrice: 185.00,
            buyDate: '2024-03-10',
            notes: 'Core consumer tech',
        },
        {
            id: 'sample_msft',
            symbol: 'MSFT',
            companyName: 'Microsoft Corporation',
            shares: 15,
            buyPrice: 410.00,
            buyDate: '2024-04-02',
            notes: 'Enterprise Cloud & Copilot',
        },
        {
            id: 'sample_amzn',
            symbol: 'AMZN',
            companyName: 'Amazon.com Inc.',
            shares: 20,
            buyPrice: 172.00,
            buyDate: '2024-06-18',
            notes: 'AWS cloud reacceleration',
        },
        {
            id: 'sample_jpm',
            symbol: 'JPM',
            companyName: 'JPMorgan Chase & Co.',
            shares: 18,
            buyPrice: 195.00,
            buyDate: '2024-02-20',
            notes: 'Financial anchor & dividend',
        }
    ];
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(sampleHoldings));
    notifyPortfolioUpdate();
}

// -------------------------------------------------------------
// Real-time Valuation & Aggregation Engine
// -------------------------------------------------------------

export function calculateValuations(
    holdings: PortfolioHolding[],
    quotesMap: Record<string, LiveQuoteItem>
): { valuations: HoldingValuation[]; summary: PortfolioSummary } {
    let totalValue = 0;
    let totalCost = 0;
    let dayGainLoss = 0;

    // First pass: calculate individual market value and costs
    const preliminary = holdings.map(h => {
        const q = quotesMap[h.symbol.toUpperCase()];
        const currentPrice = q ? q.price : h.buyPrice;
        const change = q ? q.change : 0;
        const changePercent = q ? q.changePercent : 0;
        const marketValue = h.shares * currentPrice;
        const costBasis = h.shares * h.buyPrice;
        const unrealizedGainLoss = marketValue - costBasis;
        const unrealizedGainLossPercent = costBasis > 0 ? (unrealizedGainLoss / costBasis) * 100 : 0;
        const itemDayGainLoss = h.shares * change;

        totalValue += marketValue;
        totalCost += costBasis;
        dayGainLoss += itemDayGainLoss;

        return {
            ...h,
            companyName: q?.companyName || h.companyName || h.symbol,
            sector: q?.sector || 'Equities',
            currentPrice,
            change,
            changePercent,
            marketValue,
            costBasis,
            unrealizedGainLoss,
            unrealizedGainLossPercent,
            dayGainLoss: itemDayGainLoss,
            pe: q?.pe || null,
            fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh || currentPrice,
            fiftyTwoWeekLow: q?.fiftyTwoWeekLow || currentPrice,
            allocationPercent: 0,
        };
    });

    // Second pass: compute allocations
    const valuations: HoldingValuation[] = preliminary.map(item => ({
        ...item,
        allocationPercent: totalValue > 0 ? (item.marketValue / totalValue) * 100 : 0,
    }));

    // Sort by market value descending
    valuations.sort((a, b) => b.marketValue - a.marketValue);

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const previousCloseTotalValue = totalValue - dayGainLoss;
    const dayGainLossPercent = previousCloseTotalValue > 0 ? (dayGainLoss / previousCloseTotalValue) * 100 : 0;

    let topPerformer: { symbol: string; gainPercent: number; gainDollar: number } | undefined;
    let worstPerformer: { symbol: string; gainPercent: number; gainDollar: number } | undefined;
    let largestHolding: { symbol: string; allocationPercent: number; marketValue: number } | undefined;

    if (valuations.length > 0) {
        // Sort by unrealized gain percent
        const sortedByReturn = [...valuations].sort((a, b) => b.unrealizedGainLossPercent - a.unrealizedGainLossPercent);
        const top = sortedByReturn[0];
        const bottom = sortedByReturn[sortedByReturn.length - 1];

        topPerformer = {
            symbol: top.symbol,
            gainPercent: top.unrealizedGainLossPercent,
            gainDollar: top.unrealizedGainLoss,
        };

        worstPerformer = {
            symbol: bottom.symbol,
            gainPercent: bottom.unrealizedGainLossPercent,
            gainDollar: bottom.unrealizedGainLoss,
        };

        largestHolding = {
            symbol: valuations[0].symbol,
            allocationPercent: valuations[0].allocationPercent,
            marketValue: valuations[0].marketValue,
        };
    }

    const summary: PortfolioSummary = {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        dayGainLoss,
        dayGainLossPercent,
        holdingsCount: holdings.length,
        topPerformer,
        worstPerformer,
        largestHolding,
    };

    return { valuations, summary };
}

// -------------------------------------------------------------
// CSV Export Utility
// -------------------------------------------------------------

export function exportHoldingsToCsv(valuations: HoldingValuation[]) {
    if (!valuations.length) return;
    const headers = [
        'Symbol',
        'Company Name',
        'Sector',
        'Shares',
        'Buy Price ($)',
        'Current Price ($)',
        'Cost Basis ($)',
        'Market Value ($)',
        'Unrealized P&L ($)',
        'Unrealized P&L (%)',
        'Day Gain/Loss ($)',
        'Allocation (%)',
        'Buy Date',
        'Notes'
    ];

    const rows = valuations.map(v => [
        v.symbol,
        `"${v.companyName.replace(/"/g, '""')}"`,
        `"${v.sector.replace(/"/g, '""')}"`,
        v.shares,
        v.buyPrice.toFixed(2),
        v.currentPrice.toFixed(2),
        v.costBasis.toFixed(2),
        v.marketValue.toFixed(2),
        v.unrealizedGainLoss.toFixed(2),
        v.unrealizedGainLossPercent.toFixed(2) + '%',
        v.dayGainLoss.toFixed(2),
        v.allocationPercent.toFixed(2) + '%',
        v.buyDate,
        `"${(v.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `stockomp_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
