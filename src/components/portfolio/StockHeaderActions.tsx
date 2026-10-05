"use client";

import React, { useState, useEffect } from 'react';
import { Star, Plus, Check } from 'lucide-react';
import { isWatchlisted, toggleWatchlist, addHolding, WATCHLIST_EVENT } from '@/lib/portfolioStorage';
import AddHoldingModal from './AddHoldingModal';

interface StockHeaderActionsProps {
    symbol: string;
    companyName: string;
    price: number;
    sector?: string;
}

export default function StockHeaderActions({ symbol, companyName, price, sector }: StockHeaderActionsProps) {
    const [starred, setStarred] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        setStarred(isWatchlisted(symbol));

        const handleWatchlistChange = () => {
            setStarred(isWatchlisted(symbol));
        };
        window.addEventListener(WATCHLIST_EVENT, handleWatchlistChange);
        return () => window.removeEventListener(WATCHLIST_EVENT, handleWatchlistChange);
    }, [symbol]);

    const handleToggleWatchlist = () => {
        const nowStarred = toggleWatchlist({ symbol, name: companyName, sector });
        setStarred(nowStarred);
    };

    const handleSaveHolding = (holding: {
        symbol: string;
        companyName: string;
        shares: number;
        buyPrice: number;
        buyDate: string;
        notes?: string;
    }) => {
        addHolding(holding);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    return (
        <div className="flex items-center gap-2">
            {/* Watchlist Star Button */}
            <button
                onClick={handleToggleWatchlist}
                className={'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ' + (
                    starred
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                )}
                title={starred ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
                <Star className={'w-3.5 h-3.5 ' + (starred ? 'fill-amber-500 text-amber-500' : '')} />
                <span>{starred ? 'In Watchlist' : 'Add to Watchlist'}</span>
            </button>

            {/* Add to Portfolio Button */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                title="Record holding in portfolio"
            >
                {showSuccessToast ? (
                    <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Holding Saved!</span>
                    </>
                ) : (
                    <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Portfolio</span>
                    </>
                )}
            </button>

            {/* Holding Modal */}
            <AddHoldingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveHolding}
                initialData={{
                    symbol,
                    companyName,
                    buyPrice: price,
                    shares: 10,
                }}
            />
        </div>
    );
}