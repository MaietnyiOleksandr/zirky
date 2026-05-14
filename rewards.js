// ════════════════════════════════════════════════════
// REWARDS  rewards.js — Витрати / Конвертація
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260514.1530';

// ════════════════════════════════════════════════════════════

import { state } from './state.js';
import { conversionRates } from './config.js';
import { saveRecords } from './firebase.js';
import { recalculateAchievements, giveRewardsForNewAchievements } from './achievements.js';
import { updateUI } from './ui.js';
import { nowKyiv } from './utils.js';

// ════════════════════════════════════════════════════
// 🔧  Допоміжні
// ════════════════════════════════════════════════════

function getRates() {
    return state.data.conversionRates || conversionRates;
}

export function spendStars(stars, record) {
    const balance = Number(state.data.balance);
    if (balance < stars) {
        const missing = stars - balance;
        const msgs = [
            `⭐ Ще ${missing} зірок — і мрія твоя!`,
            `💪 Зовсім трохи! Ще ${missing}⭐ — і готово!`,
            `🚀 До мрії ${missing} кроків-зірок. Ти впораєшся!`,
            `🌟 Не вистачає ${missing}⭐. Кожна гарна оцінка наближає!`
        ];
        alert(msgs[Math.floor(Math.random() * msgs.length)]);
        return false;
    }
    state.data.balance = balance - stars;
    state.data.records.push({ id: Date.now(), date: nowKyiv(), type: 'spend', stars, ...record });
    const levelsBefore = { ...(state.data.achievements.levels || {}) };
    recalculateAchievements();
    giveRewardsForNewAchievements(levelsBefore);
    saveRecords();
    updateUI();
    return true;
}

// ════════════════════════════════════════════════════
// ⚙️  Ініціалізація полів при відкритті вкладки
// ════════════════════════════════════════════════════

export function renderRewards() {
    const rates = getRates();
    const timeInput = document.getElementById('timeMinutes');
    const moneyInput = document.getElementById('moneyAmount');
    if (timeInput) {
        timeInput.step  = rates.minutesPerStar;
        timeInput.min   = rates.minutesPerStar;
        timeInput.placeholder = `Хвилин (мін. ${rates.minutesPerStar})`;
    }
    if (moneyInput) {
        moneyInput.step  = rates.moneyPerStar;
        moneyInput.min   = 50;
        moneyInput.placeholder = `Гривень (мін. 50)`;
    }
    updateTimePreview();
    updateMoneyPreview();
}

// ════════════════════════════════════════════════════
// 🎮  Час на смартфоні
// ════════════════════════════════════════════════════

export function updateTimePreview() {
    const minutes = parseInt(document.getElementById('timeMinutes')?.value) || 0;
    const el = document.getElementById('timeStarsPreview');
    if (!el) return;
    const rates = getRates();
    if (minutes <= 0) {
        el.textContent = '';
        return;
    }
    if (minutes % rates.minutesPerStar !== 0) {
        el.style.color = '#f44336';
        el.style.fontSize = '13px';
        el.textContent = `⚠️ Введіть кратне ${rates.minutesPerStar}`;
    } else {
        el.style.color = 'var(--secondary)';
        el.style.fontSize = '18px';
        el.textContent = `= ${minutes / rates.minutesPerStar} ⭐`;
    }
}

export function buyTime() {
    const input = document.getElementById('timeMinutes');
    const minutes = parseInt(input.value);
    const rates = getRates();
    if (!minutes || minutes < rates.minutesPerStar) {
        alert(`❌ Мінімум ${rates.minutesPerStar} хвилин!`);
        return;
    }
    if (minutes % rates.minutesPerStar !== 0) {
        alert(`❌ Кількість хвилин має бути кратна ${rates.minutesPerStar}!`);
        return;
    }
    const stars = minutes / rates.minutesPerStar;
    if (!confirm(`Обміняти ${stars}⭐ на ${minutes} хвилин смартфону?`)) return;
    if (spendStars(stars, { category: 'time', minutes, description: `${minutes} хв смартфону` })) {
        input.value = '';
        document.getElementById('timeStarsPreview').textContent = '';
        alert(`🎮 Отримано ${minutes} хвилин!`);
    }
}

// ════════════════════════════════════════════════════
// 💵  Гроші
// ════════════════════════════════════════════════════

export function updateMoneyPreview() {
    const amount = parseInt(document.getElementById('moneyAmount')?.value) || 0;
    const el = document.getElementById('moneyStarsPreview');
    if (!el) return;
    const rates = getRates();
    el.textContent = amount >= 50
        ? `= ${amount / rates.moneyPerStar} ⭐`
        : '';
}

export function buyMoney() {
    const input = document.getElementById('moneyAmount');
    const amount = parseInt(input.value);
    const rates = getRates();
    if (!amount || amount < 50) {
        alert('❌ Мінімальна сума — 50 грн!');
        return;
    }
    const stars = amount / rates.moneyPerStar;
    if (!confirm(`Обміняти ${stars}⭐ на ${amount} грн?`)) return;
    if (spendStars(stars, { category: 'money', amount, description: `${amount} грн` })) {
        input.value = '';
        document.getElementById('moneyStarsPreview').textContent = '';
        alert(`💵 Отримано ${amount} грн!`);
    }
}

// ════════════════════════════════════════════════════
// ✨  Особливе списання (тільки батьки / PIN)
// ════════════════════════════════════════════════════

export function buyCustomReward() {
    const date  = document.getElementById('customRewardDate').value;
    const desc  = document.getElementById('customRewardDesc').value;
    const stars = parseInt(document.getElementById('customRewardStars').value);
    if (!date || !desc || !stars || stars < 1) { alert('❌ Заповніть всі поля!'); return; }
    if (state.data.isParent) {
        doCustomReward(date, desc, stars);
    } else {
        state.pendingCustomReward = { date, desc, stars };
        document.dispatchEvent(new CustomEvent('zirky:showRewardPin'));
    }
}

export function doCustomReward(date, desc, stars) {
    if (!confirm(`Списати ${stars}⭐ на "${desc}"?`)) return;
    const balance = Number(state.data.balance);
    if (balance < stars) { alert('❌ Недостатньо зірок!'); return; }
    state.data.balance = balance - stars;
    state.data.records.push({
        id: Date.now(), date: date + 'T12:00:00',
        type: 'spend', category: 'other',
        description: desc, stars
    });
    const levelsBefore = { ...(state.data.achievements.levels || {}) };
    recalculateAchievements();
    giveRewardsForNewAchievements(levelsBefore);
    saveRecords();
    updateUI();
    ['customRewardDate', 'customRewardDesc', 'customRewardStars'].forEach(id => {
        document.getElementById(id).value = '';
    });
    alert(`🎁 Списано ${stars}⭐!`);
}

// ════════════════════════════════════════════════════
// 🔐  PIN для особливого списання
// ════════════════════════════════════════════════════

export function checkRewardPin() {
    if (state.rewardPinValue === state.data.pin) {
        document.getElementById('rewardPinOverlay').style.display = 'none';
        if (state.pendingCustomReward) {
            doCustomReward(
                state.pendingCustomReward.date,
                state.pendingCustomReward.desc,
                state.pendingCustomReward.stars
            );
            state.pendingCustomReward = null;
        }
    } else {
        alert('❌ Невірний PIN!');
        state.rewardPinValue = '';
        document.getElementById('rewardPinInput').value = '';
    }
}