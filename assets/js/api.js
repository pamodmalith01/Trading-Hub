/**
 * api.js — Unified real-time data engine
 * Handles Forex, Crypto, News, CSE with aggressive polling
 * Broadcasts events site-wide + cross-tab via BroadcastChannel
 */

const API = {
    // ── Shared State ──────────────────────────────────────────────────────────
    rates: null,
    baseCurrency: 'USD',
    crypto: null,
    cryptoList: null,
    news: null,
    cseData: null,

    symbolsMap: {
        EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
        AUD: 'Australian Dollar', CAD: 'Canadian Dollar', CHF: 'Swiss Franc',
        CNY: 'Chinese Yuan', INR: 'Indian Rupee', LKR: 'Sri Lankan Rupee',
        ZAR: 'South African Rand', SGD: 'Singapore Dollar', AED: 'UAE Dirham',
        NZD: 'New Zealand Dollar', MYR: 'Malaysian Ringgit', HKD: 'Hong Kong Dollar',
        NOK: 'Norwegian Krone', SEK: 'Swedish Krona', TRY: 'Turkish Lira',
        BRL: 'Brazilian Real'
    },

    // ── Cross-tab broadcast ───────────────────────────────────────────────────
    _bc: (() => {
        try { return new BroadcastChannel('tradinghub_realtime'); }
        catch (e) { return null; }
    })(),

    _broadcast(type, payload) {
        if (this._bc) {
            try { this._bc.postMessage({ type, payload, ts: Date.now() }); }
            catch (e) { }
        }
    },

    _dispatch(eventName, detail = null) {
        document.dispatchEvent(detail
            ? new CustomEvent(eventName, { detail })
            : new Event(eventName));
    },

    // ── Init ─────────────────────────────────────────────────────────────────
    async init() {
        // Initial load — all parallel
        await Promise.allSettled([
            this.fetchForex(),
            this.fetchCrypto(),
            this.fetchNews(),
        ]);
        this.initCSE();
        this._startPolling();
        this._listenBroadcast();
    },

    _startPolling() {
        // Forex: every 30s
        setInterval(() => this.fetchForex(this.baseCurrency), 30_000);
        // Crypto: every 20s
        setInterval(() => this.fetchCrypto(), 20_000);
        // News: every 25s
        setInterval(() => this.fetchNews(), 25_000);
        // CSE live simulation: every 3s
        setInterval(() => this.updateCSE(), 3_000);
        // Live news simulation stream: every 8s
        this._startLiveNewsStream();
    },

    _listenBroadcast() {
        if (!this._bc) return;
        this._bc.onmessage = (ev) => {
            const { type, payload } = ev.data || {};
            switch (type) {
                case 'NEWS_ARRIVAL':
                    if (!this.news) this.news = [];
                    this.news.unshift(payload);
                    this._dispatch('newsUpdated', { newArrival: payload, fromBroadcast: true });
                    // Show toast on all tabs
                    _showToast(payload.title, payload.categories?.includes('FIAT') ? 'forex'
                        : payload.categories?.includes('CSE') ? 'cse' : 'crypto');
                    break;
            }
        };
    },

    // ── Forex ─────────────────────────────────────────────────────────────────
    async fetchForex(base = this.baseCurrency) {
        try {
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            this.rates = data.rates;
            this.baseCurrency = base;
            this._dispatch('forexUpdated');
            this._broadcast('FOREX_UPDATED', { rates: data.rates, base });
            return data.rates;
        } catch (err) {
            console.warn('[API] Forex fetch failed:', err.message);
        }
    },

    // ── Crypto ────────────────────────────────────────────────────────────────
    async fetchCrypto() {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();

            this.cryptoList = data;
            this.crypto = {};
            data.forEach(c => {
                this.crypto[c.id] = {
                    usd: c.current_price,
                    usd_24h_change: c.price_change_percentage_24h || 0,
                    symbol: c.symbol.toUpperCase(),
                    market_cap: c.market_cap,
                    volume: c.total_volume,
                    image: c.image,
                    name: c.name,
                };
            });
            this._dispatch('cryptoUpdated');
            this._broadcast('CRYPTO_UPDATED', {});
            return data;
        } catch (err) {
            console.warn('[API] Crypto fetch failed:', err.message);
        }
    },

    // ── News ──────────────────────────────────────────────────────────────────
    _lastNewsIds: new Set(),

    async fetchNews() {
        try {
            const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const fresh = (data.Data || []).slice(0, 20);

            // Detect truly new articles
            const newArrivals = fresh.filter(n => !this._lastNewsIds.has(n.id));
            fresh.forEach(n => this._lastNewsIds.add(n.id));

            if (!this.news) {
                // First load
                this.news = fresh;
                this._dispatch('newsUpdated');
            } else if (newArrivals.length > 0) {
                // Prepend new ones, keep max 30
                newArrivals.forEach(n => this.news.unshift(n));
                if (this.news.length > 30) this.news = this.news.slice(0, 30);

                const latest = newArrivals[0];
                const cat = this._catFromNews(latest);
                this._dispatch('newsUpdated', { newArrival: latest });
                this._broadcast('NEWS_ARRIVAL', { ...latest, _cat: cat });
                // Toast on this tab
                _showToast(latest.title, cat);
            }
            return this.news;
        } catch (err) {
            console.warn('[API] News fetch failed:', err.message);
        }
    },

    _catFromNews(n) {
        const cats = (n.categories || '').toUpperCase();
        if (cats.includes('FIAT') || cats.includes('FOREX')) return 'forex';
        if (cats.includes('CSE')) return 'cse';
        return 'crypto';
    },

    // ── Live news simulation (fills gaps between real API calls) ──────────────
    _startLiveNewsStream() {
        const mock = [
            { title: 'USD/JPY drops below 145 — BOJ Governor signals caution', categories: 'FIAT', source: 'Global FX' },
            { title: 'Bitcoin breaks $70K — institutional demand surges', categories: 'BTC|ETH', source: 'CryptoWatch' },
            { title: 'Eurozone inflation falls — ECB may cut rates early', categories: 'FIAT', source: 'Reuters' },
            { title: 'Ethereum gas fees hit 6-month low after Pectra upgrade', categories: 'BTC|ETH', source: 'Decrypt' },
            { title: 'EXPO reports 15% profit increase in Q4 earnings', categories: 'CSE', source: 'CSE Reports' },
            { title: 'Gold surges to record $2,400 — safe-haven demand rises', categories: 'FIAT', source: 'Bloomberg' },
            { title: 'Solana network hits 65,000 TPS — new record', categories: 'BTC|ETH', source: 'CoinDesk' },
            { title: 'Central Bank of Sri Lanka holds rates — LKR stable', categories: 'CSE|FIAT', source: 'CBSL' },
            { title: 'GBP/USD rallies after UK GDP beats expectations', categories: 'FIAT', source: 'FXStreet' },
            { title: 'JKH announces $200M infrastructure project with global partners', categories: 'CSE', source: 'LBO.lk' },
        ];
        let idx = 0;
        setInterval(() => {
            if (!this.news) this.news = [];
            const m = mock[idx % mock.length];
            const item = {
                ...m,
                id: 'sim_' + Date.now() + '_' + idx,
                published_on: Math.floor(Date.now() / 1000),
                body: m.title,
                url: '#',
                imageurl: '',
                is_live_update: true,
                source_info: { name: m.source },
            };
            this.news.unshift(item);
            if (this.news.length > 30) this.news = this.news.slice(0, 30);

            const cat = this._catFromNews(item);
            this._dispatch('newsUpdated', { newArrival: item });
            this._broadcast('NEWS_ARRIVAL', { ...item, _cat: cat });
            _showToast(item.title, cat);
            idx++;
        }, 12_000); // every 12s a simulated item arrives
    },

    // ── CSE Simulation ───────────────────────────────────────────────────────
    initCSE() {
        const stocks = [
            { sym: 'EXPO', name: 'Expolanka Holdings', price: 145.50, vol: '2.4M' },
            { sym: 'JKH', name: 'John Keells Holdings', price: 188.25, vol: '1.1M' },
            { sym: 'LOLC', name: 'LOLC Holdings', price: 410.00, vol: '450k' },
            { sym: 'SAMP', name: 'Sampath Bank', price: 78.40, vol: '3.2M' },
            { sym: 'COMB', name: 'Commercial Bank', price: 102.50, vol: '1.8M' },
            { sym: 'LIOC', name: 'Lanka IOC', price: 110.20, vol: '900k' },
            { sym: 'BIL', name: 'Browns Investments', price: 5.40, vol: '12M' },
            { sym: 'DIPD', name: 'Dipped Products', price: 29.80, vol: '650k' },
        ];
        this.cseData = {
            aspi: { value: 10450.25, change: 45.30 },
            sp20: { value: 3120.40, change: -12.10 },
            stocks: stocks.map(s => ({ ...s, change: (Math.random() * 4 - 2) }))
        };
        this._dispatch('cseUpdated');
    },

    updateCSE() {
        if (!this.cseData) return;
        this.cseData.stocks.forEach(s => {
            const factor = 1 + (Math.random() * 0.006 - 0.003);
            const oldPrice = s.price;
            s.price = parseFloat((s.price * factor).toFixed(2));
            s.change = parseFloat((s.price - oldPrice).toFixed(2));
        });
        this.cseData.aspi.value += (Math.random() * 8 - 3.5);
        this.cseData.aspi.change = (Math.random() * 20 - 8);
        this.cseData.sp20.value += (Math.random() * 5 - 2.5);
        this.cseData.sp20.change = (Math.random() * 12 - 5);
        this._dispatch('cseLiveUpdated', {
            stocks: this.cseData.stocks,
            aspi: this.cseData.aspi.value,
        });
    },
};
