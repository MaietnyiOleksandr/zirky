// ════════════════════════════════════════════════════
// FIREBASE  firebase.js — Firebase
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260514.1530';

import { state } from './state.js';
import { firebaseConfig } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { recalculateAchievements } from './achievements.js';
import { migrateAppearance } from './utils.js';
import { checkStreakWarning } from './stats.js';
import { showLoading, updateUI } from './ui.js';

// ════════════════════════════════════════════════════════════
// 🔥  БЛОК: Firebase / Збереження даних
// ════════════════════════════════════════════════════════════

// Ініціалізуємо Firebase тут — db потрібен локально
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

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
            if (!state.data.records)  state.data.records  = [];
            if (!state.data.subjects) state.data.subjects = null; // ініціалізується в subjects.js
            if (!state.data.clubs)    state.data.clubs    = null;
            if (!state.data.achievements) state.data.achievements = { counters: {}, streaks: {}, levels: {}, weekly: {}, repeatableHistory: {}, freezePeriods: [] };
            // Міграція appearance до формату {child, parent}
            state.data.appearance = migrateAppearance(state.data.appearance);
        }
        showLoading(false);
        recalculateAchievements();  // Перераховуємо досягнення з усіх записів
        // Баланс завжди береться з _runningBalance — не з Firebase — щоб уникнути розбіжностей
        state.data.balance = state.data.achievements.counters._runningBalance || 0;
        updateUI();
        checkStreakWarning();  // Перевіряємо чи треба нагадати про канікули
        // Сигналізуємо що дані завантажені — ui.js сам оновить активну секцію
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

// ── Firebase: збереження даних ───────────────────────────────

// Повний знімок стану для set() / saveAll()
function _buildFullData() {
    return {
        records:        state.data.records        || [],
        balance:        state.data.balance        || 0,
        pin:            state.data.pin            || '1234',
        goal:           state.data.goal           || null,
        achievements:   state.data.achievements   || { counters: {}, streaks: {}, levels: {}, weekly: {}, repeatableHistory: {}, freezePeriods: [] },
        conversionRates: state.data.conversionRates || null,
        schedule:       state.data.schedule       || null,
        subjects:       state.data.subjects       || null,
        clubs:          state.data.clubs          || null,
        notifications:  state.data.notifications  || null,
        backupLastDate: state.data.backupLastDate  || null,
        // (zirky-notifications — окрема гілка для значків сповіщень)
        appearance:     state.data.appearance     || { child: { owned: ['default'], active: { theme: 'default', palette: 'default', font: 'default', buttons: 'default', background: 'default' } }, parent: { active: { theme: 'default', palette: 'default', font: 'default', buttons: 'default', background: 'default' } } },
    };
}

// Захисна перевірка (спільна для всіх функцій)
function _guard() {
    if (!state.data) { console.error('⚠️ ЗАХИСТ: data не існує!'); return false; }
    return true;
}

// Повне збереження через set() — тільки для import/reset у settings.js
export function saveAll() {
    if (!_guard()) return;
    set(ref(db, 'zirky'), _buildFullData());
}

// records + balance + achievements + goal (найчастіший випадок)
// Використовується: records.js, rewards.js, freeze.js, settings.js (manual/adjust), appearance.js
export function saveRecords() {
    if (!_guard()) return;
    update(ref(db, 'zirky'), {
        records:      state.data.records      || [],
        balance:      state.data.balance      || 0,
        achievements: state.data.achievements || { counters: {}, streaks: {}, levels: {}, weekly: {}, repeatableHistory: {}, freezePeriods: [] },
        goal:         state.data.goal         || null,
    });
}

// Тільки goal — goals.js (saveGoal, deleteGoal)
// Названо saveGoalData щоб не конфліктувати з локальною saveGoal() у goals.js
export function saveGoalData() {
    if (!_guard()) return;
    update(ref(db, 'zirky'), { goal: state.data.goal || null });
}

// Тільки appearance — appearance.js (applyTheme, applyComponent)
export function saveAppearance() {
    if (!_guard()) return;
    update(ref(db, 'zirky'), { appearance: state.data.appearance });
}

// Тільки schedule — schedule.js
export function saveSchedule() {
    if (!_guard()) return;
    update(ref(db, 'zirky'), { schedule: state.data.schedule || null });
}

// subjects + clubs — subjects.js
export function saveSubjects() {
    if (!_guard()) return;
    update(ref(db, 'zirky'), {
        subjects: state.data.subjects || null,
        clubs:    state.data.clubs    || null,
    });
}

// Тільки conversionRates — settings.js (saveConversionRates)
export function saveRates() {
    if (!_guard()) return;
    update(ref(db, 'zirky'), { conversionRates: state.data.conversionRates || null });
}

// Тільки pin — auth.js (changePin)
export function savePin() {
    if (!_guard()) return;
    update(ref(db, 'zirky'), { pin: state.data.pin || '1234' });
}

// Тільки backupLastDate — settings.js (exportData)
export function saveBackupDate() {
    if (!_guard()) return;
    update(ref(db, 'zirky'), { backupLastDate: state.data.backupLastDate || null });
}

// Тільки notifications — auth.js (enterAsChild)
export function saveNotifications() {
    if (!_guard()) return;
    update(ref(db, 'zirky'), { notifications: state.data.notifications || null });
}

