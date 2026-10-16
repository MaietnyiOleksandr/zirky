// Спільні елементи дитячої та батьківської довідок

export const VERSION = 'v4.20261016.2344';

import { state } from './state.js';
import { ACHIEVEMENTS } from './config.js';
import { g, achText } from './utils.js';

export const HR = '<hr style="border:none;border-top:1px solid #eee;margin:12px 0">';

export const ACCESS_HELP = `<p>🔐 <b>Вхід через Google</b><br>
    Натисніть «Увійти через Google» та виберіть свій сімейний акаунт.
    Після перевірки доступу виберіть профіль дитини або «Батьки» й введіть PIN, якщо він потрібен.<br>
    Якщо доступ ще не надано, передайте батькам показаний UID. Після додавання акаунта натисніть «Перевірити доступ знову».<br>
    На особистому пристрої вхід зазвичай зберігається. Щоб увійти іншим акаунтом або завершити сеанс на спільному пристрої,
    поверніться до вибору профілю й натисніть «Змінити Google-акаунт». Звичайне перемикання профілю не завершує Google-вхід.</p>
    ${HR}
    <p><b>Google-акаунт, профіль і PIN</b><br>
    Google-акаунт дає доступ до спільного сімейного застосунку. Профіль дитини містить її зірки, завдання й історію.
    PIN використовується всередині застосунку. Усі дозволені Google-акаунти мають однаковий доступ до бази;
    додавання акаунта не створює новий дитячий профіль.</p>
    ${HR}
    <p><b>Як батькам додати користувача</b></p>
    <ol>
        <li>Новий користувач входить у застосунок через свій Google-акаунт і передає батькам показаний <b>UID</b>.</li>
        <li>Батьки відкривають Firebase Console → проєкт <b>zirky-uspihu</b> → <b>Authentication → Users</b>
        та перевіряють, що UID відповідає потрібному email.</li>
        <li>У <b>Realtime Database → Data → familyAccess</b> додають дочірній запис:
        <b>Key (Name)</b> — повний UID користувача, <b>Value</b> — <b>true</b> типу boolean, без лапок.</li>
        <li>Зберігають запис кнопкою <b>Add</b>. Користувач натискає <b>«Перевірити доступ знову»</b> у застосунку.</li>
    </ol>
    <p>Приклад: <code>familyAccess / UID_КОРИСТУВАЧА → true</code>.
    Замість UID_КОРИСТУВАЧА вставте справжній UID, а не email чи ім’я профілю.</p>
    <p>Якщо вузла <b>familyAccess</b> ще немає: у корені бази, поруч із <b>zirky</b>, створіть Key <b>familyAccess</b>,
    залиште Value порожнім, натисніть «+» і додайте всередині UID зі значенням boolean <b>true</b>.
    Потім збережіть структуру. Наявні записи сім’ї та вузол <b>zirky</b> залиште без змін.</p>
    ${HR}
    <p><b>Як керувати доступом</b><br>
    Для кожного нового акаунта додавайте окремий UID у <b>familyAccess</b>.
    Щоб відкликати доступ, видаліть лише запис цього UID або змініть його значення на boolean <b>false</b>.
    Щоб повернути доступ — встановіть boolean <b>true</b>.<br>
    Це не видаляє профіль дитини, зірки чи історію. Керування списком потребує доступу адміністратора до Firebase Console;
    самого входу в застосунок для цього недостатньо. Правила бази для додавання користувачів змінювати не потрібно.</p>
    ${HR}
    <p><b>Якщо увійти не вдається</b><br>
    Перевірте вибраний Google-акаунт, точність UID і тип значення: boolean <b>true</b>, а не рядок «true».
    Після виправлення натисніть «Перевірити доступ знову».<br>
    Якщо вікно Google не відкривається — дозвольте спливні вікна для сайту й повторіть вхід.
    Якщо дитячий акаунт має обмеження Family Link — батькам потрібно перевірити його дозволи.
    Не вмикайте публічний доступ до бази для усунення помилок входу.</p>`;

export const SWIPE_HELP = `<p>👆 <b>Перемикання вкладок свайпами</b><br>
    На сенсорному екрані проведіть пальцем по вмісту вкладки: ліворуч — наступна вкладка, праворуч — попередня.
    На першій та останній вкладках перехід зупиняється.<br>
    Починайте жест подалі від країв екрана, кнопок, полів введення та графіків.
    У відкритих діалогах свайпи вкладок не працюють; горизонтальні таблиці прокручуються окремо.
    Вертикальне гортання сторінки та натискання кнопок вкладок працюють як раніше.</p>`;

// ── Таблиця досягнень — генерується динамічно з ACHIEVEMENTS ──
export function _renderAchTable(childId) {
    const gender = state.parent?.children?.[childId]?.gender || 'girl';

    const GROUPS = [
        { label: '📊 За оцінки',  ids: ['відмінник', 'зіркова', 'тверда_десятка'] },
        { label: '📚 Навчання',   ids: ['старанна', 'мегамозок', 'книголюб', 'читачка'] },
        { label: '🏠 Вдома',      ids: ['помічниця', 'господиня'] },
        { label: '🐈‍⬛ Тваринки',  ids: ['котячий_бог'] },
        { label: '🏸 Активність', ids: ['активна', 'спортсмен'] },
        { label: '🧼 Гігієна',    ids: gender === 'girl' ? ['чистюля', 'красуня'] : ['чистюля'] },
        { label: '🌟 Особливі',   ids: ['fire_streak', 'ощадливий', 'транжира', 'швидкий_старт', 'цілеспрямована'] },
    ];

    const thStyle = 'padding:5px 4px;border-bottom:2px solid var(--border-light);';
    let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;">
<thead><tr style="background:var(--bg);color:var(--secondary);font-weight:700;">
  <th style="${thStyle}text-align:left;">Досягнення</th>
  <th style="${thStyle}text-align:center;">🥉</th>
  <th style="${thStyle}text-align:center;">🥈</th>
  <th style="${thStyle}text-align:center;">🥇</th>
  <th style="${thStyle}text-align:right;">Зірки</th>
</tr></thead><tbody>`;

    for (const group of GROUPS) {
        if (!group.ids.length) continue;
        html += `<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">${group.label}</td></tr>`;
        let alt = false;
        for (const id of group.ids) {
            const ach = ACHIEVEMENTS[id];
            if (!ach) continue;
            const icon    = typeof ach.icon === 'object' ? g(childId, ach.icon) : ach.icon;
            const name    = achText(ach, childId);
            const isRep   = ach.type === 'repeatable_streak';
            const rewards = ach.levels.map(l => `+${l.reward}`).join('/');
            const lvls    = ach.levels;
            const b    = lvls[0]?.target ?? '';
            const s    = lvls[1]?.target ?? '';
            const gold = lvls[2]?.target ?? '';
            const bg = alt ? ' style="background:var(--bg);"' : '';
            html += `<tr${bg}><td style="padding:3px 4px;">${icon} ${name}${isRep ? ' ❗' : ''}</td>
              <td style="text-align:center;">${b}</td>
              <td style="text-align:center;">${s}</td>
              <td style="text-align:center;">${gold}</td>
              <td style="text-align:right;">${rewards}⭐</td></tr>`;
            alt = !alt;
        }
    }
    html += '</tbody></table>';
    return html;
}

