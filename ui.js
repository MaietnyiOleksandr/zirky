// ════════════════════════════════════════════════════
// UI     ui.js — Ui
//     Зірки Успіху | v3.20260426.0912
// ════════════════════════════════════════════════════

import { state } from './state.js';
import { renderAchievementsHome } from './achievements.js';
import { renderGoal } from './goals.js';
import { checkStreakWarning } from './stats.js';

// ════════════════════════════════════════════════════════════
// 🗂️   БЛОК: Навігація по вкладках
// ════════════════════════════════════════════════════════════
        export function switchTab(tab, fromClick) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    // Якщо виклик від кліку — підсвічуємо натиснуту вкладку
    if (fromClick && event && event.target) {
        event.target.classList.add('active');
    } else {
        // Програмний виклик — підсвічуємо вкладку по імені
        document.querySelectorAll('.tab').forEach(t => {
            if (t.getAttribute('onclick') && t.getAttribute('onclick').includes("'" + tab + "'")) {
                t.classList.add('active');
            }
        });
    }
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(tab + 'Section').classList.add('active');

    if (tab === 'history') renderHistory();
    else if (tab === 'rewards') {
        renderRewards();
        // Встановлюємо дефолтну дату для витрат
        const rewardDateInput = document.getElementById('customRewardDate');
        if (rewardDateInput && !rewardDateInput.value) {
            rewardDateInput.value = getTodayDate();
        }
    }
    else if (tab === 'achievements') renderAchievements();
    else if (tab === 'stats') renderStats();
    else if (tab === 'settings') showDataInfo();

    if (!state.data.isParent && tab === 'add') {
        switchTab('instructions');
    }
}

export function showForm(type) {
    document.querySelectorAll('.quick-action-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('gradeForm').style.display = 'none';
    document.getElementById('diagnosticForm').style.display = 'none';
    document.getElementById('bonusForm').style.display = 'none';
    document.getElementById('specialForm').style.display = 'none';
    document.getElementById('freezeForm').style.display = 'none';
    document.getElementById(type + 'Form').style.display = 'block';
    
    // Встановлюємо дефолтні дати
    if (type === 'diagnostic') {
        const today = getTodayDate();
        document.getElementById('diagnosticDate').value = today;
    }
    
    // Якщо відкрили канікули - встановлюємо дефолтні дати та оновлюємо список
    if (type === 'freeze') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        document.getElementById('freezeFromDate').value = today.toISOString().split('T')[0];
        document.getElementById('freezeUntilDate').value = tomorrow.toISOString().split('T')[0];
        
        renderFreezePeriods();
    }
}

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
