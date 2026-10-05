import { Quote, Profile, Financials, HistoricalData } from './stock';

export interface NormalizedDataPoint {
    date: string;
    shortDate: string;
    [symbol: string]: string | number; // percentage return per symbol
}

export interface ComparisonStock {
    symbol: string;
    quote: Quote;
    profile: Profile;
    financials: Financials;
    metrics: {
        marketCap: number;
        enterpriseValue: number;
        pe: number | null;
        forwardPe: number | null;
        priceToBook: number | null;
        fcfYield: number | null;
        evToEbitda: number | null;
        roe: number | null;
        roa: number | null;
        grossMargin: number | null;
        netMargin: number | null;
        currentRatio: number | null;
        debtToEquity: number | null;
        totalDebt: number;
        cash: number;
        dividendYield: number | null;
        epsGrowth3Y: number | null;
        dist52WHigh: number | null;
        dist52WLow: number | null;
        beta: number;
    };
}

export interface ComparisonVerdict {
    valuationWinner: { symbol: string; rationale: string };
    profitabilityWinner: { symbol: string; rationale: string };
    balanceSheetWinner: { symbol: string; rationale: string };
    momentumWinner: { symbol: string; rationale: string };
    overallWinner: { symbol: string; rationale: string };
}

export interface ComparisonResponse {
    stocks: ComparisonStock[];
    normalizedHistory: NormalizedDataPoint[];
    verdict: ComparisonVerdict;
    timeframe: string;
}
