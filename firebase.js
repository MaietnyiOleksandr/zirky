// ════════════════════════════════════════════════════
// FIREBASE  firebase.js — Firebase
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260506.1130';

import { state } from './state.js';
import { firebaseConfig } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { recalculateAchievements } from './achievements.js';
import { setNotifDb, initNotificationsListener, generateNotifications } from './notifications.js';
import { migrateAppearance } from './utils.js';
import { checkStreakWarning } from './stats.js';
import { showLoading, updateUI } from './ui.js';

// ════════════════════════════════════════════════════════════
// 🔥  БЛОК: Firebase / Збереження даних
// ════════════════════════════════════════════════════════════

// Ініціалізуємо Firebase тут — db потрібен локально
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Передаємо db у notifications.js та запускаємо listener
setNotifDb(db);
initNotificationsListener();

export function initFirebase() {
    showLoading(true);
    const dataRef = ref(db, 'zirky');
    onValue(dataRef, (snapshot) => {
        const saved = snapshot.val();
        if (saved) {
            const wasParent = state.data.isParent;

            // Зберігаємо goal.reached перед перезаписом (race condition)
            const goalReachedBefore = state.data.goal?.reached;

            // Мутуємо існуючий об'єкт щоб зберегти посилання в інших модулях
            Object.assign(state.data, saved);

            // Відновлюємо goal.reached якщо Firebase ще не встиг зберегти
            if (goalReachedBefore && state.data.goal && !state.data.goal.reached) {
                state.data.goal.reached = true;
            }

            state.data.isParent = wasParent;
            if (state.data.balance === undefined) state.data.balance = 0;
            if (!state.data.records) state.data.records = [];
            if (!state.data.achievements) state.data.achievements = { counters: {}, streaks: {}, levels: {}, weekly: {}, repeatableHistory: {}, freezePeriods: [] };
            // Міграція appearance до формату {child, parent}
            state.data.appearance = migrateAppearance(state.data.appearance);
        }
        showLoading(false);
        recalculateAchievements();  // Перераховуємо досягнення з усіх записів
        updateUI();
        checkStreakWarning();  // Перевіряємо чи треба нагадати про канікули
        // Сигналізуємо що дані завантажені — ui.js сам оновить активну секцію
        generateNotifications();  // Генеруємо/оновлюємо сповіщення
        document.dispatchEvent(new CustomEvent('zirky:dataLoaded'));
    });
}

// ── Firebase: функції для зворотнього зв'язку ────────────────
export function initFeedbackListener(callback) {
    onValue(ref(db, 'zirky-feedback'), (snapshot) => {
        callback(snapshot.val());
    });
}

export function saveFeedbackItem(item) {
    set(ref(db, `zirky-feedback/${item.id}`), item);
}

export function deleteFeedbackItem(id) {
    remove(ref(db, `zirky-feedback/${id}`));
}

export function saveAllFeedback(items) {
    if (!items || items.length === 0) {
        set(ref(db, 'zirky-feedback'), null);
        return;
    }
    const obj = {};
    items.forEach(item => { obj[item.id] = item; });
    set(ref(db, 'zirky-feedback'), obj);
}

// Firebase: зберігаємо дані
export function saveData() {
    // ЗАХИСТ: Перевіряємо чи data існує
    if (!state.data) {
        console.error('⚠️ ЗАХИСТ: data не існує!');
        return;
    }
    
    const toSave = {
        records:         state.data.records || [],
        balance:         state.data.balance || 0,
        pin:             state.data.pin || '1234',
        goal:            state.data.goal || null,
        achievements:    state.data.achievements || { counters: {}, streaks: {}, levels: {}, weekly: {}, repeatableHistory: {}, freezePeriods: [] },
        conversionRates:  state.data.conversionRates || null,
        // notifications — окрема гілка zirky-notifications
        appearance:      state.data.appearance || { child: { owned: ['default'], active: { theme: 'default', palette: 'default', font: 'default', buttons: 'default', background: 'default' } }, parent: { active: { theme: 'default', palette: 'default', font: 'default', buttons: 'default', background: 'default' } } },
    };
    set(ref(db, 'zirky'), toSave);
}

