// ════════════════════════════════════════════════════
// 🗃️  state.js — Спільний стан застосунку
//
//     Всі модулі імпортують цей об'єкт і працюють
//     з одним спільним посиланням (reference).
//     Зміни в будь-якому модулі видні всюди.
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260522.0650';

// ════════════════════════════════════════════════════════════

export const state = {

    // ── Прапор готовності даних tasks (НЕ записується у Firebase) ──
    //   Встановлюється у true після першого відгуку initTasksListener.
    //   Потрібен, щоб generateNotifications не видаляв сповіщення про
    //   завдання, поки zirky-tasks listener ще не повернувся.
    tasksLoaded: false,

    // ── Основні дані (завантажуються з Firebase) ──
    data: {
        records: [],
        balance: 0,
        pin: '1234',
        isParent: false,
        goal: null,
        achievements: {
            counters: {},
            streaks: {},
            levels: {},
            weekly: {},
            repeatableHistory: {},
            freezePeriods: []
        },
        appearance: {
            owned:  ['default'],
            active: { theme: 'default', palette: 'default', font: 'default', buttons: 'default', background: 'default' },
        },
        backupLastDate: null,   // 'YYYY-MM-DD' — дата останнього резервного копіювання (синхронізується через Firebase)

        // ── Завдання та запити (zirky-tasks/ окрема гілка Firebase) ──
        // Структура: { [id]: taskObj }
        //   origin: 'child_request' | 'parent_task'
        //   status: 'pending' | 'active' | 'done' | 'confirmed' | 'rejected'
        tasks: {},
    },

    // ── Firebase ──────────────────────────────────
    dbRef: null,

    // ── UI стан ───────────────────────────────────
    pinValue: '',
    currentViewMonth: new Date(),
    showPeriod: 'month',   // 'month' або 'all'
    chartPeriod: 'week',   // 'week', 'month', 'year'
    chartOffset: 0,        // 0 = поточний, -1 = попередній

    balancePeriod: 'week', // 'week', 'month', 'year'
    balanceOffset: 0,      // 0 = поточний, -1 = попередній

    heatmapOffset: 0,      // 0 = поточний місяць
    heatmapMode:  'earn',  // 'earn' | 'spend'

    donutPeriod:    'month', // 'week', 'month', 'year', 'all'
    donutOffset:    0,
    donutDrilldown: null,    // null | { category: string }

    // ── Тимчасові дані ────────────────────────────
    pendingCustomReward: null,
    rewardPinValue: '',
    pendingRewardIndex: null, // Індекс винагороди що очікує PIN підтвердження     // Зберігається спільно між auth.js та rewards.js
    editingFreezeIndex: undefined,

};

export const historyFilter = { type: 'all', subject: 'all' };

// Фільтр у табі "Завдання" — за зразком historyFilter / feedback фільтрів
// status: 'all' | 'pending' | 'active' | 'confirmed' | 'rejected'
// origin: 'all' | 'child_request' | 'parent_task'
export const tasksFilter = { status: 'all', origin: 'all' };
