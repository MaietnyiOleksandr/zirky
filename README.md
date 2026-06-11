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

2. **Видавати** тільки змінені файли
3. **Перед кодуванням** — запитати підтвердження (крім прямих завдань)
4. **Думати** українською
5. **На початку чату** — завантажити архів з актуальною версією
6. **Мінімум інлайн стилів** — вигляд керується CSS-змінними і `data-*` атрибутами; інлайн style лише для динамічних значень що не можна передати інакше (наприклад `--profile-color`)

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
| `config.js` | Firebase конфіг, `ACHIEVEMENTS` (з `gender`, `id`), `gradeToStars`, `conversionRates` |
| `firebase.js` | Ініціалізація DB, `initParentData()`, `initChildListener()`, `saveAll()`, `saveRecords()` та ін. |
| `auth.js` | Вхід батьків (PIN) / дитини, мульти-профільна логіка, блокування PIN |
| `navigation.js` | `switchTab()`, `showForm()`, обробка подій `zirky:*` |
| `ui.js` | `updateUI()`, `applyProfileVisibility()` — загальне оновлення інтерфейсу |
| `records.js` | `commitRecord()` — єдина точка входу для додавання запису |
| `tasks.js` | Завдання батьків + запити дитини, рендер, фільтри (+ фільтр по childId) |
| `rewards.js` | Магазин винагород, витрати зірок |
| `achievements.js` | `recalculateAchievements()`, `migrateAchievementIds()`, стріки, gender-фільтрація |
| `stats.js` | Графіки, теплова карта, донат, баланс-динаміка |
| `compare.js` | Порівняльна статистика всіх профілів (тільки для батька) |
| `schedule.js` | Розклад занять |
| `history.js` | Історія записів, фільтри, навігація по місяцях |
| `notifications.js` | Генерація сповіщень на профіль, `initNotificationsListener()` |
| `appearance.js` | Теми, компоненти, рамка профілю, `applyAppearance()`, `applyActiveBorder()` |
| `settings.js` | Налаштування, профілі дітей, резервне копіювання, конвертація |
| `help.js` | Довідка, гендерні підписи через `G()` |
| `changelog.js` | Журнал змін |
| `subjects.js` | Предмети та гуртки, `buildSubjectSelects()` |
| `goals.js` | Мета накопичення, `saveGoal()`, `renderGoal()` |
| `freeze.js` | Канікули/заморозка стріку, `addFreezePeriod()` |
| `feedback.js` | Фідбек дитини → батько, фільтри (+ фільтр по childId), кеш по всіх профілях |
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
      → initChildListener()      ← підписка на zirky/children/${childId}/
      → initTasksListener()      ← підписка на tasks/
      → initFeedbackListener()   ← підписка на feedback/
      → initNotificationsListener()
    → updateUI() + zirky:dataLoaded
```

---

## ⚧ Гендерна система

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
// Використовується для гендерних підписів у довіднику
```

**Правило застосування:**
Будь-який модуль що рендерить текст для дитини — `tasks.js`, `help.js`, `ui.js`, `rewards.js` тощо — **зобов'язаний** використовувати `g(state.activeChildId, ...)` замість хардкодженого жіночого або чоловічого роду.
- ✅ `g(state.activeChildId, 'Виконав', 'Виконала')`
- ✅ `G('зробив', 'зробила')` — у `help.js` де `G` вже визначено
- ❌ Хардкодити `'Виконала'`, `'впевнена'`, `'передумала'` тощо

Для батьківського тексту де дитина — третя особа, використовувати нейтральну форму (`виконано`, `відмовилась від завдання`) без `g()`.

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

```
commitRecord(recordData)
  1. Видалити undefined-поля
  2. state.data.records.push(record)
  3. Оновити state.data.balance
  4. checkGoalReached()
  5. Зберегти levelsBefore
  6. recalculateAchievements()
  7. giveRewardsForNewAchievements(levelsBefore)
  8. checkWeeklyAchievements()
  9. saveRecords()
  10. updateUI()
```

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
| `instructions` | Довідка (`guide` → alias) |

**Програмне перемикання:**
```js
document.dispatchEvent(new CustomEvent('zirky:switchTab', { detail: 'history' }));
document.dispatchEvent(new CustomEvent('zirky:showForm',  { detail: 'freeze' }));
document.dispatchEvent(new CustomEvent('zirky:dataLoaded'));  // після приходу даних Firebase
```

---

## 🎨 Система тем (appearance.js)

Дитина купує тему цілком, потім може міксувати компоненти куплених тем.

**Активна тема:**
```js
state.data.appearance.child.active  = { theme, palette, font, buttons, background, badge }
state.data.appearance.parent.active = { theme, palette, font, buttons, background, badge }
```

**Рамка профілю** — зберігається у `state.parent.children[childId].border`:
```js
border: {
  line:            'solid' | 'dashed' | 'dotted' | ...   // стиль лінії
  animation:       'none'  | 'pulse'  | 'rainbow' | ...  // анімація
  ownedAnimations: []                                     // куплені анімації
}
```
Застосовується через `applyActiveBorder(childId)` → CSS-атрибути `data-border-line`, `data-border-animation`, `--profile-color`.

**Декоративні теми** (`decorated: true` у палітрі):
- Виставляють `html[data-decorated="true"]`
- CSS-змінні `--decor-*` задають зображення для слотів: `tasks`, `rewards`, `schedule`, `stats`, `settings`, `themes`, `guide`, `add`, `empty-tasks`, `empty-history`, `empty-feedback`, `help-achievements`, `notif-top`, `notif-bottom`
- У `style.css` вже є всі селектори — нічого там не змінювати

**Щоб додати нову тему:** запис у `THEMES` + запис у `COMPONENTS` в `appearance.js`.

---

## 💰 Баланс — неочевидно!

`state.data.balance` **не є** джерелом правди.  
Реальний баланс живе в `state.data.achievements.counters._runningBalance` — перераховується щоразу в `recalculateAchievements()`. `state.data.balance` оновлюється з нього після кожного перерахунку.

---

## 🕐 Дати — неочевидно!

| Тип запису | Поле `date` | Причина |
|---|---|---|
| Оцінки, бонуси, спеціальні | `input.value + 'T12:00:00'` | Батько може вносити заднім числом |
| Витрати (`spend`) | `nowKyiv()` | Реальний момент покупки |
| Досягнення | `nowKyiv()` | Автоматичні |

`id: Date.now()` — завжди реальний Unix-timestamp. Сортування в `history.js` порівнює лише `date.slice(0,10)`, а для записів одного дня сортує за `id`.

---

## 🏆 Досягнення — типи

| type | Логіка |
|---|---|
| `cumulative` | Лічильник по `counterKey` в записах |
| `streak` | Дні підряд (з урахуванням `freezePeriods`) |
| `repeatable_streak` | Стрік що скидається і перезапускається (зуби, волосся, зарядка) |
| `weekly` | Зірки за поточний тиждень |
| `balance` | Поточний баланс |
| `goal_counter` | Лічильник досягнутих цілей |

---

## 🔌 ES модулі → window

`index.html` має один `<script type="module">` який імпортує всі функції і виставляє їх на `window`. Нові функції що викликаються з HTML **обов'язково** треба додавати до цього списку.

---

## 📋 Структура завдання (task)

```js
{
  id:          'task_<timestamp>_<random>',
  origin:      'child_request' | 'parent_task',
  status:      'pending' | 'active' | 'done' | 'confirmed' | 'rejected',
  category:    String,
  title:       String,
  stars:       Number,
  date:        'YYYY-MM-DD',
  createdAt:   nowKyiv(),
  childId:     'child_1',        // до якого профілю належить
}
```

