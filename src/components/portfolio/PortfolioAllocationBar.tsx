"use client";

import React from 'react';
import Link from 'next/link';
import { PieChart } from 'lucide-react';
import { HoldingValuation } from '@/types/portfolio';

interface PortfolioAllocationBarProps {
    valuations: HoldingValuation[];
}

const PALETTE = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // purple-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#6366f1', // indigo-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
    '#84cc16', // lime-500
];

export default function PortfolioAllocationBar({ valuations }: PortfolioAllocationBarProps) {
    if (!valuations || valuations.length === 0) return null;

    return (
        <div className="bg-card border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Asset Allocation</span>
                </div>
                <span className="text-xs text-muted-foreground">
                    {valuations.length} {valuations.length === 1 ? 'Position' : 'Positions'}
                </span>
            </div>

            {/* Segmented Stacked Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted/50 p-0.5 border">
                {valuations.map((v, i) => {
                    const color = PALETTE[i % PALETTE.length];
                    if (v.allocationPercent <= 0) return null;
                    return (
                        <div
                            key={v.id || v.symbol}
                            style={{
                                width: Math.max(v.allocationPercent, 1) + '%',
                                backgroundColor: color,
                            }}
                            className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 hover:opacity-80"
                            title={v.symbol + ': ' + v.allocationPercent.toFixed(1) + '% ($' + v.marketValue.toFixed(2) + ')'}
                        />
                    );
                })}
            </div>

            {/* Position Pills */}
            <div className="flex items-center gap-3 flex-wrap mt-3 text-xs">
                {valuations.slice(0, 8).map((v, i) => {
                    const color = PALETTE[i % PALETTE.length];
                    return (
                        <Link
                            key={v.id || v.symbol}
                            href={'/stock/' + v.symbol}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 hover:bg-muted transition-colors border text-[11px]"
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                            />
                            <span className="font-bold text-foreground">{v.symbol}</span>
                            <span className="text-muted-foreground font-mono">{v.allocationPercent.toFixed(1)}%</span>
                        </Link>
                    );
                })}
                {valuations.length > 8 && (
                    <span className="text-[11px] text-muted-foreground font-medium">
                        +{valuations.length - 8} more
                    </span>
                )}
            </div>
        </div>
    );
}