/**
 * cse.js
 * Dedicated logic for Colombo Stock Exchange
 * Contains real-time mockup UI updates to flash greens and reds
 */

document.addEventListener('DOMContentLoaded', () => {

    // Render the layout once on first generation
    document.addEventListener('cseUpdated', renderInitialCseView);
    // Render the dynamic updating prices every tick
    document.addEventListener('cseLiveUpdated', renderLiveUpdates);

    function renderInitialCseView() {
        renderIndices();
        renderSummaryStats();
        renderGainersTable();
    }

    function renderIndices() {
        const cont = document.getElementById('cseIndicesCont');
        if (!cont || !API.cseData) return;

        const indices = [
            { name: "All Share Price Index", sym: "ASPI", ...API.cseData.aspi },
            { name: "S&P Sri Lanka 20", sym: "S&P SL20", ...API.cseData.sp20 }
        ];

        let html = '';
        indices.forEach(idx => {
            const isUp = idx.change >= 0;
            const color = isUp ? 'text-accent' : 'text-danger';
            const icon = isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
            const pct = ((idx.change / (idx.value - idx.change)) * 100).toFixed(2);

            html += `
                <div class="glass-card rounded-2xl p-6 border border-glassborder relative overflow-hidden group">
                    <div class="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/5 flex items-center justify-center pointer-events-none">
                        <i class="fa-solid ${icon} ${color} text-xl opacity-50"></i>
                    </div>
                    <p class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">${idx.sym}</p>
                    <p class="text-[10px] text-gray-500 mb-3">${idx.name}</p>
                    
                    <h3 class="text-2xl font-bold text-white mb-1" id="val_${idx.sym.replace(/[^a-zA-Z]/g, '')}">${formatCur(idx.value, 2)}</h3>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded ${isUp ? 'bg-accent/20 text-accent' : 'bg-danger/20 text-danger'} text-xs font-bold" id="chg_${idx.sym.replace(/[^a-zA-Z]/g, '')}">
                            ${isUp ? '+' : ''}${Math.abs(idx.change).toFixed(2)} (${pct}%)
                        </span>
                    </div>
                </div>
            `;
        });

        // Add fake Turnover and Volume boxes
        html += `
            <div class="glass-card rounded-2xl p-6 border border-glassborder">
                <p class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">Market Turnover</p>
                <h3 class="text-2xl font-bold text-white mb-1">1.25B</h3>
                <p class="text-xs text-gray-500">LKR - Daily Cumulative</p>
            </div>
            <div class="glass-card rounded-2xl p-6 border border-glassborder">
                <p class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">Market Volume</p>
                <h3 class="text-2xl font-bold text-white mb-1">45.2M</h3>
                <p class="text-xs text-gray-500">Shares Traded</p>
            </div>
        `;
        cont.innerHTML = html;
        cont.classList.add('fade-in');
    }

    function renderSummaryStats() {
        const cont = document.getElementById('cseSummaryStats');
        if (!cont) return;

        cont.innerHTML = `
            <div class="flex justify-between items-center text-sm py-2 border-b border-white/5">
                <span class="text-gray-400">Market capitalization</span>
                <span class="text-white font-semibold">LKR 4,682 Bn</span>
            </div>
            <div class="flex justify-between items-center text-sm py-2 border-b border-white/5">
                <span class="text-gray-400">Market PER</span>
                <span class="text-white font-semibold">10.42</span>
            </div>
            <div class="flex justify-between items-center text-sm py-2 border-b border-white/5">
                <span class="text-gray-400">Market PBV</span>
                <span class="text-white font-semibold">1.12</span>
            </div>
            <div class="flex justify-between items-center text-sm py-2 border-b border-white/5">
                <span class="text-gray-400">DY</span>
                <span class="text-white font-semibold">3.2%</span>
            </div>
            <div class="flex justify-between items-center text-sm py-2 border-b border-white/5">
                <span class="text-gray-400">Trades</span>
                <span class="text-white font-semibold flex items-center gap-2">12,405 <span class="w-2 h-2 rounded-full bg-accent animate-ping"></span></span>
            </div>
            <div class="mt-6 p-4 rounded-xl bg-gradient-to-r from-secondary/20 to-primary/20 border border-white/10 text-center">
                <h4 class="text-sm font-bold text-white uppercase tracking-widest mb-1">Market Sentiment</h4>
                <div class="flex gap-1 mt-3">
                    <div class="h-2 rounded bg-accent w-2/3"></div>
                    <div class="h-2 rounded bg-gray-500 w-1/6"></div>
                    <div class="h-2 rounded bg-danger w-1/6"></div>
                </div>
                <div class="flex justify-between text-[10px] text-gray-400 mt-1 font-semibold uppercase">
                    <span>Advancing (120)</span>
                    <span>No Chg</span>
                    <span>Declining (45)</span>
                </div>
            </div>
        `;
    }

    function renderGainersTable() {
        const tbody = document.getElementById('cseGainersTable');
        if (!tbody || !API.cseData) return;

        let stocks = [...API.cseData.stocks].sort((a, b) => b.change - a.change); // Sort by change desc for "Gainers"

        let html = '';
        stocks.forEach(s => {
            const isUp = s.change >= 0;
            const pct = ((s.change / (s.price - s.change)) * 100).toFixed(2);

            html += `
                <tr class="hover:bg-white/5 transition-colors group cursor-pointer" id="tr_${s.sym}">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded shrink-0 bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xs">
                                ${s.sym.substring(0, 2)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-white group-hover:text-secondary transition-colors">${s.sym}</p>
                                <p class="text-[10px] text-gray-500">${s.name}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <span class="text-sm font-bold text-white" id="price_${s.sym}">${formatCur(s.price)}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <span class="text-xs text-gray-400 px-2 py-1 rounded bg-black/40 border border-white/5">${s.vol}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <span class="text-sm font-semibold flex items-center justify-end gap-1 ${isUp ? 'text-accent' : 'text-danger'}">
                            ${formatCur(Math.abs(s.change))} <span class="text-[10px]">(${pct}%)</span>
                        </span>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // Handles rapid partial DOM updates based on mock real-time events to avoid full re-render
    function renderLiveUpdates(e) {
        if (!e.detail || !e.detail.stocks) return;

        // Flash ASPI update
        const aspiVal = document.getElementById('val_ASPI');
        if (aspiVal) {
            aspiVal.innerText = formatCur(e.detail.aspi, 2);
            aspiVal.classList.remove('price-up', 'price-down');
            void aspiVal.offsetWidth; // trigger reflow
            aspiVal.classList.add(Math.random() > 0.5 ? 'price-up' : 'price-down');
        }

        // Only update prices on table rows without full repaint to let CSS flash animations work correctly
        e.detail.stocks.forEach(s => {
            let priceEl = document.getElementById(`price_${s.sym}`);
            if (priceEl) {
                let oldPrice = parseFloat(priceEl.innerText.replace(/,/g, ''));
                if (s.price !== oldPrice) {
                    priceEl.innerText = formatCur(s.price);

                    priceEl.classList.remove('price-up', 'price-down');
                    // Force reflow
                    void priceEl.offsetWidth;
                    if (s.price > oldPrice) {
                        priceEl.classList.add('price-up');
                    } else if (s.price < oldPrice) {
                        priceEl.classList.add('price-down');
                    }
                }
            }
        });
    }

});
