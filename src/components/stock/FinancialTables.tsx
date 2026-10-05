import { Financials } from "@/types/stock";

interface FinancialTablesProps {
    financials: Financials;
}

export default function FinancialTables({ financials }: FinancialTablesProps) {
    const formatCurrency = (val: number) => {
        if (!val || val === 0) return "$0.00";
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: "compact",
            maximumFractionDigits: 1
        }).format(val);
    };

    const formatRatio = (val: number, suffix = "") => {
        if (val === undefined || val === null || isNaN(val)) return "N/A";
        return val.toFixed(2) + suffix;
    };

    return (
        <div className="w-full">
            <h3 className="text-xl font-bold mb-6 text-foreground">Key Financials</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Income Statement */}
                <div className="bg-muted/30 p-5 rounded-lg border">
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Income Statement</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-medium">Revenue</span>
                            <span className="font-semibold text-foreground">{formatCurrency(financials.revenue)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-medium">Gross Profit</span>
                            <span className="font-semibold text-foreground">{formatCurrency(financials.grossProfit)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-medium">Net Income</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(financials.netIncome)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-sm font-medium">EPS (Diluted)</span>
                            <span className="font-bold text-foreground">$${financials.epsDiluted.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Balance Sheet */}
                <div className="bg-muted/30 p-5 rounded-lg border">
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Balance Sheet</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-medium">Total Assets</span>
                            <span className="font-semibold text-foreground">{formatCurrency(financials.totalAssets)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-medium">Total Liabilities</span>
                            <span className="font-semibold text-foreground">{formatCurrency(financials.totalLiabilities)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm font-medium">Total Debt</span>
                            <span className="font-semibold text-foreground">{formatCurrency(financials.totalDebt)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-sm font-medium">Cash & Equivalents</span>
                            <span className="font-bold text-foreground">{formatCurrency(financials.cashAndEquivalents)}</span>
                        </div>
                    </div>
                </div>

                {/* Cash Flow & Ratios */}
                <div className="bg-muted/30 p-5 rounded-lg border md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Cash Flow</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm font-medium">Operating Cash Flow</span>
                                <span className="font-semibold text-foreground">{formatCurrency(financials.operatingCashFlow)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm font-medium">Free Cash Flow</span>
                                <span className="font-semibold text-foreground">{formatCurrency(financials.freeCashFlow)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm font-medium">Capital Expenditure</span>
                                <span className="font-semibold text-foreground">{formatCurrency(financials.capitalExpenditure)}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Key Ratios</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm font-medium">Current Ratio</span>
                                <span className="font-semibold text-foreground">{formatRatio(financials.currentRatio)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm font-medium">Debt to Equity</span>
                                <span className="font-semibold text-foreground">{formatRatio(financials.debtToEquity)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm font-medium">Return on Equity (ROE)</span>
                                <span className="font-semibold text-foreground">{formatRatio(financials.roe * 100, "%")}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm font-medium">3Y EPS Growth</span>
                                <span className={`font-semibold ${financials.epsGrowth3Y >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                    {financials.epsGrowth3Y >= 0 ? '+' : ''}{formatRatio(financials.epsGrowth3Y, "%")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
