// ════════════════════════════════════════════════════
// 🔐  auth.js — Авторизація та PIN-код
//     Зірки Успіху | v3.20260426.0901
// ════════════════════════════════════════════════════

import { state } from './state.js';

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
    switchTab('instructions');
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
    rewardPinValue = '';
    document.getElementById('rewardPinInput').value = '';
    document.getElementById('rewardPinOverlay').style.display = 'flex';
}

export function addRewardPin(digit) {
    if (rewardPinValue.length < 4) {
        rewardPinValue += digit;
        document.getElementById('rewardPinInput').value = '•'.repeat(rewardPinValue.length);
        if (rewardPinValue.length === 4) setTimeout(checkRewardPin, 300);
    }
}

export function clearRewardPin() {
    rewardPinValue = rewardPinValue.slice(0, -1);
    document.getElementById('rewardPinInput').value = '•'.repeat(rewardPinValue.length);
}

export function cancelRewardPin() {
    document.getElementById('rewardPinOverlay').style.display = 'none';
    pendingRewardIndex = null;
    state.pendingCustomReward = null;
}

export function checkRewardPin() {
    if (rewardPinValue === state.data.pin) {
        document.getElementById('rewardPinOverlay').style.display = 'none';
        if (pendingRewardIndex !== null) {
            buyReward(pendingRewardIndex);
            pendingRewardIndex = null;
        } else if (state.pendingCustomReward) {
            doCustomReward(state.pendingCustomReward.desc, state.pendingCustomReward.stars);
            state.pendingCustomReward = null;
        }
    } else {
        alert('❌ Невірний PIN!');
        rewardPinValue = '';
        document.getElementById('rewardPinInput').value = '';
    }
}

// Функція перемикання періоду
export function togglePeriod(period) {
    state.showPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updateUI();
}

// Робимо функції глобальними для onclick в HTML
window.togglePeriod = togglePeriod;
window.updateChart = updateChart;
window.changeChartPeriod = changeChartPeriod;
window.changeChartOffset = changeChartOffset;
window.showGoalModal = showGoalModal;
window.cancelGoal = cancelGoal;
window.saveGoal = saveGoal;
window.deleteGoal = deleteGoal;
window.showPinInput = showPinInput;
window.enterAsChild = enterAsChild;
window.addPin = addPin;
window.clearPin = clearPin;
window.cancelPin = cancelPin;
window.changePin = changePin;
window.switchTab = switchTab;
window.showForm = showForm;
window.addGradeRecord = addGradeRecord;
window.addBonusRecord = addBonusRecord;
window.addSpecialRecord = addSpecialRecord;
window.deleteRecord = deleteRecord;
window.renderHistory = renderHistory;
window.changeMonth = changeMonth;
window.renderRewards = renderRewards;
window.buyReward = buyReward;
window.buyCustomReward = buyCustomReward;
window.renderStats = renderStats;
window.buyRewardWithPin = buyRewardWithPin;
window.showRewardPin = showRewardPin;
window.addRewardPin = addRewardPin;
window.clearRewardPin = clearRewardPin;
window.cancelRewardPin = cancelRewardPin;
window.checkRewardPin = checkRewardPin;

// Event delegation для кнопок мети (працює для динамічно створених кнопок)
document.addEventListener('click', (e) => {
    if (e.target.id === 'setGoalBtn' || e.target.id === 'editGoalBtn') {
        showGoalModal();
    }
});

// Ініціалізація
setTodayDates();
initFirebase();
    
// ═══════════════════════════════════════════════════
// ЕКСПОРТ/ІМПОРТ ДАНИХ
// ═══════════════════════════════════════════════════
