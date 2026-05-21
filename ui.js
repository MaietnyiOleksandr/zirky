// ════════════════════════════════════════════════════
// UI     ui.js — Ui
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260521.0938';

// ════════════════════════════════════════════════════════════

import { state } from './state.js';
import { buildSubjectSelects } from './subjects.js';
import { renderAchievementsHome } from './achievements.js';
import { renderGoal } from './goals.js';

// ════════════════════════════════════════════════════════════
// 🗂️   БЛОК: Навігація по вкладках
// ════════════════════════════════════════════════════════════
// Додавання записів

export function updateUI() {
    buildSubjectSelects(); // Оновлюємо всі select-и предметів з subjects.js
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
        // Дитина: показуємо "Довідник", блок "Додати" доступний (форми зсередини керуються navigation.js)
        const guideBtn = document.getElementById('tabBtnGuide');
        if (guideBtn) guideBtn.style.display = '';
        document.getElementById('parentInstructions').style.display = 'none';
        document.getElementById('childInstructions').style.display = 'block';
    } else {
        // Батьки: ховаємо "Довідник"
        const guideBtn = document.getElementById('tabBtnGuide');
        if (guideBtn) guideBtn.style.display = 'none';
        document.getElementById('parentInstructions').style.display = 'block';
        document.getElementById('childInstructions').style.display = 'none';
        document.getElementById('currentPin').textContent = state.data.pin;
    }

    // Батьківський блок "Корекція даних" в акордеоні налаштувань
    const _isParent = !!state.data.isParent;
    const correctionWrap = document.getElementById('settingsAccordionWrap_correction');
    if (correctionWrap) correctionWrap.style.display = _isParent ? 'block' : 'none';

    // Оновлюємо баланс всередині блоку (якщо батько)
    if (_isParent) {
        const el = document.getElementById('currentBalanceDisplay');
        if (el) el.textContent = (state.data.balance || 0) + '⭐';
        const rates = state.data.conversionRates || { minutesPerStar: 2, moneyPerStar: 1 };
        const mEl = document.getElementById('minutesPerStar');
        const gEl = document.getElementById('moneyPerStar');
        if (mEl) mEl.value = rates.minutesPerStar;
        if (gEl) gEl.value = rates.moneyPerStar;
        const mSpan = document.getElementById('currentMinutesRate');
        const gSpan = document.getElementById('currentMoneyRate');
        if (mSpan) mSpan.textContent = rates.minutesPerStar;
        if (gSpan) gSpan.textContent = rates.moneyPerStar;
        const pinEl = document.getElementById('currentPin');
        if (pinEl) pinEl.textContent = state.data.pin;
    }

    const subjSchedBtn = document.getElementById('scheduleSubjectsBtnWrap');
    if (subjSchedBtn) subjSchedBtn.style.display = _isParent ? 'block' : 'none';

    // Батьківські кнопки в розкладі
    const schedParentBtns = document.getElementById('scheduleParentBtns');
    if (schedParentBtns) schedParentBtns.style.display = _isParent ? 'flex' : 'none';

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
