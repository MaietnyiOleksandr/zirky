// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260427.0821';
// 🔐  auth.js — Авторизація та PIN-код
//     Зірки Успіху | v3.20260427.0821
// ════════════════════════════════════════════════════

import { state } from './state.js';
import { saveData } from './firebase.js';
import { switchTab, updateUI } from './ui.js';

// ════════════════════════════════════════════════════════════
// 🔐  БЛОК: Авторизація / PIN
// ════════════════════════════════════════════════════════════
export function showPinInput() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('pinOverlay').style.display = 'flex';
}

export function enterAsChild() {
    state.data.isParent = false;
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
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
        updateUI();
    } else {
        alert('❌ Невірний PIN! Вхід як Дитина.');
        state.pinValue = '';
        document.getElementById('pinInput').value = '';
        enterAsChild();
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
