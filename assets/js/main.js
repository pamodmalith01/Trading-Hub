/**
 * main.js — Global UI: Toast system, Live pulse, Ticker, Mobile nav
 * Loaded on EVERY page before page-specific JS
 */

// ══════════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM (global, injected on every page)
// ══════════════════════════════════════════════════════════════════════════════

(function buildToastContainer() {
    if (document.getElementById('toastContainer')) return;
    const el = document.createElement('div');
    el.id = 'toastContainer';
    el.style.cssText = `
        position:fixed; bottom:20px; right:20px; z-index:99999;
        display:flex; flex-direction:column-reverse; gap:10px;
        max-width:340px; pointer-events:none;
    `;
    document.body.appendChild(el);
})();

const TOAST_ICONS = {
    forex: { icon: 'fa-globe', color: '#3b82f6', label: 'FOREX' },
    crypto: { icon: 'fa-bitcoin', color: '#f59e0b', label: 'CRYPTO' },
    cse: { icon: 'fa-building', color: '#8b5cf6', label: 'CSE' },
    info: { icon: 'fa-circle-info', color: '#10b981', label: 'UPDATE' },
};

let _toastQueue = [];
let _toastActive = 0;
const MAX_TOASTS = 3;

function _showToast(message, type = 'crypto', duration = 6000) {
    // Deduplicate — same message within 10s
    const key = message.substring(0, 40);
    if (_toastQueue.includes(key)) return;
    _toastQueue.push(key);
    setTimeout(() => { _toastQueue = _toastQueue.filter(k => k !== key); }, 10000);

    if (_toastActive >= MAX_TOASTS) return;
    _toastActive++;

    const cfg = TOAST_ICONS[type] || TOAST_ICONS.info;
    const cont = document.getElementById('toastContainer');
    if (!cont) return;

    const toast = document.createElement('div');
    toast.style.cssText = `
        pointer-events:all;
        background: rgba(15, 23, 42, 0.97);
        border: 1px solid rgba(255,255,255,0.12);
        border-left: 3px solid ${cfg.color};
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        display: flex; align-items: flex-start; gap: 10px;
        transform: translateX(120%);
        transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
        opacity: 0; max-width: 340px; cursor:pointer;
    `;

    toast.innerHTML = `
        <div style="width:32px;height:32px;border-radius:8px;background:${cfg.color}18;border:1px solid ${cfg.color}35;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">
            <i class="fa-solid ${cfg.icon}" style="color:${cfg.color};font-size:13px"></i>
        </div>
        <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:9px;font-weight:700;color:${cfg.color};text-transform:uppercase;letter-spacing:1px">${cfg.label} UPDATE</span>
                <span style="font-size:9px;color:#4b5563">${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p style="font-size:11px;color:#e2e8f0;line-height:1.4;margin:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${message}</p>
        </div>
        <button onclick="this.closest('div[style]').remove()" style="color:#4b5563;hover:color:white;flex-shrink:0;font-size:12px;line-height:1;padding:2px;background:none;border:none;cursor:pointer;margin-top:-1px">✕</button>
    `;

    // Click to dismiss
    toast.addEventListener('click', () => dismissToast(toast));

    cont.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });

    // Auto-dismiss
    const timer = setTimeout(() => dismissToast(toast), duration);
    toast._timer = timer;

    return toast;
}

function dismissToast(toast) {
    if (toast._dismissed) return;
    toast._dismissed = true;
    clearTimeout(toast._timer);
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => { toast.remove(); _toastActive = Math.max(0, _toastActive - 1); }, 350);
}

// ── Live Pulse Indicator (top of every page) ──────────────────────────────────
function updateLivePulse() {
    const el = document.getElementById('lastUpdatedTime');
    if (el) el.textContent = 'Live · ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

setInterval(updateLivePulse, 1000);

// ── Ticker Tape (index.html & forex.html have different IDs so we fill both) ──
function _buildTickerContent() {
    let items = [];
    if (API.rates) {
        [
            ['EUR', '🇪🇺'], ['GBP', '🇬🇧'], ['JPY', '🇯🇵'], ['LKR', '🇱🇰'],
            ['AUD', '🇦🇺'], ['CAD', '🇨🇦'], ['CHF', '🇨🇭'], ['SGD', '🇸🇬'],
        ].forEach(([cur, flag]) => {
            const r = API.rates[cur];
            if (!r) return;
            const digits = (cur === 'JPY' || cur === 'LKR' || cur === 'INR') ? 2 : 4;
            items.push(`<span class="inline-flex items-center gap-1.5 mx-5 shrink-0">${flag} <strong class="text-gray-400 text-[11px]">USD/${cur}</strong> <span class="text-white font-mono text-[11px]">${r.toFixed(digits)}</span></span><span class="text-gray-700 mx-1">|</span>`);
        });
    }
    if (API.crypto) {
        [
            ['bitcoin', '₿ BTC', '#f59e0b'],
            ['ethereum', 'Ξ ETH', '#818cf8'],
            ['solana', '◎ SOL', '#a855f7'],
            ['binancecoin', '⬡ BNB', '#f59e0b'],
            ['ripple', '✦ XRP', '#60a5fa'],
        ].forEach(([id, label, col]) => {
            const d = API.crypto[id];
            if (!d) return;
            const up = d.usd_24h_change >= 0;
            const pct = Math.abs(d.usd_24h_change).toFixed(2);
            const prc = d.usd >= 1 ? d.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : d.usd.toFixed(4);
            items.push(`<span class="inline-flex items-center gap-1.5 mx-5 shrink-0"><strong style="color:${col}" class="text-[11px]">${label}</strong> <span class="text-white font-mono text-[11px]">$${prc}</span> <span class="text-[10px] font-bold ${up ? 'text-emerald-400' : 'text-red-400'}">${up ? '▲' : '▼'}${pct}%</span></span><span class="text-gray-700 mx-1">|</span>`);
        });
    }
    return items.join('');
}

function updateTicker() {
    const ticker = document.getElementById('globalTicker');
    if (!ticker) return;
    if (!API.crypto && !API.rates) return;
    const content = _buildTickerContent();
    if (!content) return;
    // Duplicate for seamless infinite loop
    ticker.innerHTML = content + content;
}

document.addEventListener('cryptoUpdated', updateTicker);
document.addEventListener('forexUpdated', updateTicker);
document.addEventListener('newsUpdated', (e) => {
    // Show toast for new news if not already shown by api.js (e.g. on non-originating tab)
    // api.js already calls _showToast; this is a fallback for pages that don't have api.js inited
});

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Mobile nav (shared across all pages)
    const mmb = document.getElementById('mobileMenuBtn');
    const mn = document.getElementById('mobileNav');
    const mnm = document.getElementById('mobileNavMenu');
    const cmn = document.getElementById('closeMobileNav');

    if (mmb && mn) {
        mmb.addEventListener('click', () => {
            mn.classList.remove('hidden');
            setTimeout(() => { mn.classList.remove('opacity-0'); mnm?.classList.remove('translate-x-full'); }, 10);
        });
    }
    if (cmn) {
        cmn.addEventListener('click', () => {
            mn?.classList.add('opacity-0');
            mnm?.classList.add('translate-x-full');
            setTimeout(() => mn?.classList.add('hidden'), 300);
        });
    }
    mn?.addEventListener('click', e => {
        if (e.target === mn) {
            mn.classList.add('opacity-0');
            mnm?.classList.add('translate-x-full');
            setTimeout(() => mn.classList.add('hidden'), 300);
        }
    });

    // Boot API
    API.init();

    // Welcome toast after 2s
    setTimeout(() => _showToast('Live market data connected — auto-updating every 20–30 seconds', 'info', 5000), 2000);
});

// ── Global helpers (used by dashboard.js, forex.js, cse.js, etc.) ────────────
function formatCur(val, decimals = 2) {
    if (val === null || val === undefined) return '0.00';
    return Number(val).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}
