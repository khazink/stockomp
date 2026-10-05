import React, { Suspense } from 'react';
import PortfolioView from '@/components/portfolio/PortfolioView';
import { Loader2 } from 'lucide-react';

export const metadata = {
    title: 'Custom Watchlists & Portfolio Tracker | StocKomp',
    description: 'Track your personal stock portfolio, cost basis, unrealized gain/loss, asset allocation, and starred watchlists in real-time.',
};

export default function PortfolioPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Loading Portfolio & Watchlist...</p>
                </div>
            }
        >
            <PortfolioView />
        </Suspense>
    );
}