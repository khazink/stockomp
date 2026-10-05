"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { HistoricalData } from "@/types/stock";

interface PivotLevels {
    pp: number; r1: number; r2: number; r3: number;
    s1: number; s2: number; s3: number;
}

function calcPivots(data: HistoricalData[]): PivotLevels | null {
    if (data.length < 2) return null;
    const c = data[data.length - 2] || data[data.length - 1];
    const H = c.high, L = c.low, C = c.close;
    const pp = (H + L + C) / 3;
    return {
        pp,
        r1: 2 * pp - L, r2: pp + (H - L), r3: H + 2 * (pp - L),
        s1: 2 * pp - H, s2: pp - (H - L), s3: L - 2 * (H - pp),
    };
}

function calcSMA(data: HistoricalData[], period: number): (number | null)[] {
    const r: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { r.push(null); continue; }
        let s = 0;
        for (let j = i - period + 1; j <= i; j++) s += data[j].close;
        r.push(s / period);
    }
    return r;
}

function calcEMA(data: HistoricalData[], period: number): (number | null)[] {
    const r: (number | null)[] = [];
    const k = 2 / (period + 1);
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { r.push(null); }
        else if (i === period - 1) {
            let s = 0;
            for (let j = 0; j < period; j++) s += data[j].close;
            r.push(s / period);
        } else {
            r.push((data[i].close - r[i - 1]!) * k + r[i - 1]!);
        }
    }
    return r;
}

function findSR(data: HistoricalData[], lb = 5): { supports: number[]; resistances: number[] } {
    const sup: number[] = [], res: number[] = [];
    for (let i = lb; i < data.length - lb; i++) {
        let isMin = true, isMax = true;
        for (let j = i - lb; j <= i + lb; j++) {
            if (j === i) continue;
            if (data[j].low <= data[i].low) isMin = false;
            if (data[j].high >= data[i].high) isMax = false;
        }
        if (isMin) sup.push(data[i].low);
        if (isMax) res.push(data[i].high);
    }
    const dedup = (a: number[]) => {
        const s = [...a].sort((x, y) => x - y);
        const out: number[] = [];
        for (const v of s) {
            if (!out.length || Math.abs(v - out[out.length - 1]) / out[out.length - 1] > 0.015) out.push(v);
        }
        return out.slice(-3);
    };
    return { supports: dedup(sup), resistances: dedup(res) };
}

interface StockChartProps { data: HistoricalData[]; }
type ChartMode = "candlestick" | "line";
type Overlay = "sma20" | "sma50" | "ema12" | "ema26" | "pivots" | "sr" | "volume";

export default function StockChart({ data }: StockChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<ChartMode>("candlestick");
    const [ov, setOv] = useState<Set<Overlay>>(new Set(["sma20", "pivots", "volume"]));
    const [hIdx, setHIdx] = useState<number | null>(null);

    // Sort chronologically (oldest first) to fix reversed chart
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const toggle = (o: Overlay) => setOv(p => { const n = new Set(p); n.has(o) ? n.delete(o) : n.add(o); return n; });

    const sma20 = calcSMA(sorted, 20);
    const sma50 = calcSMA(sorted, 50);
    const ema12 = calcEMA(sorted, 12);
    const ema26 = calcEMA(sorted, 26);
    const pivots = calcPivots(sorted);
    const { supports, resistances } = findSR(sorted);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const box = boxRef.current;
        if (!canvas || !box || !sorted.length) return;

        const dpr = window.devicePixelRatio || 1;
        const W = box.clientWidth;
        const H = box.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);

        const pad = { t: 16, r: 65, b: 36, l: 8 };
        const volH = ov.has("volume") ? 55 : 0;
        const pH = H - pad.t - pad.b - volH;
        const n = sorted.length;
        const bw = Math.max(1, (W - pad.l - pad.r) / n);

        let prices = sorted.flatMap(d => [d.high, d.low]);
        if (ov.has("pivots") && pivots) prices.push(pivots.r2, pivots.s2);
        if (ov.has("sr")) prices.push(...supports, ...resistances);
        const pMin = Math.min(...prices) * 0.997;
        const pMax = Math.max(...prices) * 1.003;
        const pR = pMax - pMin || 1;

        const py = (p: number) => pad.t + pH * (1 - (p - pMin) / pR);
        const ix = (i: number) => pad.l + i * bw + bw / 2;
        const maxV = Math.max(...sorted.map(d => d.volume)) || 1;
        const vy = (v: number) => H - pad.b - (v / maxV) * volH;

        // Grid
        ctx.strokeStyle = "rgba(128,128,128,0.08)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = pad.t + (pH / 5) * i;
            ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
            const pr = pMax - (pR / 5) * i;
            ctx.fillStyle = "#666"; ctx.font = "10px system-ui"; ctx.textAlign = "left";
            ctx.fillText("$" + pr.toFixed(2), W - pad.r + 5, y + 3);
        }

        // Date labels
        ctx.fillStyle = "#666"; ctx.font = "9px system-ui"; ctx.textAlign = "center";
        const step = Math.max(1, Math.floor(n / 7));
        for (let i = 0; i < n; i += step) {
            const d = new Date(sorted[i].date);
            ctx.fillText(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), ix(i), H - pad.b + 14);
        }

        // Volume
        if (ov.has("volume")) {
            for (let i = 0; i < n; i++) {
                const d = sorted[i];
                const up = d.close >= d.open;
                ctx.fillStyle = up ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.22)";
                ctx.fillRect(pad.l + i * bw + 1, vy(d.volume), bw - 2, H - pad.b - vy(d.volume));
            }
        }

        // S/R lines
        if (ov.has("sr")) {
            const hl = (p: number, c: string, l: string) => {
                const y = py(p); if (y < pad.t - 5 || y > pad.t + pH + 5) return;
                ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
                ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
                ctx.setLineDash([]); ctx.fillStyle = c; ctx.font = "bold 8px system-ui"; ctx.textAlign = "right";
                ctx.fillText(l + " $" + p.toFixed(2), W - pad.r - 3, y - 3);
            };
            supports.forEach((s, i) => hl(s, "#22c55e", "S" + (i + 1)));
            resistances.forEach((r, i) => hl(r, "#ef4444", "R" + (i + 1)));
        }

        // Pivot lines
        if (ov.has("pivots") && pivots) {
            const pl = (p: number, c: string, l: string) => {
                const y = py(p); if (y < pad.t - 5 || y > pad.t + pH + 5) return;
                ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
                ctx.setLineDash([]); ctx.fillStyle = c; ctx.font = "bold 8px system-ui"; ctx.textAlign = "left";
                ctx.fillText(l + " $" + p.toFixed(2), pad.l + 3, y - 3);
            };
            pl(pivots.pp, "#f59e0b", "PP");
            pl(pivots.r1, "#f87171", "R1"); pl(pivots.r2, "#dc2626", "R2");
            pl(pivots.s1, "#4ade80", "S1"); pl(pivots.s2, "#16a34a", "S2");
        }

        // Candles / Line
        if (mode === "candlestick") {
            for (let i = 0; i < n; i++) {
                const d = sorted[i], x = ix(i), up = d.close >= d.open;
                const bt = py(Math.max(d.open, d.close)), bb = py(Math.min(d.open, d.close));
                const bH = Math.max(1, bb - bt);
                ctx.strokeStyle = up ? "#22c55e" : "#ef4444"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x, py(d.high)); ctx.lineTo(x, py(d.low)); ctx.stroke();
                const w = Math.max(2, bw * 0.7);
                if (up) {
                    ctx.fillStyle = "rgba(34,197,94,0.35)"; ctx.fillRect(x - w / 2, bt, w, bH);
                    ctx.strokeRect(x - w / 2, bt, w, bH);
                } else {
                    ctx.fillStyle = "#ef4444"; ctx.fillRect(x - w / 2, bt, w, bH);
                }
            }
        } else {
            ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2; ctx.beginPath();
            for (let i = 0; i < n; i++) { const x = ix(i), y = py(sorted[i].close); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
            ctx.stroke();
            ctx.lineTo(ix(n - 1), pad.t + pH); ctx.lineTo(ix(0), pad.t + pH); ctx.closePath();
            const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + pH);
            g.addColorStop(0, "rgba(59,130,246,0.18)"); g.addColorStop(1, "rgba(59,130,246,0)");
            ctx.fillStyle = g; ctx.fill();
        }

        // Indicator overlays
        const drawLine = (vals: (number | null)[], color: string) => {
            ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); let s = false;
            for (let i = 0; i < n; i++) { const v = vals[i]; if (v === null) continue; const x = ix(i), y = py(v); s ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), s = true); }
            ctx.stroke();
        };
        if (ov.has("sma20")) drawLine(sma20, "#f59e0b");
        if (ov.has("sma50")) drawLine(sma50, "#a855f7");
        if (ov.has("ema12")) drawLine(ema12, "#06b6d4");
        if (ov.has("ema26")) drawLine(ema26, "#ec4899");

        // Crosshair
        if (hIdx !== null && hIdx >= 0 && hIdx < n) {
            const hx = ix(hIdx), hy = py(sorted[hIdx].close);
            ctx.strokeStyle = "rgba(200,200,200,0.25)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(hx, pad.t); ctx.lineTo(hx, H - pad.b); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad.l, hy); ctx.lineTo(W - pad.r, hy); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sorted.length, mode, ov, hIdx]);

    useEffect(() => { draw(); }, [draw]);
    useEffect(() => {
        const resize = () => draw();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, [draw]);

    const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current, tip = tipRef.current;
        if (!canvas || !tip) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const bw = (rect.width - 8 - 65) / sorted.length;
        const idx = Math.floor((mx - 8) / bw);
        if (idx >= 0 && idx < sorted.length) {
            setHIdx(idx);
            const d = sorted[idx];
            const dt = new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const chg = idx > 0 ? d.close - sorted[idx - 1].close : 0;
            const chgPct = idx > 0 && sorted[idx - 1].close ? (chg / sorted[idx - 1].close * 100) : 0;
            const chgColor = chg >= 0 ? "color:#22c55e" : "color:#ef4444";
            tip.innerHTML = '<div style="font-weight:600;font-size:11px;margin-bottom:3px">' + dt + '</div>'
                + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 10px;font-size:11px">'
                + '<span style="color:#888">O</span><span style="font-family:monospace">$' + d.open.toFixed(2) + '</span>'
                + '<span style="color:#888">H</span><span style="font-family:monospace;color:#4ade80">$' + d.high.toFixed(2) + '</span>'
                + '<span style="color:#888">L</span><span style="font-family:monospace;color:#f87171">$' + d.low.toFixed(2) + '</span>'
                + '<span style="color:#888">C</span><span style="font-family:monospace;font-weight:700">$' + d.close.toFixed(2) + '</span>'
                + '<span style="color:#888">Chg</span><span style="font-family:monospace;' + chgColor + '">' + (chg >= 0 ? "+" : "") + chg.toFixed(2) + ' (' + chgPct.toFixed(2) + '%)</span>'
                + '<span style="color:#888">Vol</span><span style="font-family:monospace">' + (d.volume / 1e6).toFixed(1) + 'M</span>'
                + '</div>';
            tip.style.opacity = "1";
            let tx = e.clientX - rect.left + 14;
            if (tx + 185 > rect.width) tx = e.clientX - rect.left - 200;
            tip.style.left = tx + "px";
            tip.style.top = Math.max(0, e.clientY - rect.top - 50) + "px";
        } else { setHIdx(null); tip.style.opacity = "0"; }
    };

    const pivotRows = pivots ? [
        { l: "R2", v: pivots.r2, c: "text-red-400" },
        { l: "R1", v: pivots.r1, c: "text-red-300" },
        { l: "PP", v: pivots.pp, c: "text-yellow-400" },
        { l: "S1", v: pivots.s1, c: "text-green-300" },
        { l: "S2", v: pivots.s2, c: "text-green-400" },
    ] : [];

    return (
        <div className="w-full flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-foreground">Technical Chart</h3>
                <div className="flex flex-wrap items-center gap-1">
                    <button onClick={() => setMode("candlestick")} className={"px-2.5 py-1 text-xs rounded-md font-medium transition-colors " + (mode === "candlestick" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>Candles</button>
                    <button onClick={() => setMode("line")} className={"px-2.5 py-1 text-xs rounded-md font-medium transition-colors " + (mode === "line" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>Line</button>
                    <span className="w-px h-4 bg-border mx-1" />
                    {([["sma20","SMA 20","#f59e0b"],["sma50","SMA 50","#a855f7"],["ema12","EMA 12","#06b6d4"],["ema26","EMA 26","#ec4899"],["pivots","Pivots","#f59e0b"],["sr","S/R","#22c55e"],["volume","Vol","#888"]] as [Overlay,string,string][]).map(([k,l,c]) => (
                        <button key={k} onClick={() => toggle(k)} className={"px-2 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 " + (ov.has(k) ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ov.has(k) ? c : "transparent", border: "1px solid " + c }} />
                            {l}
                        </button>
                    ))}
                </div>
            </div>
            <div ref={boxRef} className="relative w-full h-[420px] bg-card rounded-lg overflow-hidden border">
                <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => { setHIdx(null); if (tipRef.current) tipRef.current.style.opacity = "0"; }} />
                <div ref={tipRef} className="absolute pointer-events-none bg-card/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg transition-opacity duration-100 z-10" style={{ opacity: 0, minWidth: 170 }} />
            </div>
            {ov.has("pivots") && pivots && (
                <div className="flex flex-wrap items-center gap-3 px-1">
                    <span className="text-xs font-semibold text-muted-foreground">Pivot Levels:</span>
                    {pivotRows.map(p => <span key={p.l} className={"text-xs font-mono " + p.c}>{p.l}: {"$"}{p.v.toFixed(2)}</span>)}
                </div>
            )}
        </div>
    );
}