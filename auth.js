// ════════════════════════════════════════════════════
// 🔐  auth.js — Авторизація та PIN-код
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260505.2222';

import { state } from './state.js';
import { saveData } from './firebase.js';
import { nowKyiv } from './utils.js';
import { switchTab, updateUI } from './ui.js';
import { applyAppearance } from './appearance.js';

// ════════════════════════════════════════════════════════════
// 🔐  БЛОК: Авторизація / PIN
// ════════════════════════════════════════════════════════════
export function showPinInput() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('pinOverlay').style.display = 'flex';
}

export function enterAsChild(loginType = 'direct') {
    state.data.isParent = false;
    // Зберігаємо час входу дитини (для батьківських сповіщень)
    if (!state.data.notifications) state.data.notifications = {};
    if (!state.data.notifications.child) state.data.notifications.child = {};
    const ts = nowKyiv();
    state.data.notifications.child.lastLoginAt   = ts;
    state.data.notifications.child.lastLoginType = loginType;
    // Окремо зберігаємо кожен тип входу
    if (loginType === 'direct') {
        state.data.notifications.child.lastDirectLoginAt  = ts;
    } else {
        state.data.notifications.child.lastPinFailLoginAt = ts;
    }
    saveData();

    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    applyAppearance();
    updateUI();
    switchTab('achievements');
}

export function addPin(digit) {
    if (state.pinValue.length < 4) {
        state.pinValue += digit;
        document.getElementById('pinInput').value = '•'.repeat(state.pinValue.length);
        if (state.pinValue.length === 4) setTimeout(checkPin, 300);
    }
}

export function clearPin() {
    state.pinValue = state.pinValue.slice(0, -1);
    document.getElementById('pinInput').value = '•'.repeat(state.pinValue.length);
}

export function cancelPin() {
    state.pinValue = '';
    document.getElementById('pinInput').value = '';
    document.getElementById('pinOverlay').style.display = 'none';
    document.getElementById('loginOverlay').style.display = 'flex';
}

export function checkPin() {
    if (state.pinValue === state.data.pin) {
        state.data.isParent = true;
        document.getElementById('pinOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        applyAppearance();  // Застосовуємо тему батьківського профілю
        updateUI();
    } else {
        alert('❌ Невірний PIN! Вхід як Дитина.');
        state.pinValue = '';
        document.getElementById('pinInput').value = '';
        document.getElementById('pinOverlay').style.display = 'none';
        enterAsChild('pin_failed');
    }
}

export function changePin() {
    const newPin = document.getElementById('newPin').value;
    if (newPin.length === 4 && /^\d+$/.test(newPin)) {
        state.data.pin = newPin;
        saveData();
        document.getElementById('currentPin').textContent = newPin;
        document.getElementById('newPin').value = '';
        alert('✅ PIN змінено!');
    } else {
        alert('❌ PIN має містити 4 цифри!');
    }
}

// Вкладки

// ── Reward PIN ──────────────────────────────────

export function showRewardPin() {
    state.rewardPinValue = '';
    document.getElementById('rewardPinInput').value = '';
    document.getElementById('rewardPinOverlay').style.display = 'flex';
}

export function addRewardPin(digit) {
    if (state.rewardPinValue.length < 4) {
        state.rewardPinValue += digit;
        document.getElementById('rewardPinInput').value = '•'.repeat(state.rewardPinValue.length);
        if (state.rewardPinValue.length === 4) setTimeout(checkRewardPin, 300);
    }
}

export function clearRewardPin() {
    state.rewardPinValue = state.rewardPinValue.slice(0, -1);
    document.getElementById('rewardPinInput').value = '•'.repeat(state.rewardPinValue.length);
}

export function cancelRewardPin() {
    document.getElementById('rewardPinOverlay').style.display = 'none';
    state.pendingRewardIndex = null;
    state.pendingCustomReward = null;
}
// Функція перемикання періоду
export function togglePeriod(period) {
    state.showPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updateUI();
}

// ── Слухаємо запит на показ RewardPin від rewards.js ─────────
document.addEventListener('zirky:showRewardPin', () => showRewardPin());
