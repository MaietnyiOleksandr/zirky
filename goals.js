// ════════════════════════════════════════════════════
// GOALS  goals.js — Goals
//     Зірки Успіху | v3.20260426.0912
// ════════════════════════════════════════════════════

import { state } from './state.js';

// ════════════════════════════════════════════════════════════
// 🎯  БЛОК: Цілі
// ════════════════════════════════════════════════════════════
export function showGoalModal() {
    if (state.data.goal) {
        document.getElementById('goalName').value = state.data.goal.name || '';
        document.getElementById('goalTarget').value = state.data.goal.target || '';
        document.getElementById('goalEmoji').value = state.data.goal.emoji || '';
        document.getElementById('deleteGoalBtn').style.display = 'block';
    } else {
        document.getElementById('goalName').value = '';
        document.getElementById('goalTarget').value = '';
        document.getElementById('goalEmoji').value = '';
        document.getElementById('deleteGoalBtn').style.display = 'none';
    }
    document.getElementById('goalModal').style.display = 'flex';
    
    // Додаємо event listeners
    setTimeout(() => {
        document.getElementById('cancelGoalBtn').onclick = cancelGoal;
        document.getElementById('saveGoalBtn').onclick = saveGoal;
        document.getElementById('deleteGoalBtn').onclick = deleteGoal;
    }, 0);
}

export function cancelGoal() {
    document.getElementById('goalModal').style.display = 'none';
}

export function saveGoal() {
    const name = document.getElementById('goalName').value.trim();
    const target = parseInt(document.getElementById('goalTarget').value);
    const emoji = document.getElementById('goalEmoji').value.trim() || '🎯';
    
    if (!name) {
        alert('❌ Введіть назву мети!');
        return;
    }
    
    if (!target || target < 1) {
        alert('❌ Введіть кількість зірок (мінімум 1)!');
        return;
    }
    
    state.data.goal = { name, target, emoji };
    saveData();
    document.getElementById('goalModal').style.display = 'none';
    renderGoal();
    alert('✅ Мета встановлена!');
}

export function deleteGoal() {
    if (confirm('Видалити мету? Прогрес не втратиться.')) {
        state.data.goal = null;
        saveData();
        document.getElementById('goalModal').style.display = 'none';
        renderGoal();
    }
}

// ═══════════════ СИСТЕМА ДОСЯГНЕНЬ ═══════════════

// Ініціалізація лічильників при завантаженні

// 🏆 Achievements → achievements.js

export function renderGoal() {
    const container = document.getElementById('goalContainer');
    
    if (!state.data.goal || !state.data.goal.name || !state.data.goal.target) {
        if (state.data.isParent) {
            container.innerHTML = `
                <div class="goal-container">
                    <div class="no-goal">
                        <div style="font-size: 32px; margin-bottom: 10px;">🎯</div>
                        <button class="goal-edit-btn" id="setGoalBtn">+ Встановити мету</button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = ''; // Дитина не бачить пустий блок
        }
        return;
    }
    
    const current = Number(state.data.balance);
    const target = Number(state.data.goal.target);
    const percent = Math.min((current / target) * 100, 100);
    const emoji = state.data.goal.emoji || '🎯';
    
    // Прогноз (на основі середнього за останні 7 днів)
    const now = new Date();
    const last7Days = (state.data.records || []).filter(r => {
        const d = new Date(r.date);
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff <= 7 && r.type === 'earn';
    });
    const avgPerDay = last7Days.reduce((s, r) => s + r.stars, 0) / 7;
    const remaining = Math.max(target - current, 0);
    const daysLeft = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : '?';
    
    const editBtn = state.data.isParent ? `<button class="goal-edit-btn" id="editGoalBtn">✏️ Змінити</button>` : '';
    
    let statusText = '';
    if (remaining <= 0) {
        statusText = '🎉 Мета досягнута!';
    } else if (daysLeft !== '?') {
        const daysWord = daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дні' : 'днів';
        statusText = `Зібрано ${current} із ${target}⭐ — залишається ще приблизно ${daysLeft} ${daysWord} до мети (на основі твоїх досягнень за попередній тиждень)`;
    } else {
        statusText = `Зібрано ${current} із ${target}⭐ — продовжуй заробляти зірки!`;
    }
    
    container.innerHTML = `
        <div class="goal-container">
            <div class="goal-header">
                <div class="goal-title">
                    <span class="goal-emoji">${emoji}</span>
                    <span>${state.data.goal.name}</span>
                </div>
                ${editBtn}
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${percent}%">
                    ${percent >= 20 ? `<span class="progress-text">${Math.round(percent)}%</span>` : ''}
                </div>
            </div>
            <div class="goal-stats" style="text-align: center;">
                <span style="display: block; line-height: 1.4;">${statusText}</span>
            </div>
        </div>
    `;
}
