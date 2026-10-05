import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new (YahooFinance as any)();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        const results: any = await yahooFinance.search(query);
        const quotes = results.quotes || [];

        // Find the first valid equity/stock result
        const validQuote = quotes.find((q: any) => q.isYahooFinance === true && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'));

        if (validQuote && validQuote.symbol) {
            return NextResponse.json({ ticker: validQuote.symbol });
        }

        return NextResponse.json({ error: 'No ticker found for the given query' }, { status: 404 });
    } catch (e) {
        console.error('Error searching Yahoo Finance:', e);
        return NextResponse.json({ error: 'Internal server error while searching' }, { status: 500 });
    }
}
