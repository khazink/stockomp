"use client";

import Link from 'next/link';
import { Search, SlidersHorizontal, LayoutGrid, Swords, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Header() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;
        router.push(`/stock/${encodeURIComponent(query)}`);
    };

    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
            <div className="container flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <Link href="/" className="font-bold flex items-center space-x-2 text-lg">
                        <span>StocKomp</span>
                    </Link>
                    <nav className="flex items-center space-x-4">
                        <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
                            Home
                        </Link>
                        <Link
                            href="/screener"
                            className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Screener</span>
                        </Link>
                        <Link
                            href="/map"
                            className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5"
                        >
                            <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Heatmap</span>
                        </Link>
                        <Link
                            href="/compare"
                            className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5"
                        >
                            <Swords className="w-3.5 h-3.5 text-amber-500" />
                            <span>Compare</span>
                        </Link>
                        <Link
                            href="/portfolio"
                            className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5"
                        >
                            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                            <span>Portfolio</span>
                        </Link>
                    </nav>
                </div>

                <div className="flex-1 max-w-md mx-4 flex">
                    <form onSubmit={handleSearch} className="relative w-full">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
                            placeholder="Search ticker or company (e.g. AAPL, Apple)..."
                        />
                    </form>
                </div>
            </div>
        </header>
    );
}
