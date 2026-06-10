// ════════════════════════════════════════════════════
// 🗃️  state.js — Спільний стан застосунку
//
//     Всі модулі імпортують цей об'єкт і працюють
//     з одним спільним посиланням (reference).
//     Зміни в будь-якому модулі видні всюди.
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260606.0746';

// ════════════════════════════════════════════════════════════

// ── Дані дитини за замовчуванням ─────────────────────────
//   Використовується при switchChild() та при першому вході.
//   teachers і bells живуть всередині schedule — не виносимо окремо.
export function defaultChildData() {
    return {
        records:     [],
        balance:     0,
        goal:        null,
        achievements: {
            counters:          {},
            streaks:           {},
            levels:            {},
            weekly:            {},
            repeatableHistory: {},
            freezePeriods:     [],
        },
        appearance: {
            owned:  ['default'],
            active: { theme: 'default', palette: 'default', font: 'default', buttons: 'default', background: 'default', badge: 'default' },
            child:  null,
            parent: null,
        },
        schedule:  null,   // { days, bells, teachers, twoWeeks } — всі поля всередині
        subjects:  null,
        clubs:     null,
        tasks:     {},
        feedback:  {},
        notifications_feed: {},
    };
}

// ── Скидання UI-стану при перемиканні профілю ─────────────
//   Викликається у switchChild() перед завантаженням нового профілю.
export function resetUIState(s) {
    s.pinValue            = '';
    s.rewardPinValue      = '';
    s.pendingCustomReward = null;
    s.pendingRewardIndex  = null;
    s.editingFreezeIndex  = undefined;
    s.currentViewMonth     = new Date();
    s.currentTasksMonth    = new Date();
    s.currentFeedbackMonth = new Date();
    s.showAllTasks         = false;
    s.showAllFeedback      = false;
    s.showPeriod          = 'month';
    s.chartPeriod         = 'week';
    s.chartOffset         = 0;
    s.balancePeriod       = 'week';
    s.balanceOffset       = 0;
    s.heatmapOffset       = 0;
    s.heatmapMode         = 'earn';
    s.donutPeriod         = 'month';
    s.donutOffset         = 0;
    s.donutDrilldown      = null;

    // ── Скидання фільтрів ─────────────────────────────────────
    // Важливо: childId-фільтр обов'язково скидати щоб батько
    // не бачив порожній список після перемикання на іншу дитину.
    historyFilter.type    = 'all';
    historyFilter.subject = 'all';

    tasksFilter.status  = 'all';
    tasksFilter.origin  = 'all';
    tasksFilter.childId = 'all';

    feedbackFilter.cat    = 'all';
    feedbackFilter.status = 'all';
    feedbackFilter.childId = 'all';

    // ── Скидання кешу порівняння ──────────────────────────────
    // allChildrenData може містити застарілі дані іншого профілю
    s.allChildrenData = {};
}

// ════════════════════════════════════════════════════════════

export const state = {

    // ── Прапори готовності даних (НЕ записуються у Firebase) ──
    tasksLoaded: false,   // true після першого відгуку initTasksListener

    // ── Дані поточної дитини (завантажуються з Firebase) ──────
    //   Завжди містить структуру defaultChildData().
    //   При switchChild() замінюється повністю через Object.assign.
    data: defaultChildData(),

    // ── Дані батька (завантажуються з Firebase zirky/parent/) ─
    parent: {
        pin:                 '1234',
        conversionRates:     { minutesPerStar: 2, moneyPerStar: 1 },
        backupLastDate:      null,
        activeChildrenCount: 1,
        appearance:          null,   // { active: { theme, palette, ... } }
        showComparison:      false,
        loginHistory:        [],
        blockedUntil:        null,
        failedAttempts:      0,
        blockingNotifiedAt:  null,

        // ── Метадані дітей (zirky/parent/children/) ──
        //   { child_1: { name, avatar, color, pin, useOwnRates, ... }, ... }
        children: {},

        // ── UI-стан батьківського профілю ──
        isParent: false,   // true коли батько авторизований
    },

    // ── Активний профіль дитини ───────────────────────────────
    activeChildId: null,   // 'child_1' | 'child_2' | ... | null (батьків екран)

    // ── Агреговані дані по всіх дітях (для порівняння/stats) ─
    //   Заповнюються лише коли батько відкриває порівняльну статистику.
    //   { child_1: { records, balance, achievements }, child_2: { ... } }
    allChildrenData: {},

    // ── Firebase ──────────────────────────────────────────────
    dbRef: null,

    // ── UI стан ───────────────────────────────────────────────
    pinValue:          '',
    currentViewMonth:      new Date(),
    currentTasksMonth:     new Date(),
    currentFeedbackMonth:  new Date(),
    showAllTasks:          false,
    showAllFeedback:       false,
    showPeriod:        'month',   // 'month' | 'all'
    chartPeriod:       'week',    // 'week' | 'month' | 'year'
    chartOffset:       0,         // 0 = поточний, -1 = попередній

    balancePeriod:     'week',    // 'week' | 'month' | 'year'
    balanceOffset:     0,

    heatmapOffset:     0,         // 0 = поточний місяць
    heatmapMode:       'earn',    // 'earn' | 'spend'

    donutPeriod:       'month',   // 'week' | 'month' | 'year' | 'all'
    donutOffset:       0,
    donutDrilldown:    null,      // null | { category: string }

    // ── Тимчасові дані ────────────────────────────────────────
    pendingCustomReward: null,
    rewardPinValue:      '',
    pendingRewardIndex:  null,
    editingFreezeIndex:  undefined,

};

export const historyFilter = { type: 'all', subject: 'all' };

// Фільтр у табі «Завдання»
// status: 'all' | 'pending' | 'active' | 'confirmed' | 'rejected'
// origin: 'all' | 'child_request' | 'parent_task'
// childId: 'all' | 'child_1' | 'child_2' | ...
export const tasksFilter = { status: 'all', origin: 'all', childId: 'all' };

// Фільтр у табі «Фідбек» (батьківський вигляд)
// cat:    'all' | <категорія>
// status: 'all' | '⏳' | '🔄' | '✅' | '❌'
// childId: 'all' | 'child_1' | 'child_2' | ...
export const feedbackFilter = { cat: 'all', status: 'all', childId: 'all' };

// ── Геттери сумісності: state.data.* → state.parent.* ────────────
// Старі модулі (ui.js, navigation.js, appearance.js, rewards.js тощо)
// читають state.data.isParent і state.data.pin — геттери прозоро
// перенаправляють до state.parent без змін у цих модулях.
Object.defineProperty(state.data, 'isParent', {
    get() { return state.parent.isParent; },
    set(v) { state.parent.isParent = v; },
    enumerable:   true,
    configurable: true,
});

// state.data.pin → state.parent.pin
// Використовується у rewards.js (rewardPinOverlay) та appearance.js (купівля теми).
Object.defineProperty(state.data, 'pin', {
    get() { return state.parent.pin; },
    set(v) { state.parent.pin = v; },
    enumerable:   true,
    configurable: true,
});
