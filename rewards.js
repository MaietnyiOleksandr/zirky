// ════════════════════════════════════════════════════
// REWARDS  rewards.js — Rewards
//     Зірки Успіху | v3.20260426.0912
// ════════════════════════════════════════════════════

import { state } from './state.js';
import { rewards } from './config.js';
import { saveData } from './firebase.js';

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

export export function buyReward(index) {
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
            saveData();
            alert(`🎁 Вітаємо! Отримано: ${reward.name}`);
        }
    }
}

export export function buyCustomReward() {
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
        showRewardPin();
    }
}

export export function doCustomReward(date, desc, stars) {
    if (confirm(`Списати ${stars}⭐ на "${desc}"?`)) {
        state.data.balance = Number(state.data.balance) - stars;
        state.data.records.push({
            id: Date.now(),
            date: date + 'T12:00:00',
            description: desc, stars,
            type: 'spend'
        });
        saveData();
        document.getElementById('customRewardDate').value = '';
        document.getElementById('customRewardDesc').value = '';
        document.getElementById('customRewardStars').value = '';
        alert(`🎁 Списано ${stars}⭐!`);
    }
}

export function buyRewardWithPin(index) {
    pendingRewardIndex = index;
    state.pendingCustomReward = null;
    showRewardPin();
}
