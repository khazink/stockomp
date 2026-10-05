import YahooFinance from 'yahoo-finance2';
const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });

import { Quote, HistoricalData, Financials, Profile, NewsArticle } from '../types/stock';

export async function resolveTicker(query: string): Promise<string | null> {
    const clean = (query || "").trim();
    if (!clean) return null;

    // 1. Try direct quote first (handles standard tickers like AAPL, TSLA, MSFT)
    try {
        const q: any = await yahooFinance.quote(clean.toUpperCase());
        if (q && q.symbol && (q.regularMarketPrice !== undefined || q.shortName)) {
            return q.symbol;
        }
    } catch (e) {}

    // 2. Try search (handles company names like "apple", "microsoft", "tesla")
    try {
        const searchRes: any = await yahooFinance.search(clean);
        const quotes = searchRes?.quotes || [];
        const validQuote = quotes.find((x: any) => 
            x && x.symbol && (x.quoteType === 'EQUITY' || x.quoteType === 'ETF')
        ) || quotes.find((x: any) => x && x.symbol);

        if (validQuote && validQuote.symbol) {
            return validQuote.symbol;
        }
    } catch (e) {
        console.error("Error resolving ticker for " + query + ":", e);
    }

    return clean.toUpperCase();
}

export async function fetchQuote(ticker: string): Promise<Quote | null> {
    try {
        const q: any = await yahooFinance.quote(ticker);

        if (!q || !q.symbol || (q.regularMarketPrice === undefined && !q.shortName && !q.longName)) {
            return null;
        }

        return {
            symbol: q.symbol,
            name: q.shortName || q.longName || q.symbol,
            price: q.regularMarketPrice || q.currentPrice || 0,
            changesPercentage: q.regularMarketChangePercent || 0,
            change: q.regularMarketChange || 0,
            dayLow: q.regularMarketDayLow || 0,
            dayHigh: q.regularMarketDayHigh || 0,
            yearHigh: q.fiftyTwoWeekHigh || 0,
            yearLow: q.fiftyTwoWeekLow || 0,
            marketCap: q.marketCap || 0,
            priceAvg50: q.fiftyDayAverage || 0,
            priceAvg200: q.twoHundredDayAverage || 0,
            volume: q.regularMarketVolume || 0,
            avgVolume: q.averageDailyVolume3Month || 0,
            exchange: q.fullExchangeName || q.exchange || "Unknown",
            open: q.regularMarketOpen || 0,
            previousClose: q.regularMarketPreviousClose || 0,
            eps: q.epsTrailingTwelveMonths || 0,
            pe: q.trailingPE || 0,
            earningsAnnouncement: q.earningsTimestamp ? new Date(q.earningsTimestamp.getTime ? q.earningsTimestamp.getTime() : q.earningsTimestamp * 1000).toISOString() : "",
            sharesOutstanding: q.sharesOutstanding || 0,
            timestamp: q.regularMarketTime ? (q.regularMarketTime.getTime ? q.regularMarketTime.getTime() / 1000 : q.regularMarketTime) : Date.now() / 1000,
        };
    } catch (e) {
        console.error("Error fetching quote for " + ticker + ":", e);
        return null;
    }
}

export async function fetchHistoricalData(ticker: string, timeframe: string = "1Y"): Promise<HistoricalData[]> {
    try {
        const now = new Date();
        const period1 = new Date();

        if (timeframe === "1D" || timeframe === "1W" || timeframe === "1M") {
            period1.setMonth(period1.getMonth() - 1);
        } else if (timeframe === "5Y") {
            period1.setFullYear(period1.getFullYear() - 5);
        } else {
            period1.setFullYear(period1.getFullYear() - 1);
        }

        const queryOptions: any = {
            period1,
            period2: now,
            interval: "1d"
        };

        const results: any = await yahooFinance.historical(ticker, queryOptions);

        return (results || []).map((r: any) => ({
            date: r.date instanceof Date ? r.date.toISOString() : new Date(r.date).toISOString(),
            open: r.open || r.close || 0,
            high: r.high || r.close || 0,
            low: r.low || r.close || 0,
            close: r.close || 0,
            volume: r.volume || 0,
        }));
    } catch (e) {
        console.error("Error fetching historical data for " + ticker + ":", e);
        return [];
    }
}

export async function fetchFinancials(ticker: string): Promise<Financials> {
    try {
        const summary: any = await yahooFinance.quoteSummary(ticker, {
            modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail']
        }).catch(() => ({}));

        const fd = summary.financialData || {};
        const stats = summary.defaultKeyStatistics || {};
        const sd = summary.summaryDetail || {};

        const totalDebt = fd.totalDebt || 0;
        const cashAndEquivalents = fd.totalCash || 0;

        let totalEquity = 0;
        if (stats.bookValue && stats.sharesOutstanding) {
            totalEquity = stats.bookValue * stats.sharesOutstanding;
        } else if (fd.debtToEquity && fd.debtToEquity > 0 && totalDebt > 0) {
            totalEquity = totalDebt / (fd.debtToEquity / 100);
        }

        const totalLiabilities = Math.max(totalDebt, totalDebt > 0 ? totalDebt * 1.3 : cashAndEquivalents * 0.8);
        const totalAssets = totalEquity > 0 ? totalEquity + totalLiabilities : totalDebt + cashAndEquivalents;

        const revenue = fd.totalRevenue || 0;
        const grossProfit = fd.grossProfits || (revenue * (fd.grossMargins || 0.35)) || 0;
        const netIncome = stats.netIncomeToCommon || (revenue * (fd.profitMargins || 0.1)) || 0;
        const eps = stats.trailingEps || 0;
        const dividendPerShare = sd.dividendRate || sd.trailingAnnualDividendRate || 0;

        const operatingCashFlow = fd.operatingCashflow || (netIncome > 0 ? netIncome * 1.2 : 0);
        const freeCashFlow = fd.freeCashflow || (operatingCashFlow * 0.7) || 0;
        const capitalExpenditure = operatingCashFlow > freeCashFlow ? operatingCashFlow - freeCashFlow : 0;

        const currentRatio = fd.currentRatio || 1.5;
        const debtToEquity = fd.debtToEquity !== undefined ? (fd.debtToEquity > 1 ? fd.debtToEquity / 100 : fd.debtToEquity) : (totalEquity > 0 ? totalDebt / totalEquity : 0);
        const roe = fd.returnOnEquity !== undefined ? fd.returnOnEquity : (totalEquity > 0 ? netIncome / totalEquity : 0);
        const roa = fd.returnOnAssets !== undefined ? fd.returnOnAssets : (totalAssets > 0 ? netIncome / totalAssets : 0);
        const epsGrowth3Y = stats.earningsQuarterlyGrowth !== undefined ? stats.earningsQuarterlyGrowth * 100 : 5.0;

        return {
            symbol: ticker,
            revenue,
            grossProfit,
            netIncome,
            eps,
            epsDiluted: eps,
            dividendPerShare,
            totalAssets,
            totalLiabilities,
            totalEquity,
            totalDebt,
            cashAndEquivalents,
            operatingCashFlow,
            freeCashFlow,
            capitalExpenditure,
            currentRatio: Number(currentRatio.toFixed(2)),
            debtToEquity: Number(debtToEquity.toFixed(2)),
            roe: Number(roe.toFixed(4)),
            roa: Number(roa.toFixed(4)),
            epsGrowth3Y: Number(epsGrowth3Y.toFixed(2)),
        };
    } catch (e) {
        console.error("Error fetching financials for " + ticker + ":", e);
        return {
            symbol: ticker,
            revenue: 0, grossProfit: 0, netIncome: 0, eps: 0, epsDiluted: 0, dividendPerShare: 0,
            totalAssets: 0, totalLiabilities: 0, totalEquity: 0, totalDebt: 0, cashAndEquivalents: 0,
            operatingCashFlow: 0, freeCashFlow: 0, capitalExpenditure: 0,
            currentRatio: 1, debtToEquity: 0, roe: 0, roa: 0, epsGrowth3Y: 0,
        };
    }
}

export async function fetchProfile(ticker: string): Promise<Profile> {
    try {
        const result: any = await yahooFinance.quoteSummary(ticker, {
            modules: ['assetProfile', 'summaryProfile', 'price']
        });

        const profileInfo = result.assetProfile || result.summaryProfile || {};
        const priceInfo = result.price || {};
        const companyName = priceInfo.shortName || priceInfo.longName || ticker;
        const website = profileInfo.website || "";
        const cleanDomain = website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

        return {
            symbol: priceInfo.symbol || ticker,
            price: priceInfo.regularMarketPrice || 0,
            beta: profileInfo.beta || 1.0,
            volAvg: priceInfo.averageDailyVolume3Month || 0,
            mktCap: priceInfo.marketCap || 0,
            lastDiv: 0,
            range: (priceInfo.regularMarketDayLow || 0) + " - " + (priceInfo.regularMarketDayHigh || 0),
            changes: priceInfo.regularMarketChange || 0,
            companyName,
            currency: priceInfo.currency || "USD",
            cik: "", isin: "", cusip: "",
            exchange: priceInfo.exchangeName || "Unknown",
            exchangeShortName: priceInfo.exchange || "Unknown",
            industry: profileInfo.industry || "Unknown",
            website,
            description: profileInfo.longBusinessSummary || "No description available.",
            ceo: profileInfo.companyOfficers?.[0]?.name || "N/A",
            sector: profileInfo.sector || "Unknown",
            country: profileInfo.country || "Unknown",
            fullTimeEmployees: profileInfo.fullTimeEmployees ? profileInfo.fullTimeEmployees.toString() : "0",
            phone: profileInfo.phone || "N/A",
            address: profileInfo.address1 || "N/A",
            city: profileInfo.city || "N/A",
            state: profileInfo.state || "N/A",
            zip: profileInfo.zip || "N/A",
            dcfDiff: 0,
            dcf: (priceInfo.regularMarketPrice || 0) * 1.05,
            image: cleanDomain ? "https://logo.clearbit.com/" + cleanDomain : ""
        };
    } catch (e) {
        console.error("Error fetching profile for " + ticker + ":", e);
        return {
            symbol: ticker, price: 0, beta: 0, volAvg: 0, mktCap: 0, lastDiv: 0, range: "", changes: 0,
            companyName: ticker, currency: "USD", cik: "", isin: "", cusip: "", exchange: "", exchangeShortName: "",
            industry: "", website: "", description: "Information currently unavailable.", ceo: "",
            sector: "", country: "", fullTimeEmployees: "", phone: "", address: "", city: "", state: "", zip: "",
            dcfDiff: 0, dcf: 0, image: ""
        };
    }
}

export async function fetchNews(ticker: string): Promise<NewsArticle[]> {
    try {
        const results: any = await yahooFinance.search(ticker, { newsCount: 4 });
        const news = results.news || [];

        return news.map((n: any) => ({
            symbol: ticker,
            publishedDate: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
            title: n.title || "",
            image: n.thumbnail?.resolutions?.[0]?.url || "https://via.placeholder.com/150",
            site: n.publisher || "Yahoo Finance",
            text: n.title,
            url: n.link,
            sentiment: "Neutral"
        }));
    } catch (e) {
        console.error("Error fetching news for " + ticker + ":", e);
        return [];
    }
}
