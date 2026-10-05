"use client";

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Award, AlertTriangle, Layers } from 'lucide-react';
import { PortfolioSummary } from '@/types/portfolio';

interface PortfolioSummaryCardsProps {
    summary: PortfolioSummary;
}

export default function PortfolioSummaryCards({ summary }: PortfolioSummaryCardsProps) {
    const isTotalPositive = summary.totalGainLoss >= 0;
    const isDayPositive = summary.dayGainLoss >= 0;

    const formatMoney = (val: number) => {
        return '$' + Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Portfolio Value */}
            <div className="bg-card border rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Value</span>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-sans">
                        {formatMoney(summary.totalValue)}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>Cost Basis:</span>
                        <span className="font-semibold text-foreground font-mono">{formatMoney(summary.totalCost)}</span>
                        <span className="text-muted-foreground/60">•</span>
                        <span>{summary.holdingsCount} {summary.holdingsCount === 1 ? 'asset' : 'assets'}</span>
                    </div>
                </div>
            </div>

            {/* 2. Total Unrealized Return */}
            <div className="bg-card border rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Return</span>
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + (
                        isTotalPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    )}>
                        {isTotalPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                </div>
                <div className="mt-3">
                    <div className={'text-2xl sm:text-3xl font-extrabold tracking-tight font-sans ' + (
                        isTotalPositive ? 'text-emerald-500' : 'text-red-500'
                    )}>
                        {(isTotalPositive ? '+' : '-') + formatMoney(summary.totalGainLoss)}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span className={'px-1.5 py-0.5 rounded font-semibold text-[11px] font-mono ' + (
                            isTotalPositive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        )}>
                            {(isTotalPositive ? '+' : '') + summary.totalGainLossPercent.toFixed(2) + '%'}
                        </span>
                        <span className="text-muted-foreground">All-time Unrealized P&L</span>
                    </div>
                </div>
            </div>

            {/* 3. Today's Gain/Loss */}
            <div className="bg-card border rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Day's P&L</span>
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + (
                        isDayPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    )}>
                        <Layers className="w-4 h-4" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className={'text-2xl sm:text-3xl font-extrabold tracking-tight font-sans ' + (
                        isDayPositive ? 'text-emerald-500' : 'text-red-500'
                    )}>
                        {(isDayPositive ? '+' : '-') + formatMoney(summary.dayGainLoss)}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span className={'px-1.5 py-0.5 rounded font-semibold text-[11px] font-mono ' + (
                            isDayPositive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        )}>
                            {(isDayPositive ? '+' : '') + summary.dayGainLossPercent.toFixed(2) + '%'}
                        </span>
                        <span className="text-muted-foreground">Today's move</span>
                    </div>
                </div>
            </div>

            {/* 4. Top Performer & Allocation */}
            <div className="bg-card border rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leaders & Risk</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                    </div>
                </div>
                <div className="mt-2 space-y-1.5 text-xs">
                    {summary.topPerformer ? (
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <span>Top Performer:</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">{summary.topPerformer.symbol}</span>
                                <span className="text-emerald-500 font-mono font-semibold">
                                    {(summary.topPerformer.gainPercent >= 0 ? '+' : '') + summary.topPerformer.gainPercent.toFixed(1) + '%'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-muted-foreground">No holdings recorded</div>
                    )}

                    {summary.worstPerformer && summary.holdingsCount > 1 && (
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Laggard:</span>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">{summary.worstPerformer.symbol}</span>
                                <span className={'font-mono font-semibold ' + (summary.worstPerformer.gainPercent >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                                    {(summary.worstPerformer.gainPercent >= 0 ? '+' : '') + summary.worstPerformer.gainPercent.toFixed(1) + '%'}
                                </span>
                            </div>
                        </div>
                    )}

                    {summary.largestHolding && (
                        <div className="flex items-center justify-between border-t pt-1 text-[11px] text-muted-foreground">
                            <span>Largest:</span>
                            <span>
                                <strong className="text-foreground">{summary.largestHolding.symbol}</strong> ({summary.largestHolding.allocationPercent.toFixed(1)}%)
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}