/**
 * MI-AS Wealth - Core Application Engine & Data Controller
 */

// Retrieve target PIN hash from appsettings.js (with default fallback)
function getTargetPinHash() {
    if (window.APP_SETTINGS && typeof window.APP_SETTINGS.hashedPin === 'string') {
        return window.APP_SETTINGS.hashedPin.trim().toLowerCase();
    }
    return "81c3b0114b7e88029d201e74929a008c4e51e44f8087796d19e917d05779c15d"; // fallback for 'wealth1234'
}

// Optional async fetch of appsettings.json when hosted on HTTP/HTTPS
async function loadJsonSettings() {
    try {
        const res = await fetch('appsettings.json');
        if (res.ok) {
            const jsonSettings = await res.json();
            window.APP_SETTINGS = Object.assign({}, window.APP_SETTINGS, jsonSettings);
        }
    } catch (e) {
        // Ignore file:// CORS restrictions or missing json
    }
}
loadJsonSettings();

// Password visibility toggle
function togglePassVisibility() {
    const input = document.getElementById('passcode-input');
    const icon = document.getElementById('pass-eye-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash text-xs text-[#8FA28A]';
    } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye text-xs text-[#5E7060]/60 dark:text-[#A4B5A3]/60';
    }
}

// Theme Support (Light default featuring #F7F4ED ivory linen background, dark mode option)
function initTheme() {
    const savedTheme = localStorage.getItem('family_wealth_theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcon();
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('family_wealth_theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
    recalculateAll(); // Refreshes chart with updated theme colors
}

function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    const icon = document.getElementById('theme-toggle-icon');
    const label = document.getElementById('theme-toggle-label');
    if (icon) {
        icon.className = isDark ? 'fa-solid fa-sun text-[#C8A96B]' : 'fa-solid fa-moon text-[#5E7060]';
    }
    if (label) {
        label.innerText = isDark ? 'Dark' : 'Light';
    }
}
initTheme();

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleLogin(e) {
    e.preventDefault();
    const val = document.getElementById('passcode-input').value;
    const hash = await sha256(val);
    const targetHash = getTargetPinHash();
    const isDefault = targetHash === "81c3b0114b7e88029d201e74929a008c4e51e44f8087796d19e917d05779c15d";

    if (hash === targetHash || (isDefault && val === "wealth1234")) {
        sessionStorage.setItem('isUnlocked', 'true');
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('dashboard-app').classList.remove('hidden');
        initDashboard();
    } else {
        const errorEl = document.getElementById('auth-error');
        if (window.APP_SETTINGS && typeof window.APP_SETTINGS.passcodeHint === 'string' && window.APP_SETTINGS.passcodeHint.length > 0) {
            errorEl.innerHTML = `Incorrect passphrase. Hint: <code class="bg-[#C8A96B]/15 text-[#967634] dark:text-[#C8A96B] px-1.5 py-0.5 rounded font-mono">${window.APP_SETTINGS.passcodeHint}</code>`;
        } else if (window.APP_SETTINGS && window.APP_SETTINGS.passcodeHint === "") {
            errorEl.innerText = "Incorrect passphrase. Please try again.";
        }
        errorEl.classList.remove('hidden');
    }
}

function lockApp() {
    sessionStorage.removeItem('isUnlocked');
    location.reload();
}

// Check persistent auth state on page load
window.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    if (sessionStorage.getItem('isUnlocked') === 'true') {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('dashboard-app').classList.remove('hidden');
        initDashboard();
    }
});

// Baseline from portfolio_data.js in project directory
const defaultPortfolio = (window.PORTFOLIO_DATA && typeof window.PORTFOLIO_DATA === 'object')
    ? JSON.parse(JSON.stringify(window.PORTFOLIO_DATA))
    : {
        goldGrams: 0,
        goldPurity: '22K',
        goldCustomRate: 0,
        savings: 0,
        fd: 0,
        fds: [],
        rds: [],
        lic: [],
        mutualFunds: [],
        stocks: []
    };

// Live App Core Data State: Reads from browser localStorage, or defaults to portfolio_data.js
let state = JSON.parse(localStorage.getItem('family_wealth_state')) || defaultPortfolio;

// Backward compatibility migration for FDs
if (!state.fds) {
    state.fds = [];
    if (state.fd && parseFloat(state.fd) > 0) {
        state.fds.push({
            bank: "Primary Bank",
            amount: parseFloat(state.fd),
            dueDate: "",
            lastAlertSent: null
        });
    } else {
        state.fds.push({
            bank: "",
            amount: 0,
            dueDate: "",
            lastAlertSent: null
        });
    }
}

// Backward compatibility migration for RDs (Recurring Deposits)
if (!state.rds) {
    state.rds = [];
} else if (Array.isArray(state.rds)) {
    state.rds.forEach(r => {
        if (r.bank === undefined) r.bank = '';
        if (r.monthlyAmount === undefined) r.monthlyAmount = 0;
        if (r.balance === undefined) r.balance = 0;
        if (r.dueDate === undefined) r.dueDate = '';
        if (r.lastAlertSent === undefined) r.lastAlertSent = null;
    });
}

// Backward compatibility migration for LIC Policies
if (!state.lic) {
    state.lic = [];
} else if (Array.isArray(state.lic)) {
    state.lic.forEach(p => {
        if (p.name === undefined) p.name = '';
        if (p.policyNo === undefined) p.policyNo = '';
        if (p.premium === undefined) p.premium = 0;
        if (p.sumAssured === undefined) p.sumAssured = 0;
        if (p.dueDate === undefined) p.dueDate = '';
        if (p.lastAlertSent === undefined) p.lastAlertSent = null;
    });
}

// Backward compatibility migration for Mutual Funds SIP
if (state.mutualFunds && Array.isArray(state.mutualFunds)) {
    state.mutualFunds.forEach(mf => {
        if (mf.sipAmount === undefined) mf.sipAmount = 0;
        if (mf.sipDate === undefined) mf.sipDate = '';
        if (mf.lastSipAlertSent === undefined) mf.lastSipAlertSent = null;
    });
}

let liveGold24KRatePerGram = (window.APP_SETTINGS && window.APP_SETTINGS.defaultGoldRate) ? window.APP_SETTINGS.defaultGoldRate : 14044;
let liveGold22KRatePerGram = Math.round(liveGold24KRatePerGram * 0.916);
let chartInstance = null;
let isFetchingGold = false;

function getEffectiveGoldRate() {
    const purity = state.goldPurity || '22K';
    if (purity === 'CUSTOM') {
        return parseFloat(state.goldCustomRate) || liveGold22KRatePerGram;
    } else if (purity === '24K') {
        return liveGold24KRatePerGram;
    } else if (purity === '18K') {
        return Math.round(liveGold24KRatePerGram * 0.75);
    } else {
        return liveGold22KRatePerGram;
    }
}

function updateGoldDisplays() {
    const purity = state.goldPurity || '22K';
    const effectiveRate = getEffectiveGoldRate();

    const badge = document.getElementById('gold-live-badge');
    if (badge) {
        badge.innerHTML = `<i class="fa-solid fa-bolt text-[11px] text-[#C8A96B]"></i> Live: ₹${effectiveRate.toLocaleString('en-IN')}/g (${purity})`;
    }

    const ratePill = document.getElementById('gold-rate-pill');
    if (ratePill) {
        ratePill.innerText = `₹${effectiveRate.toLocaleString('en-IN')}/g`;
    }

    const summaryEl = document.getElementById('gold-rates-summary');
    if (summaryEl) {
        summaryEl.innerText = `Live: 24K ₹${liveGold24KRatePerGram.toLocaleString('en-IN')}/g • 22K ₹${liveGold22KRatePerGram.toLocaleString('en-IN')}/g`;
    }

    const selectEl = document.getElementById('gold-purity');
    if (selectEl && selectEl.value !== purity) {
        selectEl.value = purity;
    }

    const customBox = document.getElementById('gold-custom-rate-box');
    if (customBox) {
        if (purity === 'CUSTOM') {
            customBox.classList.remove('hidden');
        } else {
            customBox.classList.add('hidden');
        }
    }

    const customInput = document.getElementById('gold-custom-rate-input');
    if (customInput && state.goldCustomRate) {
        customInput.value = state.goldCustomRate;
    }
}

function onGoldPurityChange() {
    const selectEl = document.getElementById('gold-purity');
    if (!selectEl) return;
    state.goldPurity = selectEl.value;
    localStorage.setItem('family_wealth_state', JSON.stringify(state));
    updateGoldDisplays();
    recalculateAll();
}

async function initDashboard() {
    if (!state.goldPurity) state.goldPurity = '22K';
    document.getElementById('gold-grams').value = state.goldGrams || '';
    document.getElementById('savings-amt').value = state.savings || '';
    renderFDRows();
    renderRDRows();
    renderLICRows();
    renderMFRows();
    renderStockRows();
    updateGoldDisplays();
    recalculateAll();
    checkFDDueDates();
    checkRDDueDates();
    checkSIPDueDates();
    checkLICDueDates();
    fetchLiveMarketData(false);
}

async function fetchLiveMarketData(isManual = false) {
    if (isFetchingGold) return;
    isFetchingGold = true;
    const refreshIcon = document.getElementById('gold-refresh-icon');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
        // Real-time gold price fetch from public endpoint (XAU in INR)
        // 1 Troy Ounce = 31.1034768 grams. In India, retail landing price = spot + ~15% (customs duty & GST)
        const res = await fetch('https://api.gold-api.com/price/XAU/INR', { cache: 'no-cache' });
        if (res.ok) {
            const data = await res.json();
            if (data && data.price && data.price > 0) {
                const spotPerGram = data.price / 31.1034768;
                const rate24K = Math.round(spotPerGram * 1.15);
                const rate22K = Math.round(rate24K * 0.916);

                liveGold24KRatePerGram = rate24K;
                liveGold22KRatePerGram = rate22K;
                console.log(`Live gold updated: 24K=₹${rate24K}/g, 22K=₹${rate22K}/g`);
            }
        }
    } catch (err) {
        console.warn("Could not fetch real-time gold rates from API, using baseline:", err);
    } finally {
        isFetchingGold = false;
        if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    }

    updateGoldDisplays();
    recalculateAll();

    if (isManual) {
        showNotificationBanner(`✨ Live Gold rates updated: 24K = ₹${liveGold24KRatePerGram.toLocaleString('en-IN')}/g, 22K = ₹${liveGold22KRatePerGram.toLocaleString('en-IN')}/g`, false, null, 'fd');
    }
}

function saveAndRecalculate() {
    state.goldGrams = parseFloat(document.getElementById('gold-grams').value) || 0;
    const customInput = document.getElementById('gold-custom-rate-input');
    if (customInput && customInput.value) {
        state.goldCustomRate = parseFloat(customInput.value) || 0;
    }
    state.savings = parseFloat(document.getElementById('savings-amt').value) || 0;

    let totalFD = 0;
    if (state.fds && state.fds.length > 0) {
        state.fds.forEach(f => {
            totalFD += (parseFloat(f.amount) || 0);
        });
    }
    state.fd = totalFD;

    localStorage.setItem('family_wealth_state', JSON.stringify(state));
    recalculateAll();
    autoSaveToDisk();
}

function recalculateAll() {
    const goldRate = getEffectiveGoldRate();
    const goldVal = (parseFloat(state.goldGrams) || 0) * goldRate;
    const goldDisplay = document.getElementById('gold-calculated-display');
    if (goldDisplay) goldDisplay.innerText = `₹${goldVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    let mfTotal = 0;
    let totalSipMonthly = 0;
    if (state.mutualFunds && state.mutualFunds.length > 0) {
        state.mutualFunds.forEach((mf, idx) => {
            let unitsVal = parseFloat(mf.units) || 0;
            let val = unitsVal * (mf.latestNav || 100);
            mfTotal += val;
            totalSipMonthly += (parseFloat(mf.sipAmount) || 0);
            const el = document.getElementById(`mf-val-${idx}`);
            if (el) el.innerText = `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
            const navEl = document.getElementById(`mf-nav-${idx}`);
            if (navEl && mf.latestNav) navEl.innerText = `₹${parseFloat(mf.latestNav).toFixed(2)}`;
        });
    }

    const mfTotalPill = document.getElementById('mf-total-pill');
    if (mfTotalPill) mfTotalPill.innerText = `Total: ₹${mfTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const mfSipPill = document.getElementById('mf-sip-pill');
    if (mfSipPill) mfSipPill.innerText = `SIP: ₹${totalSipMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo`;

    let stockTotal = 0;
    state.stocks.forEach((st, idx) => {
        let val = st.qty * st.price;
        stockTotal += val;
        const el = document.getElementById(`stock-val-${idx}`);
        if (el) el.innerText = `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    });

    let fdTotal = 0;
    if (state.fds && state.fds.length > 0) {
        state.fds.forEach(f => {
            fdTotal += (parseFloat(f.amount) || 0);
        });
    } else {
        fdTotal = parseFloat(state.fd) || 0;
    }
    state.fd = fdTotal;

    const fdPill = document.getElementById('fd-total-pill');
    if (fdPill) fdPill.innerText = `Total: ₹${fdTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    let rdBalanceTotal = 0;
    let rdMonthlyTotal = 0;
    if (state.rds && state.rds.length > 0) {
        state.rds.forEach((rd) => {
            rdBalanceTotal += (parseFloat(rd.balance) || 0);
            rdMonthlyTotal += (parseFloat(rd.monthlyAmount) || 0);
        });
    }

    const rdBalancePill = document.getElementById('rd-balance-pill');
    if (rdBalancePill) rdBalancePill.innerText = `Balance: ₹${rdBalanceTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const rdMonthlyPill = document.getElementById('rd-monthly-pill');
    if (rdMonthlyPill) rdMonthlyPill.innerText = `Monthly: ₹${rdMonthlyTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo`;

    let licSumTotal = 0;
    let licPremiumTotal = 0;
    if (state.lic && state.lic.length > 0) {
        state.lic.forEach((policy) => {
            licSumTotal += (parseFloat(policy.sumAssured) || 0);
            licPremiumTotal += (parseFloat(policy.premium) || 0);
        });
    }

    const licSumPill = document.getElementById('lic-sum-pill');
    if (licSumPill) licSumPill.innerText = `Cover: ₹${licSumTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const licPremiumPill = document.getElementById('lic-premium-pill');
    if (licPremiumPill) licPremiumPill.innerText = `Premium: ₹${licPremiumTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/yr`;

    const safeTotal = state.savings + state.fd + rdBalanceTotal + licSumTotal;
    const investTotal = mfTotal + stockTotal;
    const netWorth = safeTotal + investTotal + goldVal;

    document.getElementById('total-networth').innerText = `₹${netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    document.getElementById('total-investments').innerText = `₹${investTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    document.getElementById('total-safe').innerText = `₹${safeTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    document.getElementById('total-gold-val').innerText = `₹${goldVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    // Update Main Priority Allocation Card Stats
    const safePct = netWorth > 0 ? ((safeTotal / netWorth) * 100).toFixed(1) : "0.0";
    const investPct = netWorth > 0 ? ((investTotal / netWorth) * 100).toFixed(1) : "0.0";
    const goldPct = netWorth > 0 ? ((goldVal / netWorth) * 100).toFixed(1) : "0.0";

    const allocSafeVal = document.getElementById('alloc-safe-val');
    if (allocSafeVal) allocSafeVal.innerText = `₹${safeTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const allocSafePct = document.getElementById('alloc-safe-pct');
    if (allocSafePct) allocSafePct.innerText = `${safePct}%`;
    const allocSafeBar = document.getElementById('alloc-safe-bar');
    if (allocSafeBar) allocSafeBar.style.width = `${safePct}%`;

    const allocInvestVal = document.getElementById('alloc-invest-val');
    if (allocInvestVal) allocInvestVal.innerText = `₹${investTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const allocInvestPct = document.getElementById('alloc-invest-pct');
    if (allocInvestPct) allocInvestPct.innerText = `${investPct}%`;
    const allocInvestBar = document.getElementById('alloc-invest-bar');
    if (allocInvestBar) allocInvestBar.style.width = `${investPct}%`;

    const allocGoldVal = document.getElementById('alloc-gold-val');
    if (allocGoldVal) allocGoldVal.innerText = `₹${goldVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const allocGoldPct = document.getElementById('alloc-gold-pct');
    if (allocGoldPct) allocGoldPct.innerText = `${goldPct}%`;
    const allocGoldBar = document.getElementById('alloc-gold-bar');
    if (allocGoldBar) allocGoldBar.style.width = `${goldPct}%`;

    const allocCenter = document.getElementById('alloc-center-networth');
    if (allocCenter) allocCenter.innerText = `₹${netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const allocHeaderTotal = document.getElementById('alloc-header-total');
    if (allocHeaderTotal) allocHeaderTotal.innerText = `₹${netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    updateChart(safeTotal, investTotal, goldVal);
}

// In-app Alert Notification Banner Display
function showNotificationBanner(message, isWarning = false, actionLink = null, targetCategory = 'fd') {
    const banner = document.getElementById('fd-alert-banner');
    const textEl = document.getElementById('fd-alert-banner-text');
    const titleEl = document.getElementById('fd-alert-banner-title');

    let cardBox, cardText;
    if (targetCategory === 'mf') {
        cardBox = document.getElementById('mf-card-alert-box');
        cardText = document.getElementById('mf-card-alert-text');
    } else if (targetCategory === 'lic') {
        cardBox = document.getElementById('lic-card-alert-box');
        cardText = document.getElementById('lic-card-alert-text');
    } else if (targetCategory === 'rd') {
        cardBox = document.getElementById('rd-card-alert-box');
        cardText = document.getElementById('rd-card-alert-text');
    } else {
        cardBox = document.getElementById('fd-card-alert-box');
        cardText = document.getElementById('fd-card-alert-text');
    }

    let html = `<span>${message}</span>`;
    if (actionLink) {
        html += ` <a href="${actionLink}" target="_blank" class="ml-2 inline-flex items-center gap-1 underline font-bold text-[#8FA28A] hover:text-[#7D9178]"><i class="fa-solid fa-envelope-open-text text-[11px]"></i> Open in Gmail / Mail Client</a>`;
    }

    if (banner && textEl) {
        if (titleEl) {
            if (targetCategory === 'mf') {
                titleEl.innerText = "Mutual Fund SIP Due Notice";
            } else if (targetCategory === 'lic') {
                titleEl.innerText = "LIC Policy Premium Due Notice";
            } else if (targetCategory === 'rd') {
                titleEl.innerText = "Recurring Deposit (RD) Due Notice";
            } else {
                titleEl.innerText = "Fixed Deposit Maturity Notice";
            }
        }
        textEl.innerHTML = html;
        banner.classList.remove('hidden');
    }

    if (cardBox && cardText) {
        cardText.innerHTML = html;
        cardBox.classList.remove('hidden');
    }
}

// Generate status badge HTML for an FD
function getFDStatusBadgeHtml(fd) {
    const today = new Date().toISOString().split('T')[0];
    let statusBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#5E7060]/70 dark:text-[#A4B5A3]/60 bg-black/5 dark:bg-white/5">No date set</span>`;

    if (fd && fd.dueDate) {
        const diffMs = new Date(fd.dueDate + "T00:00:00") - new Date(today + "T00:00:00");
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C8A96B]/25 text-[#967634] dark:text-[#C8A96B] border border-[#C8A96B]/40"><i class="fa-solid fa-clock-rotate-left text-[9px]"></i> Matured (${Math.abs(diffDays)}d ago)</span>`;
        } else if (diffDays === 0) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#8FA28A]/25 text-[#5A6D58] dark:text-[#8FA28A] border border-[#8FA28A]/40 animate-pulse"><i class="fa-solid fa-bell text-[9px]"></i> Matures Today!</span>`;
        } else {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#5A6D58] dark:text-[#A4B5A3] bg-[#8FA28A]/15"><i class="fa-regular fa-calendar-check text-[9px]"></i> ${diffDays}d left</span>`;
        }
    }

    const alertSentNotice = (fd && fd.lastAlertSent)
        ? `<span class="text-[9px] text-[#5E7060]/80 dark:text-[#A4B5A3]/80 block mt-0.5" title="Alert dispatched on ${fd.lastAlertSent}"><i class="fa-solid fa-check-double text-[#8FA28A]"></i> Alerted ${new Date(fd.lastAlertSent).toLocaleDateString()}</span>`
        : '';

    return `<div>${statusBadge}${alertSentNotice}</div>`;
}

function updateFDRowBadge(idx) {
    const badgeEl = document.getElementById(`fd-badge-box-${idx}`);
    if (badgeEl && state.fds && state.fds[idx]) {
        badgeEl.innerHTML = getFDStatusBadgeHtml(state.fds[idx]);
    }
}

// Dynamic Fixed Deposits (FD) Management
function renderFDRows() {
    const tbody = document.getElementById('fd-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!state.fds || state.fds.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-5 text-center text-[#5E7060]/70 dark:text-[#A4B5A3]/60 font-medium">
                    <i class="fa-solid fa-building-columns text-base mb-1 block opacity-40"></i>
                    No Fixed Deposits recorded yet. Click <span class="text-[#8FA28A] font-bold cursor-pointer" onclick="addFDRow()">+ Add FD</span> above.
                </td>
            </tr>
        `;
        return;
    }

    state.fds.forEach((fd, idx) => {
        const badgeMarkup = getFDStatusBadgeHtml(fd);

        tbody.innerHTML += `
            <tr class="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors" id="fd-row-${idx}">
                <td class="py-2.5 pr-2 min-w-[130px]">
                    <input type="text" value="${fd.bank || ''}" placeholder="e.g. HDFC Bank" oninput="updateFDField(${idx}, 'bank', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition">
                </td>
                <td class="py-2.5 px-2 w-28 min-w-[100px]">
                    <input type="number" value="${fd.amount !== undefined && fd.amount !== null ? fd.amount : ''}" placeholder="0" oninput="updateFDField(${idx}, 'amount', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition tabular-nums">
                </td>
                <td class="py-2.5 px-2 min-w-[130px]">
                    <input type="date" value="${fd.dueDate || ''}" onchange="updateFDField(${idx}, 'dueDate', this.value)" oninput="updateFDField(${idx}, 'dueDate', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition cursor-pointer">
                </td>
                <td class="py-2.5 px-2 min-w-[110px]">
                    <div class="flex items-center gap-1.5">
                        <div id="fd-badge-box-${idx}">
                            ${badgeMarkup}
                        </div>
                        <button type="button" onclick="triggerFDEmailManual(${idx})"
                            class="p-1.5 text-xs text-[#8FA28A] hover:bg-[#8FA28A]/15 rounded-lg transition active:scale-95 shrink-0"
                            title="Send / Test email alert to midhunmoorthiyedam@gmail.com">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </td>
                <td class="py-2.5 pl-2 text-right w-8">
                    <button type="button" onclick="removeFDRow(${idx})"
                        class="text-[#5E7060]/60 dark:text-[#A4B5A3]/60 hover:text-[#C8A96B] hover:bg-[#C8A96B]/15 p-1.5 rounded-lg transition active:scale-90"
                        title="Delete FD">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function addFDRow() {
    if (!state.fds) state.fds = [];
    state.fds.push({ bank: '', amount: 0, dueDate: '', lastAlertSent: null });
    renderFDRows();
    saveAndRecalculate();
}

function updateFDField(idx, field, val) {
    if (!state.fds || !state.fds[idx]) return;
    if (field === 'amount') {
        state.fds[idx].amount = val === '' ? '' : (parseFloat(val) || 0);
        saveAndRecalculate();
    } else if (field === 'bank') {
        state.fds[idx].bank = val;
        localStorage.setItem('family_wealth_state', JSON.stringify(state));
    } else if (field === 'dueDate') {
        state.fds[idx].dueDate = val;
        localStorage.setItem('family_wealth_state', JSON.stringify(state));
        updateFDRowBadge(idx);
        checkFDDueDates();
    }
}

function removeFDRow(idx) {
    if (!state.fds) return;
    state.fds.splice(idx, 1);
    renderFDRows();
    saveAndRecalculate();
}

function triggerFDEmailManual(idx) {
    if (!state.fds || !state.fds[idx]) return;
    sendFDDueEmail(state.fds[idx], true);
}

// Automated and On-Demand Email Dispatcher to midhunmoorthiyedam@gmail.com
async function sendFDDueEmail(fd, isManual = false) {
    const emailTarget = (window.APP_SETTINGS && window.APP_SETTINGS.alertEmail)
        ? window.APP_SETTINGS.alertEmail
        : "midhunmoorthiyedam@gmail.com";

    const bankName = fd.bank || "Registered Bank";
    const amountVal = parseFloat(fd.amount) || 0;
    const formattedAmount = amountVal.toLocaleString('en-IN');
    const dueDateStr = fd.dueDate || "Due Date Reached";
    const alertType = isManual ? "On-Demand Manual Alert / Test" : "Automated Maturity Due Date Reached";
    const subject = `[MI-AS Wealth] Fixed Deposit Due Alert: ${bankName} - ₹${formattedAmount}`;
    const noticeMessage = `This is an automated notification from MI-AS Wealth. Your Fixed Deposit with ${bankName} for ₹${formattedAmount} has reached its maturity due date (${dueDateStr}).`;

    // Prepare Hidden Form for Silent POST Submission to FormSubmit
    const form = document.getElementById('fd-email-form');
    if (form) {
        form.action = `https://formsubmit.co/${emailTarget}`;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('fd-email-subject', subject);
        setVal('fd-email-bank', bankName);
        setVal('fd-email-amount', `₹${formattedAmount}`);
        setVal('fd-email-duedate', dueDateStr);
        setVal('fd-email-status', alertType);
        setVal('fd-email-message', noticeMessage);
        setVal('fd-email-time', new Date().toLocaleString('en-IN'));

        try {
            form.submit();
            console.log(`Email dispatched via background form to ${emailTarget}`);
        } catch (e) {
            console.warn("Background form submission caught:", e);
        }
    }

    // Also attempt AJAX endpoint
    try {
        fetch(`https://formsubmit.co/ajax/${emailTarget}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                _subject: subject,
                _replyto: emailTarget,
                "Bank Name": bankName,
                "FD Amount": `₹${formattedAmount}`,
                "Maturity Due Date": dueDateStr,
                "Alert Type": alertType,
                "Notice": noticeMessage,
                _template: "table",
                _captcha: "false"
            })
        }).catch(() => { });
    } catch (err) {
        // Ignore background fetch failure, form submission handles delivery
    }

    // Mark alert date
    fd.lastAlertSent = new Date().toISOString();
    localStorage.setItem('family_wealth_state', JSON.stringify(state));
    const idx = state.fds.indexOf(fd);
    if (idx !== -1) updateFDRowBadge(idx);

    const mailtoBody = `Dear Midhun,\n\nYour Fixed Deposit details:\n- Bank: ${bankName}\n- Amount: ₹${formattedAmount}\n- Due Date: ${dueDateStr}\n\nGenerated by MI-AS Wealth.`;
    const mailtoUrl = `mailto:${emailTarget}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`;

    showNotificationBanner(
        `📧 Due date alert triggered for <strong>${bankName}</strong> (₹${formattedAmount}, Due: ${dueDateStr}) to <strong>${emailTarget}</strong>.`,
        false,
        mailtoUrl
    );
}

// Automatic Due Date Checker
function checkFDDueDates() {
    if (!state.fds || state.fds.length === 0) return;
    const today = new Date().toISOString().split('T')[0];

    state.fds.forEach((fd) => {
        if (fd.dueDate && fd.dueDate <= today && (parseFloat(fd.amount) || 0) > 0) {
            const lastSentDay = fd.lastAlertSent ? fd.lastAlertSent.split('T')[0] : null;
            if (lastSentDay !== today) {
                console.log(`Auto-triggering maturity alert for ${fd.bank} due on ${fd.dueDate}`);
                sendFDDueEmail(fd, false);
            }
        }
    });
}

// Generate status badge HTML for a Recurring Deposit (RD)
function getRDStatusBadgeHtml(rd) {
    const today = new Date().toISOString().split('T')[0];
    let statusBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#5E7060]/70 dark:text-[#A4B5A3]/60 bg-black/5 dark:bg-white/5">No date set</span>`;

    if (rd && rd.dueDate) {
        const diffMs = new Date(rd.dueDate + "T00:00:00") - new Date(today + "T00:00:00");
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C8A96B]/25 text-[#967634] dark:text-[#C8A96B] border border-[#C8A96B]/40"><i class="fa-solid fa-clock-rotate-left text-[9px]"></i> RD Overdue (${Math.abs(diffDays)}d)</span>`;
        } else if (diffDays === 0) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#8FA28A]/25 text-[#5A6D58] dark:text-[#8FA28A] border border-[#8FA28A]/40 animate-pulse"><i class="fa-solid fa-bell text-[9px]"></i> RD Due Today!</span>`;
        } else {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#5A6D58] dark:text-[#A4B5A3] bg-[#8FA28A]/15"><i class="fa-regular fa-calendar-check text-[9px]"></i> ${diffDays}d left</span>`;
        }
    }

    const alertSentNotice = (rd && rd.lastAlertSent)
        ? `<span class="text-[9px] text-[#5E7060]/80 dark:text-[#A4B5A3]/80 block mt-0.5" title="Alert dispatched on ${rd.lastAlertSent}"><i class="fa-solid fa-check-double text-[#8FA28A]"></i> Alerted ${new Date(rd.lastAlertSent).toLocaleDateString()}</span>`
        : '';

    return `<div>${statusBadge}${alertSentNotice}</div>`;
}

function updateRDRowBadge(idx) {
    const badgeEl = document.getElementById(`rd-badge-box-${idx}`);
    if (badgeEl && state.rds && state.rds[idx]) {
        badgeEl.innerHTML = getRDStatusBadgeHtml(state.rds[idx]);
    }
}

// Dynamic Recurring Deposits (RD) Management
function renderRDRows() {
    const tbody = document.getElementById('rd-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!state.rds || state.rds.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-6 text-center text-[#5E7060]/70 dark:text-[#A4B5A3]/60 font-medium">
                    <i class="fa-solid fa-piggy-bank text-base mb-1 block opacity-40"></i>
                    No recurring deposits recorded yet. Click <span class="text-[#8FA28A] font-bold cursor-pointer" onclick="addRDRow()">+ Add RD</span> above.
                </td>
            </tr>
        `;
        return;
    }

    state.rds.forEach((rd, idx) => {
        const badgeMarkup = getRDStatusBadgeHtml(rd);

        tbody.innerHTML += `
            <tr class="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors" id="rd-row-${idx}">
                <td class="py-2.5 pr-2 min-w-[130px]">
                    <input type="text" value="${rd.bank || ''}" placeholder="e.g. SBI Recurring Deposit" oninput="updateRDField(${idx}, 'bank', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition">
                </td>
                <td class="py-2.5 px-2 w-24 min-w-[85px]">
                    <input type="number" value="${rd.monthlyAmount !== undefined && rd.monthlyAmount !== null ? rd.monthlyAmount : ''}" placeholder="0" oninput="updateRDField(${idx}, 'monthlyAmount', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition tabular-nums" title="Monthly Installment (₹)">
                </td>
                <td class="py-2.5 px-2 w-24 min-w-[85px]">
                    <input type="number" value="${rd.balance !== undefined && rd.balance !== null ? rd.balance : ''}" placeholder="0" oninput="updateRDField(${idx}, 'balance', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition tabular-nums" title="Accumulated Balance (₹)">
                </td>
                <td class="py-2.5 px-2 min-w-[125px]">
                    <input type="date" value="${rd.dueDate || ''}" onchange="updateRDField(${idx}, 'dueDate', this.value)" oninput="updateRDField(${idx}, 'dueDate', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition cursor-pointer" title="Installment Due Date">
                </td>
                <td class="py-2.5 px-2 min-w-[110px]">
                    <div class="flex items-center gap-1.5">
                        <div id="rd-badge-box-${idx}">
                            ${badgeMarkup}
                        </div>
                        <button type="button" onclick="triggerRDEmailManual(${idx})"
                            class="p-1.5 text-xs text-[#8FA28A] hover:bg-[#8FA28A]/15 rounded-lg transition active:scale-95 shrink-0"
                            title="Send / Test RD due alert to midhunmoorthiyedam@gmail.com">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                        <button type="button" onclick="advanceRDMonth(${idx})"
                            class="p-1 px-1.5 text-[10px] font-bold text-[#967634] dark:text-[#C8A96B] hover:bg-[#C8A96B]/15 rounded-lg transition active:scale-95 shrink-0 border border-[#C8A96B]/30"
                            title="Installment Paid / Advance date +1 Month & Add Installment to Balance">
                            +1M
                        </button>
                    </div>
                </td>
                <td class="py-2.5 pl-2 text-right w-8">
                    <button type="button" onclick="removeRDRow(${idx})"
                        class="text-[#5E7060]/60 dark:text-[#A4B5A3]/60 hover:text-[#C8A96B] hover:bg-[#C8A96B]/15 p-1.5 rounded-lg transition active:scale-90"
                        title="Delete RD">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function addRDRow() {
    if (!state.rds) state.rds = [];
    state.rds.push({
        bank: '',
        monthlyAmount: 0,
        balance: 0,
        dueDate: '',
        lastAlertSent: null
    });
    renderRDRows();
    saveAndRecalculate();
}

function updateRDField(idx, field, val) {
    if (!state.rds || !state.rds[idx]) return;
    if (field === 'monthlyAmount' || field === 'balance') {
        state.rds[idx][field] = val === '' ? '' : (parseFloat(val) || 0);
        saveAndRecalculate();
    } else if (field === 'bank') {
        state.rds[idx].bank = val;
        localStorage.setItem('family_wealth_state', JSON.stringify(state));
        autoSaveToDisk();
    } else if (field === 'dueDate') {
        state.rds[idx].dueDate = val;
        localStorage.setItem('family_wealth_state', JSON.stringify(state));
        updateRDRowBadge(idx);
        checkRDDueDates();
        autoSaveToDisk();
    }
}

function advanceRDMonth(idx) {
    if (!state.rds || !state.rds[idx]) return;
    const rd = state.rds[idx];
    let baseDate = rd.dueDate ? new Date(rd.dueDate + "T00:00:00") : new Date();
    baseDate.setMonth(baseDate.getMonth() + 1);
    rd.dueDate = baseDate.toISOString().split('T')[0];
    rd.lastAlertSent = null;
    const monthlyVal = parseFloat(rd.monthlyAmount) || 0;
    if (monthlyVal > 0) {
        rd.balance = (parseFloat(rd.balance) || 0) + monthlyVal;
    }
    localStorage.setItem('family_wealth_state', JSON.stringify(state));
    renderRDRows();
    saveAndRecalculate();
}

function removeRDRow(idx) {
    if (!state.rds) return;
    state.rds.splice(idx, 1);
    renderRDRows();
    saveAndRecalculate();
}

function triggerRDEmailManual(idx) {
    if (!state.rds || !state.rds[idx]) return;
    sendRDDueEmail(state.rds[idx], true);
}

// Automated and On-Demand RD Installment Alert Dispatcher to midhunmoorthiyedam@gmail.com
async function sendRDDueEmail(rd, isManual = false) {
    const emailTarget = (window.APP_SETTINGS && window.APP_SETTINGS.alertEmail)
        ? window.APP_SETTINGS.alertEmail
        : "midhunmoorthiyedam@gmail.com";

    const bankName = rd.bank || "Recurring Deposit Bank";
    const monthlyAmt = parseFloat(rd.monthlyAmount) || 0;
    const formattedMonthlyAmt = monthlyAmt.toLocaleString('en-IN');
    const balanceAmt = parseFloat(rd.balance) || 0;
    const formattedBalanceAmt = balanceAmt.toLocaleString('en-IN');
    const dueDateStr = rd.dueDate || "Due Date Reached";
    const alertType = isManual ? "On-Demand Manual RD Alert / Test" : "Automated Monthly RD Installment Due Date Reached";
    const subject = `[MI-AS Wealth] Recurring Deposit (RD) Due Alert: ${bankName} - ₹${formattedMonthlyAmt}`;
    const noticeMessage = `This is an automated notification from MI-AS Wealth. Your Recurring Deposit (RD) monthly installment with ${bankName} for ₹${formattedMonthlyAmt} (Current Balance: ₹${formattedBalanceAmt}) is due on ${dueDateStr}. Please ensure sufficient balance in your linked bank account.`;

    // Prepare Hidden Form for Silent POST Submission to FormSubmit
    const form = document.getElementById('fd-email-form');
    if (form) {
        form.action = `https://formsubmit.co/${emailTarget}`;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('fd-email-subject', subject);
        setVal('fd-email-bank', `Recurring Deposit: ${bankName}`);
        setVal('fd-email-amount', `₹${formattedMonthlyAmt} (Monthly RD) | Balance: ₹${formattedBalanceAmt}`);
        setVal('fd-email-duedate', dueDateStr);
        setVal('fd-email-status', alertType);
        setVal('fd-email-message', noticeMessage);
        setVal('fd-email-time', new Date().toLocaleString('en-IN'));

        try {
            form.submit();
            console.log(`RD Email dispatched via background form to ${emailTarget}`);
        } catch (e) {
            console.warn("Background form submission caught:", e);
        }
    }

    // Also attempt AJAX endpoint
    try {
        fetch(`https://formsubmit.co/ajax/${emailTarget}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                _subject: subject,
                _replyto: emailTarget,
                "Category": "Recurring Deposit (RD)",
                "Bank Name": bankName,
                "Monthly Installment": `₹${formattedMonthlyAmt}`,
                "Accumulated Balance": `₹${formattedBalanceAmt}`,
                "Installment Due Date": dueDateStr,
                "Alert Type": alertType,
                "Notice": noticeMessage,
                _template: "table",
                _captcha: "false"
            })
        }).catch(() => { });
    } catch (err) { }

    // Mark alert date
    rd.lastAlertSent = new Date().toISOString();
    localStorage.setItem('family_wealth_state', JSON.stringify(state));
    const idx = state.rds.indexOf(rd);
    if (idx !== -1) updateRDRowBadge(idx);

    const mailtoBody = `Dear Midhun,\n\nYour Recurring Deposit details:\n- Bank: ${bankName}\n- Monthly Installment: ₹${formattedMonthlyAmt}\n- Accumulated Balance: ₹${formattedBalanceAmt}\n- Due Date: ${dueDateStr}\n\nPlease ensure your bank account has sufficient balance for installment debit.\n\nGenerated by MI-AS Wealth.`;
    const mailtoUrl = `mailto:${emailTarget}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`;

    showNotificationBanner(
        `🐷 RD due alert triggered for <strong>${bankName}</strong> (₹${formattedMonthlyAmt}, Due: ${dueDateStr}) to <strong>${emailTarget}</strong>.`,
        false,
        mailtoUrl,
        'rd'
    );
}

// Automatic RD Due Date Checker
function checkRDDueDates() {
    if (!state.rds || state.rds.length === 0) return;
    const today = new Date().toISOString().split('T')[0];

    state.rds.forEach((rd) => {
        if (rd.dueDate && rd.dueDate <= today && (parseFloat(rd.monthlyAmount) || 0) > 0) {
            const lastSentDay = rd.lastAlertSent ? rd.lastAlertSent.split('T')[0] : null;
            if (lastSentDay !== today) {
                console.log(`Auto-triggering RD alert for ${rd.bank} due on ${rd.dueDate}`);
                sendRDDueEmail(rd, false);
            }
        }
    });
}

// Generate status badge HTML for an LIC Policy
function getLICStatusBadgeHtml(policy) {
    const today = new Date().toISOString().split('T')[0];
    let statusBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#5E7060]/70 dark:text-[#A4B5A3]/60 bg-black/5 dark:bg-white/5">No date set</span>`;

    if (policy && policy.dueDate) {
        const diffMs = new Date(policy.dueDate + "T00:00:00") - new Date(today + "T00:00:00");
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C8A96B]/25 text-[#967634] dark:text-[#C8A96B] border border-[#C8A96B]/40"><i class="fa-solid fa-clock-rotate-left text-[9px]"></i> Premium Overdue (${Math.abs(diffDays)}d)</span>`;
        } else if (diffDays === 0) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#8FA28A]/25 text-[#5A6D58] dark:text-[#8FA28A] border border-[#8FA28A]/40 animate-pulse"><i class="fa-solid fa-bell text-[9px]"></i> Premium Due Today!</span>`;
        } else {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#5A6D58] dark:text-[#A4B5A3] bg-[#8FA28A]/15"><i class="fa-regular fa-calendar-check text-[9px]"></i> ${diffDays}d left</span>`;
        }
    }

    const alertSentNotice = (policy && policy.lastAlertSent)
        ? `<span class="text-[9px] text-[#5E7060]/80 dark:text-[#A4B5A3]/80 block mt-0.5" title="Premium alert dispatched on ${policy.lastAlertSent}"><i class="fa-solid fa-check-double text-[#8FA28A]"></i> Alerted ${new Date(policy.lastAlertSent).toLocaleDateString()}</span>`
        : '';

    return `<div>${statusBadge}${alertSentNotice}</div>`;
}

function updateLICRowBadge(idx) {
    const badgeEl = document.getElementById(`lic-badge-box-${idx}`);
    if (badgeEl && state.lic && state.lic[idx]) {
        badgeEl.innerHTML = getLICStatusBadgeHtml(state.lic[idx]);
    }
}

// Dynamic LIC & Life Insurance Policies Management
function renderLICRows() {
    const tbody = document.getElementById('lic-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!state.lic || state.lic.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-6 text-center text-[#5E7060]/70 dark:text-[#A4B5A3]/60 font-medium">
                    <i class="fa-solid fa-shield-halved text-base mb-1 block opacity-40"></i>
                    No life insurance policies recorded yet. Click <span class="text-[#8FA28A] font-bold cursor-pointer" onclick="addLICRow()">+ Add Policy</span> above.
                </td>
            </tr>
        `;
        return;
    }

    state.lic.forEach((policy, idx) => {
        const badgeMarkup = getLICStatusBadgeHtml(policy);

        tbody.innerHTML += `
            <tr class="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors" id="lic-row-${idx}">
                <td class="py-2.5 pr-2 min-w-[130px]">
                    <input type="text" value="${policy.name || ''}" placeholder="e.g. LIC Jeevan Labh" oninput="updateLICField(${idx}, 'name', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition">
                </td>
                <td class="py-2.5 px-2 w-24 min-w-[85px]">
                    <input type="text" value="${policy.policyNo || ''}" placeholder="Policy No." oninput="updateLICField(${idx}, 'policyNo', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-mono focus:outline-none transition">
                </td>
                <td class="py-2.5 px-2 w-24 min-w-[85px]">
                    <input type="number" value="${policy.premium !== undefined && policy.premium !== null ? policy.premium : ''}" placeholder="0" oninput="updateLICField(${idx}, 'premium', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition tabular-nums" title="Premium Amount (₹)">
                </td>
                <td class="py-2.5 px-2 w-24 min-w-[85px]">
                    <input type="number" value="${policy.sumAssured !== undefined && policy.sumAssured !== null ? policy.sumAssured : ''}" placeholder="0" oninput="updateLICField(${idx}, 'sumAssured', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition tabular-nums" title="Sum Assured / Life Cover (₹)">
                </td>
                <td class="py-2.5 px-2 min-w-[125px]">
                    <input type="date" value="${policy.dueDate || ''}" onchange="updateLICField(${idx}, 'dueDate', this.value)" oninput="updateLICField(${idx}, 'dueDate', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition cursor-pointer" title="Premium Due Date">
                </td>
                <td class="py-2.5 px-2 min-w-[110px]">
                    <div class="flex items-center gap-1.5">
                        <div id="lic-badge-box-${idx}">
                            ${badgeMarkup}
                        </div>
                        <button type="button" onclick="triggerLICEmailManual(${idx})"
                            class="p-1.5 text-xs text-[#8FA28A] hover:bg-[#8FA28A]/15 rounded-lg transition active:scale-95 shrink-0"
                            title="Send / Test premium due alert to midhunmoorthiyedam@gmail.com">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                        <button type="button" onclick="advanceLICYear(${idx})"
                            class="p-1 px-1.5 text-[10px] font-bold text-[#967634] dark:text-[#C8A96B] hover:bg-[#C8A96B]/15 rounded-lg transition active:scale-95 shrink-0 border border-[#C8A96B]/30"
                            title="Premium Paid / Advance date +1 Year">
                            +1Y
                        </button>
                    </div>
                </td>
                <td class="py-2.5 pl-2 text-right w-8">
                    <button type="button" onclick="removeLICRow(${idx})"
                        class="text-[#5E7060]/60 dark:text-[#A4B5A3]/60 hover:text-[#C8A96B] hover:bg-[#C8A96B]/15 p-1.5 rounded-lg transition active:scale-90"
                        title="Delete policy">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function addLICRow() {
    if (!state.lic) state.lic = [];
    state.lic.push({
        name: '',
        policyNo: '',
        premium: 0,
        sumAssured: 0,
        dueDate: '',
        lastAlertSent: null
    });
    renderLICRows();
    saveAndRecalculate();
}

function updateLICField(idx, field, val) {
    if (!state.lic || !state.lic[idx]) return;
    if (field === 'premium' || field === 'sumAssured') {
        state.lic[idx][field] = val === '' ? '' : (parseFloat(val) || 0);
        saveAndRecalculate();
    } else if (field === 'name' || field === 'policyNo') {
        state.lic[idx][field] = val;
        localStorage.setItem('family_wealth_state', JSON.stringify(state));
    } else if (field === 'dueDate') {
        state.lic[idx].dueDate = val;
        localStorage.setItem('family_wealth_state', JSON.stringify(state));
        updateLICRowBadge(idx);
        checkLICDueDates();
    }
}

function advanceLICYear(idx) {
    if (!state.lic || !state.lic[idx]) return;
    const policy = state.lic[idx];
    let baseDate = policy.dueDate ? new Date(policy.dueDate + "T00:00:00") : new Date();
    baseDate.setFullYear(baseDate.getFullYear() + 1);
    policy.dueDate = baseDate.toISOString().split('T')[0];
    policy.lastAlertSent = null;
    localStorage.setItem('family_wealth_state', JSON.stringify(state));
    renderLICRows();
    saveAndRecalculate();
}

function removeLICRow(idx) {
    if (!state.lic) return;
    state.lic.splice(idx, 1);
    renderLICRows();
    saveAndRecalculate();
}

function triggerLICEmailManual(idx) {
    if (!state.lic || !state.lic[idx]) return;
    sendLICDueEmail(state.lic[idx], true);
}

// Automated and On-Demand LIC Premium Alert Dispatcher to midhunmoorthiyedam@gmail.com
async function sendLICDueEmail(policy, isManual = false) {
    const emailTarget = (window.APP_SETTINGS && window.APP_SETTINGS.alertEmail)
        ? window.APP_SETTINGS.alertEmail
        : "midhunmoorthiyedam@gmail.com";

    const policyName = policy.name || "LIC Life Policy";
    const policyNoStr = policy.policyNo ? `(No: ${policy.policyNo})` : "";
    const premiumAmt = parseFloat(policy.premium) || 0;
    const formattedPremium = premiumAmt.toLocaleString('en-IN');
    const sumAssuredAmt = parseFloat(policy.sumAssured) || 0;
    const formattedSumAssured = sumAssuredAmt.toLocaleString('en-IN');
    const dueDateStr = policy.dueDate || "Due Date Reached";
    const alertType = isManual ? "On-Demand Manual LIC Alert / Test" : "Automated Policy Premium Due Date Reached";
    const subject = `[MI-AS Wealth] LIC Premium Due Alert: ${policyName} - ₹${formattedPremium}`;
    const noticeMessage = `This is an automated policy premium reminder from MI-AS Wealth. Your premium payment of ₹${formattedPremium} for ${policyName} ${policyNoStr} (Sum Assured: ₹${formattedSumAssured}) is due on ${dueDateStr}. Please complete your premium renewal before the due date to ensure uninterrupted coverage.`;

    // Prepare Hidden Form for Silent POST Submission to FormSubmit
    const form = document.getElementById('fd-email-form');
    if (form) {
        form.action = `https://formsubmit.co/${emailTarget}`;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('fd-email-subject', subject);
        setVal('fd-email-bank', `LIC / Insurance: ${policyName} ${policyNoStr}`);
        setVal('fd-email-amount', `₹${formattedPremium} (Premium) | Cover: ₹${formattedSumAssured}`);
        setVal('fd-email-duedate', dueDateStr);
        setVal('fd-email-status', alertType);
        setVal('fd-email-message', noticeMessage);
        setVal('fd-email-time', new Date().toLocaleString('en-IN'));

        try {
            form.submit();
            console.log(`LIC Email dispatched via background form to ${emailTarget}`);
        } catch (e) {
            console.warn("Background form submission caught:", e);
        }
    }

    // Also attempt AJAX endpoint
    try {
        fetch(`https://formsubmit.co/ajax/${emailTarget}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                _subject: subject,
                _replyto: emailTarget,
                "Category": "LIC Policy Premium",
                "Policy Name": policyName,
                "Policy Number": policy.policyNo || "N/A",
                "Premium Amount": `₹${formattedPremium}`,
                "Sum Assured": `₹${formattedSumAssured}`,
                "Premium Due Date": dueDateStr,
                "Alert Type": alertType,
                "Notice": noticeMessage,
                _template: "table",
                _captcha: "false"
            })
        }).catch(() => { });
    } catch (err) { }

    // Mark alert date
    policy.lastAlertSent = new Date().toISOString();
    localStorage.setItem('family_wealth_state', JSON.stringify(state));
    const idx = state.lic.indexOf(policy);
    if (idx !== -1) updateLICRowBadge(idx);

    const mailtoBody = `Dear Midhun,\n\nYour LIC Policy Premium details:\n- Policy: ${policyName}\n- Policy No: ${policy.policyNo || 'N/A'}\n- Premium: ₹${formattedPremium}\n- Sum Assured: ₹${formattedSumAssured}\n- Due Date: ${dueDateStr}\n\nPlease pay before the due date to keep your life cover active.\n\nGenerated by MI-AS Wealth.`;
    const mailtoUrl = `mailto:${emailTarget}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`;

    showNotificationBanner(
        `🛡️ LIC premium due alert triggered for <strong>${policyName}</strong> (₹${formattedPremium}, Due: ${dueDateStr}) to <strong>${emailTarget}</strong>.`,
        false,
        mailtoUrl,
        'lic'
    );
}

// Automatic LIC Due Date Checker
function checkLICDueDates() {
    if (!state.lic || state.lic.length === 0) return;
    const today = new Date().toISOString().split('T')[0];

    state.lic.forEach((policy) => {
        if (policy.dueDate && policy.dueDate <= today && (parseFloat(policy.premium) || 0) > 0) {
            const lastSentDay = policy.lastAlertSent ? policy.lastAlertSent.split('T')[0] : null;
            if (lastSentDay !== today) {
                console.log(`Auto-triggering LIC premium alert for ${policy.name} due on ${policy.dueDate}`);
                sendLICDueEmail(policy, false);
            }
        }
    });
}

// Periodic check every 30 minutes if the tab stays open
setInterval(() => {
    checkFDDueDates();
    checkRDDueDates();
    checkSIPDueDates();
    checkLICDueDates();
}, 1800000);

// Generate status badge HTML for a Mutual Fund SIP
function getMFStatusBadgeHtml(mf) {
    const today = new Date().toISOString().split('T')[0];
    let statusBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#5E7060]/70 dark:text-[#A4B5A3]/60 bg-black/5 dark:bg-white/5">No SIP date</span>`;

    if (mf && mf.sipDate) {
        const diffMs = new Date(mf.sipDate + "T00:00:00") - new Date(today + "T00:00:00");
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C8A96B]/25 text-[#967634] dark:text-[#C8A96B] border border-[#C8A96B]/40"><i class="fa-solid fa-clock-rotate-left text-[9px]"></i> SIP Overdue (${Math.abs(diffDays)}d)</span>`;
        } else if (diffDays === 0) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#8FA28A]/25 text-[#5A6D58] dark:text-[#8FA28A] border border-[#8FA28A]/40 animate-pulse"><i class="fa-solid fa-bell text-[9px]"></i> SIP Due Today!</span>`;
        } else {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#5A6D58] dark:text-[#A4B5A3] bg-[#8FA28A]/15"><i class="fa-regular fa-calendar-check text-[9px]"></i> ${diffDays}d left</span>`;
        }
    }

    const alertSentNotice = (mf && mf.lastSipAlertSent)
        ? `<span class="text-[9px] text-[#5E7060]/80 dark:text-[#A4B5A3]/80 block mt-0.5" title="SIP alert dispatched on ${mf.lastSipAlertSent}"><i class="fa-solid fa-check-double text-[#8FA28A]"></i> Alerted ${new Date(mf.lastSipAlertSent).toLocaleDateString()}</span>`
        : '';

    return `<div>${statusBadge}${alertSentNotice}</div>`;
}

function updateMFRowBadge(idx) {
    const badgeEl = document.getElementById(`mf-badge-box-${idx}`);
    if (badgeEl && state.mutualFunds && state.mutualFunds[idx]) {
        badgeEl.innerHTML = getMFStatusBadgeHtml(state.mutualFunds[idx]);
    }
}

// Dynamic MF & SIP Management
function renderMFRows() {
    const tbody = document.getElementById('mf-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!state.mutualFunds || state.mutualFunds.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="py-6 text-center text-[#5E7060]/70 dark:text-[#A4B5A3]/60 font-medium">
                    <i class="fa-solid fa-chart-line text-lg mb-1 block opacity-40"></i>
                    No mutual funds or SIPs tracked yet. Click <span class="text-[#8FA28A] font-bold cursor-pointer" onclick="addMFRow()">+ Add Fund</span> above.
                </td>
            </tr>
        `;
        return;
    }

    state.mutualFunds.forEach((mf, idx) => {
        const navVal = mf.latestNav !== undefined && mf.latestNav !== null ? parseFloat(mf.latestNav).toFixed(2) : "100.00";
        tbody.innerHTML += `
            <tr class="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors" id="mf-row-${idx}">
                <td class="py-2.5 pr-2 min-w-[130px]">
                    <input type="text" value="${mf.name || ''}" placeholder="e.g. HDFC Flexi Cap" oninput="updateMFField(${idx}, 'name', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition">
                </td>
                <td class="py-2.5 px-2 w-16 min-w-[65px]">
                    <input type="number" step="any" value="${mf.units !== undefined && mf.units !== null ? mf.units : ''}" placeholder="0" oninput="updateMFField(${idx}, 'units', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition tabular-nums">
                </td>
                <td class="py-2.5 px-2 min-w-[145px]">
                    <div class="flex items-center gap-1.5">
                        <input type="text" value="${mf.code || ''}" placeholder="Code" oninput="updateMFField(${idx}, 'code', this.value)"
                            class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2 py-1.5 w-16 text-[#1C241E] dark:text-[#F7F4ED] text-xs font-mono placeholder-[#5E7060]/50 focus:outline-none transition shrink-0">
                        <button type="button" onclick="fetchNav(${idx})"
                            class="bg-[#FCFAF6] dark:bg-[#1A201B] hover:bg-[#8FA28A]/15 hover:text-[#8FA28A] border border-[#C7D3C0] dark:border-[#8FA28A]/30 px-2 py-1.5 rounded-xl text-[10px] flex items-center gap-1 font-bold text-[#5E7060] dark:text-[#A4B5A3] transition shrink-0 active:scale-95 shadow-2xs" title="Fetch NAV from mfapi.in">
                            <i class="fa-solid fa-arrows-rotate text-[9px] text-[#8FA28A]"></i> NAV
                        </button>
                        <span id="mf-nav-${idx}" class="text-[10px] font-mono text-[#5E7060]/80 dark:text-[#A4B5A3]/80 tabular-nums shrink-0" title="Latest NAV">₹${navVal}</span>
                    </div>
                </td>
                <td class="py-2.5 px-2 w-24 min-w-[85px]">
                    <input type="number" value="${mf.sipAmount !== undefined && mf.sipAmount !== null ? mf.sipAmount : ''}" placeholder="0" oninput="updateMFField(${idx}, 'sipAmount', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2.5 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition tabular-nums" title="Monthly SIP (₹)">
                </td>
                <td class="py-2.5 px-2 min-w-[125px]">
                    <input type="date" value="${mf.sipDate || ''}" onchange="updateMFField(${idx}, 'sipDate', this.value)" oninput="updateMFField(${idx}, 'sipDate', this.value)"
                        class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#8FA28A] focus:ring-2 focus:ring-[#8FA28A]/15 rounded-xl px-2 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition cursor-pointer" title="Next SIP Installment Date">
                </td>
                <td class="py-2.5 px-2 min-w-[110px]">
                    <div class="flex items-center gap-1.5">
                        <div id="mf-badge-box-${idx}">
                            ${getMFStatusBadgeHtml(mf)}
                        </div>
                        <button type="button" onclick="triggerMFSipEmailManual(${idx})"
                            class="p-1.5 text-xs text-[#8FA28A] hover:bg-[#8FA28A]/15 rounded-lg transition active:scale-95 shrink-0"
                            title="Send / Test SIP alert to midhunmoorthiyedam@gmail.com">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                        <button type="button" onclick="advanceSipMonth(${idx})"
                            class="p-1 px-1.5 text-[10px] font-bold text-[#967634] dark:text-[#C8A96B] hover:bg-[#C8A96B]/15 rounded-lg transition active:scale-95 shrink-0 border border-[#C8A96B]/30"
                            title="SIP Paid / Advance date +1 Month">
                            +1M
                        </button>
                    </div>
                </td>
                <td class="py-2.5 px-2 text-right font-extrabold text-[#5A6D58] dark:text-[#8FA28A] tabular-nums whitespace-nowrap min-w-[80px]" id="mf-val-${idx}">₹0</td>
                <td class="py-2.5 pl-2 text-right w-8">
                    <button type="button" onclick="removeMF(${idx})"
                        class="text-[#5E7060]/60 dark:text-[#A4B5A3]/60 hover:text-[#C8A96B] hover:bg-[#C8A96B]/15 p-1.5 rounded-lg transition active:scale-90"
                        title="Delete fund">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function addMFRow() {
    if (!state.mutualFunds) state.mutualFunds = [];
    state.mutualFunds.push({
        name: 'New Fund',
        units: 0,
        latestNav: 100,
        code: '',
        sipAmount: 0,
        sipDate: '',
        lastSipAlertSent: null
    });
    renderMFRows();
    saveAndRecalculate();
}

function updateMFField(idx, field, val) {
    if (!state.mutualFunds || !state.mutualFunds[idx]) return;
    if (field === 'units') {
        state.mutualFunds[idx].units = val === '' ? '' : (parseFloat(val) || 0);
        saveAndRecalculate();
    } else if (field === 'sipAmount') {
        state.mutualFunds[idx].sipAmount = val === '' ? '' : (parseFloat(val) || 0);
        saveAndRecalculate();
    } else if (field === 'name') {
        state.mutualFunds[idx].name = val;
        localStorage.setItem('family_wealth_state', JSON.stringify(state));
    } else if (field === 'code') {
        state.mutualFunds[idx].code = val;
        localStorage.setItem('family_wealth_state', JSON.stringify(state));
    } else if (field === 'sipDate') {
        state.mutualFunds[idx].sipDate = val;
        localStorage.setItem('family_wealth_state', JSON.stringify(state));
        updateMFRowBadge(idx);
        checkSIPDueDates();
    }
}

function advanceSipMonth(idx) {
    if (!state.mutualFunds || !state.mutualFunds[idx]) return;
    const mf = state.mutualFunds[idx];
    let baseDate = mf.sipDate ? new Date(mf.sipDate + "T00:00:00") : new Date();
    baseDate.setMonth(baseDate.getMonth() + 1);
    mf.sipDate = baseDate.toISOString().split('T')[0];
    mf.lastSipAlertSent = null;
    localStorage.setItem('family_wealth_state', JSON.stringify(state));
    renderMFRows();
    saveAndRecalculate();
}

function removeMF(idx) {
    if (!state.mutualFunds) return;
    state.mutualFunds.splice(idx, 1);
    renderMFRows();
    saveAndRecalculate();
}

function triggerMFSipEmailManual(idx) {
    if (!state.mutualFunds || !state.mutualFunds[idx]) return;
    sendSIPDueEmail(state.mutualFunds[idx], true);
}

async function sendSIPDueEmail(mf, isManual = false) {
    const emailTarget = (window.APP_SETTINGS && window.APP_SETTINGS.alertEmail)
        ? window.APP_SETTINGS.alertEmail
        : "midhunmoorthiyedam@gmail.com";

    const fundName = mf.name || "Mutual Fund Scheme";
    const sipAmt = parseFloat(mf.sipAmount) || 0;
    const formattedSipAmt = sipAmt.toLocaleString('en-IN');
    const dueDateStr = mf.sipDate || "Due Date Reached";
    const alertType = isManual ? "On-Demand Manual SIP Alert / Test" : "Automated Monthly SIP Due Date Reached";
    const subject = `[MI-AS Wealth] Mutual Fund SIP Due Alert: ${fundName} - ₹${formattedSipAmt}`;
    const noticeMessage = `This is an automated SIP reminder from MI-AS Wealth. Your monthly Systematic Investment Plan (SIP) installment of ₹${formattedSipAmt} for ${fundName} is due on ${dueDateStr}. Please ensure sufficient balance in your linked bank account.`;

    // Prepare Hidden Form for Silent POST Submission to FormSubmit
    const form = document.getElementById('fd-email-form');
    if (form) {
        form.action = `https://formsubmit.co/${emailTarget}`;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('fd-email-subject', subject);
        setVal('fd-email-bank', `Mutual Fund: ${fundName}`);
        setVal('fd-email-amount', `₹${formattedSipAmt} (Monthly SIP)`);
        setVal('fd-email-duedate', dueDateStr);
        setVal('fd-email-status', alertType);
        setVal('fd-email-message', noticeMessage);
        setVal('fd-email-time', new Date().toLocaleString('en-IN'));

        try {
            form.submit();
            console.log(`SIP Email dispatched via background form to ${emailTarget}`);
        } catch (e) {
            console.warn("Background form submission caught:", e);
        }
    }

    // Also attempt AJAX endpoint
    try {
        fetch(`https://formsubmit.co/ajax/${emailTarget}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                _subject: subject,
                _replyto: emailTarget,
                "Category": "Mutual Fund SIP",
                "Fund Name": fundName,
                "Monthly SIP Amount": `₹${formattedSipAmt}`,
                "SIP Due Date": dueDateStr,
                "Alert Type": alertType,
                "Notice": noticeMessage,
                _template: "table",
                _captcha: "false"
            })
        }).catch(() => { });
    } catch (err) { }

    // Mark alert date
    mf.lastSipAlertSent = new Date().toISOString();
    localStorage.setItem('family_wealth_state', JSON.stringify(state));
    const idx = state.mutualFunds.indexOf(mf);
    if (idx !== -1) updateMFRowBadge(idx);

    const mailtoBody = `Dear Midhun,\n\nYour Mutual Fund SIP details:\n- Fund: ${fundName}\n- Monthly SIP: ₹${formattedSipAmt}\n- Due Date: ${dueDateStr}\n\nPlease ensure your bank account has sufficient balance for auto-debit.\n\nGenerated by MI-AS Wealth.`;
    const mailtoUrl = `mailto:${emailTarget}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`;

    showNotificationBanner(
        `🔔 SIP due alert triggered for <strong>${fundName}</strong> (₹${formattedSipAmt}, Due: ${dueDateStr}) to <strong>${emailTarget}</strong>.`,
        false,
        mailtoUrl,
        'mf'
    );
}

// Automatic SIP Due Date Checker
function checkSIPDueDates() {
    if (!state.mutualFunds || state.mutualFunds.length === 0) return;
    const today = new Date().toISOString().split('T')[0];

    state.mutualFunds.forEach((mf) => {
        if (mf.sipDate && mf.sipDate <= today && (parseFloat(mf.sipAmount) || 0) > 0) {
            const lastSentDay = mf.lastSipAlertSent ? mf.lastSipAlertSent.split('T')[0] : null;
            if (lastSentDay !== today) {
                console.log(`Auto-triggering SIP alert for ${mf.name} due on ${mf.sipDate}`);
                sendSIPDueEmail(mf, false);
            }
        }
    });
}

async function fetchNav(idx) {
    const code = state.mutualFunds[idx].code;
    if (!code) return alert("Please enter a valid scheme code from mfapi.in");
    try {
        const res = await fetch(`https://api.mfapi.in/mf/${code}`);
        const data = await res.json();
        if (data && data.data && data.data.length > 0) {
            const latestNav = parseFloat(data.data[0].nav);
            state.mutualFunds[idx].latestNav = latestNav;
            state.mutualFunds[idx].name = data.meta.scheme_name || state.mutualFunds[idx].name;
            renderMFRows();
            saveAndRecalculate();
        }
    } catch (e) {
        alert("Failed to fetch NAV. Please verify the scheme code.");
    }
}

// Dynamic Stocks Management
function renderStockRows() {
    const tbody = document.getElementById('stocks-table-body');
    tbody.innerHTML = '';
    if (state.stocks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-6 text-center text-[#5E7060]/70 dark:text-[#A4B5A3]/60 font-medium">
                    <i class="fa-solid fa-arrow-trend-up text-lg mb-1 block opacity-40"></i>
                    No stock holdings added yet. Click <span class="text-[#C8A96B] font-bold">+ Add Stock</span> above.
                </td>
            </tr>
        `;
        return;
    }
    state.stocks.forEach((st, idx) => {
        tbody.innerHTML += `
            <tr class="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                <td class="py-2.5 pr-2.5 min-w-[140px]">
                    <input type="text" value="${st.name}" onchange="updateStock(${idx}, 'name', this.value)" class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#C8A96B] focus:ring-2 focus:ring-[#C8A96B]/15 rounded-xl px-3 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition uppercase">
                </td>
                <td class="py-2.5 px-2 w-20 min-w-[70px]">
                    <input type="number" value="${st.qty}" onchange="updateStock(${idx}, 'qty', this.value)" class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#C8A96B] focus:ring-2 focus:ring-[#C8A96B]/15 rounded-xl px-3 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition tabular-nums">
                </td>
                <td class="py-2.5 px-2 w-24 min-w-[80px]">
                    <input type="number" value="${st.price}" onchange="updateStock(${idx}, 'price', this.value)" class="bg-[#F7F4ED]/80 dark:bg-[#131714]/80 border border-[#C7D3C0] dark:border-[#8FA28A]/25 focus:border-[#C8A96B] focus:ring-2 focus:ring-[#C8A96B]/15 rounded-xl px-3 py-1.5 w-full text-[#1C241E] dark:text-[#F7F4ED] text-xs font-semibold focus:outline-none transition tabular-nums">
                </td>
                <td class="py-2.5 px-2 text-right font-extrabold text-[#967634] dark:text-[#C8A96B] tabular-nums whitespace-nowrap min-w-[85px]" id="stock-val-${idx}">₹0</td>
                <td class="py-2.5 pl-2 text-right w-8">
                    <button onclick="removeStock(${idx})" class="text-[#5E7060]/60 dark:text-[#A4B5A3]/60 hover:text-[#C8A96B] hover:bg-[#C8A96B]/15 p-1.5 rounded-lg transition active:scale-90" title="Delete stock">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}
function addStockRow() {
    state.stocks.push({ name: 'RELIANCE', qty: 0, price: 0 });
    renderStockRows();
    saveAndRecalculate();
}
function updateStock(idx, field, val) {
    state.stocks[idx][field] = field !== 'name' ? parseFloat(val) || 0 : val;
    saveAndRecalculate();
}
function removeStock(idx) {
    state.stocks.splice(idx, 1);
    renderStockRows();
    saveAndRecalculate();
}

// Chart.js Visualization matching [#C7D3C0, #8FA28A, #C8A96B]
function updateChart(safe, invest, gold) {
    const ctx = document.getElementById('assetChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const chartBorderColor = isDark ? '#1A201B' : '#FCFAF6';

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Safe Assets (Bank/FD/RD/LIC)', 'Investments (MF/Stocks)', 'Gold Holdings'],
            datasets: [{
                data: [safe, invest, gold],
                backgroundColor: ['#C7D3C0', '#8FA28A', '#C8A96B'],
                borderColor: chartBorderColor,
                borderWidth: 4,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    display: false // The rich breakdown list beside the chart serves as the ultimate interactive legend
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(26, 32, 27, 0.95)' : 'rgba(252, 250, 246, 0.95)',
                    titleColor: isDark ? '#F7F4ED' : '#1C241E',
                    bodyColor: isDark ? '#C7D3C0' : '#5E7060',
                    borderColor: isDark ? 'rgba(143,162,138,0.3)' : 'rgba(199,211,192,0.8)',
                    borderWidth: 1,
                    padding: 10,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: {
                        label: function (context) {
                            return ` ${context.label}: ₹${context.raw.toLocaleString('en-IN')}`;
                        }
                    }
                }
            }
        }
    });
}

// Re-render chart on window resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (chartInstance && state) {
            recalculateAll();
        }
    }, 250);
});

function refreshData() {
    location.reload();
}

// -------------------------------------------------------------
// Persistent Disk File Sync, Import & Export Engine
// -------------------------------------------------------------
let diskFileHandle = null;
let isServerConnected = false;
let supabaseClient = null;

// Helper to check if a portfolio state has real values vs blank zeros
function isPortfolioEmpty(p) {
    if (!p) return true;
    const hasGold = (parseFloat(p.goldGrams) || 0) > 0;
    const hasSavings = (parseFloat(p.savings) || 0) > 0;
    const hasFd = (parseFloat(p.fd) || 0) > 0;
    const hasFds = Array.isArray(p.fds) && p.fds.some(f => (parseFloat(f.amount) || 0) > 0 || (f.bank && f.bank.trim() !== ''));
    const hasRds = Array.isArray(p.rds) && p.rds.some(r => (parseFloat(r.balance) || 0) > 0 || (parseFloat(r.monthlyAmount) || 0) > 0 || (r.bank && r.bank.trim() !== ''));
    const hasLic = Array.isArray(p.lic) && p.lic.some(l => (parseFloat(l.sumAssured) || 0) > 0 || (parseFloat(l.premium) || 0) > 0 || (l.name && l.name.trim() !== ''));
    const hasMf = Array.isArray(p.mutualFunds) && p.mutualFunds.some(m => (parseFloat(m.units) || 0) > 0 || (parseFloat(m.sipAmount) || 0) > 0 || (m.name && m.name !== 'New Fund' && m.name.trim() !== ''));
    const hasStocks = Array.isArray(p.stocks) && p.stocks.some(s => (parseFloat(s.qty) || 0) > 0 || (parseFloat(s.val) || 0) > 0 || (s.name && s.name.trim() !== ''));
    return !(hasGold || hasSavings || hasFd || hasFds || hasRds || hasLic || hasMf || hasStocks);
}

// -------------------------------------------------------------
// On-Demand Supabase Cloud Sync Engine (Manual Trigger Only)
// -------------------------------------------------------------
function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const sbUrl = (window.APP_SETTINGS && window.APP_SETTINGS.supabaseUrl)
        ? window.APP_SETTINGS.supabaseUrl
        : "https://heypjrfnuiazhfgcvoyg.supabase.co";
    const sbAnonKey = (window.APP_SETTINGS && window.APP_SETTINGS.supabaseAnonKey)
        ? window.APP_SETTINGS.supabaseAnonKey
        : "";

    if (window.supabase && sbAnonKey) {
        try {
            supabaseClient = window.supabase.createClient(sbUrl, sbAnonKey);
        } catch (e) {
            console.warn("Supabase init notice:", e);
        }
    }
    return supabaseClient;
}

// Pull latest data from Supabase Cloud (Only on user click)
async function pullFromSupabaseCloud() {
    const client = getSupabaseClient();
    if (!client) {
        alert("Supabase credentials not configured in appsettings.js.");
        return;
    }

    const headerBtn = document.getElementById('header-sync-btn');
    if (headerBtn) headerBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Pulling...</span>`;

    try {
        const { data, error } = await client
            .from('portfolio')
            .select('data')
            .eq('id', 1)
            .maybeSingle();

        if (error) throw error;

        if (data && data.data && typeof data.data === 'object' && !isPortfolioEmpty(data.data)) {
            state = data.data;
            localStorage.setItem('family_wealth_state', JSON.stringify(state));
            initDashboard();
            updateDiskSyncBadge("Cloud Data Synced", true);
            showNotificationBanner("☁️ Successfully pulled latest portfolio data from Supabase Cloud!", false, null, 'fd');
        } else {
            showNotificationBanner("ℹ️ Cloud has no saved data yet. Use 'Push to Cloud' to upload your current portfolio.", false, null, 'fd');
        }
    } catch (err) {
        console.error("Supabase pull error:", err);
        showNotificationBanner(`⚠️ Cloud pull failed: ${err.message || 'Check connection'}`, true, null, 'fd');
    } finally {
        if (headerBtn) headerBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate text-xs"></i> <span>Sync Data</span>`;
    }
}

// Push current data to Supabase Cloud (Only on user click)
async function pushToSupabaseCloud() {
    const client = getSupabaseClient();
    if (!client) {
        alert("Supabase credentials not configured in appsettings.js.");
        return;
    }

    const headerBtn = document.getElementById('header-sync-btn');
    if (headerBtn) headerBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Saving...</span>`;

    try {
        const { error } = await client
            .from('portfolio')
            .upsert({ id: 1, data: state, updated_at: new Date().toISOString() });

        if (error) throw error;

        updateDiskSyncBadge("Saved to Supabase Cloud", true);
        showNotificationBanner("☁️ Current portfolio successfully saved to Supabase Cloud!", false, null, 'fd');
    } catch (err) {
        console.error("Supabase push error:", err);
        showNotificationBanner(`⚠️ Cloud save failed: ${err.message || 'Check connection'}`, true, null, 'fd');
    } finally {
        if (headerBtn) headerBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate text-xs"></i> <span>Sync Data</span>`;
    }
}

// Master Sync Cloud Function (Header button)
async function syncCloudData() {
    const client = getSupabaseClient();
    if (!client) {
        syncWithDiskFile();
        return;
    }

    const headerBtn = document.getElementById('header-sync-btn');
    if (headerBtn) headerBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Syncing...</span>`;

    try {
        const { data, error } = await client
            .from('portfolio')
            .select('data')
            .eq('id', 1)
            .maybeSingle();

        if (error) throw error;

        const localHasData = !isPortfolioEmpty(state);
        const cloudHasData = data && data.data && !isPortfolioEmpty(data.data);

        if (localHasData && !cloudHasData) {
            // Upload current local data to cloud
            await client.from('portfolio').upsert({ id: 1, data: state, updated_at: new Date().toISOString() });
            updateDiskSyncBadge("Uploaded to Cloud", true);
            showNotificationBanner("☁️ Your current portfolio has been uploaded to Supabase Cloud!", false, null, 'fd');
        } else if (cloudHasData) {
            // Pull from cloud
            state = data.data;
            localStorage.setItem('family_wealth_state', JSON.stringify(state));
            initDashboard();
            updateDiskSyncBadge("Cloud Data Synced", true);
            showNotificationBanner("☁️ Pulled latest portfolio data from Supabase Cloud!", false, null, 'fd');
        } else {
            updateDiskSyncBadge("Cloud Connected", true);
            showNotificationBanner("☁️ Cloud database connected and ready.", false, null, 'fd');
        }
    } catch (err) {
        console.error("Supabase sync error:", err);
        showNotificationBanner(`⚠️ Cloud sync error: ${err.message || 'Check connection'}`, true, null, 'fd');
    } finally {
        if (headerBtn) headerBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate text-xs"></i> <span>Sync Data</span>`;
    }
}

function getApiSaveUrl() {
    return (window.location.protocol === 'http:' || window.location.protocol === 'https:')
        ? '/api/save'
        : 'http://localhost:3000/api/save';
}

function getApiDataUrl() {
    return (window.location.protocol === 'http:' || window.location.protocol === 'https:')
        ? '/api/data'
        : 'http://localhost:3000/api/data';
}

async function autoSaveToDisk() {
    // Local storage is updated in saveAndRecalculate()
    // Optional local Node.js server save if running locally
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        try {
            fetch(getApiSaveUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            }).catch(() => { });
        } catch (e) { }
    }

    // Native File System Access handle if active
    if (diskFileHandle) {
        try {
            const writable = await diskFileHandle.createWritable();
            await writable.write(JSON.stringify(state, null, 2));
            await writable.close();
        } catch (e) { }
    }
}

async function syncWithDiskFile() {
    if (getSupabaseClient()) {
        await syncCloudData();
        return;
    }

    // Native File System Access API fallback
    if ('showSaveFilePicker' in window) {
        try {
            diskFileHandle = await window.showSaveFilePicker({
                suggestedName: 'portfolio_data.json',
                types: [{
                    description: 'JSON Portfolio Data',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            const writable = await diskFileHandle.createWritable();
            await writable.write(JSON.stringify(state, null, 2));
            await writable.close();
            updateDiskSyncBadge(`Linked: ${diskFileHandle.name}`, true);
            showNotificationBanner(`📁 Direct disk sync active with <strong>${diskFileHandle.name}</strong>!`, false, null, 'fd');
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                exportData();
                return;
            }
        }
    } else {
        exportData();
    }
}

function updateDiskSyncBadge(msg, isSuccess = true) {
    const textEl = document.getElementById('disk-sync-text');
    if (textEl) textEl.innerText = msg;
    const headerBtn = document.getElementById('header-sync-btn');
    if (headerBtn) {
        headerBtn.title = msg;
        const icon = headerBtn.querySelector('i');
        if (icon) {
            icon.className = isSuccess ? "fa-solid fa-check text-xs" : "fa-solid fa-floppy-disk text-xs";
            setTimeout(() => {
                icon.className = "fa-solid fa-floppy-disk text-xs";
            }, 2500);
        }
    }
}

function importDataFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (typeof imported === 'object' && imported !== null) {
                state.goldGrams = imported.goldGrams !== undefined ? imported.goldGrams : 0;
                state.goldPurity = imported.goldPurity || '22K';
                state.goldCustomRate = imported.goldCustomRate || 0;
                state.savings = imported.savings !== undefined ? imported.savings : 0;
                state.fd = imported.fd !== undefined ? imported.fd : 0;
                state.fds = Array.isArray(imported.fds) ? imported.fds : [];
                state.rds = Array.isArray(imported.rds) ? imported.rds : [];
                state.lic = Array.isArray(imported.lic) ? imported.lic : [];
                state.mutualFunds = Array.isArray(imported.mutualFunds) ? imported.mutualFunds : [];
                state.stocks = Array.isArray(imported.stocks) ? imported.stocks : [];

                localStorage.setItem('family_wealth_state', JSON.stringify(state));
                initDashboard();
                autoSaveToDisk();
                showNotificationBanner(`📂 Portfolio successfully restored from <strong>${file.name}</strong>!`, false, null, 'fd');
            } else {
                alert("The selected file is not a valid portfolio JSON file.");
            }
        } catch (err) {
            alert("Error reading JSON file: " + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "portfolio_data.json");
    dlAnchorElem.click();
    showNotificationBanner("💾 Downloaded latest <strong>portfolio_data.json</strong> backup to your computer!", false, null, 'fd');
}
