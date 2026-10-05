import { ScoreResult } from "@/lib/engine";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, TrendingUp } from "lucide-react";
import clsx from "clsx";

interface ScoreBadgeProps {
    result: ScoreResult;
}

export default function ScoreBadge({ result }: ScoreBadgeProps) {
    const getBadgeConfig = (rating: ScoreResult["rating"]) => {
        switch (rating) {
            case "STRONG BUY": return { color: "bg-green-600", text: "text-white", icon: TrendingUp };
            case "BUY": return { color: "bg-green-400", text: "text-black", icon: CheckCircle2 };
            case "HOLD": return { color: "bg-yellow-400", text: "text-black", icon: MinusCircle };
            case "SELL": return { color: "bg-orange-500", text: "text-white", icon: AlertTriangle };
            case "STRONG SELL": return { color: "bg-red-600", text: "text-white", icon: XCircle };
        }
    };

    const config = getBadgeConfig(result.rating);
    const Icon = config.icon;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <div className={clsx(
                    "flex items-center justify-center rounded-lg px-6 py-4 font-bold text-2xl tracking-tight shadow-md transition-all",
                    config.color,
                    config.text
                )}>
                    <Icon className="w-8 h-8 mr-3" />
                    {result.rating}
                </div>
                <div className="flex flex-col">
                    <span className="text-3xl font-extrabold">{result.totalScore} <span className="text-muted-foreground text-lg font-medium">/ 100</span></span>
                    <span className="text-sm font-medium text-muted-foreground">Confidence Score</span>
                </div>
            </div>

            <div className="mt-4 bg-muted/50 rounded-lg p-5 border">
                <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Analysis Signals</h4>
                <ul className="space-y-2">
                    {result.signals.map((signal, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                            <span className="mr-2 mt-1 text-primary">•</span>
                            <span className="leading-relaxed">{signal}</span>
                        </li>
                    ))}
                </ul>
                {result.signals.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No strong signals detected.</p>
                )}
            </div>
        </div>
    );
}
