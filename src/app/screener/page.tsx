import FinvizScreener from '@/components/screener/FinvizScreener';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Stock Screener | StocKomp',
    description: 'Comprehensive Finviz-style stock screener with fundamental ratios, valuation, and technical analysis filters.',
};

export default function ScreenerPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <FinvizScreener />
        </div>
    );
}
