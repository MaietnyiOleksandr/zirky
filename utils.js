// ════════════════════════════════════════════════════
// UTILS  utils.js — Utils
//     Зірки Успіху | v3.20260426.0912
// ════════════════════════════════════════════════════

import { state } from './state.js';

// ════════════════════════════════════════════════════════════
// 🔧  БЛОК: Утиліти
// ════════════════════════════════════════════════════════════
        export function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

export function setTodayDates() {
    const today = getTodayDate();
    document.getElementById('gradeDate').value = today;
    document.getElementById('bonusDate').value = today;
    document.getElementById('specialDate').value = today;
}

// Вхід

// 🔐 AUTH функції → auth.js
