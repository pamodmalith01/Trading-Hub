/**
 * auth.js — Firebase Auth Guard + Sidebar user profile
 * Include this BEFORE any page-specific scripts on every protected page.
 * Place: <script type="module" src="assets/js/auth.js"></script>
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import {
    getAuth, onAuthStateChanged,
    signOut, GoogleAuthProvider,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

// ════════════════════════════════════════════════════════════════════════════
// 🔧 SAME Firebase config as login.html — paste yours here
// ════════════════════════════════════════════════════════════════════════════
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
// ════════════════════════════════════════════════════════════════════════════

const app = initializeApp(firebaseConfig, 'guard');
const auth = getAuth(app);

// ── Auth State Listener ───────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
    if (!user) {
        // Not logged in → redirect to login
        window.location.replace('login.html');
        return;
    }
    // Logged in → render user profile in sidebar
    _renderUserProfile(user);
});

// ── Render User Profile ───────────────────────────────────────────────────────
function _renderUserProfile(user) {
    const name = user.displayName || user.email.split('@')[0];
    const email = user.email;
    const photo = user.photoURL;
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

    // Find or create user panel slot in sidebar
    const slot = document.getElementById('userProfileSlot');
    if (!slot) return;

    slot.innerHTML = `
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-glassborder">
            ${photo
            ? `<img src="${photo}" alt="Avatar" class="w-9 h-9 rounded-full border border-glassborder object-cover shrink-0">`
            : `<div class="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">${initials}</div>`
        }
            <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-white truncate">${name}</p>
                <p class="text-[10px] text-gray-500 truncate">${email}</p>
            </div>
            <button id="logoutBtn" title="Sign Out"
                class="w-7 h-7 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors shrink-0">
                <i class="fa-solid fa-right-from-bracket text-xs"></i>
            </button>
        </div>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        if (confirm('Sign out of TradingHub?')) {
            await signOut(auth);
            window.location.replace('login.html');
        }
    });
}

// ── Expose logout globally ────────────────────────────────────────────────────
window.thLogout = async () => {
    await signOut(auth);
    window.location.replace('login.html');
};
