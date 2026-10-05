import { Quote, HistoricalData, Financials, Profile, NewsArticle } from '../types/stock';

export interface ScoreResult {
    totalScore: number;
    rating: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";
    signals: string[];
}

// Weights
const FUNDAMENTAL_WEIGHT = 40;
const TECHNICAL_WEIGHT = 40;
const SENTIMENT_WEIGHT = 20;

export function analyzeStock(
    quote: Quote,
    history: HistoricalData[],
    financials: Financials,
    profile: Profile,
    news: NewsArticle[]
): ScoreResult {

    let fundamentalScore = 0;
    let technicalScore = 0;
    let sentimentScore = 0;
    const signals: string[] = [];

    // --- 1. FUNDAMENTAL ANALYSIS (Max 40 points) ---
    // A. DCF Valuation (15 points)
    if (profile.dcf > quote.price) {
        const margin = ((profile.dcf - quote.price) / quote.price) * 100;
        if (margin > 20) {
            fundamentalScore += 15;
            signals.push(`Strong Value: Trading ${margin.toFixed(0)}% below intrinsic DCF valuation.`);
        } else {
            fundamentalScore += 10;
            signals.push(`Fair Value: Trading slightly below intrinsic DCF valuation.`);
        }
    } else {
        signals.push(`Overvalued: Trading above intrinsic DCF valuation.`);
    }

    // B. P/E Ratio (10 points)
    if (quote.pe > 0 && quote.pe < 20) {
        fundamentalScore += 10;
        signals.push(`Attractive Valuation: low P/E ratio (${quote.pe.toFixed(1)}).`);
    } else if (quote.pe >= 20 && quote.pe < 35) {
        fundamentalScore += 5;
        signals.push(`Fair Valuation: Average P/E ratio (${quote.pe.toFixed(1)}).`);
    } else {
        signals.push(`High Valuation: Elevated P/E ratio (${quote.pe.toFixed(1)}) compared to typical benchmarks.`);
    }

    // C. Profitability & Growth (10 points)
    if (financials.epsGrowth3Y > 15) {
        fundamentalScore += 10;
        signals.push(`Strong Growth: EPS has grown rapidly over the last 3 years (${financials.epsGrowth3Y.toFixed(1)}%).`);
    } else if (financials.epsGrowth3Y > 5) {
        fundamentalScore += 5;
        signals.push(`Stable Growth: Positive EPS growth over the last 3 years.`);
    } else {
        signals.push(`Weak Growth: Sluggish or negative EPS growth over the last 3 years.`);
    }

    // D. Financial Health / Current Ratio (5 points)
    if (financials.currentRatio >= 1.5) {
        fundamentalScore += 5;
        signals.push(`Strong Balance Sheet: High liquidity with a current ratio of ${financials.currentRatio.toFixed(2)}.`);
    } else if (financials.currentRatio >= 1.0) {
        fundamentalScore += 3;
        // omitted from signals to keep it concise unless it's strictly bad or good
    } else {
        signals.push(`Warning: Low liquidity with a current ratio below 1.0.`);
    }


    // --- 2. TECHNICAL ANALYSIS (Max 40 points) ---
    // A. Moving Averages Trend (20 points)
    if (quote.price > quote.priceAvg50 && quote.priceAvg50 > quote.priceAvg200) {
        technicalScore += 20;
        signals.push(`Bullish Trend: Price is above both the 50-day and 200-day moving averages.`);
    } else if (quote.price < quote.priceAvg50 && quote.priceAvg50 < quote.priceAvg200) {
        signals.push(`Bearish Trend: Price is below both the 50-day and 200-day moving averages.`);
    } else {
        technicalScore += 10;
        signals.push(`Neutral Trend: Moving averages are mixed.`);
    }

    // B. RSI - Relative Strength Index (Pseudo calc for demo) (20 points)
    // Since we are mocking, we will just simulate a basic RSI calc over the last 14 days of the mock history
    let rsi = 50; // Neutral default
    if (history.length >= 14) {
        let gains = 0;
        let losses = 0;
        for (let i = 1; i < 14; i++) {
            const change = history[i].close - history[i - 1].close;
            if (change > 0) gains += change;
            else losses -= change;
        }
        const avgGain = gains / 14;
        const avgLoss = losses / 14;
        if (avgLoss === 0) {
            rsi = 100;
        } else {
            const rs = avgGain / avgLoss;
            rsi = 100 - (100 / (1 + rs));
        }
    }

    if (rsi < 30) {
        technicalScore += 20;
        signals.push(`Oversold: RSI is ${rsi.toFixed(0)}, indicating potential bounce.`);
    } else if (rsi > 70) {
        signals.push(`Overbought: RSI is ${rsi.toFixed(0)}, indicating potential pullback.`);
    } else {
        technicalScore += 10;
        // Normal level, no signal needed to avoid clutter.
    }

    // --- 3. SENTIMENT ANALYSIS (Max 20 points) ---
    let positiveCount = 0;
    let negativeCount = 0;

    news.forEach(article => {
        if (article.sentiment === "Positive") positiveCount++;
        if (article.sentiment === "Negative") negativeCount++;
    });

    if (positiveCount > negativeCount) {
        sentimentScore = 20;
        signals.push(`Positive Sentiment: Recent news cycle is generally bullish.`);
    } else if (negativeCount > positiveCount) {
        sentimentScore = 0;
        signals.push(`Negative Sentiment: Recent news cycle indicates bearish press.`);
    } else {
        sentimentScore = 10;
        signals.push(`Neutral Sentiment: News cycle is mixed.`);
    }

    // --- AGGREGATE FINAL SCORE ---
    // Ensure we cap strictly to the max weights just in case
    fundamentalScore = Math.min(fundamentalScore, FUNDAMENTAL_WEIGHT);
    technicalScore = Math.min(technicalScore, TECHNICAL_WEIGHT);
    sentimentScore = Math.min(sentimentScore, SENTIMENT_WEIGHT);

    const totalScore = Math.round(fundamentalScore + technicalScore + sentimentScore);

    let rating: ScoreResult["rating"] = "HOLD";
    if (totalScore >= 80) rating = "STRONG BUY";
    else if (totalScore >= 60) rating = "BUY";
    else if (totalScore >= 40) rating = "HOLD";
    else if (totalScore >= 20) rating = "SELL";
    else rating = "STRONG SELL";

    return {
        totalScore,
        rating,
        signals
    };
}
