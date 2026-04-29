// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260429.1238';
// UTILS  utils.js — Utils
//     Зірки Успіху | v3.20260429.1238
// ════════════════════════════════════════════════════



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
