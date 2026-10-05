export interface Quote {
    symbol: string;
    name: string;
    price: number;
    changesPercentage: number;
    change: number;
    dayLow: number;
    dayHigh: number;
    yearHigh: number;
    yearLow: number;
    marketCap: number;
    priceAvg50: number;
    priceAvg200: number;
    volume: number;
    avgVolume: number;
    exchange: string;
    open: number;
    previousClose: number;
    eps: number;
    pe: number;
    earningsAnnouncement: string;
    sharesOutstanding: number;
    timestamp: number;
}

export interface HistoricalData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface Financials {
    symbol: string;
    // Income Statement highlights
    revenue: number;
    grossProfit: number;
    netIncome: number;
    eps: number;
    epsDiluted: number;
    dividendPerShare: number;

    // Balance Sheet highlights
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalDebt: number;
    cashAndEquivalents: number;

    // Cash Flow highlights
    operatingCashFlow: number;
    freeCashFlow: number;
    capitalExpenditure: number;

    // Derived Ratios
    currentRatio: number;
    debtToEquity: number;
    roe: number;
    roa: number;
    epsGrowth3Y: number; // custom derived
}

export interface Profile {
    symbol: string;
    price: number;
    beta: number;
    volAvg: number;
    mktCap: number;
    lastDiv: number;
    range: string;
    changes: number;
    companyName: string;
    currency: string;
    cik: string;
    isin: string;
    cusip: string;
    exchange: string;
    exchangeShortName: string;
    industry: string;
    website: string;
    description: string;
    ceo: string;
    sector: string;
    country: string;
    fullTimeEmployees: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    dcfDiff: number;
    dcf: number;
    image: string;
}

export interface NewsArticle {
    symbol: string;
    publishedDate: string;
    title: string;
    image: string;
    site: string;
    text: string;
    url: string;
    sentiment?: "Positive" | "Neutral" | "Negative"; // Added for Phase 3 engine
}
