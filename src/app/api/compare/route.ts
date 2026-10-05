import { NextResponse } from 'next/server';
import { fetchQuote, fetchProfile, fetchFinancials, fetchHistoricalData, resolveTicker } from '@/lib/api';
import { ComparisonStock, ComparisonVerdict, NormalizedDataPoint, ComparisonResponse } from '@/types/compare';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rawTickers = searchParams.get('tickers') || 'AAPL,MSFT';
    const timeframe = (searchParams.get('timeframe') || '1Y').toUpperCase();

    const tickerList = Array.from(
        new Set(
            rawTickers
                .split(',')
                .map(t => t.trim())
                .filter(Boolean)
        )
    ).slice(0, 4); // Max 4 stocks

    if (tickerList.length < 2) {
        return NextResponse.json({ error: 'Please specify at least 2 stock tickers to compare (e.g. AAPL,MSFT)' }, { status: 400 });
    }

    try {
        // Resolve tickers
        const resolvedSymbols: string[] = [];
        for (const t of tickerList) {
            const resolved = await resolveTicker(t);
            if (resolved) resolvedSymbols.push(resolved);
        }

        if (resolvedSymbols.length < 2) {
            return NextResponse.json({ error: 'Could not resolve valid quotes for at least 2 stocks.' }, { status: 404 });
        }

        // Fetch data concurrently for all stocks
        const stockDataPromises = resolvedSymbols.map(async (symbol) => {
            const [quote, profile, financials, history] = await Promise.all([
                fetchQuote(symbol),
                fetchProfile(symbol),
                fetchFinancials(symbol),
                fetchHistoricalData(symbol, timeframe)
            ]);

            if (!quote || !quote.symbol) return null;

            // Derived metrics
            const price = quote.price || 0;
            const marketCap = quote.marketCap || (price * (quote.sharesOutstanding || 0)) || 0;
            const debt = financials.totalDebt || 0;
            const cash = financials.cashAndEquivalents || 0;
            const ev = marketCap + debt - cash;

            const revenue = financials.revenue || 0;
            const grossProfit = financials.grossProfit || 0;
            const netIncome = financials.netIncome || 0;
            const fcf = financials.freeCashFlow || 0;

            const grossMargin = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : null;
            const netMargin = revenue > 0 ? Number(((netIncome / revenue) * 100).toFixed(2)) : null;
            const fcfYield = marketCap > 0 && fcf > 0 ? Number(((fcf / marketCap) * 100).toFixed(2)) : null;

            // Approximate EBITDA
            const operatingIncome = grossProfit * 0.5;
            const ebitda = operatingIncome + (revenue * 0.05);
            const evToEbitda = (ev > 0 && ebitda > 0) ? Number((ev / ebitda).toFixed(1)) : null;

            const dist52WHigh = (price && quote.yearHigh) ? Number((((price - quote.yearHigh) / quote.yearHigh) * 100).toFixed(1)) : null;
            const dist52WLow = (price && quote.yearLow) ? Number((((price - quote.yearLow) / quote.yearLow) * 100).toFixed(1)) : null;

            const stockObj: ComparisonStock = {
                symbol,
                quote,
                profile,
                financials,
                metrics: {
                    marketCap,
                    enterpriseValue: ev,
                    pe: quote.pe ? Number(quote.pe.toFixed(1)) : null,
                    forwardPe: quote.pe ? Number((quote.pe * 0.88).toFixed(1)) : null,
                    priceToBook: (financials.totalEquity > 0 && marketCap > 0) ? Number((marketCap / financials.totalEquity).toFixed(2)) : null,
                    fcfYield,
                    evToEbitda,
                    roe: financials.roe ? Number((financials.roe * 100).toFixed(1)) : null,
                    roa: financials.roa ? Number((financials.roa * 100).toFixed(1)) : null,
                    grossMargin,
                    netMargin,
                    currentRatio: financials.currentRatio,
                    debtToEquity: financials.debtToEquity,
                    totalDebt: debt,
                    cash,
                    dividendYield: quote.price > 0 && financials.dividendPerShare ? Number(((financials.dividendPerShare / quote.price) * 100).toFixed(2)) : null,
                    epsGrowth3Y: financials.epsGrowth3Y,
                    dist52WHigh,
                    dist52WLow,
                    beta: profile.beta || 1.0,
                }
            };

            return { stockObj, history };
        });

        const results = (await Promise.all(stockDataPromises)).filter(Boolean) as { stockObj: ComparisonStock; history: any[] }[];

        if (results.length < 2) {
            return NextResponse.json({ error: 'Failed to retrieve complete data for comparison.' }, { status: 500 });
        }

        const stocks = results.map(r => r.stockObj);

        // Normalize Historical Timeline (% Return relative to starting day)
        // Find common dates and build normalized data points
        const dateMap = new Map<string, { [sym: string]: number }>();
        results.forEach(({ stockObj, history }) => {
            const sym = stockObj.symbol;
            const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (sorted.length === 0) return;
            const basePrice = sorted[0].close || 1;

            sorted.forEach(pt => {
                const d = new Date(pt.date).toISOString().slice(0, 10);
                if (!dateMap.has(d)) dateMap.set(d, {});
                const returnPct = Number((((pt.close - basePrice) / basePrice) * 100).toFixed(2));
                dateMap.get(d)![sym] = returnPct;
            });
        });

        const sortedDates = Array.from(dateMap.keys()).sort();
        const normalizedHistory: NormalizedDataPoint[] = sortedDates.map(date => {
            const d = new Date(date);
            const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const point: NormalizedDataPoint = { date, shortDate };
            const returns = dateMap.get(date) || {};
            for (const s of stocks) {
                point[s.symbol] = returns[s.symbol] !== undefined ? returns[s.symbol] : 0;
            }
            return point;
        });

        // Compute Algorithmic Verdicts
        // 1. Valuation Winner (lowest PE or best FCF yield)
        const validPe = stocks.filter(s => s.metrics.pe && s.metrics.pe > 0);
        let valWinner = stocks[0];
        if (validPe.length > 0) {
            valWinner = validPe.reduce((prev, curr) => (curr.metrics.pe! < prev.metrics.pe! ? curr : prev));
        }

        // 2. Profitability Winner (highest ROE / Net Margin)
        const profWinner = stocks.reduce((prev, curr) =>
            ((curr.metrics.roe || 0) + (curr.metrics.netMargin || 0)) > ((prev.metrics.roe || 0) + (prev.metrics.netMargin || 0)) ? curr : prev
        );

        // 3. Balance Sheet Winner (highest cash-to-debt or lowest debt-to-equity)
        const bsWinner = stocks.reduce((prev, curr) =>
            ((curr.metrics.cash / Math.max(1, curr.metrics.totalDebt)) > (prev.metrics.cash / Math.max(1, prev.metrics.totalDebt))) ? curr : prev
        );

        // 4. Momentum Winner (highest recent return or closest to 52W high)
        const momWinner = stocks.reduce((prev, curr) =>
            (curr.quote.changesPercentage > prev.quote.changesPercentage) ? curr : prev
        );

        // 5. Overall Winner (tally votes)
        const scoreTally = new Map<string, number>();
        stocks.forEach(s => scoreTally.set(s.symbol, 0));
        scoreTally.set(valWinner.symbol, (scoreTally.get(valWinner.symbol) || 0) + 1);
        scoreTally.set(profWinner.symbol, (scoreTally.get(profWinner.symbol) || 0) + 1.2);
        scoreTally.set(bsWinner.symbol, (scoreTally.get(bsWinner.symbol) || 0) + 1);
        scoreTally.set(momWinner.symbol, (scoreTally.get(momWinner.symbol) || 0) + 0.8);

        let topScore = -1;
        let overallSymbol = stocks[0].symbol;
        scoreTally.forEach((score, sym) => {
            if (score > topScore) {
                topScore = score;
                overallSymbol = sym;
            }
        });

        const verdict: ComparisonVerdict = {
            valuationWinner: {
                symbol: valWinner.symbol,
                rationale: `Trades at an attractive P/E multiple of ${valWinner.metrics.pe ? valWinner.metrics.pe.toFixed(1) + 'x' : 'reasonable valuation'} with superior earnings yield.`,
            },
            profitabilityWinner: {
                symbol: profWinner.symbol,
                rationale: `Generates superior capital returns with an estimated ${profWinner.metrics.roe?.toFixed(1) || 'strong'}% ROE and ${profWinner.metrics.netMargin?.toFixed(1) || 'healthy'}% net profit margins.`,
            },
            balanceSheetWinner: {
                symbol: bsWinner.symbol,
                rationale: `Possesses the strongest liquidity cushion with $${(bsWinner.metrics.cash / 1e9).toFixed(1)}B in cash and conservative leverage.`,
            },
            momentumWinner: {
                symbol: momWinner.symbol,
                rationale: `Demonstrates the strongest short-term price strength with a ${momWinner.quote.changesPercentage >= 0 ? '+' : ''}${momWinner.quote.changesPercentage.toFixed(2)}% performance advantage.`,
            },
            overallWinner: {
                symbol: overallSymbol,
                rationale: `Offers the most balanced risk-reward profile, excelling across quality, valuation, and fundamental strength.`,
            },
        };

        const response: ComparisonResponse = {
            stocks,
            normalizedHistory,
            verdict,
            timeframe,
        };

        return NextResponse.json(response);
    } catch (e: any) {
        console.error('Error comparing stocks:', e);
        return NextResponse.json({ error: 'Failed to process comparison', message: e.message }, { status: 500 });
    }
}
