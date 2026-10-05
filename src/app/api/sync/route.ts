import { NextResponse } from 'next/server';
import {
    ensureBackgroundSyncRunning,
    executeMarketSync,
    getSyncTelemetry,
    setAutoSync
} from '@/lib/backgroundSync';

export async function GET() {
    ensureBackgroundSyncRunning();
    const telemetry = getSyncTelemetry();
    return NextResponse.json(telemetry);
}

export async function POST(request: Request) {
    ensureBackgroundSyncRunning();

    try {
        let body: any = {};
        try {
            body = await request.json();
        } catch {}

        if (body.action === 'toggleAutoSync') {
            setAutoSync(!!body.enabled);
            return NextResponse.json({
                success: true,
                message: `Auto-sync ${body.enabled ? 'enabled' : 'disabled'}`,
                telemetry: getSyncTelemetry(),
            });
        }

        // Default action: force immediate sync
        const result = await executeMarketSync();
        return NextResponse.json({
            success: result.success,
            durationMs: result.durationMs,
            stocksUpdated: result.count,
            telemetry: getSyncTelemetry(),
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
