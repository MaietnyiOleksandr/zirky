// ════════════════════════════════════════════════════
// ⚙️  config.js — Конфігурація та константи
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260629.0001';

// ════════════════════════════════════════════════════════════

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


// ── Список бонусів ────────────────────────────────
// Єдине джерело для форми дитини (#bonusType) і форми батьків (#ptaskBonusType).
// Формат опції:
//   value     — рядок для парсингу: "назва|зірки|підкатегорія|counterKey"
//   label     — текст для відображення (нейтральний)
//   boy/girl  — якщо різні для хлопця/дівчини (замінює value і label)
//   gender    — 'boy'|'girl' — показувати лише для певної статі (null — для всіх)
//   hasPages  — true якщо потрібне поле "кількість сторінок" (книга)
export const BONUS_OPTIONS = [
    {
        group: '📚 Навчання',
        options: [
            { value: '📝 Виконано Д/З|2|study|homework',    label: '📝 Виконано Д/З (+2⭐)' },
            { value: '🎯 Важке завдання|5|study|hard_tasks', label: '🎯 Важке завдання (+5⭐)' },
            {
                boy:      '📖 Прочитав книгу|10|study|books',
                girl:     '📖 Прочитала книгу|10|study|books',
                boyLabel: '📖 Прочитав книгу (+10⭐)',
                label:    '📖 Прочитала книгу (+10⭐)',
                hasPages: true,
            },
        ],
    },
    {
        group: '🤝 Допомога батькам',
        options: [
            { value: '🤝 Допомога батькам: проста|3|help|help', label: '🤝 Допомога: проста (+3⭐)' },
            { value: '💪 Допомога батькам: важка|5|help|help',  label: '💪 Допомога: важка (+5⭐)' },
        ],
    },
    {
        group: '🏠 По дому',
        options: [
            {
                boy: '🧹 Прибрав кімнату|3|home_chore|home_chores',
                girl: '🧹 Прибрала кімнату|3|home_chore|home_chores',
                boyLabel: '🧹 Прибрав кімнату (+3⭐)',
                label: '🧹 Прибрала кімнату (+3⭐)',
            },
            {
                boy: '👕 Поскладав одяг|3|home_chore|home_chores',
                girl: '👕 Поскладала одяг|3|home_chore|home_chores',
                boyLabel: '👕 Поскладав одяг (+3⭐)',
                label: '👕 Поскладала одяг (+3⭐)',
            },
            {
                boy: '🛏️ Застелив ліжко|2|home_chore|home_chores',
                girl: '🛏️ Застелила ліжко|2|home_chore|home_chores',
                boyLabel: '🛏️ Застелив ліжко (+2⭐)',
                label: '🛏️ Застелила ліжко (+2⭐)',
            },
            {
                boy: '🫧 Помив посуд|3|home_chore|home_chores',
                girl: '🫧 Помила посуд|3|home_chore|home_chores',
                boyLabel: '🫧 Помив посуд (+3⭐)',
                label: '🫧 Помила посуд (+3⭐)',
            },
            {
                boy: '🔧 Допоміг ремонтувати|5|home_chore|home_chores',
                girl: '🍳 Допомогла готувати|5|home_chore|home_chores',
                boyLabel: '🔧 Допоміг ремонтувати (+5⭐)',
                label: '🍳 Допомогла готувати (+5⭐)',
            },
        ],
    },
    {
        group: '🏸 Активність',
        options: [
            { value: '🚶 Прогулянка 30+ хв|3|activity|activity',  label: '🚶 Прогулянка 30+ хв (+3⭐)' },
            { value: '🏃 Тренування 60+ хв|5|activity|activity',   label: '🏃 Тренування 60+ хв (+5⭐)' },
            { value: '🏋️ Зробити зарядку|5|activity|workout',      label: '🏋️ Зробити зарядку (+5⭐)' },
        ],
    },
    {
        group: '🧼 Гігієна',
        options: [
            { value: '💇 Причесати волосся|5|hygiene|hair', label: '💇 Причесатись (+5⭐)', gender: 'girl' },
            { value: '🪥 Почистити зуби|2|hygiene|teeth',   label: '🪥 Почистити зуби (+2⭐)' },
        ],
    },
];

// ── Курси конвертації ─────────────────────────────
export const conversionRates = {
    minutesPerStar: 2,   // 1⭐ = 2 хвилини
    moneyPerStar: 1      // 1⭐ = 1 гривня
};

// ── Досягнення ────────────────────────────────────
// gender: null — для всіх; "boy" / "girl" — лише для певної статі
// id — стабільний ключ для record.achId (не змінювати після релізу!)
export const ACHIEVEMENTS = {

    // ── За оцінки ─────────────────────────────────
    "відмінник": {
        id: "відмінник",
        gender: null,
        name: { boy: "Відмінник", girl: "Відмінниця" },
        icon: "🎓",
        desc: "Збирай оцінки «12» з будь-яких предметів",
        levels: [
            { tier: "bronze", target: 5,   reward: 50,   desc: "5 дванадцяток" },
            { tier: "silver", target: 20,  reward: 200,  desc: "20 дванадцяток" },
            { tier: "gold",   target: 100, reward: 1000, desc: "100 дванадцяток" }
        ],
        type: "cumulative",
        counter: "grades_12"
    },
    "зіркова": {
        id: "зіркова",
        gender: null,
        name: { boy: "Зірковий", girl: "Зіркова" },
        icon: "💫",
        desc: "Збирай оцінки «11» з будь-яких предметів",
        levels: [
            { tier: "bronze", target: 30,  reward: 10, desc: "30 одинадцяток" },
            { tier: "silver", target: 60,  reward: 30, desc: "60 одинадцяток" },
            { tier: "gold",   target: 120, reward: 50, desc: "120 одинадцяток" }
        ],
        type: "cumulative",
        counter: "grades_11"
    },
    "тверда_десятка": {
        id: "тверда_десятка",
        gender: null,
        name: "Тверда десятка",
        icon: "🏅",
        desc: "Збирай оцінки «10» з будь-яких предметів",
        levels: [
            { tier: "bronze", target: 50,  reward: 10, desc: "50 десяток" },
            { tier: "silver", target: 100, reward: 20, desc: "100 десяток" },
            { tier: "gold",   target: 200, reward: 30, desc: "200 десяток" }
        ],
        type: "cumulative",
        counter: "grades_10"
    },

    // ── Навчання ──────────────────────────────────
    "книголюб": {
        id: "книголюб",
        gender: null,
        name: "Книголюб",
        icon: "📚",
        desc: "Читай книги та розвивайся",
        levels: [
            { tier: "bronze", target: 5,  reward: 20,  desc: "5 книг" },
            { tier: "silver", target: 10, reward: 40,  desc: "10 книг" },
            { tier: "gold",   target: 20, reward: 100, desc: "20 книг" }
        ],
        type: "cumulative",
        counter: "books"
    },
    "старанна": {
        id: "старанна",
        gender: null,
        name: { boy: "Старанний", girl: "Старанна" },
        icon: "📝",
        desc: "Частіше виконуй домашні завдання",
        levels: [
            { tier: "bronze", target: 20,  reward: 30,  desc: "20 виконаних Д/З" },
            { tier: "silver", target: 60,  reward: 70,  desc: "60 виконаних Д/З" },
            { tier: "gold",   target: 120, reward: 150, desc: "120 виконаних Д/З" }
        ],
        type: "cumulative",
        counter: "homework"
    },
    "мегамозок": {
        id: "мегамозок",
        gender: null,
        name: "Мегамозок",
        icon: "🧠",
        desc: "Виконуй складні завдання та перемагай",
        levels: [
            { tier: "bronze", target: 10, reward: 30,  desc: "10 важких завдань" },
            { tier: "silver", target: 30, reward: 70,  desc: "30 важких завдань" },
            { tier: "gold",   target: 90, reward: 150, desc: "90 важких завдань" }
        ],
        type: "cumulative",
        counter: "hard_tasks"
    },
    "читачка": {
        id: "читачка",
        gender: null,
        name: { boy: "Читач", girl: "Читачка" },
        icon: "📖",
        desc: "Читай книги та рахуй прочитані сторінки",
        levels: [
            { tier: "bronze",   target: 300,  reward: 30, desc: "300 сторінок" },
            { tier: "silver",   target: 800,  reward: 30, desc: "800 сторінок" },
            { tier: "gold",     target: 1500, reward: 30, desc: "1 500 сторінок" },
            { tier: "platinum", target: 3000, reward: 30, desc: "3 000 сторінок" },
            { tier: "diamond",  target: 5000, reward: 30, desc: "5 000 сторінок" },
            { tier: "sapphire", target: 8000, reward: 30, desc: "8 000 сторінок" }
        ],
        type: "cumulative",
        counter: "pages"
    },

    // ── Вдома ─────────────────────────────────────
    "помічниця": {
        id: "помічниця",
        gender: null,
        name: { boy: "Помічник", girl: "Помічниця" },
        icon: "🤝",
        desc: "Допомагай батькам - отримуй додаткові винагороди",
        levels: [
            { tier: "bronze", target: 10, reward: 30,  desc: { boy: "10 разів допоміг", girl: "10 разів допомогла" } },
            { tier: "silver", target: 30, reward: 70,  desc: { boy: "30 разів допоміг", girl: "30 разів допомогла" } },
            { tier: "gold",   target: 90, reward: 150, desc: { boy: "90 разів допоміг", girl: "90 разів допомогла" } }
        ],
        type: "cumulative",
        counter: "help"
    },
    "господиня": {
        id: "господиня",
        gender: null,
        name: { boy: "Господар", girl: "Господиня" },
        icon: "🏠",
        desc: "Тримай дім у порядку",
        levels: [
            { tier: "bronze", target: 20,  reward: 30,  desc: "20 домашніх справ" },
            { tier: "silver", target: 60,  reward: 70,  desc: "60 домашніх справ" },
            { tier: "gold",   target: 120, reward: 150, desc: "120 домашніх справ" }
        ],
        type: "cumulative",
        counter: "home_chores"
    },

    // ── Активність ────────────────────────────────
    "активна": {
        id: "активна",
        gender: null,
        name: { boy: "Активний", girl: "Активна" },
        icon: "🏸",
        desc: { boy: "Рухайся та будь активним", girl: "Рухайся та будь активною" },
        levels: [
            { tier: "bronze", target: 7,  reward: 30,  desc: "7 активних виходів" },
            { tier: "silver", target: 20, reward: 70,  desc: "20 активних виходів" },
            { tier: "gold",   target: 45, reward: 150, desc: "45 активних виходів" }
        ],
        type: "cumulative",
        counter: "activity"
    },
    "красуня": {
        id: "красуня",
        gender: "girl",
        name: "Красуня",
        icon: "🪮",
        desc: "Причесуйся кожен день",
        levels: [
            { tier: "bronze", target: 3, reward: 10, desc: "3 дні" },
            { tier: "silver", target: 5, reward: 20, desc: "5 днів" },
            { tier: "gold",   target: 7, reward: 30, desc: "7 днів" }
        ],
        type: "repeatable_streak",
        streak: "hair"
    },

    // ── Гігієна ───────────────────────────────────
    "спортсмен": {
        id: "спортсмен",
        gender: null,
        name: { boy: "Спортсмен", girl: "Спортсменка" },
        icon: "🏋️",
        desc: "Роби зарядку щодня",
        levels: [
            { tier: "bronze", target: 5,  reward: 10, desc: "5 днів" },
            { tier: "silver", target: 10, reward: 20, desc: "10 днів" },
            { tier: "gold",   target: 30, reward: 50, desc: "30 днів" }
        ],
        type: "repeatable_streak",
        streak: "workout"
    },
    "чистюля": {
        id: "чистюля",
        gender: null,
        name: "Чистюля",
        icon: "🦷",
        desc: "Чисти зуби 2 рази на добу",
        levels: [
            { tier: "bronze", target: 5,  reward: 20,  desc: "5 днів" },
            { tier: "silver", target: 10, reward: 50,  desc: "10 днів" },
            { tier: "gold",   target: 30, reward: 100, desc: "30 днів" }
        ],
        type: "repeatable_streak",
        streak: "teeth"
    },

    // ── Особливі ──────────────────────────────────
    "fire_streak": {
        id: "fire_streak",
        gender: null,
        name: "Fire Streak",
        icon: "🔥",
        desc: "Заробляй зірки кожен день без перерв",
        levels: [
            { tier: "bronze", target: 7,  reward: 50,  desc: "7 днів" },
            { tier: "silver", target: 14, reward: 100, desc: "14 днів" },
            { tier: "gold",   target: 30, reward: 300, desc: "30 днів" }
        ],
        type: "streak",
        streak: "earning"
    },
    "ощадливий": {
        id: "ощадливий",
        gender: null,
        name: { boy: "Ощадливий", girl: "Ощадлива" },
        icon: "💰",
        desc: "Накопичуй зірки на балансі",
        levels: [
            { tier: "bronze", target: 200,  reward: 10, desc: "200⭐" },
            { tier: "silver", target: 500,  reward: 30, desc: "500⭐" },
            { tier: "gold",   target: 1000, reward: 50, desc: "1000⭐" }
        ],
        type: "balance"
    },
    "транжира": {
        id: "транжира",
        gender: null,
        name: "Транжира",
        icon: "💸",
        desc: "Витрачай зірки на винагороди",
        levels: [
            { tier: "bronze", target: 300,  reward: 10, desc: "300⭐" },
            { tier: "silver", target: 700,  reward: 20, desc: "700⭐" },
            { tier: "gold",   target: 1000, reward: 40, desc: "1000⭐" }
        ],
        type: "cumulative",
        counter: "total_spent"
    },
    "швидкий_старт": {
        id: "швидкий_старт",
        gender: null,
        name: "Швидкий старт",
        icon: "🚀",
        desc: "Заробляй багато зірок за тиждень",
        levels: [
            { tier: "bronze", target: 50,  reward: 5,  desc: "50⭐" },
            { tier: "silver", target: 100, reward: 10, desc: "100⭐" },
            { tier: "gold",   target: 150, reward: 20, desc: "150⭐" }
        ],
        type: "weekly"
    },
    "цілеспрямована": {
        id: "цілеспрямована",
        gender: null,
        name: { boy: "Цілеспрямований", girl: "Цілеспрямована" },
        icon: "🎯",
        desc: "Досягни своєї мети",
        levels: [
            { tier: "bronze", target: 1, reward: 20, desc: { boy: "Перша мета досягнута",   girl: "Перша мета досягнута"  } },
            { tier: "silver", target: 2, reward: 40, desc: { boy: "Двічі досягнув мети",     girl: "Двічі досягла мети"    } },
            { tier: "gold",   target: 3, reward: 60, desc: { boy: "Тричі досягнув мети",     girl: "Тричі досягла мети"    } }
        ],
        type: "goal_counter",
        check: "goal_reached"
    },
};


// ── Зірки за оцінки ──────────────────────────────
export const gradeToStars = {
    '12': 5,
    '11': 4,
    '10': 3,
    '9': 2,
    '8': 1
};
