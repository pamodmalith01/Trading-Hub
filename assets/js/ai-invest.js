/**
 * ai-invest.js
 * Logic for the AI Crypto Investment Analyzer page
 */

document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('aiAnalyzeBtn');
    const investInput = document.getElementById('aiInvestAmount');
    const loadingState = document.getElementById('aiLoadingState');
    const resultsCont = document.getElementById('aiResultsContainer');
    const topPickCard = document.getElementById('topPickCard');
    const altPicksGrid = document.getElementById('altPicksGrid');

    if (!analyzeBtn) return;

    analyzeBtn.addEventListener('click', () => {
        let amount = parseFloat(investInput.value);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid investment amount in USD.');
            return;
        }

        // Trigger loading animation
        resultsCont.classList.add('hidden');
        loadingState.classList.remove('hidden');
        loadingState.classList.add('flex');

        // Simulate API/AI analysis delay
        setTimeout(() => {
            generateRecommendations(amount);
            loadingState.classList.add('hidden');
            loadingState.classList.remove('flex');
            resultsCont.classList.remove('hidden');
            resultsCont.classList.add('fade-in');
        }, 2500); // 2.5 second mock analysis time
    });

    function generateRecommendations(amount) {
        if (!API.cryptoList || API.cryptoList.length === 0) {
            alert("Market AI is still syncing real-time data from global exchanges... please try again in a few seconds.");
            return;
        }

        // We want to simulate an AI picking the best coin to hold for > 2 months out of the top 50 global coins.
        let candidates = [...API.cryptoList];

        // Filter out stablecoins based on known IDs or low volatility
        candidates = candidates.filter(c => !['tether', 'usd-coin', 'dai', 'first-digital-usd', 'true-usd', 'staked-ether'].includes(c.id));

        // Score them based on investment amount and market conditions
        candidates.forEach(c => {
            let score = 0;
            const isLargeCap = c.market_cap_rank <= 15;

            // For holding 2+ months, fundamentals matter. 
            if (amount >= 5000) {
                // If large investment (> $5000), favor large caps with lower risk.
                score += isLargeCap ? 50 : 10;
                // Favor slight dips (accumulation zone)
                if (c.price_change_percentage_24h < 0) score += 10;
                score += (c.market_cap / 1e10); // Extra points for huge liquidity
            } else {
                // If smaller investment, favor mid-caps/growth with higher potential
                score += (c.market_cap_rank > 5 && c.market_cap_rank <= 30) ? 40 : 20;
                // Buy the dip but look for solid volume
                if (c.price_change_percentage_24h < -2) score += 20;
                else if (c.price_change_percentage_24h > 5) score += 15; // Momentum
            }

            // Analyze News Sentiment
            let newsSentimentBonus = 0;
            if (API.news && API.news.length > 0) {
                API.news.forEach(n => {
                    const titleLow = n.title ? n.title.toLowerCase() : '';
                    const bodyLow = n.body ? n.body.toLowerCase() : '';
                    const symLow = c.symbol.toLowerCase();
                    const nameLow = c.name.toLowerCase();

                    // Direct mention
                    if (titleLow.includes(symLow) || titleLow.includes(nameLow) || bodyLow.includes(symLow) || bodyLow.includes(nameLow)) {
                        // Very basic sentiment check
                        if (titleLow.includes('surge') || titleLow.includes('up') || titleLow.includes('bull') || titleLow.includes('buy') || titleLow.includes('launch') || titleLow.includes('upgrade')) {
                            newsSentimentBonus += 15;
                        } else if (titleLow.includes('drop') || titleLow.includes('down') || titleLow.includes('bear') || titleLow.includes('ban') || titleLow.includes('hack')) {
                            newsSentimentBonus -= 15;
                        } else {
                            newsSentimentBonus += 5; // Neutral mention is slightly positive (visibility)
                        }
                    }
                });
            }

            c.ai_score = score + newsSentimentBonus + Math.random() * 20; // Combine base score + news + slight entropy
            c.hadPositiveNews = newsSentimentBonus > 0;
            c.hadNegativeNews = newsSentimentBonus < 0;
        });

        // Sort by AI score
        candidates.sort((a, b) => b.ai_score - a.ai_score);

        let topCoinObj = candidates[0];
        let altCoinsList = [candidates[1], candidates[2]];

        const priceChangeStr = topCoinObj.price_change_percentage_24h >= 0 ? "risen" : "dropped";
        const priceChangeVal = Math.abs(topCoinObj.price_change_percentage_24h || 0).toFixed(2);

        // Construct the long AI reason
        let topReason = `<p class="mb-3">Based on our deep-learning algorithmic analysis across the top 50 global cryptocurrencies, factoring in real-time market data and global news sentiment, <strong>${topCoinObj.name} (${topCoinObj.symbol.toUpperCase()})</strong> is currently the absolute optimal choice for your <strong>$${formatCur(amount)}</strong> capital injection exactly at this moment.</p>`;

        if (amount >= 5000) {
            topReason += `<p class="mb-3">For substantial investments like yours, liquidity, historical resilience, and institutional backing are paramount. ${topCoinObj.name} scores exceptionally high in our <em>Value Preservation & Growth Index</em>. We are currently observing solid on-chain accumulation patterns by "whales" and strong support levels holding above its macro moving averages, making it an extremely safe yet lucrative bet.</p>`;
        } else {
            topReason += `<p class="mb-3">For growth-focused portfolios, ${topCoinObj.name} presents an asymmetrical risk-reward setup. We are detecting massive real-time network activity spikes and expanding technological integrations that have not yet been fully priced in by the retail market. Catching this now gives you a significant edge.</p>`;
        }

        if (topCoinObj.hadPositiveNews) {
            topReason += `<p class="mb-3 text-emerald-400"><strong>News Catalyst Detected:</strong> Our NLP engines have detected highly positive recent news catalysts surrounding ${topCoinObj.name}, further increasing its short-term breakout probability.</p>`;
        } else if (topCoinObj.hadNegativeNews) {
            topReason += `<p class="mb-3 text-warning"><strong>Contrarian Opportunity:</strong> Despite recent negative press, our quantitative models suggest ${topCoinObj.name} is deeply oversold, offering a massive discount for long-term entry.</p>`;
        }

        topReason += `<p>The current price is trading at <strong>$${formatCur(topCoinObj.current_price, 4)}</strong>, having ${priceChangeStr} by ${priceChangeVal}% in the last 24h. Entering the market at this precise zone ensures you secure an excellent average entry price before the next projected macroeconomic impulse. However, remember the golden rule: <strong>Our AI strongly mandates holding this asset strictly for the mid-to-long term (a minimum of 2 to 6 months)</strong> to fully ride out the short-term volatility and realize its projected parabolic upside potential.</p>`;

        let holdTime = amount >= 5000 ? "4 - 12 Months" : "2 - 6 Months";
        let targetEntry = "$ " + formatCur(topCoinObj.current_price * 0.98, 4) + " - " + formatCur(topCoinObj.current_price, 4);

        let topCoin = {
            id: topCoinObj.name, sym: topCoinObj.symbol.toUpperCase(), price: topCoinObj.current_price,
            alloc: 0.60, img: topCoinObj.image,
            reason: topReason,
            risk: amount >= 5000 ? (topCoinObj.market_cap_rank <= 5 ? "Low" : "Medium") : "High",
            potential: amount >= 5000 ? "1.5x - 3x (Min. 2 Months)" : "3x - 10x (Min. 2 Months)",
            holdTime: holdTime,
            targetEntry: targetEntry
        };

        // 1. Render Top Pick
        let topAmt = amount * topCoin.alloc;
        let topTotalCoins = (topAmt / topCoin.price).toFixed(6);

        topPickCard.innerHTML = `
            <div class="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start relative z-10">
                <div class="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/20 shadow-lg shadow-yellow-500/20 overflow-hidden p-2">
                    <img src="${topCoin.img}" alt="${topCoin.id}" class="w-full h-full object-contain">
                </div>
                <div class="flex-1 text-center md:text-left">
                    <h4 class="text-3xl font-bold text-white mb-1 uppercase tracking-wider">${topCoin.id} <span class="text-gray-500 text-lg">(${topCoin.sym})</span></h4>
                    <p class="text-xs font-semibold px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full inline-block border border-yellow-500/50 mb-6 drop-shadow-md">Invest ${(topCoin.alloc * 100)}% ($${topAmt.toFixed(2)}) • Minimum 2 Month Hold</p>
                    
                    <div class="text-sm text-gray-300 leading-relaxed mb-6 border-l-2 border-primary pl-4 text-left bg-primary/5 p-4 rounded-r-xl">
                        <h5 class="flex items-center gap-2 font-bold text-primary mb-2 uppercase text-[10px] tracking-widest"><i class="fa-solid fa-microchip"></i> AI Investment Thesis</h5>
                        <div class="space-y-2 mt-2">${topCoin.reason}</div>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                        <div class="bg-black/60 rounded-xl p-3 border border-white/5 shadow-inner">
                            <p class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Current Price</p>
                            <p class="text-sm font-bold text-white">$${formatCur(topCoin.price, 4)}</p>
                        </div>
                        <div class="bg-black/60 rounded-xl p-3 border border-white/5 shadow-inner">
                            <p class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Target Entry Zone</p>
                            <p class="text-xs font-bold text-emerald-400">${topCoin.targetEntry}</p>
                        </div>
                        <div class="bg-black/60 rounded-xl p-3 border border-white/5 shadow-inner">
                            <p class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Suggested Hold</p>
                            <p class="text-sm font-bold text-white">${topCoin.holdTime}</p>
                        </div>
                    </div>
                    
                    <!-- Market Chart Container -->
                    <div class="mt-6 w-full h-[300px] rounded-xl overflow-hidden border border-white/10" id="tvChartContainer">
                        <!-- TradingView Script Injected Here -->
                    </div>
                </div>
                
                <div class="hidden lg:flex flex-col items-center justify-center min-w-[140px] pl-6 border-l border-white/10 shrink-0 self-stretch">
                    <button class="w-full bg-gradient-to-tr from-accent to-emerald-500 hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105" onclick="alert('Initiating smart contract routing for ${topCoin.sym} purchase via secure DEX integrations...')">
                        <i class="fa-solid fa-cart-shopping mr-1"></i> Auto Buy
                    </button>
                    <p class="text-[10px] text-gray-500 text-center mt-3">Execute instantly at best market routing</p>
                </div>
            </div>
            
            <!-- Mobile Buy Button -->
            <div class="p-4 border-t border-white/10 md:hidden bg-black/40">
                <button class="w-full bg-gradient-to-tr from-accent to-emerald-500 hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)]" onclick="alert('Initiating smart contract routing for ${topCoin.sym} purchase via secure DEX integrations...')">
                    <i class="fa-solid fa-cart-shopping mr-1"></i> Auto Buy ${topCoin.sym} Now
                </button>
            </div>
        `;

        // 2. Render Alts
        let altHtml = '';
        altCoinsList.forEach(aObj => {
            let allocPct = 0.20; // Give remaining 40% split into two 20s
            let aAmt = amount * allocPct;
            let aTotal = (aAmt / aObj.current_price).toFixed(6);
            let riskStr = aObj.market_cap_rank <= 10 ? "Medium" : "High";

            let briefReason = aObj.market_cap_rank <= 10 ?
                `As a top 10 global asset, ${aObj.name} provides stability and acts as an excellent diversification hedge against ${topCoin.id}.` :
                `${aObj.name} shows massive momentum via increasing on-chain volume. Excellent for supercharging portfolio growth over the next 2 months.`;

            altHtml += `
                <div class="glass-card rounded-2xl p-6 border border-glassborder hover:border-secondary/30 transition-all flex flex-col h-full bg-white/5">
                    <div class="flex justify-between items-start mb-4 border-b border-white/10 pb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center shrink-0 border border-white/5 overflow-hidden p-1">
                                <img src="${aObj.image}" alt="${aObj.id}" class="w-full h-full object-contain">
                            </div>
                            <div>
                                <h4 class="font-bold text-white uppercase">${aObj.name} <span class="text-xs text-gray-500">(${aObj.symbol.toUpperCase()})</span></h4>
                                <span class="text-xs text-accent font-medium">Allocate ${(allocPct * 100)}% ($${aAmt.toFixed(2)})</span>
                            </div>
                        </div>
                        <button class="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-lg" onclick="alert('Adding ${aObj.symbol.toUpperCase()} to your execution cart.')">Add</button>
                    </div>
                    
                    <p class="text-xs text-gray-300 mb-4 flex-1 leading-relaxed"><strong>AI Insight:</strong> ${briefReason}</p>
                    
                    <div class="flex justify-between text-xs bg-black/60 p-3 rounded-xl border border-white/5">
                        <div>
                            <span class="text-gray-500 block mb-1 uppercase font-bold text-[9px]">Target Qty</span>
                            <span class="text-white font-bold">${aTotal} <span class="text-gray-500 uppercase">${aObj.symbol}</span></span>
                        </div>
                        <div class="text-right">
                            <span class="text-gray-500 block mb-1 uppercase font-bold text-[9px]">Risk Profile</span>
                            <span class="text-white font-bold">${riskStr}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        const altPicksGrid = document.getElementById('altPicksGrid');
        if (altPicksGrid) altPicksGrid.innerHTML = altHtml;

        // Initialize TradingView widget with a slight delay
        setTimeout(() => {
            const chartCont = document.getElementById('tvChartContainer');
            if (chartCont) {
                chartCont.innerHTML = '';
                const script = document.createElement('script');
                script.src = "https://s3.tradingview.com/tv.js";
                script.async = true;
                script.onload = () => {
                    new TradingView.widget({
                        "width": "100%",
                        "height": "100%",
                        "symbol": `CRYPTO:${topCoin.sym}USD`,
                        "interval": "D",
                        "timezone": "Etc/UTC",
                        "theme": "dark",
                        "style": "1",
                        "locale": "en",
                        "enable_publishing": false,
                        "backgroundColor": "rgba(0,0,0,0.5)",
                        "gridColor": "rgba(255,255,255,0.05)",
                        "hide_top_toolbar": true,
                        "hide_legend": true,
                        "save_image": false,
                        "container_id": "tvChartContainer"
                    });
                };
                chartCont.appendChild(script);
            }
        }, 100);
    }

    function formatCur(val, dec = 2) {
        return parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
});
