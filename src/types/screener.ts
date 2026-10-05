export interface ScreenerStock {
    no: number;
    symbol: string;
    companyName: string;
    sector: string;
    industry: string;
    country: string;
    marketCap: number;
    marketCapTier: 'Mega' | 'Large' | 'Mid' | 'Small';
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    avgVolume: number;
    relVolume: number;
    pe: number | null;
    forwardPe: number | null;
    priceToBook: number | null;
    eps: number | null;
    epsForward: number | null;
    dividendRate: number | null;
    dividendYield: number | null; // percentage e.g. 1.85%
    sma50: number | null;
    sma50DiffPercent: number | null;
    sma200: number | null;
    sma200DiffPercent: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    dist52WHigh: number | null;
    dist52WLow: number | null;
    analystRating: string | null;
    // Technical Indicators
    rsi14: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHist: number | null;
    beta: number | null;

    // Full Finviz Descriptive Attributes
    exchange?: string;
    indexName?: string;
    shortFloat?: number | null;
    targetPrice?: number | null;
    sharesOutstanding?: number | null;
    floatShares?: number | null;
    ipoYear?: number | null;
    theme?: string;
    subTheme?: string;
    optionShort?: string;
    earningsDate?: string;

    // Full Finviz Fundamental Attributes
    peg?: number | null;
    priceToSales?: number | null;
    priceToCash?: number | null;
    priceToFcf?: number | null;
    currentRatio?: number | null;
    quickRatio?: number | null;
    debtToEquity?: number | null;
    grossMargin?: number | null;
    operatingMargin?: number | null;
    netMargin?: number | null;
    roe?: number | null;
    roa?: number | null;
    payoutRatio?: number | null;
    insiderOwn?: number | null;
    instOwn?: number | null;
}

export type ScreenerView = 'overview' | 'valuation' | 'financial' | 'technical';

export type FilterCategoryTab = 'descriptive' | 'fundamental' | 'technical' | 'news' | 'etf' | 'all';

export interface ScreenerFilters {
    search: string;
    preset: string;
    filterTab: FilterCategoryTab;

    // --- Descriptive Filters (matching authentic Finviz screenshot) ---
    exchange: string;
    index: string;
    sector: string;
    industry: string;
    country: string;
    marketCapTier: string;
    dividendRange: string;
    shortFloat: string;
    analystRating: string;
    optionShort: string;
    earningsDate: string;
    avgVolume: string;
    relVolume: string;
    currentVolume: string;
    trades: string;
    priceRange: string;
    targetPrice: string;
    ipoDate: string;
    sharesOutstanding: string;
    floatShares: string;
    theme: string;
    subTheme: string;

    // --- Fundamental Filters ---
    peRange: string;
    forwardPeRange: string;
    pegRange: string;
    priceToBookRange: string;
    priceToSalesRange: string;
    priceToFcfRange: string;
    currentRatioRange: string;
    debtEquityRange: string;
    grossMarginRange: string;
    profitMarginRange: string;
    roeRange: string;
    payoutRange: string;
    insiderOwnRange: string;
    instOwnRange: string;

    // --- Technical Filters ---
    changeRange: string;
    sma50Filter: string;
    sma200Filter: string;
    fiftyTwoWeekFilter: string;
    rsiFilter: string;
    macdFilter: string;
    betaFilter: string;
    volatilityRange: string;
}
