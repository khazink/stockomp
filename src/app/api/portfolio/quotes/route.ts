import { NextResponse } from 'next/server';
import { getStocksBySymbols } from '@/lib/db';
import { fetchQuote, fetchProfile } from '@/lib/api';
import { LiveQuoteItem } from '@/types/portfolio';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rawSymbols = searchParams.get('symbols') || '';

    const symbolList = Array.from(
        new Set(
            rawSymbols
                .split(',')
                .map(s => s.trim().toUpperCase())
                .filter(Boolean)
        )
    ).slice(0, 50); // limit to 50 symbols per batch

    if (symbolList.length === 0) {
        return NextResponse.json({ quotes: [], bySymbol: {} });
    }

    try {
        // 1. Fetch from SQLite cached stocks
        const dbStocks = getStocksBySymbols(symbolList);
        const quotes: LiveQuoteItem[] = [];
        const foundSet = new Set<string>();

        for (const s of dbStocks) {
            const sym = s.symbol.toUpperCase();
            foundSet.add(sym);
            quotes.push({
                symbol: sym,
                companyName: s.companyName,
                sector: s.sector || 'Equities',
                price: s.price,
                change: s.change,
                changePercent: s.changePercent,
                marketCap: s.marketCap,
                pe: s.pe,
                fiftyTwoWeekHigh: s.fiftyTwoWeekHigh ?? s.price ?? 0,
                fiftyTwoWeekLow: s.fiftyTwoWeekLow ?? s.price ?? 0,
                volume: s.volume,
            });
        }

        // 2. For missing symbols, query live Yahoo Finance
        const missingSymbols = symbolList.filter(s => !foundSet.has(s));
        if (missingSymbols.length > 0) {
            const liveFetches = missingSymbols.map(async (sym) => {
                try {
                    const [q, p] = await Promise.all([
                        fetchQuote(sym),
                        fetchProfile(sym)
                    ]);
                    if (q && q.symbol) {
                        return {
                            symbol: q.symbol.toUpperCase(),
                            companyName: p?.companyName || q.name || q.symbol,
                            sector: p?.sector || 'Equities',
                            price: q.price || 0,
                            change: q.change || 0,
                            changePercent: q.changesPercentage || 0,
                            marketCap: q.marketCap || 0,
                            pe: null,
                            fiftyTwoWeekHigh: q.yearHigh || 0,
                            fiftyTwoWeekLow: q.yearLow || 0,
                            volume: q.volume || 0,
                        } as LiveQuoteItem;
                    }
                } catch (e) {
                    console.error(`Failed live quote fallback for ${sym}:`, e);
                }
                return null;
            });

            const liveResults = await Promise.all(liveFetches);
            for (const item of liveResults) {
                if (item) {
                    quotes.push(item);
                }
            }
        }

        const bySymbol: Record<string, LiveQuoteItem> = {};
        for (const q of quotes) {
            bySymbol[q.symbol] = q;
        }

        return NextResponse.json({
            quotes,
            bySymbol,
            count: quotes.length,
            cachedCount: dbStocks.length,
            liveCount: quotes.length - dbStocks.length,
        });
    } catch (err: any) {
        console.error('Portfolio quotes route error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch quotes' }, { status: 500 });
    }
}
