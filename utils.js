// ════════════════════════════════════════════════════
// UTILS  utils.js — 🔧 Утиліти
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260502.0850';

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

export function nowKyiv() {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Kyiv' }).replace(' ', 'T');
}
