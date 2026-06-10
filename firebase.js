// ════════════════════════════════════════════════════
// 🔥  firebase.js — Firebase
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260608.0802';

import { state, defaultChildData } from './state.js';
import { firebaseConfig } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, update, remove, onValue, get, runTransaction } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { recalculateAchievements, migrateAchievementIds } from './achievements.js';
import { migrateAppearance } from './utils.js';
import { checkStreakWarning } from './stats.js';
import { updateUI } from './ui.js';

// ════════════════════════════════════════════════════════════

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ── Функція відписки від попереднього дитячого listener-а ───
let _unsubChild    = null;
let _unsubTasks    = null;
let _unsubFeedback = null;
let _unsubNotifs   = null;

// Відписує від усіх активних Firebase listeners.
// Викликається з settings.js (switchProfile) перед поверненням на екран вибору.
export function unsubscribeAllListeners() {
    if (_unsubChild)    { _unsubChild();    _unsubChild    = null; }
    if (_unsubTasks)    { _unsubTasks();    _unsubTasks    = null; }
    if (_unsubFeedback) { _unsubFeedback(); _unsubFeedback = null; }
    if (_unsubNotifs)   { _unsubNotifs();   _unsubNotifs   = null; }
}

// Зберігає зовнішню відписку від notification listener-а.
// Викликається з auth.js після initNotificationsListener().
export function setNotifUnsub(unsub) {
    if (_unsubNotifs) { _unsubNotifs(); }
    _unsubNotifs = unsub || null;
}

// ════════════════════════════════════════════════════════════
// 🔥  ІНІЦІАЛІЗАЦІЯ
// ════════════════════════════════════════════════════════════

// Завантажує parent/ один раз при старті.
// Повертає Promise що резолвиться після першого читання.
export function initParentData() {
    return new Promise((resolve) => {
        onValue(ref(db, 'zirky/parent'), (snapshot) => {
            const saved = snapshot.val();
            if (saved) {
                // Зберігаємо isParent — він не приходить з Firebase
                const wasParent = state.parent.isParent;
                Object.assign(state.parent, saved);
                state.parent.isParent = wasParent;
                if (!state.parent.children)         state.parent.children         = {};
                if (!state.parent.conversionRates)  state.parent.conversionRates  = { minutesPerStar: 2, moneyPerStar: 1 };
                if (!state.parent.loginHistory)      state.parent.loginHistory      = [];
                if (state.parent.failedAttempts === undefined) state.parent.failedAttempts = 0;
            }
            resolve();
        }, { onlyOnce: true });
    });
}

// Підписується на дані активної дитини.
// При switchChild() — відписується від старої і підписується на нову.
export function initChildListener(childId) {
    // Відписуємось від попереднього listener-а
    if (_unsubChild) { _unsubChild(); _unsubChild = null; }

    const childRef = ref(db, `zirky/children/${childId}`);
    _unsubChild = onValue(childRef, (snapshot) => {
        const saved = snapshot.val();
        if (saved) {
            // Зберігаємо goal.reached перед перезаписом (race condition)
            const goalReachedBefore = state.data.goal?.reached;

            Object.assign(state.data, saved);

            // Відновлюємо goal.reached якщо Firebase ще не встиг зберегти
            if (goalReachedBefore && state.data.goal && !state.data.goal.reached) {
                state.data.goal.reached = true;
            }

            // Гарантуємо обов'язкові поля
            if (state.data.balance === undefined) state.data.balance = 0;
            if (!state.data.records)              state.data.records  = [];
            if (!state.data.subjects)             state.data.subjects = null;
            if (!state.data.clubs)                state.data.clubs    = null;
            if (!state.data.achievements)         state.data.achievements = defaultChildData().achievements;
            if (!state.data.tasks)                state.data.tasks    = {};
            if (!state.data.feedback)             state.data.feedback = {};

            // Міграція appearance до формату {child, parent}
            state.data.appearance = migrateAppearance(state.data.appearance);
        }

        migrateAchievementIds();    // одноразова міграція achId у старих записах
        recalculateAchievements();
        // Баланс завжди береться з _runningBalance — не з Firebase
        state.data.balance = state.data.achievements.counters._runningBalance || 0;
        updateUI();
        checkStreakWarning();
        document.dispatchEvent(new CustomEvent('zirky:dataLoaded'));
    });
}

// Зручна обгортка для першого входу — читає parent/, потім підписується на child
export function initFirebase(childId = 'child_1') {
    return initParentData().then(() => {
        state.activeChildId = childId;
        initChildListener(childId);
    });
}

// ════════════════════════════════════════════════════════════
// 🔥  ЗАВДАННЯ  (children/{id}/tasks/)
// ════════════════════════════════════════════════════════════

export function initTasksListener(callback) {
    if (_unsubTasks) { _unsubTasks(); _unsubTasks = null; }

    const childId = state.activeChildId || 'child_1';
    _unsubTasks = onValue(ref(db, `zirky/children/${childId}/tasks`), (snapshot) => {
        const data = snapshot.val() || {};
        state.data.tasks = data;
        state.tasksLoaded = true;
        if (typeof callback === 'function') callback(data);
    });
}

export function saveTask(task, childId) {
    if (!task || !task.id) { console.error('⚠️ saveTask: некоректне завдання', task); return; }
    const cid = childId || task.childId || state.activeChildId || 'child_1';
    const clean = {};
    for (const key in task) {
        if (task[key] !== undefined) clean[key] = task[key];
    }
    set(ref(db, `zirky/children/${cid}/tasks/${task.id}`), clean);
}

export function deleteTask(id, childId) {
    if (!id) return;
    const cid = childId || state.activeChildId || 'child_1';
    remove(ref(db, `zirky/children/${cid}/tasks/${id}`));
}

export function deleteTasks(ids, childId) {
    if (!ids || !ids.length) return;
    const cid = childId || state.activeChildId || 'child_1';
    const updates = {};
    ids.forEach(id => { updates[`zirky/children/${cid}/tasks/${id}`] = null; });
    update(ref(db), updates);
}

export function saveAllTasks(tasksObj) {
    const childId = state.activeChildId || 'child_1';
    if (!tasksObj || Object.keys(tasksObj).length === 0) {
        set(ref(db, `zirky/children/${childId}/tasks`), null);
        return;
    }
    set(ref(db, `zirky/children/${childId}/tasks`), tasksObj);
}

// ════════════════════════════════════════════════════════════
// 🔥  ФІДБЕК  (children/{id}/feedback/)
// ════════════════════════════════════════════════════════════

export function initFeedbackListener(callback) {
    if (_unsubFeedback) { _unsubFeedback(); _unsubFeedback = null; }

    const childId = state.activeChildId || 'child_1';
    _unsubFeedback = onValue(ref(db, `zirky/children/${childId}/feedback`), (snapshot) => {
        callback(snapshot.val());
    });
}

export function saveFeedbackItem(item, childId) {
    const cid = childId || item.childId || state.activeChildId || 'child_1';
    set(ref(db, `zirky/children/${cid}/feedback/${item.id}`), item);
}

export function deleteFeedbackItem(id, childId) {
    const cid = childId || state.activeChildId || 'child_1';
    remove(ref(db, `zirky/children/${cid}/feedback/${id}`));
}

export function saveAllFeedback(items) {
    const childId = state.activeChildId || 'child_1';
    if (!items || items.length === 0) {
        set(ref(db, `zirky/children/${childId}/feedback`), null);
        return;
    }
    const obj = {};
    items.forEach(item => { obj[item.id] = item; });
    set(ref(db, `zirky/children/${childId}/feedback`), obj);
}

// ════════════════════════════════════════════════════════════
// 🔥  ЗБЕРЕЖЕННЯ ДАНИХ  (children/{id}/)
// ════════════════════════════════════════════════════════════

function _childRef() {
    const childId = state.activeChildId || 'child_1';
    return ref(db, `zirky/children/${childId}`);
}

function _guard() {
    if (!state.data) { console.error('⚠️ ЗАХИСТ: data не існує!'); return false; }
    return true;
}

// Повне збереження дитячих даних — тільки для import/reset у settings.js
export function saveAll() {
    if (!_guard()) return;
    const childId = state.activeChildId || 'child_1';
    set(ref(db, `zirky/children/${childId}`), {
        records:      state.data.records      || [],
        balance:      state.data.balance      || 0,
        goal:         state.data.goal         || null,
        achievements: state.data.achievements || defaultChildData().achievements,
        appearance:   state.data.appearance   || defaultChildData().appearance,
        schedule:     state.data.schedule     || null,
        subjects:     state.data.subjects     || null,
        clubs:        state.data.clubs        || null,
    });
}

// records + balance + achievements + goal
export function saveRecords() {
    if (!_guard()) return;
    update(_childRef(), {
        records:      state.data.records      || [],
        balance:      state.data.balance      || 0,
        achievements: state.data.achievements || defaultChildData().achievements,
        goal:         state.data.goal         || null,
    });
}

// Тільки goal — goals.js
export function saveGoalData() {
    if (!_guard()) return;
    update(_childRef(), { goal: state.data.goal || null });
}

// Тільки appearance — appearance.js
export function saveAppearance() {
    if (!_guard()) return;
    update(_childRef(), { appearance: state.data.appearance });
}

// Тільки schedule — schedule.js
export function saveSchedule() {
    if (!_guard()) return;
    update(_childRef(), { schedule: state.data.schedule || null });
}

// subjects + clubs — subjects.js
export function saveSubjects() {
    if (!_guard()) return;
    update(_childRef(), {
        subjects: state.data.subjects || null,
        clubs:    state.data.clubs    || null,
    });
}

// ════════════════════════════════════════════════════════════
// 🔥  ЗБЕРЕЖЕННЯ ДАНИХ БАТЬКА  (parent/)
// ════════════════════════════════════════════════════════════

// Тільки pin батька — auth.js (changePin)
export function savePin() {
    update(ref(db, 'zirky/parent'), { pin: state.parent.pin || '1234' });
}

// Тільки conversionRates — settings.js
export function saveRates() {
    update(ref(db, 'zirky/parent'), { conversionRates: state.parent.conversionRates || null });
}

// Тільки backupLastDate — settings.js
export function saveBackupDate() {
    update(ref(db, 'zirky/parent'), { backupLastDate: state.parent.backupLastDate || null });
}

// Тільки appearance батька — appearance.js
export function saveParentAppearance() {
    update(ref(db, 'zirky/parent'), { appearance: state.parent.appearance || null });
}

// loginHistory + блокування батька — auth.js
export function saveParentLoginData() {
    update(ref(db, 'zirky/parent'), {
        loginHistory:       state.parent.loginHistory       || [],
        blockedUntil:       state.parent.blockedUntil       || null,
        failedAttempts:     state.parent.failedAttempts     || 0,
        blockingNotifiedAt: state.parent.blockingNotifiedAt || null,
    });
}

// Мета-дані дитини (name, avatar, color, pin дитини тощо) — settings.js / auth.js
export function saveChildMeta(childId) {
    const meta = state.parent.children?.[childId];
    if (!meta) return;
    update(ref(db, `zirky/parent/children/${childId}`), meta);
}

// 6в — рамка профілю дитини → parent/children/${childId}/border
export function saveBorder(childId) {
    const border = state.parent.children?.[childId]?.border;
    if (!border) return;
    update(ref(db, `zirky/parent/children/${childId}/border`), border);
}

// Додавання нового дитячого профілю — ініціалізує структуру в Firebase
export function initNewChildData(childId) {
    const defaults = defaultChildData();
    return set(ref(db, `zirky/children/${childId}`), {
        balance:            defaults.balance,
        records:            [],
        tasks:              {},
        feedback:           {},
        notifications_feed: {},
        achievements:       defaults.achievements,
        appearance:         defaults.appearance,
        schedule:           null,
        subjects:           null,
        clubs:              null,
        goal:               null,
    });
}

// Видалення дитячого профілю — всі дані з Firebase
// Видаляє: zirky/children/${childId} + zirky/parent/children/${childId}
// Локально: видаляє з state.parent.children, оновлює activeChildrenCount
// Повертає Promise.
export function deleteChild(childId) {
    const updates = {};
    updates[`zirky/children/${childId}`]            = null;
    updates[`zirky/parent/children/${childId}`]     = null;

    return update(ref(db), updates).then(() => {
        delete state.parent.children[childId];
        state.parent.activeChildrenCount = Object.keys(state.parent.children).length;
        update(ref(db, 'zirky/parent'), {
            activeChildrenCount: state.parent.activeChildrenCount,
        });
    });
}

// 5г + 3б — loginHistory дитини при вході
// Записує { at, type:'child' } на початок масиву, зберігає останні 20 записів.
export function saveChildLoginHistory(childId, type = 'child', agent = '') {
    const histRef = ref(db, `zirky/parent/children/${childId}/loginHistory`);
    runTransaction(histRef, (current) => {
        const history = Array.isArray(current) ? current : [];
        history.unshift({ at: new Date().toISOString(), type, agent });
        if (history.length > 20) history.length = 20;
        return history;
    }).catch(err => console.warn('saveChildLoginHistory error:', err));
}

// failedAttempts + blockedUntil дитини → parent/children/${childId}/
export function saveChildBlockData(childId) {
    const meta = state.parent.children?.[childId];
    if (!meta) return;
    update(ref(db, `zirky/parent/children/${childId}`), {
        failedAttempts:     meta.failedAttempts     ?? 0,
        blockedUntil:       meta.blockedUntil       ?? null,
        blockingNotifiedAt: meta.blockingNotifiedAt ?? null,
    });
}
