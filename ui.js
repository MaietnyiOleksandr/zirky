// ════════════════════════════════════════════════════
// UI     ui.js — Ui
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260510.0005';

// ════════════════════════════════════════════════════════════

import { state } from './state.js';
import { showForm, switchTab } from './navigation.js';
export { showForm, switchTab };  // re-export — інші файли ще імпортують з ui.js
import { renderAchievementsHome } from './achievements.js';
import { renderGoal } from './goals.js';

// ════════════════════════════════════════════════════════════
// 🗂️   БЛОК: Навігація по вкладках
// ════════════════════════════════════════════════════════════
// Додавання записів

export function updateUI() {
    document.getElementById('balance').textContent = Number(state.data.balance) + '⭐';

    let records = state.data.records || [];
    if (state.showPeriod === 'month') {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        records = records.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
    }
    const earned = records.filter(r=>r.type==='earn').reduce((s,r)=>s+r.stars,0);
    const spent = records.filter(r=>r.type==='spend').reduce((s,r)=>s+r.stars,0);

    document.getElementById('earnedStats').textContent = earned + '⭐';
    document.getElementById('spentStats').textContent = spent + '⭐';

    if (!state.data.isParent) {
        document.querySelectorAll('.tab').forEach(t => {
            if (t.textContent.includes('Додати')) t.style.display = 'none';
        });
        document.getElementById('parentInstructions').style.display = 'none';
        document.getElementById('childInstructions').style.display = 'block';
    } else {
        // Відновлюємо всі вкладки для батьків
        document.querySelectorAll('.tab').forEach(t => t.style.display = '');
        document.getElementById('parentInstructions').style.display = 'block';
        document.getElementById('childInstructions').style.display = 'none';
        document.getElementById('currentPin').textContent = state.data.pin;
    }

    // Батьківські блоки в налаштуваннях
    const _isParent = !!state.data.isParent;
    const pinBlock     = document.getElementById('pinSettingsBlock');
    const balanceBlock = document.getElementById('balanceCorrectionBlock');
    const ratesBlock   = document.getElementById('conversionRatesBlock');
    if (pinBlock)     pinBlock.style.display     = _isParent ? 'block' : 'none';
    if (balanceBlock) {
        balanceBlock.style.display = _isParent ? 'block' : 'none';
        if (_isParent) {
            const el = document.getElementById('currentBalanceDisplay');
            if (el) el.textContent = (state.data.balance || 0) + '⭐';
        }
    }
    const manualBlock = document.getElementById('manualRecordBlock');
    if (manualBlock) manualBlock.style.display = _isParent ? 'block' : 'none';

    // Батьківські кнопки в розкладі
    const schedParentBtns = document.getElementById('scheduleParentBtns');
    if (schedParentBtns) schedParentBtns.style.display = _isParent ? 'flex' : 'none';

    // Таб "Розклад" — поки прихований для дитини (тестування)
    const schedTab = document.querySelector('.tab[data-tab="schedule"]');
    if (schedTab) schedTab.style.display = _isParent ? '' : 'none';

    if (ratesBlock) {
        ratesBlock.style.display = _isParent ? 'block' : 'none';
        if (_isParent) {
            const rates = state.data.conversionRates || { minutesPerStar: 2, moneyPerStar: 1 };
            const mEl = document.getElementById('minutesPerStar');
            const gEl = document.getElementById('moneyPerStar');
            if (mEl) mEl.value = rates.minutesPerStar;
            if (gEl) gEl.value = rates.moneyPerStar;
            const mSpan = document.getElementById('currentMinutesRate');
            const gSpan = document.getElementById('currentMoneyRate');
            if (mSpan) mSpan.textContent = rates.minutesPerStar;
            if (gSpan) gSpan.textContent = rates.moneyPerStar;
        }
    }

    renderAchievementsHome();

    if (document.getElementById('achievementsSection')?.classList.contains('active')) {
        if (window.renderAchievements) window.renderAchievements();
    }

    renderGoal();
}

export function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}


// ── Слухаємо зміни стану (від freeze.js та інших) ────────────
document.addEventListener('zirky:stateChanged', () => {
    updateUI();
});
