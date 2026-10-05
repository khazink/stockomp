export type MarketSession = 'REGULAR' | 'PRE_MARKET' | 'AFTER_HOURS' | 'CLOSED';

export interface MarketStatus {
    isOpen: boolean;
    session: MarketSession;
    statusText: string;
    description: string;
    etTime: string;
    recommendedIntervalMs: number;
    nextOpenOrClose: string;
}

export function getMarketStatus(): MarketStatus {
    const now = new Date();
    // Format into America/New_York (US Eastern Time)
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        weekday: 'short',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    });

    const parts = formatter.formatToParts(now);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
        partMap[p.type] = p.value;
    }

    const weekday = partMap.weekday; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const hour = parseInt(partMap.hour, 10);
    const minute = parseInt(partMap.minute, 10);
    const totalMinutes = hour * 60 + minute;

    const etTimeStr = `${weekday} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ET`;

    // Weekend check
    if (weekday === 'Sat' || weekday === 'Sun') {
        return {
            isOpen: false,
            session: 'CLOSED',
            statusText: 'Market Closed (Weekend)',
            description: 'U.S. exchanges are closed for the weekend. Next open Monday at 9:30 AM ET.',
            etTime: etTimeStr,
            recommendedIntervalMs: 60 * 60 * 1000, // 1 hour
            nextOpenOrClose: 'Opens Monday 9:30 AM ET',
        };
    }

    // Weekday:
    // Pre-market: 04:00 - 09:30 ET (240 - 570 mins)
    // Regular: 09:30 - 16:00 ET (570 - 960 mins)
    // After-hours: 16:00 - 20:00 ET (960 - 1200 mins)
    // Closed overnight: 20:00 - 04:00 ET (< 240 or >= 1200 mins)

    if (totalMinutes >= 570 && totalMinutes < 960) {
        // Regular Market Hours (9:30 AM to 4:00 PM ET)
        const minsLeft = 960 - totalMinutes;
        const h = Math.floor(minsLeft / 60);
        const m = minsLeft % 60;
        return {
            isOpen: true,
            session: 'REGULAR',
            statusText: 'Market Open',
            description: `Regular trading session is active. Closes in ${h}h ${m}m (4:00 PM ET).`,
            etTime: etTimeStr,
            recommendedIntervalMs: 5 * 60 * 1000, // 5 minutes sync
            nextOpenOrClose: `Closes in ${h}h ${m}m`,
        };
    } else if (totalMinutes >= 240 && totalMinutes < 570) {
        // Pre-Market (4:00 AM to 9:30 AM ET)
        const minsToOpen = 570 - totalMinutes;
        const h = Math.floor(minsToOpen / 60);
        const m = minsToOpen % 60;
        return {
            isOpen: false,
            session: 'PRE_MARKET',
            statusText: 'Pre-Market',
            description: `Pre-market session active. Regular trading opens in ${h}h ${m}m (9:30 AM ET).`,
            etTime: etTimeStr,
            recommendedIntervalMs: 15 * 60 * 1000, // 15 minutes sync
            nextOpenOrClose: `Opens in ${h}h ${m}m`,
        };
    } else if (totalMinutes >= 960 && totalMinutes < 1200) {
        // After-Hours (4:00 PM to 8:00 PM ET)
        const minsToClose = 1200 - totalMinutes;
        const h = Math.floor(minsToClose / 60);
        const m = minsToClose % 60;
        return {
            isOpen: false,
            session: 'AFTER_HOURS',
            statusText: 'After-Hours',
            description: `After-hours session active. Extended trading closes in ${h}h ${m}m (8:00 PM ET).`,
            etTime: etTimeStr,
            recommendedIntervalMs: 15 * 60 * 1000, // 15 minutes sync
            nextOpenOrClose: `After-hours ends in ${h}h ${m}m`,
        };
    } else {
        // Closed Overnight
        return {
            isOpen: false,
            session: 'CLOSED',
            statusText: 'Market Closed (Overnight)',
            description: 'U.S. exchanges are closed overnight. Pre-market opens at 4:00 AM ET.',
            etTime: etTimeStr,
            recommendedIntervalMs: 60 * 60 * 1000, // 1 hour sync
            nextOpenOrClose: 'Pre-market opens 4:00 AM ET',
        };
    }
}
