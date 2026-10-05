export interface WatchlistItem {
    symbol: string;
    name: string;
    sector?: string;
    addedAt: string;
    notes?: string;
}

export interface PortfolioHolding {
    id: string;
    symbol: string;
    companyName: string;
    shares: number;
    buyPrice: number;
    buyDate: string;
    notes?: string;
}

export interface LiveQuoteItem {
    symbol: string;
    companyName: string;
    sector: string;
    price: number;
    change: number;
    changePercent: number;
    marketCap: number;
    pe: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    volume: number;
    updatedAt?: number;
}

export interface HoldingValuation extends PortfolioHolding {
    currentPrice: number;
    change: number;
    changePercent: number;
    marketValue: number;
    costBasis: number;
    unrealizedGainLoss: number;
    unrealizedGainLossPercent: number;
    dayGainLoss: number;
    allocationPercent: number;
    pe: number | null;
    sector: string;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
}

export interface PortfolioSummary {
    totalValue: number;
    totalCost: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    dayGainLoss: number;
    dayGainLossPercent: number;
    holdingsCount: number;
    topPerformer?: {
        symbol: string;
        gainPercent: number;
        gainDollar: number;
    };
    worstPerformer?: {
        symbol: string;
        gainPercent: number;
        gainDollar: number;
    };
    largestHolding?: {
        symbol: string;
        allocationPercent: number;
        marketValue: number;
    };
}
