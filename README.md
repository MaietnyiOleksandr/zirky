# ⭐ Зірки Успіху — README

> Цей файл — швидкий довідник по архітектурі проекту.  
> Покладається у корінь архіву разом з іншими файлами.

---

## 📐 Правила роботи над проектом

1. **Версія** — оновлювати у кожному зміненому файлі:

   | Тип файлу | Де | Формат |
   |---|---|---|
   | `*.js` | `export const VERSION = '...'` | `'vMAJOR.YYYYMMDD.HHMM'` |
   | `index.html` | коментар `<!-- version: ... -->` | `v4.YYYYMMDD.HHMM` |
   | `style.css` | коментар `/* version: ... */` | `v4.YYYYMMDD.HHMM` |

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

## 🔔 Система сповіщень (notifications.js)

`generateNotifications()` — головна функція, викликається після кожної мутації даних. Повністю перегенеровує список з нуля.

**Стабільні ключі (без дати):**

| id | Тип | Тригер |
|---|---|---|
| `backup_recurring` | `backup` | `days >= 7` від останнього бекапу |
| `no_stars_recurring` | `no_stars` | `daysDiff >= 2` без нових зірок |

Ці два сповіщення перезаписують себе при кожному запуску — в Firebase завжди лише один запис кожного типу. `readBy` скидається лише якщо числовий лічильник (`days` / `daysDiff`) збільшився.

**Щоденні/циклічні (з датою в ключі):**

| id-шаблон | Тип | Тригер |
|---|---|---|
| `streak_risk_YYYY-MM-DD` | `streak_risk` | серія під загрозою |
| `good_dynamics_YYYY-MM-DD` | `good_dynamics` | +20% зірок відносно минулого тижня |
| `task_*_${taskId}` | різні | дії з завданнями |
| `login_failed_*` | `login_failed` | невірний PIN |

**Навігація по кліку:**
- `good_dynamics` → `__zSwitchTab('stats')`
- `backup` → `__zSwitchTab('settings')`
- `task_*` → `__zSwitchTab('tasks'/'feedback')`

**Міграція старих ключів:**
При завантаженні `initNotificationsListener` автоматично видаляє з Firebase старі `backup_YYYY-MM-DD` і `no_stars_YYYY-MM-DD` записи.

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

## ⚠️ Відомі архітектурні нюанси

| Проблема | Рішення |
|---|---|
| `Firebase exceptionGuard` мовчки ковтає помилки всередині `onValue`-колбеків | Завжди додавати `console.log` на початку колбеку при діагностиці |
| `_getTaskById` повертає spread-копію | Після мутації обов'язково `_updateTaskInCache(task)` |
| `saveAll()` мав використовувати `update()`, а не `set()` | Виправлено: `set()` мовчки видаляв tasks/feedback/notifications при першому запуску |
| Циклічні залежності `firebase.js ↔ notifications.js` | Трекінг listener-а перенесено до `auth.js`; крос-модульні виклики тільки всередині функцій |
| `generateLoginFailedNotif` потребує `_db` і `_subscribedChildId` | Виправлено: fallback на `_fbDb` з firebase.js і `state.activeChildId` при виклику до ініціалізації listener-а |
| `window.refreshActivityModal` реєструється після старту модулів | Виклик через `if (window.refreshActivityModal)` — безпечно, спрацює при наступному `updateUI` |
