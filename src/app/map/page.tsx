import MarketHeatmap from '@/components/heatmap/MarketHeatmap';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'S&P 500 Market Heatmap | StocKomp',
    description: 'Interactive Finviz-style treemap heatmap for all 503 S&P 500 constituents color-coded by daily performance.',
};

export default function HeatmapPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <MarketHeatmap />
        </div>
    );
}
