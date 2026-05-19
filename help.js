// ════════════════════════════════════════════════════
// ❓  help.js — Інструкції по розділах
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260519.2150';

import { state } from './state.js';
import { CHANGELOG } from './changelog.js';

const HR = '<hr style="border:none;border-top:1px solid #eee;margin:12px 0">';


const TITLES = {
    addSection:          '➕ Додати',
    scheduleSection:     '📋 Розклад уроків',
    rewardsSection:      '🎁 Витрати',
    achievementsSection: '🏆 Досягнення',
    historySection:      '📜 Історія',
    statsSection:        '📊 Статистика',
    feedbackSection:     '💬 Зворотній зв`язок',
    settingsSection:     '⚙️ Налаштування',
    about:               'ℹ️ Про програму',
    changelog:           '📝 Історія змін',
};

// ════════════════════════════════════════════════════
// 👧 ДИТИНА
// ════════════════════════════════════════════════════
const HELP_CHILD = {

    addSection: `
        <p>Тут ти можеш надсилати запити батькам на нарахування зірок 📨</p>
        <p>💙 Усі твої записи спочатку перевіряють батьки — лише після підтвердження зірки додаються до балансу.</p>
        ${HR}
        <p>📚 <b>Надіслати оцінку</b><br>
        Обери дату, предмет і оцінку. Зірки нарахуються після перевірки батьками.<br>
        Оцінки: 12=5⭐ / 11=4⭐ / 10=3⭐ / 9=2⭐ / 8=1⭐<br>
        📐 Математика — подвійні зірки (×2)</p>
        ${HR}
        <p>📝 <b>Надіслати діагностувальну</b><br>
        Контрольна робота — потрійні зірки (×3)<br>
        📐 Математика — шестикратний бонус (×6)</p>
        ${HR}
        <p>🌟 <b>Надіслати бонус</b> — обирай зі списку категорій:<br>
        📚 Навчання · 🤝 Допомога · 🏠 По дому · 🏸 Активність · 🧼 Гігієна<br>
        <span style="font-size:12px;color:var(--text-muted);">При виборі книги — обов'язково вкажи кількість сторінок</span></p>
        ${HR}
        <p>📨 <b>Що відбувається після надсилання?</b><br>
        Запит з'явиться у розділі <b>✅ Завдання</b> зі статусом <b>⏳ Чекає підтвердження</b>.<br>
        Батьки побачать сповіщення та підтвердять або відхилять його з коментарем.<br>
        Якщо підтверджено — зірки додадуться до балансу, запис з'явиться в Історії.</p>
        ${HR}
        <p>💡 Не надсилай запит двічі за одне досягнення — батьки можуть не зрозуміти</p>
    `,

    historySection: `
        <p>Тут зберігається все що ти заробила і витратила ⭐</p>
        ${HR}
        <p>📅 Перегортай місяці стрілками щоб бачити старі записи<br>
        🟢 Зелені записи — зароблені зірки<br>
        🔴 Червоні записи — витрачені зірки<br>
        ❄️ Записи про канікули — в ці дні серії не перериваються</p>
        ${HR}
        <p>🔍 <b>Фільтри</b> — допомагають знайти потрібні записи:<br>
        📚 <b>Оцінки</b> — можна додатково відфільтрувати по предмету<br>
        📝 <b>Діагностувальні</b> — контрольні роботи<br>
        🌟 <b>Бонуси</b> — Д/З, книги, допомога вдома тощо<br>
        🏆 <b>Зірки за досягнення</b> — бонусні нарахування<br>
        🎨 <b>Теми оформлення</b> — покупки та повернення тем<br>
        🔴 <b>Витрати</b> — час / гроші / особливе списання</p>
        ${HR}
        <p>👨‍👩‍👧 Батьки можуть видаляти записи якщо щось додали помилково</p>
    `,

    rewardsSection: `
        <p>Тут ти можеш обміняти зірки на нагороди! 🎉</p>
        ${HR}
        <p>🎮 <b>Час на смартфоні</b><br>
        Введи скільки хвилин хочеш отримати — і побачиш скільки зірок спишеться.<br>
        Мінімум — одна зірка. Кількість хвилин за одну зірку встановлюють батьки.</p>
        ${HR}
        <p>💵 <b>Гроші</b><br>
        Введи суму в гривнях — і побачиш скільки зірок спишеться.<br>
        Мінімум 50 грн. Курс встановлюють батьки.</p>
        ${HR}
        <p>✨ <b>Особливе списання</b><br>
        Якщо хочеш витратити зірки на щось інше — попроси батьків.<br>
        🔐 Для цього потрібен PIN батьків</p>
        ${HR}
        <p>💰 Перевір чи вистачає зірок — баланс показаний вгорі екрану</p>
    `,

    achievementsSection: `
        <p>Тут твої додаткові нагороди за старання! 🌟</p>
        <p>За кожен рівень досягнення автоматично отримаєш бонусні зірки ⭐</p>
        ${HR}
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;">
<thead><tr style="background:var(--bg);color:var(--secondary);font-weight:700;">
  <th style="padding:5px 4px;text-align:left;border-bottom:2px solid var(--border-light);">Досягнення</th>
  <th style="padding:5px 4px;text-align:center;border-bottom:2px solid var(--border-light);">🥉</th>
  <th style="padding:5px 4px;text-align:center;border-bottom:2px solid var(--border-light);">🥈</th>
  <th style="padding:5px 4px;text-align:center;border-bottom:2px solid var(--border-light);">🥇</th>
  <th style="padding:5px 4px;text-align:right;border-bottom:2px solid var(--border-light);">Зірки</th>
</tr></thead>
<tbody>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">📊 Оцінки</td></tr>
<tr><td style="padding:3px 4px;">🎓 Відмінник</td><td style="text-align:center;">5</td><td style="text-align:center;">20</td><td style="text-align:center;">100</td><td style="text-align:right;">+50/200/1000⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">💫 Зіркова</td><td style="text-align:center;">30</td><td style="text-align:center;">60</td><td style="text-align:center;">120</td><td style="text-align:right;">+10/30/50⭐</td></tr>
<tr><td style="padding:3px 4px;">🏅 Тверда десятка</td><td style="text-align:center;">50</td><td style="text-align:center;">100</td><td style="text-align:center;">200</td><td style="text-align:right;">+10/20/30⭐</td></tr>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">📚 Навчання</td></tr>
<tr><td style="padding:3px 4px;">📝 Старанна</td><td style="text-align:center;">20</td><td style="text-align:center;">60</td><td style="text-align:center;">120</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">🧠 Мегамозок</td><td style="text-align:center;">10</td><td style="text-align:center;">30</td><td style="text-align:center;">90</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr><td style="padding:3px 4px;">📚 Книголюб</td><td style="text-align:center;">5 книг</td><td style="text-align:center;">10</td><td style="text-align:center;">20</td><td style="text-align:right;">+20/40/100⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">📖 Читачка</td><td colspan="3" style="text-align:center;font-size:11px;">300→800→1500→3000→5000→8000 стор.</td><td style="text-align:right;">+30⭐ × 6</td></tr>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">🏠 Вдома</td></tr>
<tr><td style="padding:3px 4px;">🤝 Помічниця</td><td style="text-align:center;">10</td><td style="text-align:center;">30</td><td style="text-align:center;">90</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">🏠 Господиня</td><td style="text-align:center;">20</td><td style="text-align:center;">60</td><td style="text-align:center;">120</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr><td style="padding:3px 4px;">🏸 Активна</td><td style="text-align:center;">7</td><td style="text-align:center;">20</td><td style="text-align:center;">45</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">🧼 Гігієна</td></tr>
<tr><td style="padding:3px 4px;">🦷 Чистюля ❗</td><td style="text-align:center;">5</td><td style="text-align:center;">10</td><td style="text-align:center;">30</td><td style="text-align:right;">+20/50/100⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">🪮 Красуня ❗</td><td style="text-align:center;">3</td><td style="text-align:center;">5</td><td style="text-align:center;">7</td><td style="text-align:right;">+10/20/30⭐</td></tr>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">🌟 Особливі</td></tr>
<tr><td style="padding:3px 4px;">🔥 Fire Streak</td><td style="text-align:center;">7 днів</td><td style="text-align:center;">14</td><td style="text-align:center;">30</td><td style="text-align:right;">+50/100/300⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">💰 Ощадлива</td><td style="text-align:center;">200⭐</td><td style="text-align:center;">500⭐</td><td style="text-align:center;">1000⭐</td><td style="text-align:right;">+10/30/50⭐</td></tr>
<tr><td style="padding:3px 4px;">💸 Транжира</td><td style="text-align:center;">300⭐</td><td style="text-align:center;">700⭐</td><td style="text-align:center;">1000⭐</td><td style="text-align:right;">+10/20/40⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">🚀 Швидкий старт ❗</td><td style="text-align:center;">50⭐</td><td style="text-align:center;">100⭐</td><td style="text-align:center;">150⭐</td><td style="text-align:right;">+5/10/20⭐</td></tr>
<tr><td style="padding:3px 4px;">🎯 Цілеспрямована</td><td style="text-align:center;">1 ціль</td><td style="text-align:center;">2</td><td style="text-align:center;">3</td><td style="text-align:right;">+20/40/60⭐</td></tr>
</tbody></table>
<p style="font-size:11px;color:var(--text-muted);margin-top:4px;">❗ — повторюється після кожного виконання</p>
        ${HR}
        <p>🔥 <b>Fire Streak</b> — заробляй зірки щодня без пропусків у будні.<br>
        Вихідні та канікули серію не скидають 🎉</p>
        ${HR}
        <p>🦷 <b>Чистюля</b> — потрібно 2 записи "зуби" на день<br>
        🪮 <b>Красуня</b> — 1 запис "причесатись" на день<br>
        🚀 <b>Швидкий старт</b> — зірки з початку кожного тижня</p>
    `,

    statsSection: `
        <p>Тут видно як ти стараєшся! 📈</p>
        ${HR}
        <p>📊 <b>Головний графік:</b><br>
        🔵 Синя лінія — зароблені зірки<br>
        🔴 Червона лінія — витрачені зірки<br>
        ❄️ Блакитна зона — канікули<br>
        ⏱️ Перемикай: <b>Тиждень / Місяць / Рік</b> та стрілками ◀ ▶</p>
        ${HR}
        <p>💰 <b>Графік балансу:</b><br>
        Показує скільки зірок було на рахунку кожного дня<br>
        Ростуть — стараєшся 🚀 Падають — витрачаєш 🎮<br>
        ⏱️ Теж перемикай: <b>Тиждень / Місяць / Рік</b></p>
        ${HR}
        <p>🔥 <b>Теплова карта:</b><br>
        Кожен квадратик — один день місяця<br>
        Чим темніший — тим більше зірок того дня<br>
        Колір залежить від місяця: найтемніший = найкращий твій день<br>
        ⭐ <b>Нараховано</b> / 🎮 <b>Витрачено</b> — перемикай вгорі<br>
        Натисни на день — побачиш анімацію</p>
        ${HR}
        <p>📚 <b>Середня оцінка по предметах:</b><br>
        📈 покращились / 📉 знизились / ➡️ стабільно</p>
        ${HR}
        <p>📈 <b>Динаміка оцінок:</b><br>
        Вибери предмет зі списку — побачиш всі оцінки на графіку<br>
        🟢 Зелені точки — оцінки 10-12 / 🟡 Жовті — оцінки 8-9</p>
        ${HR}
        <p>🍩 <b>Звідки мої зірки:</b><br>
        Пончик показує з чого ти найбільше заробляєш<br>
        🎓 Оцінки · 🔬 Діагностичні · 🌟 Бонуси · ✨ Особливі · 🏆 Досягнення<br>
        Натисни на шматочок бонусів — побачиш деталі: 📚 Навчання / 🤝 Допомога / 🏠 По дому / 🏸 Активність / 🧼 Гігієна 🔍<br>
        ⏱️ Перемикай: <b>Тиждень / Місяць / Рік / Увесь час</b></p>
    `,

    scheduleSection: `
        <p>Тут твій розклад уроків на кожен день 📋</p>
        ${HR}
        <p>◀ ▶ <b>Стрілки</b> — перегортай дні тижня<br>
        Між стрілками — день тижня, дата${''/* та номер тижня якщо двотижневий */}</p>
        ${HR}
        <p>👩‍🏫 <b>Натисни на назву уроку</b> — побачиш ім'я вчителя<br>
        🧑‍🏫 <b>Вчителі</b> — повний список вчителів по предметах<br>
        🕐 <b>Дзвінки</b> — час початку і кінця кожного уроку</p>
        ${HR}
        <p>🎭 <b>Гуртки</b> виділені кольором після основних уроків<br>
        Для гуртків вказано час початку та кінця</p>
    `,

    feedbackSection: `
        <p>Тут ти можеш написати батькам 💬</p>
        ${HR}
        <p><b>Як надіслати повідомлення:</b><br>
        1️⃣ Вибери категорію зі списку<br>
        2️⃣ Напиши текст<br>
        3️⃣ Натисни <b>«Надіслати»</b></p>
        ${HR}
        <p>📬 <b>Статуси твоїх повідомлень:</b><br>
        ⏳ <b>Нове</b> — батьки ще не бачили (можна редагувати або видалити)<br>
        🔄 <b>В опрацюванні</b> — батьки займаються<br>
        ✅ <b>Виконано</b> / ❌ <b>Відхилено</b> — відповідь батьків</p>
        ${HR}
        <p>💬 Відповідь батьків з'явиться під твоїм повідомленням з датою.<br>
        Ти можеш додати свій коментар до будь-якого повідомлення.</p>
        ${HR}
        <p>🔔 Нова відповідь батьків — сповіщення у дзвіночку</p>
    `,

    settingsSection: `
        <p>Цей розділ в основному для батьків 👨‍👩‍👧</p>
        ${HR}
        <p>🎨 <b>Теми оформлення</b><br>
        Тут можна купити тему та змінити вигляд застосунку.<br>
        👀 <b>Спробувати</b> — 30 секунд пробного режиму без покупки<br>
        ⭐ <b>Купити</b> — списує зірки та відкриває тему назавжди<br>
        Після покупки кількох тем — можна міксувати елементи в <b>🎛️ Кастомізації</b></p>
        ${HR}
        <p>🔔 <b>Сповіщення</b> (дзвіночок у хедері)<br>
        Нові відповіді батьків, зміни статусу, нові досягнення,<br>
        нагадування про ризик серії та інше.<br>
        🔴 Червона крапка — є нові сповіщення. При відкритті — зникає.</p>
        ${HR}
        <p><b>Також доступно тобі:</b><br>
        📊 Інформація про дані (кнопка у заголовку)<br>
        📤 <b>Експорт</b> — зберегти всі зірки та досягнення у файл<br>
        📥 <b>Імпорт</b> — відновити дані (потрібен PIN батьків)<br>
        🗑️ <b>Скидання</b> — видалити все (потрібен PIN батьків)</p>
        ${HR}
        <p><b>Тільки для батьків:</b><br>
        🔐 Зміна PIN / 💰 Корекція балансу / ⭐ Курси конвертації<br></p>
    `,

    about: `
        <p>⭐ <b>Зірки Успіху</b> — твоя особиста гра досягнень!</p>
        <p>Старайся в школі й вдома — заробляй зірки ⭐<br>
        Витрачай їх на нагороди, які <b>ти сама обираєш</b> 🎁</p>
        ${HR}
        <p>📚 <b>За що даються зірки?</b><br>
        За оцінки в школі та за домашні справи,<br>
        за читання книг, гігієну та особливі вчинки.<br>
        Діагностувальні роботи, та інше</p>
        ${HR}
        <p>🏆 <b>Досягнення</b><br>
        Виконуй завдання — відкривай нагороди й отримуй бонусні зірки!<br>
        17 досягнень: за оцінки, навчання, домашні справи, активність, гігієну та інше.<br>
        Читачка рахує сторінки книг — чим більше читаєш, тим більше рівнів!</p>
        ${HR}
        <p>🔥 <b>Fire Streak</b><br>
        Заробляй зірки кожного буднього дня — і серія зростатиме.<br>
        Вихідні та канікули не перервуть!</p>
        ${HR}
        <p>🎨 <b>Магазин тем</b><br>
        Накопичуй зірки та купуй нові теми оформлення.<br>
        Перед купівлею — 30 секунд пробного режиму безкоштовно 👀<br>
        Маєш кілька тем? Міксуй компоненти у кастомізації 🎛️</p>
        ${HR}
        <p>📊 <b>Статистика та мета</b><br>
        Дивись скільки зірок заробила за тиждень, місяць, рік.<br>
        Постав собі ціль — і йди до неї крок за кроком! 🎯</p>
        ${HR}
        <p>💬 <b>Написати батькам</b><br>
        Є побажання або питання? Надсилай прямо з застосунку.<br>
        Батьки дадуть відповідь, і ти одразу її побачиш.</p>
        <p style="margin-top:12px;"><b>Старайся щодня — і зірок ставатиме все більше!</p>
        <p> а з ними - більше можливостей та розвитку 🚀</b></p>
    `,
};

// ════════════════════════════════════════════════════
// 👨‍👩‍👧 БАТЬКИ
// ════════════════════════════════════════════════════
const HELP_PARENT = {

    addSection: `
        <p>Тут ви можете додавати всі записи для дитини напряму 📝</p>
        <p>💙 У дитячому профілі цей розділ також доступний — але кнопки називаються <b>"Надіслати на перевірку"</b>. Усі дитячі запити чекають на ваше підтвердження у розділі <b>✅ Завдання</b>.</p>
        ${HR}
        <p>📚 <b>Додати оцінку</b><br>
        Оберіть дату, предмет і оцінку — зірки нараховуються автоматично.<br>
        Оцінки: 12=5⭐ / 11=4⭐ / 10=3⭐ / 9=2⭐ / 8=1⭐<br>
        📐 Математика — подвійні зірки (×2) · Оцінки нижче 8 зірок не дають</p>
        ${HR}
        <p>📝 <b>Діагностувальна робота</b><br>
        Потрійний множник для всіх предметів (×3)<br>
        📐 Математика — шестикратний бонус (×6)</p>
        ${HR}
        <p>🌟 <b>Додати бонус</b> — бонуси розділені по категоріях:<br>
        📚 <b>Навчання:</b> Д/З +2⭐ · Важке завдання +5⭐ · Книга +10⭐<br>
        <span style="font-size:12px;color:var(--text-muted);">При виборі книги — вводьте кількість сторінок для досягнення "Читачка"</span><br>
        🤝 <b>Допомога батькам:</b> проста +3⭐ · важка +5⭐<br>
        🏠 <b>Домашні справи:</b> кімната +3⭐ · одяг +3⭐ · ліжко +2⭐ · посуд +3⭐ · готування +5⭐<br>
        🏸 <b>Активність:</b> прогулянка 30+ хв / 6000+ кроків +3⭐ · тренування 60+ хв / 10000+ кроків +5⭐<br>
        🧼 <b>Гігієна:</b> причесатись +5⭐ · зуби +2⭐<br>
        <b>⚠️ Для "Чистюля" — 2 записи "зуби" на один день!</b></p>
        ${HR}
        <p>✨ <b>Особливе нарахування</b> <span style="font-size:12px;color:var(--text-muted);">— доступне лише батькам</span><br>
        Довільний опис і кількість зірок — для нестандартних ситуацій</p>
        ${HR}
        <p>❄️ <b>Канікули</b> <span style="font-size:12px;color:var(--text-muted);">— доступне лише батькам</span><br>
        Позначте період — Fire Streak та серії оцінок не перервуться.<br>
        Якщо дитина заробить зірки під час канікул — серії все одно зростуть.<br>
        Канікули можна редагувати ✏️ або видаляти 🗑️</p>
        ${HR}
        <p>📨 <b>Як обробляти запити дитини?</b><br>
        Запити надходять у розділ <b>✅ Завдання</b> з позначкою <b>📨 Запит від дитини</b>.<br>
        Натисніть <b>✅ Підтвердити</b> — зірки додадуться, запис з'явиться в Історії як звичайне нарахування.<br>
        Натисніть <b>❌ Відхилити</b> — оберіть стандартну причину або напишіть свій коментар, який побачить дитина.</p>
    `,

    historySection: `
        <p>Повна хронологія всіх нарахувань і витрат 📜</p>
        <p>📅 Перемикайте місяці ◀ ▶<br>
        🟢 Зелені — нараховані / 🔴 Червоні — списані / ❄️ Сірі — канікули</p>
        ${HR}
        <p>🔍 <b>Фільтри:</b><br>
        📚 Оцінки / 📝 Діагностувальні — з додатковим фільтром по предмету<br>
        🌟 Бонуси / ✨ Особливі / 🏆 Досягнення<br>
        🔴 Витрати — з фільтром: 🎮 Час / 💵 Гроші / ✨ Особливе / 🎨 Теми<br>
        ❄️ Канікули</p>
        ${HR}
        <p>🗑️ Видалення — тільки в батьківському режимі, баланс перераховується.<br>
        ✏️ Записи канікул можна також редагувати прямо з Історії</p>
        ${HR}
        <p>💡 Заходьте в Історію щонеділі разом з дитиною — чудовий привід похвалити за старання</p>
    `,

    rewardsSection: `
        <p>Тут дитина може самостійно обмінювати зірки на нагороди 🎁</p>
        ${HR}
        <p>🎮 <b>Час на смартфоні</b><br>
        Дитина вводить хвилини — програма рахує зірки автоматично.<br>
        Мінімум — одна зірка.</p>
        ${HR}
        <p>💵 <b>Гроші</b><br>
        Дитина вводить суму в гривнях. Мінімальна сума — 50 грн.</p>
        ${HR}
        <p>✨ <b>Особливе списання</b><br>
        🔐 Якщо дитина ініціює — потрібен PIN батьків.<br>
        Батьки можуть додати самостійно без PIN.</p>
        ${HR}
        <p>⭐ <b>Курси конвертації</b> змінюються в розділі Налаштування.</p>
    `,

    achievementsSection: `
        <p>Система досягнень мотивує дитину до регулярних зусиль 🏆</p>
        <p>За кожен рівень автоматично нараховуються бонусні зірки.<br>
        Досягнення з ❗ можна отримувати повторно.</p>
        ${HR}
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;">
<thead><tr style="background:var(--bg);color:var(--secondary);font-weight:700;">
  <th style="padding:5px 4px;text-align:left;border-bottom:2px solid var(--border-light);">Досягнення</th>
  <th style="padding:5px 4px;text-align:center;border-bottom:2px solid var(--border-light);">🥉 Бронза</th>
  <th style="padding:5px 4px;text-align:center;border-bottom:2px solid var(--border-light);">🥈 Срібло</th>
  <th style="padding:5px 4px;text-align:center;border-bottom:2px solid var(--border-light);">🥇 Золото</th>
  <th style="padding:5px 4px;text-align:right;border-bottom:2px solid var(--border-light);">Бонус</th>
</tr></thead>
<tbody>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">📊 За оцінки</td></tr>
<tr><td style="padding:3px 4px;">🎓 Відмінник</td><td style="text-align:center;">5</td><td style="text-align:center;">20</td><td style="text-align:center;">100</td><td style="text-align:right;">+50/200/1000⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">💫 Зіркова</td><td style="text-align:center;">30</td><td style="text-align:center;">60</td><td style="text-align:center;">120</td><td style="text-align:right;">+10/30/50⭐</td></tr>
<tr><td style="padding:3px 4px;">🏅 Тверда десятка</td><td style="text-align:center;">50</td><td style="text-align:center;">100</td><td style="text-align:center;">200</td><td style="text-align:right;">+10/20/30⭐</td></tr>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">📚 Навчання</td></tr>
<tr><td style="padding:3px 4px;">📝 Старанна</td><td style="text-align:center;">20 Д/З</td><td style="text-align:center;">60</td><td style="text-align:center;">120</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">🧠 Мегамозок</td><td style="text-align:center;">10 завд.</td><td style="text-align:center;">30</td><td style="text-align:center;">90</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr><td style="padding:3px 4px;">📚 Книголюб</td><td style="text-align:center;">5 книг</td><td style="text-align:center;">10</td><td style="text-align:center;">20</td><td style="text-align:right;">+20/40/100⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">📖 Читачка</td><td colspan="3" style="text-align:center;font-size:11px;">6 рівнів: 300→800→1500→3000→5000→8000 стор.</td><td style="text-align:right;">+30⭐ × 6</td></tr>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">🏠 Домашні справи та активність</td></tr>
<tr><td style="padding:3px 4px;">🤝 Помічниця</td><td style="text-align:center;">10</td><td style="text-align:center;">30</td><td style="text-align:center;">90</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">🏠 Господиня</td><td style="text-align:center;">20 справ</td><td style="text-align:center;">60</td><td style="text-align:center;">120</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr><td style="padding:3px 4px;">🏸 Активна</td><td style="text-align:center;">7 виходів</td><td style="text-align:center;">20</td><td style="text-align:center;">45</td><td style="text-align:right;">+30/70/150⭐</td></tr>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">🧼 Гігієна</td></tr>
<tr><td style="padding:3px 4px;">🦷 Чистюля ❗</td><td style="text-align:center;">5 днів</td><td style="text-align:center;">10</td><td style="text-align:center;">30</td><td style="text-align:right;">+20/50/100⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">🪮 Красуня ❗</td><td style="text-align:center;">3 дні</td><td style="text-align:center;">5</td><td style="text-align:center;">7</td><td style="text-align:right;">+10/20/30⭐</td></tr>
<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">🌟 Особливі</td></tr>
<tr><td style="padding:3px 4px;">🔥 Fire Streak</td><td style="text-align:center;">7 днів</td><td style="text-align:center;">14</td><td style="text-align:center;">30</td><td style="text-align:right;">+50/100/300⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">💰 Ощадливий</td><td style="text-align:center;">200⭐</td><td style="text-align:center;">500⭐</td><td style="text-align:center;">1000⭐</td><td style="text-align:right;">+10/30/50⭐</td></tr>
<tr><td style="padding:3px 4px;">💸 Транжира</td><td style="text-align:center;">300⭐</td><td style="text-align:center;">700⭐</td><td style="text-align:center;">1000⭐</td><td style="text-align:right;">+10/20/40⭐</td></tr>
<tr style="background:var(--bg);"><td style="padding:3px 4px;">🚀 Швидкий старт ❗</td><td style="text-align:center;">50⭐/тиж</td><td style="text-align:center;">100⭐</td><td style="text-align:center;">150⭐</td><td style="text-align:right;">+5/10/20⭐</td></tr>
<tr><td style="padding:3px 4px;">🎯 Цілеспрямована</td><td style="text-align:center;">1 ціль</td><td style="text-align:center;">2</td><td style="text-align:center;">3</td><td style="text-align:right;">+20/40/60⭐</td></tr>
</tbody></table>
<p style="font-size:11px;color:var(--text-muted);margin-top:4px;">❗ — досягнення повторюються після кожного виконання</p>
        ${HR}
        <p>🎯 <b>Цілеспрямована</b> — після досягнення встановіть нову мету на головній.<br>
        🔥 <b>Fire Streak</b> — рахуються лише будні. Вихідні та ❄️ канікули серію не скидають.<br>
        🦷 <b>Чистюля</b> — потрібно <b>2 записи "зуби"</b> на один день.<br>
        📖 <b>Читачка</b> — кількість сторінок вводиться при додаванні бонусу "Прочитала книгу".</p>
    `,

    statsSection: `
        <p>Аналітика прогресу дитини за різні періоди 📊</p>
        ${HR}
        <p>📈 <b>Головний графік</b><br>
        🔵 Синя — зароблені / 🔴 Червона — витрачені<br>
        ❄️ Сіра зона — канікули<br>
        Перемикайте: <b>Тиждень / Місяць / Рік</b> та стрілками ◀ ▶</p>
        ${HR}
        <p>💰 <b>Графік балансу</b><br>
        Показує накопичений баланс на кінець кожного дня/місяця<br>
        Корисно бачити загальну динаміку: чи зростає баланс або дитина активно витрачає<br>
        Перемикайте: <b>Тиждень / Місяць / Рік</b> та стрілками ◀ ▶</p>
        ${HR}
        <p>🔥 <b>Теплова карта активності</b><br>
        Сітка з квадратиків — кожен день місяця<br>
        Темніший квадратик = більше зірок того дня<br>
        Шкала динамічна: найтемніший колір = максимум саме цього місяця<br>
        Перемикач <b>⭐ Нараховано / 🎮 Витрачено</b> — окремі карти для доходів і витрат<br>
        Колір змінюється з темою оформлення<br>
        Натисніть на день — побачите кількість зірок, через 3 секунди повернеться номер<br>
        Внизу: загальна сума, кількість активних днів, найкращий день і тиждень</p>
        ${HR}
        <p>📚 <b>Середня оцінка по предметах</b><br>
        Показує середній бал і тренд порівняно з попереднім місяцем<br>
        📈 Покращились / 📉 Знизились / ➡️ Стабільно</p>
        ${HR}
        <p>📉 <b>Динаміка оцінок по предмету</b><br>
        Оберіть предмет — побачите всі оцінки на графіку<br>
        При великій кількості точок — агрегація по тижнях автоматично</p>
        ${HR}
        <p>🍩 <b>Розподіл зірок по джерелах</b><br>
        Кругова діаграма: частка кожного типу нарахувань за обраний період<br>
        Натисніть на сегмент — дриллдаун по підкатегоріях:<br>
        🎓 <b>Оцінки</b> / 🔬 <b>Діагностичні</b> → розбивка по предметах<br>
        🌟 <b>Бонуси</b> → 📚 Навчання / 🤝 Допомога / 🧼 Гігієна / 🏠 По дому / 🏸 Активність<br>
        🏆 <b>Досягнення</b> → по типах досягнень<br>
        ✨ <b>Особливі</b> — без підкатегорій (довільні нарахування)<br>
        Перемикайте: <b>Тиждень / Місяць / Рік / Увесь час</b> та стрілками ◀ ▶</p>
        ${HR}
        <p>💡 Переглядайте статистику разом з дитиною раз на тиждень</p>
    `,

    scheduleSection: `
        <p>Розклад уроків дитини на тиждень 📋</p>
        ${HR}
        <p>◀ ▶ — гортайте дні тижня<br>
        Між стрілками — день, дата та номер тижня (якщо двотижневий розклад)</p>
        ${HR}
        <p>🧑‍🏫 <b>Вчителі</b> — редагуйте ПІБ вчителів по предметах та класного керівника.<br>
        Редагувати можуть і батьки, і дитина.<br>
        🕐 <b>Дзвінки</b> — встановіть час початку і кінця кожного уроку</p>
        ${HR}
        <p><b>Тільки для батьків:</b><br>
        ✏️ <b>Редагувати розклад</b> — виберіть день, додайте урок зі списку предметів<br>
        Якщо розклад двотижневий — перемикайте між тижнем А та Б<br>
        🎭 <b>Гуртки</b> — додайте гуртки з часом початку/кінця<br>
        📚 <b>Предмети та гуртки</b> — керуйте списком предметів (назва, іконка, подвійні зірки)<br>
        та гуртків (назва, іконка)</p>
        ${HR}
        <p>💡 Зміна списку предметів одразу оновлює форму «Додати+» та фільтри в Історії</p>
    `,

    feedbackSection: `
        <p>Повідомлення від дитини — побажання, запитання, зауваження 💬</p>
        ${HR}
        <p>🔴 Червоний бейдж на табі — є нові непрочитані повідомлення</p>
        ${HR}
        <p><b>Як опрацьовувати:</b><br>
        1️⃣ Натисніть на статус повідомлення → оберіть новий зі списку<br>
        2️⃣ Залиште коментар — дитина одразу побачить відповідь з датою<br>
        3️⃣ Коментар можна редагувати ✏️ або видалити 🗑️</p>
        ${HR}
        <p>📬 <b>Статуси:</b><br>
        ⏳ <b>Нове</b> — дитина може редагувати або видалити<br>
        🔄 <b>В опрацюванні</b> — ви зайнялись питанням<br>
        ✅ <b>Виконано</b> / ❌ <b>Відхилено</b></p>
        ${HR}
        <p>🗑️ Повідомлення можна видалити — з підтвердженням<br>
        🔔 Нове повідомлення або коментар дитини — сповіщення у дзвіночку</p>
    `,

    settingsSection: `
        <p>Керування даними та параметрами програми ⚙️</p>
        ${HR}
        <p>📊 <b>Інформація про дані</b> (кнопка 📊 у заголовку)<br>
        Відкриває модальне вікно з деталями:<br>
        • Кількість записів, баланс, досягнення, канікули<br>
        • Зворотній зв'язок: кількість повідомлень, нових та виконаних<br>
        • Теми: куплені, активна у дитини та батьків<br>
        • 👧 Активність дитини: час прямого входу та входу після невірного PIN<br>
        • Таблиця версій усіх файлів програми</p>
        ${HR}
        <p>🔔 <b>Сповіщення</b> (дзвіночок у хедері)<br>
        Нові сповіщення для батьків:<br>
        💬 Нове повідомлення від дитини / ✏️ Новий або змінений коментар дитини<br>
        🏆 Нові досягнення / 📝 Нова версія програми<br>
        🔥 Ризик серії (будній день, після 16:00, немає зірок)<br>
        ⭐ Зірки не додавались більше доби / 🎯 Ціль близько (<10%)<br>
        📈 Хороша динаміка тижня / 💾 Нагадування про резервну копію (7 днів)<br>
        При відкритті — всі сповіщення позначаються прочитаними</p>
        ${HR}
        <p>🎨 <b>Теми оформлення</b><br>
        Дитина купує теми самостійно за зірки.<br>
        Батьки мають <b>окрему тему</b> — незалежно від дитячої.<br>
        👀 <b>Спробувати</b> — 30 секунд пробного режиму (без купівлі)<br>
        ⭐ <b>Купити</b> — списує зірки, тема стає доступною назавжди<br>
        🎛️ <b>Кастомізація</b> — якщо куплено кілька тем, міксуйте компоненти<br>
        ↩️ <b>Повернення</b> — батьки можуть повернути куплену тему через PIN<br>
        🛠️ <b>Режим розробника</b> — всі теми для тестування без запису в Firebase<br>
        Куплені теми, активна тема та кастомізація зберігаються у Firebase і резервній копії</p>
        ${HR}
        <p>🔐 <b>PIN-код</b><br>
        Захищає батьківський режим. При невірному PIN — автоматичний вхід як Дитина.<br>
        <b>⚠️ Якщо забудете PIN — доступ до батьківського режиму буде закрито</b></p>
        ${HR}
        <p>💰 <b>Корекція балансу</b><br>
        Тільки для виправлення помилок. Не впливає на записи в Історії.</p>
        ${HR}
        <p>⭐ <b>Курси конвертації</b><br>
        🎮 Хвилин за 1⭐ / 💵 Гривень за 1⭐<br>
        Після збереження одразу застосовуються у Витратах</p>
        ${HR}
        <p>📤 <b>Експорт резервної копії</b><br>
        Зберігає всі дані у файл JSON: записи, баланс, досягнення, теми, налаштування.<br>
        <b>Рекомендується робити щотижня!</b></p>
        ${HR}
        <p>📥 <b>Імпорт резервної копії</b><br>
        <b>⚠️ Повністю замінює всі поточні дані!</b><br>
        Корисно при переході на новий пристрій або після збою</p>
        ${HR}
        <p>🗑️ <b>Скидання всіх даних</b><br>
        <b>⚠️ Дія незворотна! Зробіть експорт перед скиданням</b></p>
    `,

    about: `
        <p>⭐ <b>Зірки Успіху</b> — гейміфікована система мотивації для школярів</p>
        <p>Це не просто трекер оцінок. Це повноцінна платформа, де реальні досягнення
        дитини перетворюються на зірки, зірки — на нагороди,
        а нагороди — на звичку старатися та досягати успіхів.</p>
        ${HR}
        <p>📚 <b>Нарахування зірок</b><br>
        Оцінки 8–12 балів з автоматичним підрахунком. Подвійний множник за математику,
        потрійний за діагностувальні роботи. Бонуси за домашні справи, читання, гігієну.
        Особливе нарахування — для всього нестандартного.</p>
        ${HR}
        <p>🎁 <b>Нагороди</b><br>
        Час на смартфоні, кишенькові гроші або довільна нагорода — дитина витрачає зірки
        самостійно. Курси конвертації налаштовуються батьками.</p>
        ${HR}
        <p>🏆 <b>17 досягнень</b><br>
        Кожне досягнення — від 3 до 6 рівнів з автоматичними бонусними зірками.<br>
        📊 Оцінки: Відмінник / Зіркова / Тверда десятка<br>
        📚 Навчання: Старанна / Мегамозок / Книголюб / Читачка (6 рівнів, рахує сторінки)<br>
        🏠 Вдома: Помічниця / Господиня / Активна<br>
        🧼 Гігієна: Чистюля ❗ / Красуня ❗<br>
        🌟 Особливі: Fire Streak / Ощадливий / Транжира / Швидкий старт ❗ / Цілеспрямована</p>
        ${HR}
        <p>🎨 <b>Магазин тем оформлення</b><br>
        Дитина купує теми за накопичені зірки — додаткова мотивація не витрачати все
        одразу. 30 секунд пробного режиму перед купівлею. Кастомізація компонентів між
        купленими темами. Батьківський профіль має власну незалежну тему.</p>
        ${HR}
        <p>📊 <b>Статистика та аналітика</b><br>
        Графіки зароблених і витрачених зірок за тиждень/місяць/рік. Середні оцінки по
        предметах з трендами. Динаміка оцінок по кожному предмету окремо.</p>
        ${HR}
        <p>📋 <b>Розклад</b><br>
        Повний розклад уроків з підтримкою однотижневого та двотижневого режиму.
        Гуртки з часом, ПІБ вчителів, час дзвінків.</p>
        ${HR}
        <p>🔔 <b>Центр сповіщень</b><br>
        Автоматичні нагадування для батьків і дитини: ризик серії, ціль близька, хороша
        динаміка тижня, нові досягнення, резервна копія. Окремий потік для кожного профілю.</p>
        ${HR}
        <p>💬 <b>Зворотній зв'язок</b><br>
        Дитина надсилає повідомлення прямо з застосунку. Статуси, коментарі, відповіді —
        і сповіщення при кожній зміні.</p>
        ${HR}
        <p>❄️ <b>Канікули</b><br>
        Freeze-режим: Fire Streak та серії оцінок не перерваються. Якщо дитина зароблює
        зірки під час канікул — серії все одно зростають.</p>
        ${HR}
        <p>☁️ <b>Технічно</b><br>
        Дані в хмарі Firebase — синхронізуються між усіма пристроями, не зникнуть при
        очищенні браузера. Резервні копії у JSON. Не потребує встановлення.</p>
    `,
};

function renderChangelogHTML() {
    return CHANGELOG.map((entry, i) => `
        ${i > 0 ? '<hr style="border:none;border-top:1px solid #eee;margin:0 0 14px;">' : ''}
        <div style="margin-bottom:14px;">
            <div style="font-weight:700; color:var(--secondary); margin-bottom:5px;">
                ${entry.version}
                <span style="font-size:12px; color:var(--text-hint); font-weight:400; margin-left:6px;">${entry.date}</span>
            </div>
            <ul style="margin:0; padding-left:18px; line-height:1.75; font-size:13px;">
                ${entry.changes.map(c => `<li>${c}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

export function showHelp(sectionId) {
    const modal   = document.getElementById('helpModal');
    const title   = document.getElementById('helpModalTitle');
    const content = document.getElementById('helpModalContent');

    title.textContent = TITLES[sectionId] || '❓ Довідка';

    if (sectionId === 'changelog') {
        content.innerHTML = renderChangelogHTML();
        // Позначаємо changelog прочитаним через notifications.js
        if (window.markChangelogRead) window.markChangelogRead();
    } else {
        const texts = state.data.isParent ? HELP_PARENT : HELP_CHILD;
        content.innerHTML = texts[sectionId] || '<p>Інформація відсутня</p>';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeHelp() {
    document.getElementById('helpModal').style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('helpModal');
    if (e.target === modal) closeHelp();
});