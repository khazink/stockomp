"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { HoldingValuation } from '@/types/portfolio';
import { ArrowUpDown, Edit2, Trash2, Swords, Briefcase, Plus, ExternalLink } from 'lucide-react';

interface HoldingsTableProps {
    valuations: HoldingValuation[];
    onEdit: (holding: HoldingValuation) => void;
    onDelete: (id: string) => void;
    onAddClick: () => void;
    onLoadSample: () => void;
}

type SortField = 'symbol' | 'shares' | 'buyPrice' | 'currentPrice' | 'marketValue' | 'costBasis' | 'unrealizedGainLossPercent' | 'dayGainLoss' | 'allocationPercent';

export default function HoldingsTable({ valuations, onEdit, onDelete, onAddClick, onLoadSample }: HoldingsTableProps) {
    const [sortField, setSortField] = useState<SortField>('marketValue');
    const [sortAsc, setSortAsc] = useState<boolean>(false);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    const sorted = [...valuations].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') {
            return sortAsc ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
        }
        return sortAsc ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });

    if (!valuations || valuations.length === 0) {
        return (
            <div className="bg-card border rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">Your Portfolio is Empty</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Track your actual shares, average cost basis, and live market performance against real-time quotes.
                </p>
                <div className="flex items-center gap-3 mt-6">
                    <button
                        onClick={onAddClick}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add First Holding</span>
                    </button>
                    <button
                        onClick={onLoadSample}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-background hover:bg-muted font-medium text-sm transition-colors"
                    >
                        <span>Load Sample Portfolio</span>
                    </button>
                </div>
            </div>
        );
    }

    const renderSortHeader = (label: string, field: SortField, align: 'left' | 'right' = 'right') => (
        <th
            onClick={() => handleSort(field)}
            className={'px-3 py-3 text-xs font-semibold cursor-pointer select-none transition-colors hover:text-foreground text-muted-foreground ' + (
                align === 'left' ? 'text-left' : 'text-right'
            )}
        >
            <div className={'inline-flex items-center gap-1 ' + (align === 'right' ? 'justify-end w-full' : '')}>
                <span>{label}</span>
                <ArrowUpDown className={'w-3 h-3 ' + (sortField === field ? 'text-primary' : 'opacity-40')} />
            </div>
        </th>
    );

    return (
        <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="border-b bg-muted/40 divide-x divide-border/30">
                            {renderSortHeader('Ticker & Company', 'symbol', 'left')}
                            {renderSortHeader('Shares', 'shares')}
                            {renderSortHeader('Avg Price', 'buyPrice')}
                            {renderSortHeader('Current Price', 'currentPrice')}
                            {renderSortHeader('Market Value', 'marketValue')}
                            {renderSortHeader('Cost Basis', 'costBasis')}
                            {renderSortHeader('Total Return', 'unrealizedGainLossPercent')}
                            {renderSortHeader("Day's Gain/Loss", 'dayGainLoss')}
                            {renderSortHeader('Alloc %', 'allocationPercent')}
                            <th className="px-3 py-3 text-xs font-semibold text-center text-muted-foreground w-24">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {sorted.map(v => {
                            const isPositiveTotal = v.unrealizedGainLoss >= 0;
                            const isPositiveDay = v.dayGainLoss >= 0;

                            return (
                                <tr
                                    key={v.id || v.symbol}
                                    className="hover:bg-muted/40 transition-colors group divide-x divide-border/20"
                                >
                                    {/* Symbol & Company */}
                                    <td className="px-3 py-2.5 font-sans">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={'/stock/' + v.symbol}
                                                className="font-bold text-sm text-primary hover:underline"
                                            >
                                                {v.symbol}
                                            </Link>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                                {v.sector}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground truncate max-w-[150px]" title={v.companyName}>
                                            {v.companyName}
                                        </div>
                                    </td>

                                    {/* Shares */}
                                    <td className="px-3 py-2.5 text-right font-mono font-medium">
                                        {v.shares.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                                    </td>

                                    {/* Avg Buy Price */}
                                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                                        {'$' + v.buyPrice.toFixed(2)}
                                    </td>

                                    {/* Current Price */}
                                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">
                                        {'$' + v.currentPrice.toFixed(2)}
                                    </td>

                                    {/* Market Value */}
                                    <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                                        {'$' + v.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    {/* Cost Basis */}
                                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                                        {'$' + v.costBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    {/* Total Return */}
                                    <td className="px-3 py-2.5 text-right">
                                        <div className={'font-mono font-bold ' + (isPositiveTotal ? 'text-emerald-500' : 'text-red-500')}>
                                            {(isPositiveTotal ? '+' : '') + '$' + Math.abs(v.unrealizedGainLoss).toFixed(2)}
                                        </div>
                                        <div className={'text-[11px] font-mono font-semibold ' + (isPositiveTotal ? 'text-emerald-500' : 'text-red-500')}>
                                            {(isPositiveTotal ? '+' : '') + v.unrealizedGainLossPercent.toFixed(2) + '%'}
                                        </div>
                                    </td>

                                    {/* Day's Gain/Loss */}
                                    <td className="px-3 py-2.5 text-right">
                                        <div className={'font-mono font-semibold ' + (isPositiveDay ? 'text-emerald-500' : 'text-red-500')}>
                                            {(isPositiveDay ? '+' : '') + '$' + Math.abs(v.dayGainLoss).toFixed(2)}
                                        </div>
                                        <div className={'text-[10px] font-mono ' + (isPositiveDay ? 'text-emerald-500' : 'text-red-500')}>
                                            {(isPositiveDay ? '+' : '') + v.changePercent.toFixed(2) + '%'}
                                        </div>
                                    </td>

                                    {/* Allocation % */}
                                    <td className="px-3 py-2.5 text-right">
                                        <div className="font-mono font-semibold text-foreground">
                                            {v.allocationPercent.toFixed(1) + '%'}
                                        </div>
                                        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden ml-auto mt-1">
                                            <div
                                                className="h-full bg-primary rounded-full"
                                                style={{ width: Math.min(100, Math.max(0, v.allocationPercent)) + '%' }}
                                            />
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-2.5 text-center">
                                        <div className="inline-flex items-center gap-1">
                                            <button
                                                onClick={() => onEdit(v)}
                                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                title="Edit holding"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <Link
                                                href={'/compare?tickers=' + v.symbol + ',AAPL'}
                                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors"
                                                title="Compare this holding"
                                            >
                                                <Swords className="w-3.5 h-3.5" />
                                            </Link>
                                            <button
                                                onClick={() => onDelete(v.id)}
                                                className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                                title="Delete holding"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}