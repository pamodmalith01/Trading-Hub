document.addEventListener('DOMContentLoaded', async () => {
    const newsFeedWrapper = document.getElementById('newsFeedWrapper');
    const loadingState = document.getElementById('newsLoadingState');
    const newUpdateBanner = document.getElementById('newUpdateBanner');
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    // We will listen to the global 'newsUpdated' event from API now
    let currentNewsItemIndex = 0;

    // Remove loading state on initial load
    setTimeout(() => {
        if (loadingState) loadingState.remove();
        renderInitialNews();
    }, 1500);

    function renderInitialNews() {
        // Use API news if available (CryptoCompare)
        if (API && API.news && API.news.length > 0) {
            API.news.forEach((article, idx) => {
                const markup = createNewsMarkup({
                    title: article.title,
                    body: article.body.substring(0, 100) + '...',
                    type: 'crypto',
                    source: article.source,
                    time: new Date(article.published_on * 1000).toLocaleTimeString()
                }, false);
                newsFeedWrapper.insertAdjacentHTML('beforeend', markup);
            });
        }

        // Add some local/forex mocks initially to populate
        const initialMocks = [
            { title: "Lanka IOC increases fuel prices slightly", body: "Price per liter of Octane 92 increased by Rs 5 starting midnight.", type: "cse", source: "Local News", time: "1 hr ago" },
            { title: "Gold prices hit new all-time high amid safe-haven demand", body: "XAU/USD trading above 2050 as geopolitical tensions rise.", type: "forex", source: "Commodity Desk", time: "2 hrs ago" }
        ];

        initialMocks.forEach(n => {
            newsFeedWrapper.insertAdjacentHTML('beforeend', createNewsMarkup(n, false));
        });
    }

    function createNewsMarkup(newsItem, isNew) {
        let badgeColor = 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        let icon = 'fa-newspaper';

        if (newsItem.type === 'forex') { badgeColor = 'bg-primary/20 text-primary border-primary/30'; icon = 'fa-globe'; }
        else if (newsItem.type === 'crypto') { badgeColor = 'bg-accent/20 text-accent border-accent/30'; icon = 'fa-bitcoin'; }
        else if (newsItem.type === 'cse') { badgeColor = 'bg-secondary/20 text-secondary border-secondary/30'; icon = 'fa-building'; }

        return `
            <div class="glass-card rounded-2xl p-6 border border-glassborder relative pl-10 hover:bg-white/5 transition-all w-full news-item-el ${isNew ? 'animate-new-item border-primary/50' : ''}" data-type="${newsItem.type}">
                <!-- Timeline Dot -->
                <div class="absolute left-[-5px] top-8 w-3 h-3 rounded-full ${newsItem.type === 'forex' ? 'bg-primary' : newsItem.type === 'crypto' ? 'bg-accent' : 'bg-secondary'} shadow-[0_0_10px_currentColor] z-10"></div>
                
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-3">
                        <span class="px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${badgeColor} flex items-center gap-1">
                            <i class="fa-solid ${icon}"></i> ${newsItem.type}
                        </span>
                        <span class="text-xs text-gray-500 font-medium">${newsItem.source} • ${newsItem.time}</span>
                    </div>
                </div>
                
                <h3 class="text-lg font-bold text-white mb-2 leading-snug">${newsItem.title}</h3>
                <p class="text-sm text-gray-400 line-clamp-2">${newsItem.body}</p>
                
                <div class="mt-4 flex gap-4 border-t border-glassborder pt-3">
                    <button class="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1" onclick="alert('Trade Impact Analysis: High volatility expected for ${newsItem.type.toUpperCase()} assets connected to this event. Consider adjusting stop losses.')"><i class="fa-solid fa-chart-line"></i> Trade impacting</button>
                    <button class="text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1" onclick="alert('Link copied to clipboard! You can now share this ${newsItem.type.toUpperCase()} news update.')"><i class="fa-solid fa-share-nodes"></i> Share</button>
                </div>
            </div>
        `;
    }

    document.addEventListener('newsUpdated', (e) => {
        // If it's a specific live arrival item via our simulation
        if (e.detail && e.detail.newArrival) {
            const incoming = e.detail.newArrival;
            incoming.time = "Just now";

            const markup = createNewsMarkup(incoming, true);

            // Insert at the top of the wrapper
            newsFeedWrapper.insertAdjacentHTML('afterbegin', markup);

            // Show banner if scrolled down slightly
            if (newsFeedWrapper.parentElement.scrollTop > 100) {
                showBanner();
            }

            // Re-apply filter if needed
            applyCurrentFilter();
        }
    });

    function showBanner() {
        newUpdateBanner.classList.remove('opacity-0', 'h-0');
        newUpdateBanner.classList.add('opacity-100', 'h-auto', 'py-3');
    }

    function hideBanner() {
        newUpdateBanner.classList.add('opacity-0', 'h-0');
        newUpdateBanner.classList.remove('opacity-100', 'h-auto', 'py-3');
    }

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', () => {
            newsFeedWrapper.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
            hideBanner();
        });
    }

    // Hide banner on scroll top
    newsFeedWrapper.parentElement.addEventListener('scroll', () => {
        if (newsFeedWrapper.parentElement.scrollTop < 50) {
            hideBanner();
        }
    });

    // Filtering logic
    const filterBtns = document.querySelectorAll('.news-filter');
    let currentFilter = 'all';

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => {
                b.classList.remove('bg-primary', 'text-white', 'border-primary/50');
                b.classList.add('bg-white/5', 'text-gray-300', 'border-white/10');
            });

            e.target.classList.remove('bg-white/5', 'text-gray-300', 'border-white/10');
            e.target.classList.add('bg-primary', 'text-white', 'border-primary/50');

            currentFilter = e.target.getAttribute('data-filter');
            applyCurrentFilter();
        });
    });

    function applyCurrentFilter() {
        const items = document.querySelectorAll('.news-item-el');
        items.forEach(item => {
            if (currentFilter === 'all' || item.getAttribute('data-type') === currentFilter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
});
