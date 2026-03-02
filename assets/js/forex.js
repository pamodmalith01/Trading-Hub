/**
 * forex.js  — Forex & Global Markets page logic
 * Features: Market Sessions, Live Rate Table with % change + spread,
 *           Major Pairs strip, Currency Converter, Market News
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const MAJOR_PAIRS = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'SGD'];

const CURRENCY_INFO = {
    USD: { name: 'US Dollar', flag: '🇺🇸', color: '#3b82f6' },
    EUR: { name: 'Euro', flag: '🇪🇺', color: '#8b5cf6' },
    GBP: { name: 'British Pound', flag: '🇬🇧', color: '#10b981' },
    JPY: { name: 'Japanese Yen', flag: '🇯🇵', color: '#f59e0b' },
    AUD: { name: 'Australian Dollar', flag: '🇦🇺', color: '#06b6d4' },
    CAD: { name: 'Canadian Dollar', flag: '🇨🇦', color: '#ef4444' },
    CHF: { name: 'Swiss Franc', flag: '🇨🇭', color: '#84cc16' },
    CNY: { name: 'Chinese Yuan', flag: '🇨🇳', color: '#f97316' },
    INR: { name: 'Indian Rupee', flag: '🇮🇳', color: '#ec4899' },
    LKR: { name: 'Sri Lankan Rupee', flag: '🇱🇰', color: '#a855f7' },
    SGD: { name: 'Singapore Dollar', flag: '🇸🇬', color: '#14b8a6' },
    AED: { name: 'UAE Dirham', flag: '🇦🇪', color: '#6366f1' },
    ZAR: { name: 'S. African Rand', flag: '🇿🇦', color: '#f59e0b' },
    NZD: { name: 'New Zealand $', flag: '🇳🇿', color: '#22c55e' },
    MYR: { name: 'Malaysian Ringgit', flag: '🇲🇾', color: '#e11d48' },
    HKD: { name: 'Hong Kong Dollar', flag: '🇭🇰', color: '#dc2626' },
    NOK: { name: 'Norwegian Krone', flag: '🇳🇴', color: '#2563eb' },
    SEK: { name: 'Swedish Krona', flag: '🇸🇪', color: '#1d4ed8' },
    TRY: { name: 'Turkish Lira', flag: '🇹🇷', color: '#b45309' },
    BRL: { name: 'Brazilian Real', flag: '🇧🇷', color: '#15803d' },
};

// Market sessions (UTC open/close hours)
const SESSIONS = [
    { name: 'Sydney', open: 21, close: 6, tz: 'AEST', icon: '🇦🇺', color: '#06b6d4' },
    { name: 'Tokyo', open: 0, close: 9, tz: 'JST', icon: '🇯🇵', color: '#f59e0b' },
    { name: 'London', open: 8, close: 17, tz: 'GMT', icon: '🇬🇧', color: '#8b5cf6' },
    { name: 'New York', open: 13, close: 22, tz: 'EST', icon: '🇺🇸', color: '#3b82f6' },
];

// Simulated spread reference (pips) per quote currency
const SPREADS = {
    EUR: 0.7, GBP: 0.9, JPY: 0.6, AUD: 0.8, CAD: 0.9, CHF: 0.8, NZD: 1.2,
    SGD: 1.5, MYR: 3.0, LKR: 2.5, INR: 1.8, CNY: 2.0, ZAR: 4.0, AED: 1.5,
    HKD: 1.0, NOK: 2.5, SEK: 2.2, TRY: 5.0, BRL: 3.5, DEFAULT: 2.0
};

// Rate history for % change calculation (keep last 2 fetches)
let prevRates = {};
let rateHistory = {};   // {CUR: [rate1, rate2, ...]} last 5 values

// ─── Helper Functions ─────────────────────────────────────────────────────────

function nowUTC() {
    const now = new Date();
    return now.getUTCHours() + now.getUTCMinutes() / 60;
}

function isSessionOpen(session) {
    const h = nowUTC();
    if (session.open < session.close) return h >= session.open && h < session.close;
    return h >= session.open || h < session.close;            // wraps midnight
}

function pctChange(curr, prev) {
    if (!prev || prev === 0) return 0;
    return ((curr - prev) / prev) * 100;
}

function fmtRate(rate, currency) {
    if (currency === 'JPY' || currency === 'KRW' || currency === 'IDR') return rate.toFixed(2);
    if (rate >= 100) return rate.toFixed(2);
    if (rate >= 10) return rate.toFixed(3);
    return rate.toFixed(4);
}

function spreadDisplay(cur) {
    return (SPREADS[cur] || SPREADS.DEFAULT).toFixed(1);
}

function miniTrendSVG(history, isUp) {
    if (!history || history.length < 2) return '<span class="text-gray-700 text-xs">—</span>';
    const vals = history.slice(-5);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const w = 44, h = 18;
    const pts = vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const color = isUp ? '#10b981' : '#ef4444';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="inline-block">
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function updateClock() {
    const el = document.getElementById('rateUpdateClock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const lu = document.getElementById('lastUpdatedBadge');
    if (lu) lu.innerHTML = `<i class="fa-solid fa-clock mr-1"></i>${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

// ─── Render: Market Sessions ──────────────────────────────────────────────────

function renderSessions() {
    const grid = document.getElementById('sessionGrid');
    if (!grid) return;

    grid.innerHTML = SESSIONS.map(s => {
        const open = isSessionOpen(s);
        const h = nowUTC();
        // Hours remaining / until open
        let timeInfo = '';
        if (open) {
            const rem = ((s.close - h + 24) % 24).toFixed(1);
            timeInfo = `Closes in ~${rem}h`;
        } else {
            const until = ((s.open - h + 24) % 24).toFixed(1);
            timeInfo = `Opens in ~${until}h`;
        }

        return `
        <div class="session-card ${open ? 'open' : 'closed'}">
            <div class="flex items-center gap-2">
                <span class="text-xl">${s.icon}</span>
                <div>
                    <p class="text-sm font-bold text-white">${s.name}</p>
                    <p class="text-[10px] text-gray-500">${s.tz}</p>
                </div>
            </div>
            <div class="text-right">
                <div class="flex items-center justify-end gap-1.5 mb-1">
                    <span class="w-2 h-2 rounded-full ${open ? 'live-dot' : ''}" style="background:${open ? '#10b981' : '#4b5563'}"></span>
                    <span class="text-xs font-bold" style="color:${open ? '#10b981' : '#6b7280'}">${open ? 'OPEN' : 'CLOSED'}</span>
                </div>
                <p class="text-[10px] text-gray-500">${timeInfo}</p>
            </div>
        </div>`;
    }).join('');
}

// ─── Render: Live Rate Table ──────────────────────────────────────────────────

function renderRateTable() {
    const tbody = document.getElementById('fxRateBody');
    if (!tbody || !API.rates) return;

    const base = API.baseCurrency || 'USD';
    const entries = Object.entries(API.rates).filter(([c]) => c !== base);

    let html = '';
    entries.forEach(([cur, rate]) => {
        const info = CURRENCY_INFO[cur] || { name: cur, flag: '💱', color: '#6b7280' };
        const prev = prevRates[cur] || rate;
        const pct = pctChange(rate, prev);
        const isUp = pct >= 0;
        const absPct = Math.abs(pct).toFixed(3);
        const spread = spreadDisplay(cur);
        const hist = rateHistory[cur] || [rate];
        const trend = miniTrendSVG(hist, isUp);

        const pctColor = isUp ? 'text-accent' : 'text-danger';
        const pctIcon = isUp ? 'fa-caret-up' : 'fa-caret-down';
        const pctBg = isUp ? 'bg-accent/10 border-accent/20' : 'bg-danger/10 border-danger/20';

        html += `
        <tr class="fx-row border-t border-glassborder" id="fxrow-${cur}">
            <td class="px-5 py-3">
                <div class="flex items-center gap-2.5">
                    <span class="text-xl">${info.flag}</span>
                    <div>
                        <p class="text-sm font-bold text-white">${base}/${cur}</p>
                        <p class="text-[10px] text-gray-500">${info.name}</p>
                    </div>
                </div>
            </td>
            <td class="px-5 py-3">
                <span class="text-sm font-mono font-bold text-white" id="rate-${cur}">${fmtRate(rate, cur)}</span>
            </td>
            <td class="px-5 py-3 text-right">
                <span class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${pctColor} ${pctBg}">
                    <i class="fa-solid ${pctIcon} text-[10px]"></i>${absPct}%
                </span>
            </td>
            <td class="px-5 py-3 text-right hidden sm:table-cell">
                <span class="spread-pill">${spread}</span>
            </td>
            <td class="px-5 py-3 text-right hidden md:table-cell">
                ${trend}
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
    // Update prevRates after render
    entries.forEach(([cur, rate]) => { prevRates[cur] = rate; });
}

// ─── Render: Major Pairs Strip ────────────────────────────────────────────────

function renderMajorStrip() {
    const strip = document.getElementById('majorPairsStrip');
    if (!strip || !API.rates) return;

    const base = API.baseCurrency || 'USD';
    strip.innerHTML = MAJOR_PAIRS.filter(c => c !== base && API.rates[c]).map(cur => {
        const rate = API.rates[cur];
        const prev = prevRates[cur] || rate;
        const pct = pctChange(rate, prev);
        const isUp = pct >= 0;
        const info = CURRENCY_INFO[cur] || { flag: '💱' };

        return `
        <div class="flex-shrink-0 glass-card border border-glassborder rounded-xl px-4 py-3 min-w-[140px] cursor-default hover:border-primary/40 transition-all">
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-sm font-bold text-white">${base}/${cur}</span>
                <span class="text-lg">${info.flag}</span>
            </div>
            <p class="text-base font-mono font-black text-white">${fmtRate(rate, cur)}</p>
            <p class="text-[10px] mt-1 font-semibold ${isUp ? 'text-accent' : 'text-danger'}">
                <i class="fa-solid ${isUp ? 'fa-caret-up' : 'fa-caret-down'} mr-0.5"></i>
                ${Math.abs(pct).toFixed(3)}%
            </p>
        </div>`;
    }).join('');
}

// ─── Render: Market News ──────────────────────────────────────────────────────

function renderNews() {
    const cont = document.getElementById('forexNewsCont');
    if (!cont || !API.news) return;

    const tags = {
        forex: { label: 'Forex', cls: 'text-primary bg-primary/10' },
        crypto: { label: 'Crypto', cls: 'text-gold bg-gold/10' },
        cse: { label: 'CSE', cls: 'text-accent bg-accent/10' }
    };

    const items = API.news.slice(0, 8);
    if (!items.length) { cont.innerHTML = '<p class="text-gray-500 text-sm col-span-4">No news yet.</p>'; return; }

    cont.innerHTML = items.map(n => {
        const src = (n.source_info?.name) || n.source || 'Market';
        const cat = n.categories?.toLowerCase().includes('fiat') ? 'forex'
            : n.categories?.toLowerCase().includes('cse') ? 'cse' : 'crypto';
        const tag = tags[cat] || tags.crypto;
        const ts = new Date((n.published_on || (Date.now() / 1000)) * 1000);
        const time = ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const isLive = n.is_live_update;

        return `
        <a href="${n.url || '#'}" target="_blank"
           class="glass-card rounded-xl p-4 border border-glassborder hover:border-primary/40 transition-all flex flex-col gap-2 fade-up group">
            <div class="flex items-start justify-between gap-2">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${tag.cls}">${tag.label}</span>
                <div class="flex items-center gap-1 shrink-0">
                    ${isLive ? '<span class="live-dot w-1.5 h-1.5 rounded-full bg-accent"></span>' : ''}
                    <span class="text-[10px] text-gray-500">${time}</span>
                </div>
            </div>
            <h4 class="text-xs font-semibold text-gray-200 leading-relaxed flex-1 group-hover:text-white transition-colors">${n.title}</h4>
            <p class="text-[10px] text-gray-600 truncate">${src}</p>
        </a>`;
    }).join('');
}

// ─── Converter ────────────────────────────────────────────────────────────────

function runConverter() {
    if (!API.rates) return;
    const amount = parseFloat(document.getElementById('convAmount')?.value) || 0;
    const from = document.getElementById('convFrom')?.value;
    const to = document.getElementById('convTo')?.value;
    const resEl = document.getElementById('convResult');
    const infoEl = document.getElementById('convRateInfo');
    const invEl = document.getElementById('convInverse');
    if (!resEl) return;

    const rF = API.rates[from] || 1;
    const rT = API.rates[to] || 1;
    const cross = rT / rF;
    const result = amount * cross;

    const toInfo = CURRENCY_INFO[to] || {};
    const fromInfo = CURRENCY_INFO[from] || {};

    resEl.innerHTML = `<span class="text-lg font-medium text-gray-400">${toInfo.flag || ''} ${to}</span> ${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    infoEl.textContent = `1 ${from} = ${cross.toFixed(4)} ${to}`;
    invEl.textContent = `1 ${to} = ${(1 / cross).toFixed(4)} ${from}`;
}

// ─── Rate Flash on Update ─────────────────────────────────────────────────────

function flashRow(cur, up) {
    const row = document.getElementById(`fxrow-${cur}`);
    if (!row) return;
    row.classList.remove('rate-flash-up', 'rate-flash-down');
    void row.offsetWidth; // reflow
    row.classList.add(up ? 'rate-flash-up' : 'rate-flash-down');
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    // ── Sessions: initial + refresh every 60s ──
    renderSessions();
    setInterval(renderSessions, 60_000);

    // ── Clock ──
    updateClock();
    setInterval(updateClock, 1000);

    // ── Base currency selector ──
    const baseSelector = document.getElementById('baseCurrencySelector');
    if (baseSelector) {
        baseSelector.addEventListener('change', e => {
            prevRates = {};
            rateHistory = {};
            document.getElementById('fxRateBody').innerHTML =
                `<tr><td colspan="5" class="px-5 py-10 text-center text-gray-500">
                  <i class="fa-solid fa-spinner fa-spin mr-2 text-primary"></i>Fetching ${e.target.value} rates...
                </td></tr>`;
            API.fetchForex(e.target.value);
        });
    }

    // ── Forex updated event ──
    document.addEventListener('forexUpdated', () => {
        if (!API.rates) return;

        // Track history
        Object.entries(API.rates).forEach(([cur, rate]) => {
            if (!rateHistory[cur]) rateHistory[cur] = [];
            rateHistory[cur].push(rate);
            if (rateHistory[cur].length > 10) rateHistory[cur].shift();

            // Flash changed cells
            if (prevRates[cur] && prevRates[cur] !== rate) {
                flashRow(cur, rate > prevRates[cur]);
            }
        });

        renderRateTable();
        renderMajorStrip();
        runConverter();
    });

    // ── News updated ──
    document.addEventListener('newsUpdated', renderNews);

    // ── Converter controls ──
    ['convAmount', 'convFrom', 'convTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', runConverter);
        if (el) el.addEventListener('change', runConverter);
    });

    const swapBtn = document.getElementById('convSwap');
    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            const f = document.getElementById('convFrom');
            const t = document.getElementById('convTo');
            const tmp = f.value; f.value = t.value; t.value = tmp;
            swapBtn.classList.add('rotate-180');
            setTimeout(() => swapBtn.classList.remove('rotate-180'), 300);
            runConverter();
        });
    }

    // ── Mobile nav ──
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const closeMobileNav = document.getElementById('closeMobileNav');

    const openMNav = () => { mobileNav.classList.remove('hidden'); setTimeout(() => { mobileNav.classList.remove('opacity-0'); mobileNavMenu.classList.remove('translate-x-full'); }, 10); };
    const closeMNav = () => { mobileNav.classList.add('opacity-0'); mobileNavMenu.classList.add('translate-x-full'); setTimeout(() => mobileNav.classList.add('hidden'), 300); };

    mobileMenuBtn?.addEventListener('click', openMNav);
    closeMobileNav?.addEventListener('click', closeMNav);
    mobileNav?.addEventListener('click', e => { if (e.target === mobileNav) closeMNav(); });

    // ── If API already has rates loaded (from api.js init), render immediately ──
    if (API.rates) {
        renderRateTable();
        renderMajorStrip();
        runConverter();
    }
    if (API.news) renderNews();
});
