"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, SlidersHorizontal, LayoutGrid, Swords, Sparkles, Briefcase } from 'lucide-react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;

    setLoading(true);
    router.push(`/stock/${encodeURIComponent(clean)}`);
  };

  const handleQuickSearch = (symbol: string) => {
    setLoading(true);
    router.push(`/stock/${symbol}`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <main className="flex flex-col items-center justify-center text-center max-w-2xl w-full">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Algorithmic Stock Intelligence</span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight mb-6">
          Analyze Any Stock. <span className="text-primary">Instantly.</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Enter a ticker or company name to get a definitive Buy, Hold, or Sell recommendation powered by fundamental metrics, valuation models, and technical charts.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-xl relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Search className="h-6 w-6" />}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex h-16 w-full rounded-full border-2 border-input bg-background px-4 py-2 text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 pl-14 pr-32 shadow-sm transition-all"
            placeholder="Search by ticker or name (e.g. AAPL, Apple, TSLA)..."
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 bottom-2 px-6 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? "Searching..." : "Analyze"}
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
          <span>Popular:</span>
          {["AAPL", "TSLA", "NVDA", "MSFT", "AMZN"].map((symbol) => (
            <button
              key={symbol}
              onClick={() => handleQuickSearch(symbol)}
              className="font-medium hover:text-foreground transition-colors underline decoration-dotted"
            >
              {symbol}
            </button>
          ))}
        </div>

        {/* Feature Hub Buttons */}
        <div className="mt-10 pt-8 border-t w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs sm:text-sm font-semibold transition-all shadow-xs group"
          >
            <LayoutGrid className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform duration-200" />
            <span>S&P 500 Heatmap</span>
          </Link>
          <Link
            href="/screener"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted text-xs sm:text-sm font-semibold transition-all shadow-xs group"
          >
            <SlidersHorizontal className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-200" />
            <span>Finviz Screener</span>
          </Link>
          <Link
            href="/compare?tickers=NVDA,AMD"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs sm:text-sm font-semibold transition-all shadow-xs group"
          >
            <Swords className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform duration-200" />
            <span>Side-by-Side Compare</span>
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs sm:text-sm font-semibold transition-all shadow-xs group"
          >
            <Briefcase className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform duration-200" />
            <span>Portfolio & Watchlist</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
