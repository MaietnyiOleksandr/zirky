// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260427.0729';
// REWARDS  rewards.js — Rewards
//     Зірки Успіху | v3.20260427.0729
// ════════════════════════════════════════════════════

import { state } from './state.js';
import { rewards } from './config.js';
import { saveData } from './firebase.js';
import { recalculateAchievements, giveRewardsForNewAchievements } from './achievements.js';
import { updateUI } from './ui.js';

// ════════════════════════════════════════════════════════════
// 🎁  БЛОК: Витрати / Винагороди
// ════════════════════════════════════════════════════════════
export function renderRewards() {
    const list = document.getElementById('rewardsList');
    list.innerHTML = rewards.map((r, i) => {
        const canAfford = Number(state.data.balance) >= r.cost;
        return `
            <div class="reward-item">
                <div>
                    <div class="reward-name">${r.name}</div>
                    <div class="reward-cost">${r.cost}⭐</div>
                </div>
                <button class="reward-btn" onclick="${canAfford ? (state.data.isParent ? 'buyReward('+i+')' : 'buyRewardWithPin('+i+')') : ''}" ${!canAfford ? 'disabled' : ''}>
                    ${canAfford ? '✅ Обміняти' : '🔒'}
                </button>
            </div>`;
    }).join('');
}

export function buyReward(index) {
    const reward = rewards[index];
    if (Number(state.data.balance) >= reward.cost) {
        if (confirm(`Обміняти ${reward.cost}⭐ на "${reward.name}"?`)) {
            state.data.balance = Number(state.data.balance) - reward.cost;
            state.data.records.push({
                id: Date.now(),
                date: new Date().toISOString(),
                reward: reward.name,
                stars: reward.cost,
                type: 'spend'
            });
            const levelsBefore = {...(state.data.achievements.levels || {})};
            recalculateAchievements();
            giveRewardsForNewAchievements(levelsBefore);
            saveData();
            updateUI();
            alert(`🎁 Вітаємо! Отримано: ${reward.name}`);
        }
    }
}

export function buyCustomReward() {
    const date = document.getElementById('customRewardDate').value;
    const desc = document.getElementById('customRewardDesc').value;
    const stars = parseInt(document.getElementById('customRewardStars').value);
    const balance = Number(state.data.balance);

    if (!date || !desc || !stars || stars < 1) { alert('❌ Заповніть всі поля!'); return; }

    if (balance < stars) {
        const missing = stars - balance;
        const msgs = [
            `⭐ Ще ${missing} зірок — і мрія твоя! Продовжуй старатися!`,
            `💪 Зовсім трохи залишилось! Ще ${missing}⭐ — і готово!`,
            `🚀 До мрії ${missing} кроків-зірок. Ти впораєшся!`,
            `🌟 Не вистачає ${missing}⭐. Кожна гарна оцінка наближає тебе!`
        ];
        alert(msgs[Math.floor(Math.random() * msgs.length)]);
        return;
    }

    if (state.data.isParent) {
        doCustomReward(date, desc, stars);
    } else {
        state.pendingCustomReward = { date, desc, stars };
        document.dispatchEvent(new CustomEvent('zirky:showRewardPin'));  // auth.js слухає
    }
}

export function doCustomReward(date, desc, stars) {
    if (confirm(`Списати ${stars}⭐ на "${desc}"?`)) {
        state.data.balance = Number(state.data.balance) - stars;
        state.data.records.push({
            id: Date.now(),
            date: date + 'T12:00:00',
            description: desc, stars,
            type: 'spend'
        });
        const levelsBefore = {...(state.data.achievements.levels || {})};
        recalculateAchievements();
        giveRewardsForNewAchievements(levelsBefore);
        saveData();
        updateUI();
        document.getElementById('customRewardDate').value = '';
        document.getElementById('customRewardDesc').value = '';
        document.getElementById('customRewardStars').value = '';
        alert(`🎁 Списано ${stars}⭐!`);
    }
}

export function buyRewardWithPin(index) {
    state.pendingRewardIndex = index;
    state.pendingCustomReward = null;
    document.dispatchEvent(new CustomEvent('zirky:showRewardPin'));  // auth.js слухає
}

// ── Перенесено з auth.js (розрив циклічної залежності) ──
export function checkRewardPin() {
    if (state.rewardPinValue === state.data.pin) {
        document.getElementById('rewardPinOverlay').style.display = 'none';
        if (state.pendingRewardIndex !== null) {
            buyReward(state.pendingRewardIndex);
            state.pendingRewardIndex = null;
        } else if (state.pendingCustomReward) {
            doCustomReward(state.pendingCustomReward.date, state.pendingCustomReward.desc, state.pendingCustomReward.stars);
            state.pendingCustomReward = null;
        }
    } else {
        alert('❌ Невірний PIN!');
        state.rewardPinValue = '';
        document.getElementById('rewardPinInput').value = '';
    }
}
