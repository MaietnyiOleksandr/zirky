// ════════════════════════════════════════════════════
// 🗂️  navigation.js — Навігація між вкладками та формами
//     Зірки Успіху | v3.20260426.1627
//
//     Виокремлено для розриву циклічних залежностей:
//     history.js, stats.js, freeze.js потребували
//     showForm/switchTab, а ui.js потребував їх модулів
// ════════════════════════════════════════════════════

import { state } from './state.js';
import { getTodayDate } from './utils.js';
import { renderAchievements, renderAchievementsHome } from './achievements.js';
import { renderGoal } from './goals.js';
import { renderFreezePeriods } from './freeze.js';
import { renderHistory, changeMonth } from './history.js';
import { renderRewards } from './rewards.js';
import { renderStats, checkStreakWarning } from './stats.js';
import { showDataInfo } from './settings.js';

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

// ── Слухаємо події від firebase.js та freeze.js ──────────────
document.addEventListener('zirky:dataLoaded', () => {
    const activeSection = document.querySelector('.section.active');
    if (activeSection) {
        if (activeSection.id === 'historySection') renderHistory();
        if (activeSection.id === 'statsSection') renderStats();
        if (activeSection.id === 'rewardsSection') renderRewards();
    }
    checkStreakWarning();
});

// ── Слухаємо навігаційні події від інших модулів ─────────────
document.addEventListener('zirky:showForm', (e) => showForm(e.detail));
document.addEventListener('zirky:switchTab', (e) => switchTab(e.detail, true));
