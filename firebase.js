// ════════════════════════════════════════════════════
// FIREBASE  firebase.js — Firebase
//     Зірки Успіху | v3.20260426.1550
// ════════════════════════════════════════════════════

import { state } from './state.js';
import { firebaseConfig } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { checkWeeklyAchievements, recalculateAchievements } from './achievements.js';
import { showLoading, updateUI } from './ui.js';

// ════════════════════════════════════════════════════════════
// 🔥  БЛОК: Firebase / Збереження даних
// ════════════════════════════════════════════════════════════

// Ініціалізуємо Firebase тут — db потрібен локально
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export function initFirebase() {
    showLoading(true);
    const dataRef = ref(db, 'zirky');
    onValue(dataRef, (snapshot) => {
        const saved = snapshot.val();
        if (saved) {
            const wasParent = state.data.isParent;
            // Мутуємо існуючий об'єкт щоб зберегти посилання в інших модулях
            Object.assign(state.data, saved);
            state.data.isParent = wasParent;
            if (state.data.balance === undefined) state.data.balance = 0;
            if (!state.data.records) state.data.records = [];
            if (!state.data.achievements) state.data.achievements = { counters: {}, streaks: {}, levels: {}, weekly: {}, repeatableHistory: {}, freezePeriods: [] };
        }
        showLoading(false);
        recalculateAchievements();  // Перераховуємо досягнення з усіх записів
        checkWeeklyAchievements();  // Перевіряємо тижневі досягнення
        updateUI();
        checkStreakWarning();  // Перевіряємо чи треба нагадати про канікули
        // Сигналізуємо що дані завантажені — ui.js сам оновить активну секцію
        document.dispatchEvent(new CustomEvent('zirky:dataLoaded'));
    });
}

// Firebase: зберігаємо дані
export function saveData() {
    // ЗАХИСТ: Перевіряємо чи data існує
    if (!state.data) {
        console.error('⚠️ ЗАХИСТ: data не існує!');
        return;
    }
    
    const toSave = {
        records: state.data.records || [],
        balance: state.data.balance || 0,
        pin: state.data.pin || '1234',
        goal: state.data.goal || null,
        achievements: state.data.achievements || { counters: {}, streaks: {}, levels: {}, weekly: {}, repeatableHistory: {}, freezePeriods: [] }
    };
    set(ref(db, 'zirky'), toSave);
}

