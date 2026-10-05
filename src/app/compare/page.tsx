import StockCompareView from '@/components/compare/StockCompareView';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
    title: 'Side-by-Side Stock Comparison | StocKomp',
    description: 'Compare 2 to 4 stocks head-to-head on valuation multiples, profitability, balance sheet safety, and normalized performance returns.',
};

export default function ComparePage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <Suspense fallback={<div className="py-20 text-center">Loading comparison tool...</div>}>
                <StockCompareView />
            </Suspense>
        </div>
    );
}
