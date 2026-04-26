// ════════════════════════════════════════════════════
// ⚙️  config.js — Конфігурація та константи
//     Зірки Успіху | v3.20260426.0853
// ════════════════════════════════════════════════════

// ── Firebase ──────────────────────────────────────
export const firebaseConfig = {
    apiKey: "AIzaSyBv_Lm_p-laB5cq1FiJ59q5IcTKVuGE0H0",
    authDomain: "zirky-uspihu.firebaseapp.com",
    databaseURL: "https://zirky-uspihu-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "zirky-uspihu",
    storageBucket: "zirky-uspihu.firebasestorage.app",
    messagingSenderId: "1034534533154",
    appId: "1:1034534533154:web:7bfefc2f6fbd1e782f727b"
};

// ── Початковий стан даних ─────────────────────────
let data = {
    records: [],
    balance: 0,
    pin: '1234',
    isParent: false,
    goal: null,  // { name: string, target: number, emoji: string }
    achievements: {
        counters: {},  // grades_12: 5, books: 2
        streaks: {},   // earning: {current: 7, best: 12, lastDate: "2026-04-11"}
        levels: {},    // {"відмінник": 2, "книголюб": 1} - поточний рівень
        weekly: {},    // "2026-W15": {"швидкий_старт": 2}
        repeatableHistory: {},  // {"чистюля": {1: 3, 2: 1}} - скільки разів отримано кожен рівень
        freezePeriods: []  // [{ from: "2026-04-21", until: "2026-04-30" }] - всі періоди канікул
    }
};

// ── Винагороди ────────────────────────────────────
export const rewards = [
    { name: '+30 хв смартфону', cost: 10 },
    { name: "Вихідний без обов'язків", cost: 50 },
    { name: '50 грн', cost: 50 }
];

// ── Досягнення ────────────────────────────────────
export const ACHIEVEMENTS = {
    "відмінник": {
        name: "Відмінник",
        icon: "🎓",
        desc: "Збирай оцінки «12» з будь-яких предметів",
        levels: [
            { tier: "bronze", target: 5, reward: 50, desc: "5 дванадцяток" },
            { tier: "silver", target: 20, reward: 200, desc: "20 дванадцяток" },
            { tier: "gold", target: 100, reward: 1000, desc: "100 дванадцяток" }
        ],
        type: "cumulative",
        counter: "grades_12"
    },
    "книголюб": {
        name: "Книголюб",
        icon: "📚",
        desc: "Читай книги та розвивайся",
        levels: [
            { tier: "bronze", target: 5, reward: 20, desc: "5 книг" },
            { tier: "silver", target: 10, reward: 40, desc: "10 книг" },
            { tier: "gold", target: 20, reward: 100, desc: "20 книг" }
        ],
        type: "cumulative",
        counter: "books"
    },
    "fire_streak": {
        name: "Fire Streak",
        icon: "🔥",
        desc: "Заробляй зірки кожен день без перерв",
        levels: [
            { tier: "bronze", target: 7, reward: 50, desc: "7 днів" },
            { tier: "silver", target: 14, reward: 100, desc: "14 днів" },
            { tier: "gold", target: 30, reward: 300, desc: "30 днів" }
        ],
        type: "streak",
        streak: "earning"
    },
    "ощадливий": {
        name: "Ощадливий",
        icon: "💰",
        desc: "Накопичуй зірки на балансі",
        levels: [
            { tier: "bronze", target: 200, reward: 10, desc: "200⭐" },
            { tier: "silver", target: 500, reward: 30, desc: "500⭐" },
            { tier: "gold", target: 1000, reward: 50, desc: "1000⭐" }
        ],
        type: "balance"
    },
    "транжира": {
        name: "Транжира",
        icon: "💸",
        desc: "Витрачай зірки на винагороди",
        levels: [
            { tier: "bronze", target: 300, reward: 10, desc: "300⭐" },
            { tier: "silver", target: 700, reward: 20, desc: "700⭐" },
            { tier: "gold", target: 1000, reward: 40, desc: "1000⭐" }
        ],
        type: "cumulative",
        counter: "total_spent"
    },
    "чистюля": {
        name: "Чистюля",
        icon: "🦷",
        desc: "Чисти зуби 2 рази на добу",
        levels: [
            { tier: "bronze", target: 5, reward: 20, desc: "5 днів" },
            { tier: "silver", target: 10, reward: 50, desc: "10 днів" },
            { tier: "gold", target: 30, reward: 100, desc: "30 днів" }
        ],
        type: "repeatable_streak",
        streak: "teeth"
    },
    "красуня": {
        name: "Красуня",
        icon: "🪮",
        desc: "Причесуйся кожен день",
        levels: [
            { tier: "bronze", target: 3, reward: 10, desc: "3 дні" },
            { tier: "silver", target: 5, reward: 20, desc: "5 днів" },
            { tier: "gold", target: 7, reward: 30, desc: "7 днів" }
        ],
        type: "repeatable_streak",
        streak: "hair"
    },
    "швидкий_старт": {
        name: "Швидкий старт",
        icon: "🚀",
        desc: "Заробляй багато зірок за тиждень",
        levels: [
            { tier: "bronze", target: 50, reward: 5, desc: "50⭐" },
            { tier: "silver", target: 100, reward: 10, desc: "100⭐" },
            { tier: "gold", target: 150, reward: 20, desc: "150⭐" }
        ],
        type: "weekly"
    },
    "ціленаправлений": {
        name: "Ціленаправлений",
        icon: "🎯",
        desc: "Досягни своєї мети",
        levels: [
            { tier: "gold", reward: 20, desc: "Перша мета" }
        ],
        type: "special",
        check: "goal_reached"
    }
};

// ── Зірки за оцінки ──────────────────────────────
export const gradeToStars = {
    '12': 5,
    '11': 4,
    '10': 3,
    '9': 2,
    '8': 1
};

// ── Змінні стану ─────────────────────────────────
let currentViewMonth = new Date();
let pinValue = '';
let showPeriod = 'month'; // 'month' або 'all'
let chartPeriod = 'week'; // 'week', 'month', 'year'
let chartOffset = 0; // 0 = поточний період, -1 = попередній, і т.д.
let dbRef = null;
let pendingCustomReward = null;
