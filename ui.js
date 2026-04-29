// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260429.1236';
// UI     ui.js — Ui
//     Зірки Успіху | v3.20260429.1236
// ════════════════════════════════════════════════════

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
    
    renderAchievementsHome();
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
