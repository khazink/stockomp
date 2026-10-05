"use client";

import Link from 'next/link';
import { Award, TrendingUp, TrendingDown, Check, ShieldCheck, DollarSign, BarChart2 } from 'lucide-react';
import { ComparisonStock, ComparisonVerdict } from '@/types/compare';

interface ComparisonMatrixProps {
    stocks: ComparisonStock[];
    verdict: ComparisonVerdict;
}

const STOCK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ComparisonMatrix({ stocks, verdict }: ComparisonMatrixProps) {
    if (!stocks || stocks.length === 0) return null;

    const formatCap = (v: number) => {
        if (!v) return '-';
        if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
        if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
        return `$${(v / 1e6).toFixed(0)}M`;
    };

    // Helper to find best value index
    const getBestIdx = (values: (number | null | undefined)[], mode: 'lowest' | 'highest' = 'highest') => {
        let bestIdx = -1;
        let bestVal = mode === 'highest' ? -Infinity : Infinity;
        values.forEach((v, i) => {
            if (v !== null && v !== undefined && !isNaN(v)) {
                if (mode === 'highest' && v > bestVal) {
                    bestVal = v;
                    bestIdx = i;
                } else if (mode === 'lowest' && v < bestVal) {
                    bestVal = v;
                    bestIdx = i;
                }
            }
        });
        return bestIdx;
    };

    const renderRow = (
        label: string,
        getter: (s: ComparisonStock) => { display: string; numVal?: number | null },
        mode?: 'lowest' | 'highest'
    ) => {
        const rowVals = stocks.map(s => getter(s));
        const bestIdx = mode ? getBestIdx(rowVals.map(r => r.numVal), mode) : -1;

        return (
            <tr className="hover:bg-muted/40 transition-colors divide-x divide-border/40 text-xs">
                <td className="px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap bg-muted/10 w-44">
                    {label}
                </td>
                {rowVals.map((r, idx) => {
                    const isWinner = bestIdx === idx;
                    return (
                        <td
                            key={stocks[idx].symbol}
                            className={`px-4 py-2.5 text-center font-mono font-medium transition-colors ${
                                isWinner ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-foreground'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-1.5">
                                <span>{r.display}</span>
                                {isWinner && <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            </div>
                        </td>
                    );
                })}
            </tr>
        );
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Head-to-Head Algorithmic Verdict Card */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b pb-3">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="text-xl font-extrabold tracking-tight">Algorithmic Head-to-Head Verdict</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-primary" /> Valuation Winner
                        </span>
                        <span className="text-lg font-extrabold text-foreground">{verdict.valuationWinner.symbol}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                            {verdict.valuationWinner.rationale}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <BarChart2 className="w-3.5 h-3.5 text-emerald-500" /> Profitability Winner
                        </span>
                        <span className="text-lg font-extrabold text-foreground">{verdict.profitabilityWinner.symbol}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                            {verdict.profitabilityWinner.rationale}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Balance Sheet Winner
                        </span>
                        <span className="text-lg font-extrabold text-foreground">{verdict.balanceSheetWinner.symbol}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                            {verdict.balanceSheetWinner.rationale}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border border-primary/40 bg-primary/5 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-primary flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-primary" /> Overall Champion
                        </span>
                        <span className="text-lg font-extrabold text-primary">{verdict.overallWinner.symbol}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                            {verdict.overallWinner.rationale}
                        </p>
                    </div>
                </div>
            </div>

            {/* Side-by-Side Detailed Matrix Table */}
            <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b bg-muted/40 divide-x divide-border/40">
                                <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-44">
                                    Metrics
                                </th>
                                {stocks.map((s, idx) => (
                                    <th key={s.symbol} className="px-4 py-4 text-center min-w-[170px]">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-xs"
                                                style={{ backgroundColor: STOCK_COLORS[idx % STOCK_COLORS.length] }}
                                            >
                                                {s.symbol.slice(0, 3)}
                                            </div>
                                            <Link
                                                href={`/stock/${s.symbol}`}
                                                className="text-base font-extrabold text-primary hover:underline"
                                            >
                                                {s.symbol}
                                            </Link>
                                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                {s.profile.companyName}
                                            </span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="font-extrabold text-sm">${s.quote.price.toFixed(2)}</span>
                                                <span className={`text-xs font-bold ${s.quote.changesPercentage >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    ({s.quote.changesPercentage >= 0 ? '+' : ''}{s.quote.changesPercentage.toFixed(2)}%)
                                                </span>
                                            </div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border/50">
                            {/* Section: General & Size */}
                            <tr className="bg-muted/60 font-bold text-xs">
                                <td colSpan={stocks.length + 1} className="px-4 py-1.5 text-foreground uppercase tracking-wide">
                                    Company Size & Market Profile
                                </td>
                            </tr>
                            {renderRow('Sector', s => ({ display: s.profile.sector || 'Unknown' }))}
                            {renderRow('Industry', s => ({ display: s.profile.industry || 'Unknown' }))}
                            {renderRow('Market Cap', s => ({ display: formatCap(s.metrics.marketCap), numVal: s.metrics.marketCap }), 'highest')}
                            {renderRow('Enterprise Value', s => ({ display: formatCap(s.metrics.enterpriseValue), numVal: s.metrics.enterpriseValue }))}
                            {renderRow('Beta (Volatility)', s => ({ display: s.metrics.beta.toFixed(2), numVal: s.metrics.beta }), 'lowest')}

                            {/* Section: Valuation Multiples */}
                            <tr className="bg-muted/60 font-bold text-xs">
                                <td colSpan={stocks.length + 1} className="px-4 py-1.5 text-foreground uppercase tracking-wide">
                                    Valuation & Multiples
                                </td>
                            </tr>
                            {renderRow('P/E Ratio (TTM)', s => ({ display: s.metrics.pe ? s.metrics.pe.toFixed(1) + 'x' : 'N/A', numVal: s.metrics.pe }), 'lowest')}
                            {renderRow('Forward P/E', s => ({ display: s.metrics.forwardPe ? s.metrics.forwardPe.toFixed(1) + 'x' : 'N/A', numVal: s.metrics.forwardPe }), 'lowest')}
                            {renderRow('Price to Book (P/B)', s => ({ display: s.metrics.priceToBook ? s.metrics.priceToBook.toFixed(2) + 'x' : 'N/A', numVal: s.metrics.priceToBook }), 'lowest')}
                            {renderRow('EV / EBITDA', s => ({ display: s.metrics.evToEbitda ? s.metrics.evToEbitda.toFixed(1) + 'x' : 'N/A', numVal: s.metrics.evToEbitda }), 'lowest')}
                            {renderRow('Free Cash Flow Yield', s => ({ display: s.metrics.fcfYield ? s.metrics.fcfYield.toFixed(2) + '%' : 'N/A', numVal: s.metrics.fcfYield }), 'highest')}

                            {/* Section: Profitability & Returns */}
                            <tr className="bg-muted/60 font-bold text-xs">
                                <td colSpan={stocks.length + 1} className="px-4 py-1.5 text-foreground uppercase tracking-wide">
                                    Profitability & Quality
                                </td>
                            </tr>
                            {renderRow('Return on Equity (ROE)', s => ({ display: s.metrics.roe ? s.metrics.roe.toFixed(1) + '%' : 'N/A', numVal: s.metrics.roe }), 'highest')}
                            {renderRow('Return on Assets (ROA)', s => ({ display: s.metrics.roa ? s.metrics.roa.toFixed(1) + '%' : 'N/A', numVal: s.metrics.roa }), 'highest')}
                            {renderRow('Gross Profit Margin', s => ({ display: s.metrics.grossMargin ? s.metrics.grossMargin.toFixed(1) + '%' : 'N/A', numVal: s.metrics.grossMargin }), 'highest')}
                            {renderRow('Net Profit Margin', s => ({ display: s.metrics.netMargin ? s.metrics.netMargin.toFixed(1) + '%' : 'N/A', numVal: s.metrics.netMargin }), 'highest')}

                            {/* Section: Financial Health */}
                            <tr className="bg-muted/60 font-bold text-xs">
                                <td colSpan={stocks.length + 1} className="px-4 py-1.5 text-foreground uppercase tracking-wide">
                                    Balance Sheet & Safety
                                </td>
                            </tr>
                            {renderRow('Cash & Equivalents', s => ({ display: formatCap(s.metrics.cash), numVal: s.metrics.cash }), 'highest')}
                            {renderRow('Total Debt', s => ({ display: formatCap(s.metrics.totalDebt), numVal: s.metrics.totalDebt }), 'lowest')}
                            {renderRow('Debt to Equity', s => ({ display: s.metrics.debtToEquity !== null ? s.metrics.debtToEquity.toFixed(2) : 'N/A', numVal: s.metrics.debtToEquity }), 'lowest')}
                            {renderRow('Current Ratio', s => ({ display: s.metrics.currentRatio !== null ? s.metrics.currentRatio.toFixed(2) : 'N/A', numVal: s.metrics.currentRatio }), 'highest')}

                            {/* Section: Dividends & Growth */}
                            <tr className="bg-muted/60 font-bold text-xs">
                                <td colSpan={stocks.length + 1} className="px-4 py-1.5 text-foreground uppercase tracking-wide">
                                    Dividends & Long-Term Growth
                                </td>
                            </tr>
                            {renderRow('Dividend Yield', s => ({ display: s.metrics.dividendYield ? s.metrics.dividendYield.toFixed(2) + '%' : '0.00%', numVal: s.metrics.dividendYield || 0 }), 'highest')}
                            {renderRow('3Y EPS Growth', s => ({ display: s.metrics.epsGrowth3Y !== null ? s.metrics.epsGrowth3Y.toFixed(1) + '%' : 'N/A', numVal: s.metrics.epsGrowth3Y }), 'highest')}

                            {/* Section: Technicals */}
                            <tr className="bg-muted/60 font-bold text-xs">
                                <td colSpan={stocks.length + 1} className="px-4 py-1.5 text-foreground uppercase tracking-wide">
                                    Technical Momentum & Range
                                </td>
                            </tr>
                            {renderRow('From 52-Week High', s => ({ display: s.metrics.dist52WHigh !== null ? s.metrics.dist52WHigh.toFixed(1) + '%' : 'N/A', numVal: s.metrics.dist52WHigh }), 'highest')}
                            {renderRow('From 52-Week Low', s => ({ display: s.metrics.dist52WLow !== null ? '+' + s.metrics.dist52WLow.toFixed(1) + '%' : 'N/A', numVal: s.metrics.dist52WLow }), 'highest')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
