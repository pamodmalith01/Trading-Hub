/**
 * dashboard.js — Overview page widgets
 * Renders: Ticker, Sessions, Stat Cards, Forex/Crypto/CSE/News widgets
 */

// ── Market Sessions ───────────────────────────────────────────────────────────
const SESSIONS = [
    { name: 'Sydney', icon: '🇦🇺', open: 21, close: 6, tz: 'AEST', color: '#06b6d4' },
    { name: 'Tokyo', icon: '🇯🇵', open: 0, close: 9, tz: 'JST', color: '#f59e0b' },
    { name: 'London', icon: '🇬🇧', open: 8, close: 17, tz: 'GMT', color: '#8b5cf6' },
    { name: 'New York', icon: '🇺🇸', open: 13, close: 22, tz: 'EST', color: '#3b82f6' },
];

function isOpen(s) {
    const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
    return s.open < s.close ? (h >= s.open && h < s.close) : (h >= s.open || h < s.close);
}

function hoursInfo(s) {
    const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
    if (isOpen(s)) { const r = ((s.close - h + 24) % 24); return `Closes ~${r.toFixed(0)}h`; }
    const u = ((s.open - h + 24) % 24); return `Opens ~${u.toFixed(0)}h`;
}

function renderSessions() {
    const el = document.getElementById('sessionStrip');
    if (!el) return;
    el.innerHTML = SESSIONS.map(s => {
        const open = isOpen(s);
        return `
        <div class="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${open ? 'sess-open border-accent/30' : 'sess-closed border-glassborder glass-card'}">
            <span class="text-xl">${s.icon}</span>
            <div>
                <p class="text-xs font-bold text-white leading-none">${s.name}</p>
                <p class="text-[10px] text-gray-500">${s.tz}</p>
            </div>
            <div class="ml-2 text-right">
                <div class="flex items-center gap-1 justify-end">
                    <span class="w-1.5 h-1.5 rounded-full ${open ? 'bg-accent pulse-dot' : 'bg-gray-600'}"></span>
                    <span class="text-[10px] font-bold ${open ? 'text-accent' : 'text-gray-500'}">${open ? 'OPEN' : 'CLOSED'}</span>
                </div>
                <p class="text-[9px] text-gray-600">${hoursInfo(s)}</p>
            </div>
        </div>`;
    }).join('');
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtPrice(p) { return p >= 1000 ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.toFixed(4); }
function pctBadge(pct) {
    const up = pct >= 0;
    const cls = up ? 'text-accent bg-accent/10 border-accent/25' : 'text-danger bg-danger/10 border-danger/25';
    const ic = up ? 'fa-caret-up' : 'fa-caret-down';
    return `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cls} inline-flex items-center gap-1"><i class="fa-solid ${ic} text-[9px]"></i>${Math.abs(pct).toFixed(2)}%</span>`;
}

// ── Sidebar clock ─────────────────────────────────────────────────────────────
function startClock() {
    const el = document.getElementById('sidebarClock');
    const lu = document.getElementById('lastUpdatedTime');
    const tick = () => {
        const t = new Date().toLocaleTimeString('en-GB');
        if (el) el.textContent = t;
        if (lu) lu.textContent = 'Updated ' + t;
    };
    tick(); setInterval(tick, 1000);
}

// ── Stat Cards ────────────────────────────────────────────────────────────────
function updateStatCards() {
    // BTC
    if (API.crypto && API.crypto['bitcoin']) {
        const d = API.crypto['bitcoin'];
        const el = document.getElementById('btcPrice');
        const pe = document.getElementById('btcPct');
        if (el) el.textContent = '$' + d.usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        if (pe) pe.outerHTML = pctBadge(d.usd_24h_change).replace('<span', '<span id="btcPct"');
    }
    // ETH
    if (API.crypto && API.crypto['ethereum']) {
        const d = API.crypto['ethereum'];
        const el = document.getElementById('ethPrice');
        if (el) el.textContent = '$' + d.usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const pe = document.getElementById('ethPct');
        if (pe) pe.outerHTML = pctBadge(d.usd_24h_change).replace('<span', '<span id="ethPct"');
    }
    // EUR/USD
    if (API.rates && API.rates['EUR']) {
        const el = document.getElementById('eurusdPrice');
        if (el) el.textContent = (1 / API.rates['EUR']).toFixed(4);
    }
    // USD/LKR
    if (API.rates && API.rates['LKR']) {
        const el = document.getElementById('lkrPrice');
        if (el) el.textContent = API.rates['LKR'].toFixed(2);
    }
}

// ── Forex Widget ──────────────────────────────────────────────────────────────
const FOREX_PAIRS = [
    { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
    { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
    { code: 'JPY', flag: '🇯🇵', name: 'Japanese Yen' },
    { code: 'AUD', flag: '🇦🇺', name: 'Australian $' },
    { code: 'LKR', flag: '🇱🇰', name: 'Sri Lanka Rupee' },
    { code: 'INR', flag: '🇮🇳', name: 'Indian Rupee' },
];

let prevForex = {};

function renderForexWidget() {
    const cont = document.getElementById('forexWidgetCont');
    if (!cont || !API.rates) return;
    cont.innerHTML = FOREX_PAIRS.map(p => {
        const rate = API.rates[p.code];
        if (!rate) return '';
        const prev = prevForex[p.code] || rate;
        const change = rate - prev;
        const isUp = change >= 0;
        const digits = (p.code === 'JPY' || p.code === 'LKR' || p.code === 'INR') ? 2 : 4;
        const tclass = isUp ? 'text-accent' : 'text-danger';
        const arrow = isUp ? '▲' : '▼';
        return `
        <div class="flex items-center justify-between px-5 py-3 hover:bg-white/4 transition-colors" id="fxw-${p.code}">
            <div class="flex items-center gap-2.5">
                <span class="text-lg">${p.flag}</span>
                <div>
                    <p class="text-xs font-bold text-white">USD/${p.code}</p>
                    <p class="text-[10px] text-gray-600">${p.name}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-sm font-mono font-bold text-white">${rate.toFixed(digits)}</p>
                <p class="text-[10px] ${tclass} font-semibold">${arrow} ${Math.abs(change).toFixed(digits)}</p>
            </div>
        </div>`;
    }).join('');
    FOREX_PAIRS.forEach(p => { if (API.rates[p.code]) prevForex[p.code] = API.rates[p.code]; });
}

// ── Crypto Widget ─────────────────────────────────────────────────────────────
const CRYPTO_LIST = [
    { id: 'bitcoin', sym: 'BTC', icon: 'fa-bitcoin', iconCls: 'fa-brands', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/25' },
    { id: 'ethereum', sym: 'ETH', icon: 'fa-ethereum', iconCls: 'fa-brands', color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/25' },
    { id: 'solana', sym: 'SOL', icon: 'fa-sun', iconCls: 'fa-solid', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/25' },
    { id: 'binancecoin', sym: 'BNB', icon: 'fa-coins', iconCls: 'fa-solid', color: 'text-gold', bg: 'bg-gold/15', border: 'border-gold/25' },
    { id: 'ripple', sym: 'XRP', icon: 'fa-droplet', iconCls: 'fa-solid', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/25' },
    { id: 'cardano', sym: 'ADA', icon: 'fa-circle', iconCls: 'fa-solid', color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/25' },
];

function renderCryptoWidget() {
    const cont = document.getElementById('cryptoWidgetCont');
    if (!cont || !API.crypto) return;
    let html = '';
    CRYPTO_LIST.forEach(a => {
        const d = API.crypto[a.id]; if (!d) return;
        const isUp = d.usd_24h_change >= 0;
        const tclass = isUp ? 'text-accent' : 'text-danger';
        const icPct = isUp ? 'fa-caret-up' : 'fa-caret-down';
        html += `
        <div class="flex items-center justify-between px-5 py-3 hover:bg-white/4 transition-colors">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl ${a.bg} border ${a.border} flex items-center justify-center shrink-0">
                    <i class="${a.iconCls} ${a.icon} ${a.color} text-sm"></i>
                </div>
                <div>
                    <p class="text-xs font-bold text-white">${a.sym}</p>
                    <p class="text-[10px] text-gray-600 capitalize">${a.id}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-sm font-mono font-bold text-white">$${d.usd >= 1 ? d.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : d.usd.toFixed(4)}</p>
                <p class="text-[10px] font-bold ${tclass} flex items-center justify-end gap-0.5">
                    <i class="fa-solid ${icPct}"></i>${Math.abs(d.usd_24h_change).toFixed(2)}%
                </p>
            </div>
        </div>`;
    });
    cont.innerHTML = html;
}

// ── CSE Widget ────────────────────────────────────────────────────────────────
let prevCSE = {};

function renderCSEWidget(e) {
    const cont = document.getElementById('cseWidgetCont');
    if (!cont || !API.cseData) return;
    const d = API.cseData;

    const aspiUp = d.aspi.change >= 0;
    const sp20Up = d.sp20.change >= 0;

    let html = `
    <div class="grid grid-cols-2 gap-2 mb-3">
        <div class="rounded-xl bg-black/40 border border-glassborder p-3 text-center">
            <p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">ASPI</p>
            <p class="text-sm font-black text-white">${d.aspi.value.toFixed(0)}</p>
            <p class="text-[10px] font-bold ${aspiUp ? 'text-accent' : 'text-danger'}">
                ${aspiUp ? '▲' : '▼'} ${Math.abs(d.aspi.change).toFixed(1)}
            </p>
        </div>
        <div class="rounded-xl bg-black/40 border border-glassborder p-3 text-center">
            <p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">S&P SL20</p>
            <p class="text-sm font-black text-white">${d.sp20.value.toFixed(0)}</p>
            <p class="text-[10px] font-bold ${sp20Up ? 'text-accent' : 'text-danger'}">
                ${sp20Up ? '▲' : '▼'} ${Math.abs(d.sp20.change).toFixed(1)}
            </p>
        </div>
    </div>
    <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Top Active Stocks</p>
    <div class="space-y-1.5">`;

    d.stocks.slice(0, 5).forEach(s => {
        const isUp = s.change >= 0;
        const wasUp = prevCSE[s.sym] ? s.price >= prevCSE[s.sym] : true;
        const flash = e?.type === 'cseLiveUpdated' ? (wasUp ? 'flash-g' : 'flash-r') : '';
        html += `
        <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 border border-transparent hover:border-glassborder transition-all ${flash}">
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white">${s.sym}</span>
                <span class="text-[9px] text-gray-600">${s.vol}</span>
            </div>
            <div class="text-right">
                <span class="text-xs font-mono font-bold text-white">${s.price.toFixed(2)}</span>
                <span class="text-[9px] font-bold ml-1.5 ${isUp ? 'text-accent' : 'text-danger'}">${isUp ? '▲' : '▼'}${Math.abs(s.change).toFixed(2)}</span>
            </div>
        </div>`;
        prevCSE[s.sym] = s.price;
    });

    html += `</div>`;
    cont.innerHTML = html;
}

// ── News Widget ───────────────────────────────────────────────────────────────
const CAT_MAP = {
    'BTC': { label: 'Crypto', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25' },
    'ETH': { label: 'Crypto', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25' },
    'FIAT': { label: 'Forex', cls: 'text-primary  bg-primary/10  border-primary/25' },
    'CSE': { label: 'CSE', cls: 'text-accent    bg-accent/10   border-accent/25' },
};

function getNewsTag(cats) {
    if (!cats) return CAT_MAP['ETH'];
    const up = cats.toUpperCase();
    if (up.includes('FIAT') || up.includes('FOREX')) return CAT_MAP['FIAT'];
    if (up.includes('CSE')) return CAT_MAP['CSE'];
    return CAT_MAP['BTC'];
}

function renderNewsWidget() {
    const cont = document.getElementById('newsWidgetCont');
    if (!cont || !API.news || API.news.length === 0) return;

    cont.innerHTML = API.news.slice(0, 8).map((n, i) => {
        const tag = getNewsTag(n.categories);
        const src = n.source_info?.name || n.source || 'Market';
        const ts = new Date((n.published_on || (Date.now() / 1000)) * 1000);
        const time = ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const img = n.imageurl || '';
        const isLive = n.is_live_update;
        const body = (n.body || '').substring(0, 80) + '...';

        return `
        <a href="${n.url || '#'}" target="_blank"
           class="glass-card rounded-xl border border-glassborder hover:border-primary/40 transition-all group overflow-hidden flex flex-col fade-up"
           style="animation-delay:${i * 0.05}s">
            ${img ? `<div class="h-24 bg-cover bg-center rounded-t-xl opacity-80 group-hover:opacity-100 transition-opacity" style="background-image:url('${img}')"></div>` : ''}
            <div class="p-3.5 flex flex-col flex-1">
                <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${tag.cls}">${tag.label}</span>
                    <div class="flex items-center gap-1 shrink-0">
                        ${isLive ? '<span class="pulse-dot w-1.5 h-1.5 rounded-full bg-accent"></span>' : ''}
                        <span class="text-[10px] text-gray-500">${time}</span>
                    </div>
                </div>
                <h4 class="text-xs font-semibold text-gray-200 leading-snug flex-1 group-hover:text-white transition-colors line-clamp-3">${n.title}</h4>
                <p class="text-[10px] text-gray-600 mt-2 truncate">${src}</p>
            </div>
        </a>`;
    }).join('');
}

// ── Ticker Tape ───────────────────────────────────────────────────────────────
function renderTicker() {
    const el = document.getElementById('globalTicker');
    if (!el) return;
    let items = [];

    if (API.rates) {
        [['EUR', '🇪🇺'], ['GBP', '🇬🇧'], ['JPY', '🇯🇵'], ['LKR', '🇱🇰'], ['AUD', '🇦🇺'], ['CAD', '🇨🇦'], ['CHF', '🇨🇭']].forEach(([cur, flag]) => {
            const r = API.rates[cur];
            if (r) items.push(`<span class="inline-flex items-center gap-1.5 mr-8">${flag} <strong class="text-gray-300">USD/${cur}</strong> <span class="text-white font-mono">${cur === 'JPY' || cur === 'LKR' ? r.toFixed(2) : r.toFixed(4)}</span></span>`);
        });
    }
    if (API.crypto) {
        [['bitcoin', '₿ BTC'], ['ethereum', 'Ξ ETH'], ['solana', 'SOL'], ['binancecoin', 'BNB']].forEach(([id, label]) => {
            const d = API.crypto[id];
            if (d) {
                const up = d.usd_24h_change >= 0;
                items.push(`<span class="inline-flex items-center gap-1.5 mr-8"><strong class="text-gray-300">${label}</strong> <span class="text-white font-mono">$${d.usd >= 1 ? d.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : d.usd.toFixed(4)}</span> <span class="${up ? 'text-accent' : 'text-danger'} text-[10px]">${up ? '▲' : '▼'}${Math.abs(d.usd_24h_change).toFixed(2)}%</span></span>`);
            }
        });
    }

    if (!items.length) return;
    const inner = items.join('') + items.join(''); // duplicate for seamless loop
    el.innerHTML = inner;
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    startClock();
    renderSessions();
    setInterval(renderSessions, 60_000);

    // Mobile nav
    const mmb = document.getElementById('mobileMenuBtn');
    const mn = document.getElementById('mobileNav');
    const mnm = document.getElementById('mobileNavMenu');
    const cmn = document.getElementById('closeMobileNav');
    const openM = () => { mn.classList.remove('hidden'); setTimeout(() => { mn.classList.remove('opacity-0'); mnm.classList.remove('translate-x-full'); }, 10); };
    const closeM = () => { mn.classList.add('opacity-0'); mnm.classList.add('translate-x-full'); setTimeout(() => mn.classList.add('hidden'), 300); };
    mmb?.addEventListener('click', openM);
    cmn?.addEventListener('click', closeM);
    mn?.addEventListener('click', e => { if (e.target === mn) closeM(); });

    // API events
    document.addEventListener('forexUpdated', () => { renderForexWidget(); renderTicker(); updateStatCards(); });
    document.addEventListener('cryptoUpdated', () => { renderCryptoWidget(); renderTicker(); updateStatCards(); });
    document.addEventListener('cseUpdated', renderCSEWidget);
    document.addEventListener('cseLiveUpdated', renderCSEWidget);
    document.addEventListener('newsUpdated', renderNewsWidget);

    // If API already loaded
    if (API.rates) { renderForexWidget(); updateStatCards(); }
    if (API.crypto) { renderCryptoWidget(); updateStatCards(); }
    if (API.cseData) { renderCSEWidget(); }
    if (API.news) { renderNewsWidget(); }
    renderTicker();
});
