// ════════════════════════════════════════════════════
// REWARDS  rewards.js — Витрати / Конвертація
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260624.2010';

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

// Повертає актуальні ставки конвертації для поточної дитини.
// Якщо useOwnRates=true і дитина має власні conversionRates — беремо їх.
// Інакше — беремо глобальні ставки батька (state.parent.conversionRates),
// і лише якщо їх немає — дефолт з config.js.
function getRates() {
    const childId = state.activeChildId;
    const meta    = childId ? state.parent.children?.[childId] : null;
    if (meta?.useOwnRates && meta?.conversionRates) {
        return meta.conversionRates;
    }
    return state.parent.conversionRates || conversionRates;
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

// НСК(5, minutesPerStar) — крок завжди кратний 5 і дає цілі зірки
function lcmMinutes(mps) {
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    return (5 * mps) / gcd(5, mps);
}

export function renderRewards() {
    const rates = getRates();
    const timeInput = document.getElementById('timeMinutes');
    const moneyInput = document.getElementById('moneyAmount');
    if (timeInput) {
        const timeStep = lcmMinutes(rates.minutesPerStar);
        timeInput.step  = timeStep;
        timeInput.min   = timeStep;
        timeInput.placeholder = `Хвилин (кратно ${timeStep}, мін. ${timeStep})`;
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
    const timeStep = lcmMinutes(rates.minutesPerStar);
    if (minutes % timeStep !== 0) {
        el.style.color = '#f44336';
        el.style.fontSize = '13px';
        el.textContent = `⚠️ Введіть кратне ${timeStep} хв`;
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
    const timeStep = lcmMinutes(rates.minutesPerStar);
    if (!minutes || minutes < timeStep) {
        alert(`❌ Мінімум ${timeStep} хвилин!`);
        return;
    }
    if (minutes % timeStep !== 0) {
        alert(`❌ Кількість хвилин має бути кратна ${timeStep}!`);
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
    if (amount < 50) { el.textContent = ''; return; }
    if (amount % rates.moneyPerStar !== 0) {
        el.style.color = '#f44336';
        el.style.fontSize = '13px';
        el.textContent = `⚠️ Введіть кратне ${rates.moneyPerStar}`;
    } else {
        el.style.color = 'var(--secondary)';
        el.style.fontSize = '18px';
        el.textContent = `= ${amount / rates.moneyPerStar} ⭐`;
    }
}

export function buyMoney() {
    const input = document.getElementById('moneyAmount');
    const amount = parseInt(input.value);
    const rates = getRates();
    if (!amount || amount < 50) {
        alert('❌ Мінімальна сума — 50 грн!');
        return;
    }
    if (amount % rates.moneyPerStar !== 0) {
        alert(`❌ Сума має бути кратна ${rates.moneyPerStar} грн!`);
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
    if (!date || !desc.trim() || !stars || stars < 1) { alert('❌ Заповніть всі поля!'); return; }
    if (state.data.isParent) {
        doCustomReward(date, desc, stars);
    } else {
        const balance = Number(state.data.achievements?.counters?._runningBalance ?? state.data.balance);
        if (balance < stars) {
            const missing = stars - balance;
            alert(`⭐ Недостатньо зірок для «${desc}»\nНазбирай ще ${missing} ${missing === 1 ? 'зірку' : missing < 5 ? 'зірки' : 'зірок'}!`);
            return;
        }
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