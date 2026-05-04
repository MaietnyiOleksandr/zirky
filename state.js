// ════════════════════════════════════════════════════
// 🗃️  state.js — Спільний стан застосунку
//
//     Всі модулі імпортують цей об'єкт і працюють
//     з одним спільним посиланням (reference).
//     Зміни в будь-якому модулі видні всюди.
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260504.1013';

// ════════════════════════════════════════════════════════════

export const state = {

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
    },

    // ── Firebase ──────────────────────────────────
    dbRef: null,

    // ── UI стан ───────────────────────────────────
    pinValue: '',
    currentViewMonth: new Date(),
    showPeriod: 'month',   // 'month' або 'all'
    chartPeriod: 'week',   // 'week', 'month', 'year'
    chartOffset: 0,        // 0 = поточний, -1 = попередній

    // ── Тимчасові дані ────────────────────────────
    pendingCustomReward: null,
    rewardPinValue: '',
    pendingRewardIndex: null, // Індекс винагороди що очікує PIN підтвердження     // Зберігається спільно між auth.js та rewards.js
    editingFreezeIndex: undefined,

};

export const historyFilter = { type: 'all', subject: 'all' };
