"use client";

import React from 'react';
import { ScreenerFilters, FilterCategoryTab } from '@/types/screener';
import { MAJOR_ETFS, LATEST_MARKET_NEWS } from '@/lib/finvizMeta';
import { SlidersHorizontal, Search, RotateCcw, ExternalLink, Newspaper, Layers } from 'lucide-react';
import Link from 'next/link';

interface FinvizFilterMatrixProps {
    filters: ScreenerFilters;
    setFilters: React.Dispatch<React.SetStateAction<ScreenerFilters>>;
    industries: string[];
    totalStocks: number;
    filteredCount: number;
    onReset: () => void;
}

export default function FinvizFilterMatrix({
    filters,
    setFilters,
    industries,
    totalStocks,
    filteredCount,
    onReset,
}: FinvizFilterMatrixProps) {
    const activeTab = filters.filterTab || 'descriptive';

    const setTab = (tab: FilterCategoryTab) => {
        setFilters(prev => ({ ...prev, filterTab: tab }));
    };

    const updateFilter = (key: keyof ScreenerFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value, preset: 'custom' }));
    };

    // Helper for rendering a Finviz-styled filter item (Label on left, Select on right)
    const renderFilterItem = (
        label: string,
        filterKey: keyof ScreenerFilters,
        options: { value: string; label: string }[],
        disabled = false
    ) => (
        <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
            <label className="text-[11px] text-muted-foreground font-medium text-right shrink-0 whitespace-nowrap">
                {label}
            </label>
            <select
                value={String(filters[filterKey] || 'ALL')}
                onChange={(e) => updateFilter(filterKey, e.target.value)}
                disabled={disabled}
                className={'h-7 w-[120px] sm:w-[130px] rounded px-1.5 text-[11px] font-semibold border transition-colors ' + (
                    disabled
                        ? 'bg-muted/30 border-border/40 text-muted-foreground/40 cursor-not-allowed'
                        : filters[filterKey] && filters[filterKey] !== 'ALL'
                            ? 'bg-blue-600/15 border-blue-500 text-blue-400 focus-visible:ring-1 focus-visible:ring-blue-500'
                            : 'bg-card border-border/80 text-foreground hover:border-border focus-visible:ring-1 focus-visible:ring-primary'
                )}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-popover text-popover-foreground">
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col gap-3">
            {/* Header: Title, Search, Reset */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
                {/* Authentic Finviz Filter Category Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                    {[
                        { id: 'descriptive', label: 'Descriptive' },
                        { id: 'fundamental', label: 'Fundamental' },
                        { id: 'technical', label: 'Technical' },
                        { id: 'news', label: 'News' },
                        { id: 'etf', label: 'ETF' },
                        { id: 'all', label: 'All' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTab(tab.id as FilterCategoryTab)}
                            className={'px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ' + (
                                activeTab === tab.id
                                    ? 'bg-blue-500/15 border border-blue-500 text-blue-400 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Instant Search Bar & Count */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:inline">
                        (<strong className="text-foreground">{filteredCount}</strong> / {totalStocks})
                    </span>
                    <div className="relative w-full sm:w-60">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => updateFilter('search', e.target.value)}
                            placeholder="Filter symbol or name..."
                            className="flex h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* TAB 1: DESCRIPTIVE FILTERS (Exact 5-Column Finviz Grid from Screenshot) */}
            {(activeTab === 'descriptive' || activeTab === 'all') && (
                <div className="space-y-3">
                    {activeTab === 'all' && (
                        <div className="text-xs font-bold text-primary uppercase tracking-wider pt-2 border-t">
                            Descriptive Filters
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2.5">
                        {/* COLUMN 1 */}
                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Exchange', 'exchange', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'NASDAQ', label: 'NASDAQ' },
                                { value: 'NYSE', label: 'NYSE' },
                                { value: 'AMEX', label: 'AMEX' },
                            ])}
                            {renderFilterItem('Market Cap.', 'marketCapTier', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'Mega', label: 'Mega ($200bln+)' },
                                { value: 'Large', label: 'Large ($10B-$200B)' },
                                { value: 'Mid', label: 'Mid ($2B-$10B)' },
                                { value: 'Small', label: 'Small ($300M-$2B)' },
                            ])}
                            {renderFilterItem('Earnings Date', 'earningsDate', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'THIS_WEEK', label: 'This Week' },
                                { value: 'NEXT_WEEK', label: 'Next Week' },
                                { value: 'THIS_MONTH', label: 'This Month' },
                                { value: 'PAST_5_DAYS', label: 'Previous 5 Days' },
                            ])}
                            {renderFilterItem('Price $', 'priceRange', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'UNDER_10', label: 'Under $10' },
                                { value: 'UNDER_20', label: 'Under $20' },
                                { value: 'UNDER_50', label: 'Under $50' },
                                { value: 'UNDER_100', label: 'Under $100' },
                                { value: 'OVER_50', label: 'Over $50' },
                                { value: 'OVER_100', label: 'Over $100' },
                                { value: 'OVER_200', label: 'Over $200' },
                            ])}
                            {renderFilterItem('Theme', 'theme', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'AI', label: 'Artificial Intelligence' },
                                { value: 'SEMIS', label: 'Semiconductors' },
                                { value: 'CLOUD', label: 'Cloud Computing' },
                                { value: 'CYBER', label: 'Cybersecurity' },
                                { value: 'FINTECH', label: 'Fintech & Payments' },
                                { value: 'ENERGY', label: 'Clean Energy & Power' },
                                { value: 'ECOMMERCE', label: 'E-Commerce' },
                                { value: 'HEALTH', label: 'Biotech & Health' },
                            ])}
                        </div>

                        {/* COLUMN 2 */}
                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Index', 'index', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'SP500', label: 'S&P 500' },
                                { value: 'SP100', label: 'S&P 100' },
                                { value: 'DJIA', label: 'DJIA (Dow 30)' },
                                { value: 'NASDAQ100', label: 'NASDAQ 100' },
                            ])}
                            {renderFilterItem('Dividend Yield', 'dividendRange', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'NONE', label: 'None (0%)' },
                                { value: 'POS', label: 'Positive (>0%)' },
                                { value: 'OVER_1_5', label: '> 1.5%' },
                                { value: 'OVER_3', label: 'High (>3%)' },
                                { value: 'OVER_5', label: 'Very High (>5%)' },
                            ])}
                            {renderFilterItem('Average Volume', 'avgVolume', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'UNDER_500K', label: 'Under 500K' },
                                { value: 'UNDER_1M', label: 'Under 1M' },
                                { value: 'OVER_500K', label: 'Over 500K' },
                                { value: 'OVER_1M', label: 'Over 1M' },
                                { value: 'OVER_2M', label: 'Over 2M' },
                                { value: 'OVER_5M', label: 'Over 5M' },
                                { value: 'OVER_10M', label: 'Over 10M' },
                            ])}
                            {renderFilterItem('Target Price', 'targetPrice', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'ABOVE', label: 'Above Price' },
                                { value: 'BELOW', label: 'Below Price' },
                                { value: 'ABOVE_10', label: '10%+ Above' },
                                { value: 'ABOVE_20', label: '20%+ Above' },
                            ])}
                            {renderFilterItem('Sub-theme', 'subTheme', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'GEN_AI', label: 'Generative AI' },
                                { value: 'DATA_CENTER', label: 'Data Centers' },
                                { value: 'GPU_CHIPS', label: 'GPUs & Custom ASIC' },
                                { value: 'SAAS', label: 'Enterprise SaaS' },
                                { value: 'AUTONOMOUS', label: 'Autonomous Tech' },
                            ])}
                        </div>

                        {/* COLUMN 3 */}
                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Sector', 'sector', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'Technology', label: 'Technology' },
                                { value: 'Financial Services', label: 'Financial Services' },
                                { value: 'Healthcare', label: 'Healthcare' },
                                { value: 'Consumer Cyclical', label: 'Consumer Cyclical' },
                                { value: 'Consumer Defensive', label: 'Consumer Defensive' },
                                { value: 'Communication Services', label: 'Communication' },
                                { value: 'Industrials', label: 'Industrials' },
                                { value: 'Energy', label: 'Energy' },
                                { value: 'Basic Materials', label: 'Basic Materials' },
                                { value: 'Real Estate', label: 'Real Estate' },
                                { value: 'Utilities', label: 'Utilities' },
                            ])}
                            {renderFilterItem('Short Float', 'shortFloat', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'LOW_5', label: 'Low (<5%)' },
                                { value: 'MID_5_10', label: '5% - 10%' },
                                { value: 'HIGH_10', label: 'High (>10%)' },
                                { value: 'VHIGH_20', label: 'Very High (>20%)' },
                            ])}
                            {renderFilterItem('Relative Volume', 'relVolume', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'OVER_1', label: 'Over 1' },
                                { value: 'OVER_1_5', label: 'Over 1.5' },
                                { value: 'OVER_2', label: 'Over 2' },
                                { value: 'UNDER_1', label: 'Under 1' },
                            ])}
                            {renderFilterItem('IPO Date', 'ipoDate', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'PAST_YEAR', label: 'Past Year' },
                                { value: 'PAST_5_YEARS', label: 'Past 5 Years' },
                                { value: 'MORE_5_YEARS', label: 'More than 5Y ago' },
                                { value: 'MORE_25_YEARS', label: 'More than 25Y ago' },
                            ])}
                        </div>

                        {/* COLUMN 4 */}
                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Industry', 'industry', [
                                { value: 'ALL', label: 'Any' },
                                ...industries.slice(0, 30).map(ind => ({ value: ind, label: ind }))
                            ])}
                            {renderFilterItem('Analyst Recom.', 'analystRating', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'STRONG_BUY', label: 'Strong Buy' },
                                { value: 'BUY', label: 'Buy or better' },
                                { value: 'HOLD', label: 'Hold' },
                                { value: 'SELL', label: 'Underperform/Sell' },
                            ])}
                            {renderFilterItem('Current Volume', 'currentVolume', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'UNDER_500K', label: 'Under 500K' },
                                { value: 'OVER_500K', label: 'Over 500K' },
                                { value: 'OVER_1M', label: 'Over 1M' },
                                { value: 'OVER_2M', label: 'Over 2M' },
                                { value: 'OVER_5M', label: 'Over 5M' },
                                { value: 'OVER_10M', label: 'Over 10M' },
                                { value: 'OVER_20M', label: 'Over 20M' },
                            ])}
                            {renderFilterItem('Shares Outstanding', 'sharesOutstanding', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'UNDER_50M', label: 'Under 50M' },
                                { value: 'UNDER_500M', label: 'Under 500M' },
                                { value: 'OVER_100M', label: 'Over 100M' },
                                { value: 'OVER_500M', label: 'Over 500M' },
                                { value: 'OVER_1B', label: 'Over 1B' },
                                { value: 'OVER_5B', label: 'Over 5B' },
                            ])}
                        </div>

                        {/* COLUMN 5 */}
                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Country', 'country', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'USA', label: 'USA' },
                                { value: 'Ireland', label: 'Ireland' },
                                { value: 'Switzerland', label: 'Switzerland' },
                                { value: 'United Kingdom', label: 'United Kingdom' },
                                { value: 'Netherlands', label: 'Netherlands' },
                            ])}
                            {renderFilterItem('Option/Short', 'optionShort', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'OPTIONABLE', label: 'Optionable' },
                                { value: 'SHORTABLE', label: 'Shortable' },
                                { value: 'BOTH', label: 'Optionable & short' },
                            ])}
                            {renderFilterItem('Trades', 'trades', [
                                { value: 'ALL', label: 'Elite only' },
                            ], true)}
                            {renderFilterItem('Float', 'floatShares', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'UNDER_50M', label: 'Under 50M' },
                                { value: 'UNDER_500M', label: 'Under 500M' },
                                { value: 'OVER_100M', label: 'Over 100M' },
                                { value: 'OVER_500M', label: 'Over 500M' },
                                { value: 'OVER_1B', label: 'Over 1B' },
                            ])}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: FUNDAMENTAL FILTERS */}
            {(activeTab === 'fundamental' || activeTab === 'all') && (
                <div className="space-y-3">
                    {activeTab === 'all' && (
                        <div className="text-xs font-bold text-primary uppercase tracking-wider pt-3 border-t">
                            Fundamental & Valuation Filters
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2.5">
                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('P/E Ratio', 'peRange', [
                                { value: 'ALL', label: 'Any P/E' },
                                { value: 'UNDER_15', label: 'Under 15 (Deep Value)' },
                                { value: 'UNDER_20', label: 'Under 20 (Value)' },
                                { value: 'UNDER_30', label: 'Under 30' },
                                { value: 'OVER_30', label: 'Over 30 (Growth)' },
                            ])}
                            {renderFilterItem('Forward P/E', 'forwardPeRange', [
                                { value: 'ALL', label: 'Any Fwd P/E' },
                                { value: 'UNDER_15', label: 'Under 15' },
                                { value: 'UNDER_20', label: 'Under 20' },
                                { value: 'UNDER_25', label: 'Under 25' },
                                { value: 'OVER_25', label: 'Over 25' },
                            ])}
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Price / Book', 'priceToBookRange', [
                                { value: 'ALL', label: 'Any P/B' },
                                { value: 'UNDER_1', label: 'Under 1' },
                                { value: 'UNDER_2', label: 'Under 2' },
                                { value: 'UNDER_5', label: 'Under 5' },
                                { value: 'OVER_5', label: 'Over 5' },
                            ])}
                            {renderFilterItem('Price / Sales', 'priceToSalesRange', [
                                { value: 'ALL', label: 'Any P/S' },
                                { value: 'UNDER_1', label: 'Under 1' },
                                { value: 'UNDER_3', label: 'Under 3' },
                                { value: 'OVER_5', label: 'Over 5' },
                                { value: 'OVER_10', label: 'Over 10' },
                            ])}
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Return on Equity', 'roeRange', [
                                { value: 'ALL', label: 'Any ROE' },
                                { value: 'POS', label: 'Positive (>0%)' },
                                { value: 'OVER_15', label: 'Over 15%' },
                                { value: 'OVER_25', label: 'Over 25%' },
                            ])}
                            {renderFilterItem('Current Ratio', 'currentRatioRange', [
                                { value: 'ALL', label: 'Any Current Ratio' },
                                { value: 'OVER_1', label: 'Over 1' },
                                { value: 'OVER_1_5', label: 'Over 1.5' },
                                { value: 'OVER_2', label: 'Over 2' },
                            ])}
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Debt / Equity', 'debtEquityRange', [
                                { value: 'ALL', label: 'Any Debt/Eq' },
                                { value: 'UNDER_0_5', label: 'Under 0.5' },
                                { value: 'UNDER_1', label: 'Under 1.0' },
                                { value: 'OVER_1', label: 'Over 1.0' },
                            ])}
                            {renderFilterItem('Net Profit Margin', 'profitMarginRange', [
                                { value: 'ALL', label: 'Any Margin' },
                                { value: 'POS', label: 'Positive (>0%)' },
                                { value: 'OVER_15', label: 'Over 15%' },
                                { value: 'OVER_25', label: 'Over 25%' },
                            ])}
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Payout Ratio', 'payoutRange', [
                                { value: 'ALL', label: 'Any Payout' },
                                { value: 'UNDER_30', label: 'Under 30%' },
                                { value: 'UNDER_50', label: 'Under 50%' },
                                { value: 'OVER_50', label: 'Over 50%' },
                            ])}
                            {renderFilterItem('Inst. Ownership', 'instOwnRange', [
                                { value: 'ALL', label: 'Any Inst. Own' },
                                { value: 'OVER_50', label: 'Over 50%' },
                                { value: 'OVER_70', label: 'Over 70%' },
                                { value: 'OVER_85', label: 'Over 85%' },
                            ])}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: TECHNICAL FILTERS */}
            {(activeTab === 'technical' || activeTab === 'all') && (
                <div className="space-y-3">
                    {activeTab === 'all' && (
                        <div className="text-xs font-bold text-primary uppercase tracking-wider pt-3 border-t">
                            Technical & Trend Filters
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2.5">
                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('RSI (14)', 'rsiFilter', [
                                { value: 'ALL', label: 'Any RSI' },
                                { value: 'OS_30', label: 'Oversold (< 30)' },
                                { value: 'OS_20', label: 'Extreme OS (< 20)' },
                                { value: 'OB_70', label: 'Overbought (> 70)' },
                                { value: 'OB_80', label: 'Extreme OB (> 80)' },
                                { value: 'BULL_40_60', label: 'Bullish (40 - 60)' },
                                { value: 'NEUTRAL_30_70', label: 'Neutral (30 - 70)' },
                            ])}
                            {renderFilterItem('MACD (12,26,9)', 'macdFilter', [
                                { value: 'ALL', label: 'Any MACD' },
                                { value: 'BULL_HIST', label: 'Bullish (Hist > 0)' },
                                { value: 'BEAR_HIST', label: 'Bearish (Hist < 0)' },
                                { value: 'BULL_CROSS', label: 'Bullish Cross' },
                                { value: 'BEAR_CROSS', label: 'Bearish Cross' },
                            ])}
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Beta (Volatility)', 'betaFilter', [
                                { value: 'ALL', label: 'Any Beta' },
                                { value: 'LOW_08', label: 'Low (< 0.8 / Safe)' },
                                { value: 'MOD_08_13', label: 'Moderate (0.8-1.3)' },
                                { value: 'HIGH_13', label: 'High (> 1.3 / Vol)' },
                                { value: 'VERY_HIGH_18', label: 'Very High (> 1.8)' },
                            ])}
                            {renderFilterItem('Price vs 50 SMA', 'sma50Filter', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'ABOVE', label: 'Price Above 50 SMA' },
                                { value: 'BELOW', label: 'Price Below 50 SMA' },
                            ])}
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Price vs 200 SMA', 'sma200Filter', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'ABOVE', label: 'Price Above 200 SMA' },
                                { value: 'BELOW', label: 'Price Below 200 SMA' },
                            ])}
                            {renderFilterItem('52-Week Range', 'fiftyTwoWeekFilter', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'NEAR_HIGH_5', label: 'Within 5% of High' },
                                { value: 'NEAR_HIGH_10', label: 'Within 10% of High' },
                                { value: 'NEAR_LOW_10', label: 'Within 10% of Low' },
                            ])}
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {renderFilterItem('Today Change', 'changeRange', [
                                { value: 'ALL', label: 'Any Change' },
                                { value: 'POS', label: 'Up (> 0%)' },
                                { value: 'NEG', label: 'Down (< 0%)' },
                                { value: 'POS_2', label: 'Up 2%+' },
                                { value: 'NEG_2', label: 'Down 2%+' },
                                { value: 'POS_5', label: 'Up 5%+' },
                            ])}
                            {renderFilterItem('Rel Volume', 'relVolume', [
                                { value: 'ALL', label: 'Any' },
                                { value: 'OVER_1', label: 'Over 1' },
                                { value: 'OVER_1_5', label: 'Over 1.5' },
                                { value: 'OVER_2', label: 'Over 2' },
                            ])}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: NEWS FEED */}
            {activeTab === 'news' && (
                <div className="py-2 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b">
                        <div className="flex items-center gap-2">
                            <Newspaper className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                Live Market News & Earnings Catalysts
                            </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">Aggregated across S&P 500</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {LATEST_MARKET_NEWS.map((item, idx) => (
                            <div key={idx} className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                    <span className="font-semibold text-primary">{item.category}</span>
                                    <span>{item.time}</span>
                                </div>
                                <h4 className="text-xs font-bold text-foreground leading-snug hover:text-primary transition-colors">
                                    {item.title}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="text-[10px] text-muted-foreground">Related:</span>
                                    {item.related.map(sym => (
                                        <Link
                                            key={sym}
                                            href={'/stock/' + sym}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary hover:underline"
                                        >
                                            {sym}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 5: ETF SECTOR & BROAD MARKET RADAR */}
            {activeTab === 'etf' && (
                <div className="py-2 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                S&P 500 Broad Market & Sector ETFs
                            </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">Macro Trend Radar</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                        {MAJOR_ETFS.map(etf => {
                            const isPositive = etf.change >= 0;
                            return (
                                <Link
                                    key={etf.symbol}
                                    href={'/stock/' + etf.symbol}
                                    className="p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-primary">{etf.symbol}</span>
                                        <span className={'text-[11px] font-mono font-bold ' + (isPositive ? 'text-emerald-500' : 'text-red-500')}>
                                            {(isPositive ? '+' : '') + etf.change.toFixed(2) + '%'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">{etf.category}</div>
                                    <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 mt-2 font-mono">
                                        <span>{'$' + etf.price.toFixed(2)}</span>
                                        <span>{etf.aum}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
