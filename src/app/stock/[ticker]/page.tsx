import { fetchQuote, fetchHistoricalData, fetchFinancials, fetchProfile, fetchNews, resolveTicker } from "@/lib/api";
import { analyzeStock } from "@/lib/engine";
import ScoreBadge from "@/components/stock/ScoreBadge";
import StockHeaderActions from "@/components/portfolio/StockHeaderActions";
import StockChart from "@/components/stock/StockChart";
import FinancialTables from "@/components/stock/FinancialTables";
import Link from "next/link";
import { Search, AlertCircle, Swords } from "lucide-react";

export default async function StockDashboard({ params }: { params: Promise<{ ticker: string }> }) {
    const resolvedParams = await params;
    const rawTicker = (resolvedParams.ticker || "").trim();

    // 1. Resolve ticker (e.g. "apple" -> "AAPL")
    const resolvedTicker = await resolveTicker(rawTicker);

    // 2. Fetch quote for resolved ticker
    const quote = resolvedTicker ? await fetchQuote(resolvedTicker) : null;

    // 3. If no quote exists (e.g. "abcde" or invalid search), render "No such stock found"
    if (!quote || !quote.symbol) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-xl text-center">
                <div className="bg-card border rounded-2xl p-8 shadow-sm flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">No Such Stock Found</h1>
                    <p className="text-muted-foreground mb-6">
                        We couldn't find any stock matching &ldquo;<span className="font-semibold text-foreground">{rawTicker}</span>&rdquo;. Please check the ticker symbol or company name and try searching again.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 transition-colors shadow"
                    >
                        <Search className="mr-2 h-4 w-4" />
                        Search Another Stock
                    </Link>
                </div>
            </div>
        );
    }

    const ticker = quote.symbol;

    // Fetch all other data concurrently
    const [history, financials, profile, news] = await Promise.all([
        fetchHistoricalData(ticker, "1Y"),
        fetchFinancials(ticker),
        fetchProfile(ticker),
        fetchNews(ticker)
    ]);

    // Run the analysis engine
    const analysisResult = analyzeStock(quote, history, financials, profile, news);

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex flex-col gap-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-card border rounded-xl p-8 shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-lg shadow-sm border flex items-center justify-center p-2 overflow-hidden">
                            {profile.image ? (
                                <img src={profile.image} alt={`${ticker} logo`} className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className="font-bold text-xl text-muted-foreground">{ticker.slice(0, 3)}</span>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-extrabold tracking-tight">{ticker}</h1>
                                {rawTicker.toUpperCase() !== ticker && (
                                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                                        Matched: &ldquo;{rawTicker}&rdquo;
                                    </span>
                                )}
                            </div>
                            <p className="text-xl text-muted-foreground font-medium">{profile.companyName}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 bg-muted text-xs rounded-full font-medium">{profile.exchangeShortName}</span>
                                <span className="px-2 py-0.5 bg-muted text-xs rounded-full font-medium">{profile.sector}</span>
                                <Link
                                    href={`/compare?tickers=${ticker},${ticker === 'AAPL' ? 'MSFT' : ticker === 'NVDA' ? 'AMD' : ticker === 'KO' ? 'PEP' : 'AAPL'}`}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                                    title="Compare this stock side-by-side with industry peers"
                                >
                                    <Swords className="w-3 h-3" />
                                    <span>Compare with Peers</span>
                                </Link>
                                <StockHeaderActions
                                    symbol={ticker}
                                    companyName={profile.companyName}
                                    price={quote.price}
                                    sector={profile.sector}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto">
                        <h2 className="text-4xl font-extrabold">${quote.price.toFixed(2)}</h2>
                        <div className="flex items-center md:justify-end gap-2 mt-1">
                            <p className={`font-semibold text-lg ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changesPercentage.toFixed(2)}%)
                            </p>
                            <span className="text-sm text-muted-foreground">Today</span>
                        </div>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content Area (Chart + Financials) */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <div className="bg-card border rounded-xl p-6 shadow-sm">
                            <StockChart data={history} />
                        </div>

                        <div className="bg-card border rounded-xl p-6 shadow-sm">
                            <FinancialTables financials={financials} />
                        </div>
                    </div>

                    {/* Sidebar (Analysis Engine + Company Profile) */}
                    <div className="flex flex-col gap-8">

                        <div className="bg-card border rounded-xl p-6 shadow-sm">
                            <h3 className="text-xl font-bold mb-6">Engine Recommendation</h3>
                            <ScoreBadge result={analysisResult} />
                        </div>

                        <div className="bg-card border rounded-xl p-6 shadow-sm">
                            <h3 className="text-xl font-bold mb-4">About {profile.companyName}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                                {profile.description}
                            </p>
                            <div className="space-y-3">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-sm text-muted-foreground">CEO</span>
                                    <span className="text-sm font-medium">{profile.ceo}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Employees</span>
                                    <span className="text-sm font-medium">{parseInt(profile.fullTimeEmployees || "0").toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Market Cap</span>
                                    <span className="text-sm font-medium">
                                        ${(profile.mktCap / 1000000000).toFixed(2)}B
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
