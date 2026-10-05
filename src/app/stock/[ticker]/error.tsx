"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Search, AlertCircle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("StockPage Error:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="bg-destructive/10 p-4 rounded-full mb-6 relative">
                <AlertCircle className="w-12 h-12 text-destructive" />
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight mb-3">Stock Not Found</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-md">
                We couldn't find any financial data for that ticker symbol. It might be invalid, delisted, or not supported by our provider.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 py-2"
                >
                    <Search className="mr-2 h-4 w-4" />
                    Search Again
                </Link>
                <button
                    onClick={() => reset()}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-8 py-2"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
