"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { NormalizedDataPoint } from '@/types/compare';

interface ComparativeChartProps {
    data: NormalizedDataPoint[];
    symbols: string[];
    timeframe: string;
    onTimeframeChange: (tf: string) => void;
}

const STOCK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ComparativeChart({ data, symbols, timeframe, onTimeframeChange }: ComparativeChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);
    const [hIdx, setHIdx] = useState<number | null>(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const box = boxRef.current;
        if (!canvas || !box || !data.length) return;

        const dpr = window.devicePixelRatio || 1;
        const W = box.clientWidth;
        const H = box.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);

        const pad = { t: 20, r: 60, b: 35, l: 15 };
        const pH = H - pad.t - pad.b;
        const pW = W - pad.l - pad.r;
        const n = data.length;

        // Find min and max returns across all stocks
        let minReturn = 0;
        let maxReturn = 0;

        for (const pt of data) {
            for (const sym of symbols) {
                const val = typeof pt[sym] === 'number' ? (pt[sym] as number) : 0;
                if (val < minReturn) minReturn = val;
                if (val > maxReturn) maxReturn = val;
            }
        }

        // Add padding
        minReturn = Math.min(-5, Math.floor(minReturn - 3));
        maxReturn = Math.max(5, Math.ceil(maxReturn + 3));
        const returnRange = maxReturn - minReturn || 1;

        const valToY = (v: number) => pad.t + pH * (1 - (v - minReturn) / returnRange);
        const idxToX = (i: number) => pad.l + (i / Math.max(1, n - 1)) * pW;

        // Background horizontal grid lines
        ctx.lineWidth = 1;
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const v = minReturn + (returnRange / steps) * i;
            const y = valToY(v);

            // Baseline 0% highlighted
            if (Math.abs(v) < (returnRange / (steps * 2))) {
                ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                ctx.setLineDash([4, 4]);
            } else {
                ctx.strokeStyle = 'rgba(128,128,128,0.1)';
                ctx.setLineDash([]);
            }

            ctx.beginPath();
            ctx.moveTo(pad.l, y);
            ctx.lineTo(W - pad.r, y);
            ctx.stroke();

            // Right label
            ctx.fillStyle = Math.abs(v) < 1 ? '#38bdf8' : '#888';
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${v >= 0 ? '+' : ''}${v.toFixed(0)}%`, W - pad.r + 6, y + 3);
        }
        ctx.setLineDash([]);

        // Date labels on X-axis
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const dateStep = Math.max(1, Math.floor(n / 6));
        for (let i = 0; i < n; i += dateStep) {
            const pt = data[i];
            ctx.fillText(pt.shortDate, idxToX(i), H - pad.b + 18);
        }

        // Draw Line for each stock
        symbols.forEach((sym, symIdx) => {
            const color = STOCK_COLORS[symIdx % STOCK_COLORS.length];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.2;
            ctx.beginPath();

            for (let i = 0; i < n; i++) {
                const val = typeof data[i][sym] === 'number' ? (data[i][sym] as number) : 0;
                const x = idxToX(i);
                const y = valToY(val);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // Hover Crosshair
        if (hIdx !== null && hIdx >= 0 && hIdx < n) {
            const hx = idxToX(hIdx);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(hx, pad.t);
            ctx.lineTo(hx, H - pad.b);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw dots on each line
            symbols.forEach((sym, symIdx) => {
                const val = typeof data[hIdx][sym] === 'number' ? (data[hIdx][sym] as number) : 0;
                const hy = valToY(val);
                ctx.fillStyle = STOCK_COLORS[symIdx % STOCK_COLORS.length];
                ctx.beginPath();
                ctx.arc(hx, hy, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
        }
    }, [data, symbols, hIdx]);

    useEffect(() => {
        draw();
    }, [draw]);

    useEffect(() => {
        const resize = () => draw();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [draw]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const box = boxRef.current;
        const tip = tipRef.current;
        if (!canvas || !box || !tip || !data.length) return;

        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const pad = { l: 15, r: 60 };
        const pW = rect.width - pad.l - pad.r;
        const frac = Math.max(0, Math.min(1, (mx - pad.l) / pW));
        const idx = Math.round(frac * (data.length - 1));

        if (idx >= 0 && idx < data.length) {
            setHIdx(idx);
            const pt = data[idx];

            let tipHtml = `<div class="font-bold text-xs mb-1.5 pb-1 border-b border-border text-foreground">${pt.date}</div>`;
            tipHtml += `<div class="flex flex-col gap-1 text-xs">`;
            symbols.forEach((sym, symIdx) => {
                const val = typeof pt[sym] === 'number' ? (pt[sym] as number) : 0;
                const color = STOCK_COLORS[symIdx % STOCK_COLORS.length];
                const sign = val >= 0 ? '+' : '';
                tipHtml += `
                    <div class="flex items-center justify-between gap-4 font-mono">
                        <span class="flex items-center gap-1.5 font-bold font-sans" style="color: ${color}">
                            <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
                            ${sym}
                        </span>
                        <span class="font-bold ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                            ${sign}${val.toFixed(2)}%
                        </span>
                    </div>
                `;
            });
            tipHtml += `</div>`;

            tip.innerHTML = tipHtml;
            tip.style.opacity = '1';

            let tx = e.clientX - rect.left + 15;
            if (tx + 180 > rect.width) tx = e.clientX - rect.left - 190;
            tip.style.left = tx + 'px';
            tip.style.top = Math.max(10, e.clientY - rect.top - 40) + 'px';
        }
    };

    const handleMouseLeave = () => {
        setHIdx(null);
        if (tipRef.current) tipRef.current.style.opacity = '0';
    };

    return (
        <div className="flex flex-col gap-3 w-full bg-card border rounded-xl p-5 shadow-xs">
            {/* Chart Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-foreground">Normalized % Return Comparison</h3>
                    <span className="text-xs text-muted-foreground hidden sm:inline">(All lines pegged to 0% at start)</span>
                </div>

                <div className="flex items-center gap-1.5">
                    {['1M', '3M', '6M', '1Y', '5Y'].map((tf) => (
                        <button
                            key={tf}
                            onClick={() => onTimeframeChange(tf)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                                timeframe === tf ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Legend Chips */}
            <div className="flex flex-wrap items-center gap-3 px-1">
                {symbols.map((sym, idx) => (
                    <div key={sym} className="flex items-center gap-1.5 text-xs font-bold">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STOCK_COLORS[idx % STOCK_COLORS.length] }} />
                        <span>{sym}</span>
                    </div>
                ))}
            </div>

            {/* Canvas Area */}
            <div ref={boxRef} className="relative w-full h-[360px] bg-background/50 rounded-lg overflow-hidden border">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                />
                <div
                    ref={tipRef}
                    className="absolute pointer-events-none bg-card/95 backdrop-blur-md border rounded-lg p-2.5 shadow-xl transition-opacity duration-75 z-20"
                    style={{ opacity: 0, minWidth: 170 }}
                />
            </div>
        </div>
    );
}
