# ⭐ Зірки Успіху — README

> Цей файл — швидкий довідник по архітектурі проекту.  
> Покладається у корінь архіву разом з іншими файлами.

---

## 📐 Правила роботи над проектом (!Обов'язково!)

1. **Версія** — оновлювати у кожному зміненому файлі:

   | Тип файлу | Де | Формат |
   |---|---|---|
   | `*.js` | `export const VERSION = '...'` | `'vMAJOR.YYYYMMDD.HHMM'` |
   | `*.html` | коментар `<!-- version: ... -->` | `v4.YYYYMMDD.HHMM` |
   | `*.css` | коментар `/* version: ... */` | `v4.YYYYMMDD.HHMM` |

   **MAJOR** = `4`. **HHMM** — з повідомлення підтвердження, інакше `0000`.

2. **Видавати** тільки змінені файли — **без архіву**, напряму
3. **Перед кодуванням** — запитати підтвердження (крім прямих завдань)
4. **Думати** українською
5. **На початку чату** — завантажити архів з актуальною версією
6. **Мінімум інлайн стилів** — вигляд керується CSS-змінними і `data-*` атрибутами; інлайн `style` лише для динамічних значень що не можна передати інакше (наприклад `--profile-color`)
7. **Не пакувати файли у ZIP** — видавати відредаговані файли напряму, без архіву

---

## 🗂 Загальний опис

Веб-застосунок для мотивації дитини: батьки нараховують зірки за оцінки та поведінку, дитина витрачає їх на винагороди. Підтримує **кілька дитячих профілів** під одним батьківським акаунтом. Один HTML-файл + ES-модулі + Firebase Realtime Database. Без фреймворків, без збірника.

**Стек:** Vanilla JS (ES modules), Firebase 10.7.1 (Realtime DB), CSS custom properties  
**Хостинг:** будь-який статичний (GitHub Pages і т.п.)

---

## 📁 Структура файлів

| Файл | Відповідальність |
|---|---|
| `index.html` | Весь HTML + `<script type="module">` що імпортує все і виставляє `window.*` |
| `style.css` | Всі стилі, CSS-змінні, теми, декор-селектори |
| `state.js` | Спільний об'єкт `state`, `defaultChildData()`, `resetUIState()`, геттери сумісності |
| `config.js` | Firebase конфіг, `ACHIEVEMENTS` (з `gender`, `id`), `gradeToStars`, `conversionRates`, **`BONUS_OPTIONS`** |
| `firebase.js` | Ініціалізація DB, `initParentData()`, `initChildListener()`, `saveAll()`, `saveTask()`, `saveChildLoginHistory()` та ін. |
| `auth.js` | Вхід батьків (PIN) / дитини, мульти-профільна логіка, блокування PIN |
| `navigation.js` | `switchTab()`, `showForm()`, обробка подій `zirky:*` |
| `ui.js` | `updateUI()`, `applyProfileVisibility()`, `renderFreezePeriods()` при перемиканні профілю |
| `records.js` | `commitRecord()` — єдина точка входу для додавання запису |
| `tasks.js` | Два потоки: `parent_task` і `child_request`. `renderBonusSelect()`. Мульти-профільний кеш `_allTasksCache`. |
| `rewards.js` | Магазин винагород, витрати зірок |
| `achievements.js` | `recalculateAchievements()`, `migrateAchievementIds()`, стріки, `shouldSkipDayForStreak()`, `_isDateInFreeze()` |
| `stats.js` | Графіки, теплова карта, донат, баланс-динаміка |
| `compare.js` | Порівняльна статистика всіх профілів (тільки для батька) |
| `schedule.js` | Розклад занять |
| `history.js` | Історія записів, фільтри, навігація по місяцях |
| `notifications.js` | Генерація сповіщень, `initNotificationsListener()`, стабільні ключі `backup_recurring` / `no_stars_recurring` |
| `appearance.js` | Теми, компоненти, рамка профілю, `applyAppearance()`, `applyActiveBorder()` |
| `settings.js` | Налаштування, профілі дітей, резервне копіювання, модалка активності з табами профілів |
| `help.js` | Довідка, гендерні підписи через `G()` |
| `changelog.js` | Журнал змін |
| `subjects.js` | Предмети та гуртки, `buildSubjectSelects()` |
| `goals.js` | Мета накопичення, `saveGoal()`, `renderGoal()` |
| `freeze.js` | Канікули/заморозка стріку, `addFreezePeriod()`, `renderFreezePeriods()` |
| `feedback.js` | Фідбек дитини → батько, кеш по всіх профілях (`_allFeedbackCache`) |
| `utils.js` | `nowKyiv()`, `g()`, `achText()`, `migrateAppearance()`, `pulseElement()` |
| `geese/*.webp` | Зображення для декоративної теми «Гуси» |

---

## 🔥 Firebase — структура гілок (v4)

```
zirky/
  parent/                          ← спільні батьківські дані
    pin: '1234'
    conversionRates: { minutesPerStar, moneyPerStar }
    backupLastDate: 'YYYY-MM-DD'
    activeChildrenCount: 1
    appearance: { active: { theme, palette, font, buttons, background, badge } }
    showComparison: false
    loginHistory: []               ← масив 20 останніх входів батька
    blockedUntil: null
    failedAttempts: 0
    blockingNotifiedAt: null
    children/                      ← мета-дані профілів (не повні дані дитини!)
      child_1/
        name, avatar, color, pin, gender, useOwnRates, startTab
        conversionRates: null | { minutesPerStar, moneyPerStar }
        border: { line, animation, ownedAnimations }
        loginHistory: []           ← масив 20 останніх входів дитини
        failedAttempts: 0
        blockedUntil: null
        blockingNotifiedAt: null

  children/                        ← повні дані кожної дитини (ізольовані)
    child_1/
      records: []
      balance: 0                   ← береться з _runningBalance у achievements
      achievements: { counters, streaks, levels, weekly, repeatableHistory, freezePeriods }
      appearance: { child: { owned, active }, parent: { active } }
      goal: null
      schedule: { days, bells, teachers, twoWeeks }
      subjects: []
      clubs: []
      tasks/
        [task.id]: { taskObj }
      feedback/
        [item.id]: { feedbackObj }
      notifications_feed/
        [notif.id]: { notifObj }
```

> ⚠️ Старі гілки `zirky-tasks/`, `zirky-feedback/`, `zirky-notifications/` — видалені при міграції на v4.

---

## 👥 Мульти-профільна система (v4)

- До **5 дитячих профілів** під одним батьківським акаунтом
- Кожна дитина має окремий PIN, стартовий таб, колір, рамку, стать (`gender: 'boy' | 'girl'`)
- Дані кожної дитини повністю ізольовані: `zirky/children/${childId}/`
- **Sticky child-bar** для батька: швидке перемикання між профілями без виходу
- `state.activeChildId` — який профіль зараз активний (`'child_1'` | `'child_2'` | ...)
- `state.parent.children` — мета-дані всіх профілів (name, pin, gender, border тощо)

**Порядок ініціалізації:**
```
initParentData()           ← завантажує zirky/parent/ один раз
  → показує loginOverlay
  → user вибирає профіль
  → _doEnterAsChild(childId) або checkPin (батько)
    → _subscribeToChild(childId)
      → initNotificationsListener()  ← першим, щоб _db був готовий
      → initChildListener()          ← підписка на zirky/children/${childId}/
      → initTasksListener()          ← підписка на tasks/
      → initFeedbackListener()       ← підписка на feedback/
    → updateUI() + zirky:dataLoaded
```

**Перемикання між профілями (sticky child-bar):**
```
switchChildFromBar(childId)
  → resetUIState()           ← очищує state.data
  → resetAllTasksCache()     ← скидає кеш завдань всіх дітей
  → resetAllFeedbackCache()  ← скидає кеш фідбеків
  → _subscribeToChild(childId)  ← нові підписки на Firebase
```

> ⚠️ Підписки (`initTasksListener` тощо) при перемиканні замінюються новими. Кожна підписка зберігає `unsub`-функцію і відписується перед новою підпискою.

---

## ⧊ Гендерна система

`gender: 'boy' | 'girl'` зберігається в `state.parent.children[childId].gender`.

**Утиліти (`utils.js`):**
```js
g(childId, boy, girl)           // повертає boy або girl залежно від гендеру
achText(ach, childId, field)    // правильна назва/desc досягнення для гендеру
```

**В `config.js`:**
- `name: { boy: 'Відмінник', girl: 'Відмінниця' }` — гендерна назва
- `gender: 'girl'` — досягнення лише для певної статі (напр. «Красуня»)
- `id: 'відмінник'` — стабільний ключ для `record.achId` (не змінювати після релізу!)

**В `help.js`:**
```js
const G = (boy, girl) => g(childId, boy, girl);
```

**Правило застосування:**
- ✅ `g(state.activeChildId, 'Виконав', 'Виконала')`
- ✅ `G('зробив', 'зробила')` — у `help.js` де `G` вже визначено
- ❌ Хардкодити `'Виконала'`, `'впевнена'`, `'передумала'` тощо

Для батьківського тексту де дитина — третя особа використовувати нейтральну форму без `g()`.

---

## 🎭 Режими: батьки / дитина

- `state.parent.isParent` — `true` якщо батько авторизований через PIN
- `state.data.isParent` — геттер → `state.parent.isParent` (сумісність старих модулів)
- `state.data.pin` — геттер → `state.parent.pin` (сумісність)
- Блокування PIN — окреме для кожного профілю, зберігається у Firebase

---

## 📝 Структура запису (record)

```js
{
  id:          Date.now(),
  date:        'YYYY-MM-DDT12:00:00',
  type:        'earn' | 'spend' | 'freeze' | 'info',
  category:    'grade' | 'diagnostic' | 'bonus' | 'special' | 'task_reward'
               | 'achievement' | 'correction',
  stars:       Number,
  subject:     String,
  grade:       String,            // '8'–'12'
  description: String,
  counterKey:  String,
  achId:       String,            // стабільний id досягнення (після міграції v4)
  achLevel:    Number,            // рівень досягнення на момент отримання
  pages:       Number,
  freezeId:    String,
}
```

---

## ⚡ Пайплайн додавання запису — `commitRecord()`

`commitRecord()` — єдина точка входу для будь-якого нарахування або витрати зірок.

```
commitRecord(recordData)
  1. Видалити undefined-поля (Firebase не приймає undefined)
  2. state.data.records.push(record)
  3. Оновити state.data.balance
  4. checkGoalReached()              ← перевіряє чи досягнута ціль накопичення
  5. Зберегти levelsBefore           ← знімок рівнів досягнень ДО перерахунку
  6. recalculateAchievements()       ← повний перерахунок по всіх записах
  7. giveRewardsForNewAchievements() ← бонусні зірки за нові рівні (різниця зі знімком)
  8. checkWeeklyAchievements()       ← окремо перевіряє тижневі досягнення
  9. saveRecords()                   ← Firebase update: records, balance, achievements, goal
  10. updateUI()                     ← перерендер всього інтерфейсу
```

> ⚠️ `commitRecord()` працює лише з активною дитиною (`state.data`). Для підтвердження завдань «чужої» дитини використовується `_commitRecordForChild()` у `tasks.js`.

---

## 🗂 Таби навігації

`switchTab(tabName)` активує секцію `#{tabName}Section`.

| tab | Секція |
|---|---|
| `add` | Форми додавання (оцінки, бонуси, заморозка, мета) |
| `tasks` | Завдання та запити |
| `rewards` | Магазин винагород |
| `stats` | Статистика та графіки |
| `schedule` | Розклад |
| `history` | Історія |
| `achievements` | Досягнення |
| `feedback` | Зворотній зв'язок |
| `settings` | Налаштування |
| `guide` | Псевдонім → відкриває `instructionsSection`, підсвічує кнопку `guide` в навбарі |
| `instructions` | Довідник (без кнопки в навбарі, лише через `guide`) |

**Програмне перемикання:**
```js
document.dispatchEvent(new CustomEvent('zirky:switchTab', { detail: 'history' }));
document.dispatchEvent(new CustomEvent('zirky:showForm',  { detail: 'freeze' }));
window.__zSwitchTab('stats');   // з сповіщень — закриває панель + switchTab + scroll
```

---

## 📋 Система завдань (tasks.js)

### Два потоки

| `origin` | Хто створює | Статуси |
|---|---|---|
| `child_request` | Дитина через форми «Додати» | `pending` → `confirmed` / `rejected` |
| `parent_task` | Батько у вкладці «Завдання» | `active` → `done` → `confirmed` / `rejected` |

### Структура об'єкта task

```js
{
  id:            'task_<timestamp>_<random>',
  origin:        'child_request' | 'parent_task',
  status:        'pending' | 'active' | 'done' | 'confirmed' | 'rejected',
  category:      String,
  subcategory:   String?,
  title:         String,
  stars:         Number,
  rewardStars:   Number,          // додаткова винагорода за виконання (parent_task)
  createdAt:     nowKyiv(),
  doneAt:        nowKyiv()?,      // коли дитина натиснула «Виконав/ла»
  confirmedAt:   nowKyiv()?,
  rejectedAt:    nowKyiv()?,
  overdueAt:     nowKyiv()?,      // якщо батько натиснув «Прострочено» — для майбутніх досягнень
  hasDeadline:   Boolean,
  deadline:      'YYYY-MM-DDTHH:MM'?,
  childId:       'child_1',
  childComment:  String?,         // коментар дитини при відмові
  rejectComment: String?,         // коментар батька при відхиленні або 'Прострочено'
  counterKey:    String?,
  pages:         Number?,
  lastEditNote:  String?,
}
```

> ⚠️ `overdueAt` + `rejectComment: 'Прострочено'` — мітка для майбутніх досягнень що рахують прострочені завдання. Фільтр: `Object.values(tasks).filter(t => t.overdueAt)`.

### Статуси та переходи

```
child_request:  pending → confirmed
                        → rejected
                        (дитина може видалити pending до підтвердження)

parent_task:    active  → done         (дитина: «Виконав/ла»)
                done    → active       (дитина: «Помилився/лась» — скасування запиту)
                active  → rejected     (батько: «Прострочено» — лише якщо deadline минув)
                done    → confirmed    (батько підтвердив)
                done    → rejected     (батько відхилив)
```

### Список бонусів — BONUS_OPTIONS (config.js)

**Єдине джерело** для обох `<select>`:
- `#bonusType` — форма дитини «Додати бонус» (рендериться через `renderBonusSelect` при `updateUI`)
- `#ptaskBonusType` — форма батьків «Створити завдання» (рендериться при `openParentTaskForm`)

```js
// Щоб додати новий бонус — тільки config.js, більше нічого не чіпати:
BONUS_OPTIONS = [
  { group: '📚 Навчання', options: [
    { value: 'назва|зірки|підкат|counterKey', label: 'Відображення (+N⭐)' },
    { boy: '...', girl: '...', boyLabel: '...', label: '...' },  // гендерні
    { ..., gender: 'girl' },     // лише для дівчат
    { ..., hasPages: true },     // показує поле «кількість сторінок»
  ]},
  ...
]
```

`renderBonusSelect(selectId)` визначає гендер через:
```js
state.data?.gender
  || state.parent?.children?.[state.activeChildId]?.gender
  || 'girl'
```
(перший — для дитячого профілю, другий — для батьківського де `state.data.gender` відсутній)

### Мульти-профільний кеш (_allTasksCache)

Батько бачить завдання **всіх** дітей одночасно:
```js
_allTasksCache = {
  child_1: { [task.id]: taskObj },
  child_2: { [task.id]: taskObj },
}
```

- `_getTaskById(id)` — шукає по всьому кешу, повертає `{ ...task, childId }`  (копію!)
- Після будь-якої мутації — обов'язково `_updateTaskInCache(task)`, інакше UI показує застарілі дані
- `_deleteTaskFromCache(id, childId)` — після видалення

> ⚠️ `_getTaskById` повертає **spread-копію**, не посилання. Тому `task.status = 'x'` не потрапляє в кеш автоматично — `_updateTaskInCache(task)` обов'язковий після кожної мутації.

---

## 🏆 Досягнення — типи

| type | Логіка |
|---|---|
| `cumulative` | Лічильник по `counterKey` в записах |
| `streak` | Дні підряд (з урахуванням `freezePeriods` і вихідних) |
| `repeatable_streak` | Стрік що скидається і перезапускається (зуби, волосся, зарядка) |
| `weekly` | Зірки за поточний тиждень |
| `balance` | Поточний баланс |
| `goal_counter` | Лічильник досягнутих цілей |

### Логіка earning streak з урахуванням канікул

```
Поза freeze-періодом:
  - вихідні (сб/нд) — пропускаються, не рахуються як пропуск
  - будній без запису — streak скидається

Під час freeze-періоду (_isDateInFreeze = true):
  - вихідні НЕ є винятком (рахуються як звичайні дні)
  - gap = 1 день (daysDiff === 2) — дозволено, streak продовжується
  - gap >= 2 дні — streak скидається
```

`_isDateInFreeze(fromDate, toDate)` — перевіряє чи хоч один день між двома записами потрапляє в будь-який `freezePeriods` запис.

---

## 📊 Модалка «Активність» (settings.js)

Показує loginHistory батьків і кожної дитини з табами профілів.

- `_activeActivityTab` — поточна вкладка (`'parent'` або childId), зберігається в пам'яті сесії
- `showActivityModal()` — відкриває модалку, перевіряє чи збережена вкладка ще існує
- `refreshActivityModal()` — безпечний перерендер відкритої модалки; реєструється як `window.refreshActivityModal`
- `switchActivityTab(tabId)` — перемикає вкладку, реєструється як `window.switchActivityTab`

`firebase.js` викликає `window.refreshActivityModal` після `saveChildLoginHistory().then()` і `saveParentLoginData()` — без прямого імпорту `settings.js`.

---

## 💰 Баланс — неочевидно!

`state.data.balance` **не є** джерелом правди.  
Реальний баланс: `state.data.achievements.counters._runningBalance` — перераховується в `recalculateAchievements()`.

---

## 🕐 Дати — неочевидно!

| Тип запису | Поле `date` | Причина |
|---|---|---|
| Оцінки, бонуси, спеціальні | `input.value + 'T12:00:00'` | Батько може вносити заднім числом |
| Витрати (`spend`) | `nowKyiv()` | Реальний момент покупки |
| Досягнення | `nowKyiv()` | Автоматичні |

`id: Date.now()` — завжди реальний Unix-timestamp.

---

## 🎨 Система тем (appearance.js)

**Щоб додати нову тему:** запис у `THEMES` + запис у `COMPONENTS` в `appearance.js`.

**Декоративні теми** (`decorated: true`):
- Виставляють `html[data-decorated="true"]`
- CSS-змінні `--decor-*` задають зображення для слотів: `tasks`, `rewards`, `schedule`, `stats`, `settings`, `themes`, `guide`, `add`, `empty-tasks`, `empty-history`, `empty-feedback`, `help-achievements`, `notif-top`, `notif-bottom`
- У `style.css` вже є всі селектори — нічого там не змінювати для нових тем

---

## 🔌 ES модулі → window

`index.html` має один `<script type="module">` який імпортує всі функції і виставляє їх на `window`. Нові функції що викликаються з HTML **обов'язково** треба додавати до цього списку.

---

## 🔍 Діагностика — алгоритм

Перед будь-якою діагностикою дати відповідь на три питання:

**1. Де вже працює?**
Знайти елемент або сценарій де аналогічна поведінка є. Якщо хедер анімується — JS і дані правильні. Якщо колір змінюється — подія спрацьовує. Працюючий випадок — це еталон, не повторна точка входу для дослідження.

**2. Чим відрізняється те що не працює від того що працює?**
Порівняти еталон з проблемним місцем по одному шару за раз: JS → CSS → HTML структура. Перша знайдена різниця — і є причина. Далі не копати.

**3. Чи найпростіше пояснення вже перевірено?**
Перед тим як іти в глибину — перевірити очевидне: чи є CSS селектор для цього елемента, чи прокинута функція у `window`, чи правильний `id` у DOM. Складні причини — тільки якщо прості виключені.

> **Головна пастка:** почати копати JS коли симптом візуальний. Візуальний симптом ("не анімується", "не змінює стиль", "не видно") — починати з CSS, не з JS. JS перевіряти тільки якщо CSS в порядку.

> **⚠️ Небезпечна зона — `profile-color-btn.active` в анімаційних селекторах:**  
> Видалення `profile-color-btn.active` з блоків `[data-border-animation="rainbow"]` ламає анімацію `.rainbow-wrap::after` (веселка на хедері зупиняється). Перевірено тричі. CSS синтаксис після видалення правильний, порядок блоків не змінюється, JS не залежить від цього селектора. Причина невідома — можливо баг рушія браузера з перерахунком стилів при зміні stacking context. **Не видаляти ці рядки.**

---

---

## 🔔 Система сповіщень (notifications.js)

### Загальна схема

```
Firebase: zirky/children/${childId}/notifications_feed/[id]
                    ▲ onValue слухач                   │ _saveItem / _removeItem
                    │                                   │
     notifications.js                                  │
       ┌─────────────────────────────────────────┐     │
       │  _items = {}  (кеш у пам'яті)           │◄────┘
       │    ↑ onValue → _items заповнюється       │
       │    ↓ _saveItem → Firebase write          │
       │                                          │
       │  generateNotifications()                 │
       │    → _upsertItem()   → _saveItem()       │
       │    → _removeItem()   → Firebase remove   │
       │                                          │
       │  _compactReadItems()                     │
       │    → update(ref(db, '/'), slimUpdates)   │
       └─────────────────────────────────────────┘
               ▲ dispatchEvent('zirky:dataLoaded')
               │
         firebase.js onValue
           → recalculateAchievements()
           → updateUI()
           → checkStreakWarning()
           → dispatchEvent(...)
```

> ⚠️ `notifications_feed` є **дочірньою гілкою** `zirky/children/${childId}/`.  
> Будь-який запис до неї тригерить `firebase.js onValue` (батьківський слухач).  
> Це коренева причина рекурсивних циклів у цій підсистемі.

---

### Структура нотифікацій

**Повний формат (Full)** — те що генерує `generateNotifications()`:
```js
{
  id:        'task_confirmed_task_123_abc',  // стабільний ключ
  type:      'task_confirmed',
  role:      'child',                        // 'parent' | 'child' | 'both'
  title:     'Завдання підтверджено!',
  body:      'Батьки підтвердили «Математика»',
  createdAt: '2026-07-04T22:20:00+03:00',
  dismissBy: ['checkmark'],                  // кнопки закриття
  badges:    ['star', 'task'],              // іконки у бейджі
  readBy:    { child: '2026-07-04T22:21:00' } | undefined,
  // додаткові поля залежно від типу: daysDiff, days, repeatDays, ...
}
```

**Slim формат** — після компактизації прочитаних нотифікацій:
```js
{
  id, type, role, createdAt, readBy    // тільки 5 полів (SLIM_FIELDS)
}
```

`_toSlim(item)` виконує компактизацію; `_isFullyRead(item)` визначає чи всі ролі прочитали.

---

### Типи нотифікацій

| type | Хто бачить | Коли генерується |
|---|---|---|
| `changelog` | `'both'` | Нова версія changelog |
| `task_request` | `'parent'` | Дитина надіслала бонус на перевірку |
| `task_confirmed` | `'child'` | Батько підтвердив запит |
| `task_rejected` | `'child'` | Батько відхилив запит |
| `login_failed` | `'parent'` | Невдала спроба входу дитини |
| `feedback_new` | `'parent'` | Новий фідбек від дитини |
| `feedback_reply` | `'child'` | Батько відповів на фідбек |
| `feedback_status` | `'child'` | Батько змінив статус фідбеку |
| `feedback_comment` | `'child'` | Батько прокоментував фідбек |
| `achievement` | `'both'` | Дитина досягла нового рівня |
| `backup` | `'parent'` | Давно не було резервної копії (`backup_recurring`) |
| `no_stars` | `'parent'` | Зірки не додавались N діб (`no_stars_recurring`) |
| `streak_risk` | `'both'` | Ризик переривання серії |
| `good_dynamics` | `'both'` | Позитивна динаміка зароблених зірок |
| `goal_close` | `'child'` | Дитина близька до досягнення мети |

**Стабільні (recurring) типи** — мають фіксований ID без дати:
- `backup_recurring` — один запис, перезаписується щодня якщо днів ≥ 7
- `no_stars_recurring` — один запис, перезаписується якщо daysDiff ≥ 2

---

### Ключові функції

#### `generateNotifications()`

Викликається через `document.addEventListener('zirky:dataLoaded', ...)` після кожного `firebase.js onValue`. Читає поточний `state.data` і `_items`, вирішує які нотифікації створити/видалити.

**Захист:** `_generating = true/false` + `try/finally` — запобігає рекурсивному виклику якщо Firebase тригерить `onValue` синхронно під час запису.

**Fallback `_items`:** `firebase.js onValue` (ширший шлях) може спрацювати раніше ніж `notifications.js onValue` (вужчий шлях `notifications_feed`). Якщо `_items` ще порожній — функція заповнює його з `state.data.notifications_feed`, яке вже доступне після `Object.assign` у `firebase.js onValue`. Без цього всі `!_items[id]` повертали `true` і нотифікації перестворювалися з нуля (без `readBy`).

```js
export function generateNotifications() {
    if (_generating) return;   // guard від рекурсії
    _generating = true;
    try {
        // Fallback якщо notifications.js onValue ще не спрацював
        if (Object.keys(_items).length === 0 && state.data?.notifications_feed) {
            Object.values(state.data.notifications_feed).forEach(item => {
                if (item?.id) _items[item.id] = item;
            });
        }
        // ... генерація ...
    } finally {
        _generating = false;   // скидається навіть при винятку
    }
}
```

#### `_upsertItem(item)`

Оновлює кеш і пише нотифікацію у Firebase.

```js
function _upsertItem(item) {
    const existing = _items[item.id];
    // Якщо вміст не змінився — не пишемо (захист від slim↔full циклу)
    if (existing && JSON.stringify(existing) === JSON.stringify(item)) return;
    _items[item.id] = item;
    _saveItem(item);
}
```

> ⚠️ `JSON.stringify` чутливий до порядку ключів. Однакові об'єкти з різним порядком вважатимуться різними. Це безпечна сторона помилки (зайвий write), не небезпечна (пропущений write).

#### `_compactReadItems()`

Викликається з `notifications.js onValue` після кожного оновлення. Конвертує повністю прочитані нотифікації у slim-формат і видаляє застарілі recurring-записи.

```
Умови для компактизації:
  1. Нотифікація НЕ вже slim (є поля поза SLIM_FIELDS)
  2. _isFullyRead(item) === true (всі ролі прочитали)

Умова для видалення (CYCLIC_TYPES):
  - Тип є циклічним (backup, no_stars, streak_risk, ...)
  - Існує новіший anchor-запис того самого типу
```

**Захист:** `_compacting = true/false` + `try/finally` — запобігає рекурсії якщо `update(ref(db, '/'), slim)` тригерить `onValue` синхронно.

---

### Логіка `no_stars_recurring`

Нотифікація «Зірки не додавались» потребує особливої уваги:

```js
const daysDiff = lastEarnDay
    ? Math.round((new Date(today) - new Date(lastEarnDay)) / 86_400_000)
    : 0; // earnRecs порожній → дані ще не завантажені → не генеруємо
```

`daysDiff = 0` якщо `earnRecs` порожній — умова `>= 2` не спрацьовує → нотифікація не з'явиться. Раніше тут було `9999` → `Math.min(9999, 99) = 99` → «99 діб без нових зірок!» при кожному вході до завантаження даних.

**Захист від зайвих write:** якщо `daysDiff` не змінився порівняно з `existing.daysDiff`, зберігаємо `existing.createdAt` → `JSON.stringify` рівний → `_upsertItem` не пише → Firebase не тригерить.

```js
const prevDiff = existing?.daysDiff ?? existing?.days ?? null;
const sameDiff = prevDiff !== null && prevDiff === daysDiff;
if (existing?.readBy && (prevDiff === null || sameDiff)) {
    item.readBy = existing.readBy;   // зберігаємо «прочитано»
}
if (sameDiff && existing?.createdAt) {
    item.createdAt = existing.createdAt;   // ключ до відсутності зайвого write!
}
```

---


#### Навігація по кліку на сповіщення

| Тип | Перехід |
|---|---|
| `good_dynamics` | `__zSwitchTab('stats')` |
| `backup` | `__zSwitchTab('settings')` |
| `task_*`, `feedback_*` | `__zSwitchTab('tasks')` або `'feedback'` |

#### Міграція старих ключів

При завантаженні `initNotificationsListener` автоматично видаляє з Firebase застарілі записи старого формату: `backup_YYYY-MM-DD` і `no_stars_YYYY-MM-DD` → замінені стабільними ключами `backup_recurring` / `no_stars_recurring`.

### Відомі пастки та рішення

#### Пастка 1: slim↔full нескінченний цикл

**Симптом:** 45+ помилок у консолі одразу після входу до профілю; у батьківському режимі — 81+ помилка.

**Причина:**
```
generateNotifications() → _upsertItem(FULL) → _saveItem → Firebase write
    → (sync) notifications.js onValue → _compactReadItems → FULL + fully_read → slim write
    → (sync) firebase.js onValue → dispatchEvent → generateNotifications() → знову FULL
    → (sync) ...  ← нескінченно → Maximum call stack size exceeded
```

Виникає лише для **профілів з нотифікаціями у застарілому форматі** (slim у Firebase, але `generateNotifications` генерує full): `_upsertItem` без JSON-перевірки завжди писав у Firebase незалежно від змін.

**Рішення:** три захисти одночасно:
1. `_generating` guard → блокує повторний вхід у `generateNotifications`
2. `_compacting` guard → блокує повторний вхід у `_compactReadItems`
3. JSON-check в `_upsertItem` → не пише якщо вміст не змінився

#### Пастка 2: `records` як об'єкт Firebase

**Симптом:** `no_stars_recurring` показує «99 діб» хоча дитина заробляла зірки нещодавно.

**Причина:** Firebase Realtime Database може повернути `records` як об'єкт `{0:{...}, 1:{...}}` замість масиву (якщо є дірки в індексах після видалення записів). `Array.prototype.filter()` на об'єкті або не спрацьовує або кидає TypeError → `earnRecs = []` → `lastEarn = null` → `daysDiff = 9999`.

**Рішення:**
```js
const records = Array.isArray(state.data.records)
    ? state.data.records
    : Object.values(state.data.records || {});
```

#### Пастка 3: `notifications_feed` тригерить батьківський `onValue`

`firebase.js onValue` слухає весь `zirky/children/${childId}/`. Будь-який запис до `notifications_feed/` (дочірній шлях) тригерить його. Це означає що будь-який `_saveItem` → `firebase.js onValue` → `dispatchEvent` → `generateNotifications`.

Без захисних guards це призводить до нескінченного циклу навіть при єдиному `_upsertItem` виклику зі зміненим вмістом.

#### Пастка 4: `firebase.js onValue` спрацьовує раніше `notifications.js onValue`

**Симптом:** при вході нотифікації що були прочитані раніше (slim у Firebase) повторно з'являються як нові (без `readBy`). Зокрема всі нотифікації починаючи з певної дати.

**Причина:** підписки реєструються у порядку: спочатку `initNotificationsListener` (на вужчий шлях `notifications_feed`), потім `initChildListener` (на ширший шлях `zirky/children/${childId}/`). Firebase SDK може викликати callback для ширшого шляху раніше — тому `firebase.js onValue` → `dispatchEvent` → `generateNotifications()` спрацьовує **до** того як `notifications.js onValue` заповнив `_items`. Всі `!_items[id]` = `true` → функція перестворює нотифікації з нуля без `readBy`.

**Рішення:** fallback на початку `generateNotifications()`:
```js
if (Object.keys(_items).length === 0 && state.data?.notifications_feed) {
    Object.values(state.data.notifications_feed).forEach(item => {
        if (item?.id) _items[item.id] = item;
    });
}
```

#### Пастка 5: `no_stars_recurring` показує «99 діб» при вході

**Симптом:** при кожному вході спочатку з'являється «99 діб без нових зірок», після закриття модалки — правильна цифра (наприклад «3»).

**Причина:** при першому виклику `generateNotifications()` (до завантаження даних дитини), `earnRecs` порожній → `lastEarn = null` → `daysDiff = 9999` (старе значення) → `Math.min(9999, 99) = 99` → записує нотифікацію з `daysDiff=9999` у Firebase. Другий виклик (після завантаження) генерує правильне значення.

**Рішення:** `daysDiff = 0` коли `lastEarnDay = null` → умова `>= 2` не спрацьовує → нотифікація не генерується до завантаження реальних даних.


## ⚠️ Відомі архітектурні нюанси

| Проблема | Рішення |
|---|---|
| `Firebase exceptionGuard` мовчки ковтає помилки всередині `onValue`-колбеків | Завжди додавати `console.log` на початку колбеку при діагностиці |
| `_getTaskById` повертає spread-копію | Після мутації обов'язково `_updateTaskInCache(task)` |
| `saveAll()` мав використовувати `update()`, а не `set()` | Виправлено: `set()` мовчки видаляв tasks/feedback/notifications при першому запуску |
| Циклічні залежності `firebase.js ↔ notifications.js` | Трекінг listener-а перенесено до `auth.js`; крос-модульні виклики тільки всередині функцій |
| `generateLoginFailedNotif` потребує `_db` і `_subscribedChildId` | Виправлено: fallback на `_fbDb` з firebase.js і `state.activeChildId` при виклику до ініціалізації listener-а |
| `window.refreshActivityModal` реєструється після старту модулів | Виклик через `if (window.refreshActivityModal)` — безпечно, спрацює при наступному `updateUI` |
