# ⭐ Зірки Успіху — README

> Цей файл — швидкий довідник по архітектурі проекту.  
> Покладається у корінь архіву разом з іншими файлами.

---

## 🗂 Загальний опис

Веб-застосунок для мотивації дитини: батьки нараховують зірки за оцінки та поведінку, дитина витрачає їх на винагороди. Один HTML-файл + ES-модулі + Firebase Realtime Database. Без фреймворків, без збірника.

**Стек:** Vanilla JS (ES modules), Firebase 10.7.1 (Realtime DB), CSS custom properties  
**Хостинг:** будь-який статичний (файли відкриваються напряму)

---

## 📁 Структура файлів

| Файл | Відповідальність |
|---|---|
| `index.html` | Весь HTML + `<script type="module">` що імпортує все і виставляє `window.*` |
| `style.css` | Всі стилі, CSS-змінні, теми, декор-селектори |
| `state.js` | Єдиний спільний об'єкт `state` — всі модулі читають/пишуть його |
| `config.js` | Firebase конфіг, `ACHIEVEMENTS`, `gradeToStars`, `conversionRates` |
| `firebase.js` | Ініціалізація DB, `initFirebase()`, `saveRecords()`, `saveAppearance()` та ін. |
| `auth.js` | Вхід батьків (PIN) / дитини, `state.data.isParent` |
| `records.js` | `commitRecord()` — єдина точка входу для додавання запису |
| `tasks.js` | Завдання батьків + запити дитини, рендер, фільтри |
| `rewards.js` | Магазин винагород, витрати зірок |
| `achievements.js` | `recalculateAchievements()`, перевірка рівнів, стріки, `_runningBalance` |
| `stats.js` | Графіки, теплова карта, донат, баланс-динаміка |
| `schedule.js` | Розклад занять |
| `history.js` | Історія записів, фільтри, навігація по місяцях |
| `notifications.js` | Генерація сповіщень, значки, `generateNotifications()` |
| `navigation.js` | `switchTab()`, `showForm()`, обробка подій `zirky:*` |
| `appearance.js` | Теми, компоненти, `THEMES`, `COMPONENTS`, `applyTheme()` |
| `settings.js` | Налаштування, резервне копіювання, конвертація |
| `ui.js` | `updateUI()`, `showLoading()` — загальне оновлення інтерфейсу |
| `help.js` | Довідка, `showHelp()`, `closeHelp()` |
| `changelog.js` | Журнал змін, значок нових версій |
| `subjects.js` | Предмети та гуртки, `isDoubleSubject()`, `buildSubjectSelects()` |
| `records.js` | Оцінки, бонуси, діагностика, спеціальні записи, видалення |
| `goals.js` | Мета накопичення, `saveGoal()`, `renderGoal()` |
| `freeze.js` | Канікули/заморозка стріку, `addFreezePeriod()` |
| `utils.js` | `nowKyiv()`, `getTodayDate()`, `pulseElement()`, `migrateAppearance()` |
| `geese/*.webp` | Зображення гусей для декоративної теми «Гуси» |

---

## 🔥 Firebase — структура гілок

```
zirky/                    ← основні дані (onValue слухач в initFirebase)
  records: []             ← всі записи (зірки)
  balance: 0              ← НЕ є джерелом правди — береться з _runningBalance
  pin: '1234'
  goal: { target, label, reached }
  achievements: { counters, streaks, levels, weekly, repeatableHistory, freezePeriods }
  appearance: { child: { owned, active }, parent: { active } }
  schedule: { ... }
  notifications: { ... }
  subjects: [ ... ]
  clubs: [ ... ]
  conversionRates: { minutesPerStar, moneyPerStar }
  backupLastDate: 'YYYY-MM-DD'

zirky-tasks/              ← завдання та запити (окремий onValue в initTasksListener)
  [task.id]: { taskObj }

zirky-feedback/           ← зворотній зв'язок батьки↔дитина
  [item.id]: { feedbackObj }
```

---

## 📝 Структура запису (record)

```js
{
  id:          Date.now(),          // Unix ms — також є точним часом додавання!
  date:        'YYYY-MM-DDT12:00:00', // або nowKyiv() для витрат/досягнень
  type:        'earn' | 'spend' | 'freeze' | 'info',
  category:    'grade' | 'diagnostic' | 'bonus' | 'special' | 'task_reward'
               | 'achievement' | 'correction',
  stars:       Number,
  subject:     String,              // для оцінок
  grade:       String,              // '8'–'12'
  description: String,              // або desc — є обидва варіанти (легасі)
  counterKey:  String,              // для бонусів що рахуються в досягненнях
  pages:       Number,              // для книг
  freezeId:    String,              // для type='freeze'
}
```

---

## ⚡ Пайплайн додавання запису — `commitRecord()`

Всі записи (оцінки, бонуси, підтверджені завдання) проходять **один шлях** через `records.js`:

```
commitRecord(recordData)
  1. Видалити undefined-поля (Firebase не приймає undefined)
  2. state.data.records.push(record)
  3. Оновити state.data.balance (+/-)
  4. checkGoalReached()
  5. Зберегти levelsBefore
  6. recalculateAchievements()   ← перераховує ВСЕ з нуля
  7. giveRewardsForNewAchievements(levelsBefore)
  8. checkWeeklyAchievements()
  9. saveRecords()               ← Firebase
  10. updateUI()
```

---

## 🎭 Режими: батьки / дитина

- `state.data.isParent` — `true` якщо ввійшов через PIN, `false` для дитини
- PIN зберігається у `state.data.pin` (Firebase), за замовчуванням `'1234'`
- Провалений PIN → `enterAsChild('pin_failed')` (дитина входить автоматично)
- Деякі кнопки/функції рендеряться лише при `isParent === true`

---

## 🗂 Таби навігації

`switchTab(tabName)` активує секцію `#{tabName}Section` і викликає відповідний render.

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
| `settings` | Налаштування (включає магазин тем) |
| `instructions` | Довідка (`guide` → alias) |

**Програмне перемикання:**
```js
document.dispatchEvent(new CustomEvent('zirky:switchTab', { detail: 'history' }));
document.dispatchEvent(new CustomEvent('zirky:showForm',  { detail: 'freeze' }));
```

---

## 🎨 Система тем (appearance.js)

Кожна тема = набір компонентів: `palette`, `font`, `buttons`, `background`, `badge`.  
Дитина купує тему цілком, потім може міксувати компоненти куплених тем.

**Активна тема зберігається:**
```js
state.data.appearance.child.active  = { theme, palette, font, buttons, background, badge }
state.data.appearance.parent.active = { theme, palette, font, buttons, background, badge }
```

**Декоративні теми** (`decorated: true` у палітрі):
- Виставляють `html[data-decorated="true"]`
- CSS-змінні `--decor-*` задають зображення для слотів: `tasks`, `rewards`, `schedule`, `stats`, `settings`, `themes`, `guide`, `add`, `empty-tasks`, `empty-history`, `empty-feedback`, `help-achievements`, `notif-top`, `notif-bottom`
- У `style.css` вже є всі потрібні селектори — нічого там не змінювати

**Щоб додати нову тему:** запис у `THEMES` + запис у `COMPONENTS`.

---

## 💰 Баланс — неочевидно!

`state.data.balance` **не є** джерелом правди.  
Реальний баланс живе в:
```js
state.data.achievements.counters._runningBalance
```
Він перераховується щоразу в `recalculateAchievements()` — прохід по всіх записах.  
`state.data.balance` оновлюється з нього після кожного перерахунку.  
Це захист від розбіжностей при синхронізації Firebase.

---

## 🕐 Дати — неочевидно!

Два різних підходи в залежності від типу запису:

| Тип запису | Поле `date` | Причина |
|---|---|---|
| Оцінки, бонуси, спеціальні | `input.value + 'T12:00:00'` | Батько може вносити заднім числом — дата вибирається вручну |
| Витрати (`spend`) | `nowKyiv()` | Прив'язані до реального моменту покупки |
| Досягнення | `nowKyiv()` | Автоматичні — реальний момент отримання |

**`id: Date.now()`** — завжди реальний Unix-мілісекундний timestamp.  
Тому сортування в `history.js` порівнює лише `date.slice(0,10)` (тільки дату),  
а для записів одного дня сортує за `id` — це і є реальний час додавання.

---

## 🔌 ES модулі → window (onclick у HTML)

`index.html` має один `<script type="module">`, який імпортує всі функції і **вручну** виставляє їх на `window`:
```js
window.switchTab = switchTab;
window.commitRecord = commitRecord;
// ... і ще ~80 функцій
```
Це потрібно бо `onclick="..."` у HTML не бачить ES-модульний scope.  
Нові функції що викликаються з HTML **обов'язково** треба додавати до цього списку.

---

## 📋 Структура завдання (task)

```js
{
  id:        'task_<timestamp>_<random>',
  origin:    'child_request' | 'parent_task',
  status:    'pending' | 'active' | 'done' | 'confirmed' | 'rejected',
  category:  String,
  desc:      String,
  stars:     Number,
  date:      'YYYY-MM-DD',          // дата виконання (вибирається у формі)
  createdAt: nowKyiv(),             // реальний час створення
  confirmedAt / rejectedAt / doneAt / declinedAt / updatedAt: nowKyiv()
}
```

---

## 🏆 Досягнення — типи

| type | Логіка |
|---|---|
| `cumulative` | Лічильник по `counterKey` в записах |
| `streak` | Дні підряд з нарахуванням зірок (з урахуванням `freezePeriods`) |
| `repeatable_streak` | Стрік що скидається і перезапускається (зуби, волосся) |
| `weekly` | Зірки за поточний тиждень |
| `balance` | Поточний баланс |
| `goal_counter` | Лічильник досягнутих цілей |

---

## 📐 Правила роботи над проектом

1. **Версія** — оновлювати у кожному зміненому файлі: `v3.YYYYMMDD.HHMM`
2. **Видавати** тільки змінені файли, не весь архів
3. **Перед кодуванням** — запитати підтвердження (крім випадків коли завдання змінити код дається напряму)
4. **Думати** українською
5. **На початку чату** — користувач завантажує архів з актуальною версією
