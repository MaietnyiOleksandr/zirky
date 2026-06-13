// ════════════════════════════════════════════════════
// 🔔  notifications.js — Система сповіщень
//     Етап 1: Фундамент — структура + Firebase
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260613.0748';

import { state }    from './state.js';
import { nowKyiv }  from './utils.js';
import { CHANGELOG } from './changelog.js';
import { getFeedbackItems } from './feedback.js';
import { ref, set, update, remove, onValue }
    from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ════════════════════════════════════════════════════
// 📋  КАТАЛОГ ТИПІВ СПОВІЩЕНЬ
//     Щоб додати новий тип — лише тут.
//     badges:    де показувати крапку
//     dismissBy: як прибирати ("checkmark" | "modal" | "tab")
//     repeatDays: null = одноразове, N = повторювати кожні N днів
//     role:      "both" | "parent" | "child"
// ════════════════════════════════════════════════════
export const NOTIF_TYPES = {
    changelog: {
        role:       'both',
        badges:     ['bell', 'changelog', 'settings'],
        dismissBy:  ['checkmark', 'modal'],
        repeatDays: null,
    },
    login_failed: {
        role:       'parent',
        badges:     ['bell', 'settings', 'login-failed'],
        dismissBy:  ['checkmark', 'modal'],
        repeatDays: null,
    },
    achievement: {
        role:       'both',
        badges:     ['bell', 'achievements'],
        dismissBy:  ['checkmark'],
        repeatDays: null,
    },
    feedback_reply: {
        role:       'child',
        badges:     ['bell', 'feedback'],
        dismissBy:  ['checkmark', 'tab'],
        repeatDays: null,
    },
    feedback_status: {
        role:       'child',
        badges:     ['bell', 'feedback'],
        dismissBy:  ['checkmark', 'tab'],
        repeatDays: null,
    },
    feedback_new: {
        role:       'parent',
        badges:     ['bell', 'feedback'],
        dismissBy:  ['checkmark', 'tab'],
        repeatDays: null,
    },
    feedback_comment: {
        role:       'parent',
        badges:     ['bell', 'feedback'],
        dismissBy:  ['checkmark', 'tab'],
        repeatDays: null,
    },
    // ── Завдання ──────────────────────────────────────────
    // Tasks-сповіщення НЕ dismiss-яться при відкритті табу.
    // Замість цього: dismiss-яться при кліку на конкретну картку завдання
    // АБО при зміні статусу (автоматично через _pruneOutdatedTaskNotifs).
    // Кнопка ✓ "Ознайомлена" продовжує працювати як зазвичай.
    task_new: {            // Дитині — батьки створили нове завдання
        role:       'child',
        badges:     ['bell', 'tasks'],
        dismissBy:  ['checkmark'],
        repeatDays: null,
    },
    task_request: {        // Батькам — дитина надіслала запит
        role:       'parent',
        badges:     ['bell', 'tasks'],
        dismissBy:  ['checkmark'],
        repeatDays: null,
    },
    task_done: {           // Батькам — дитина виконала завдання
        role:       'parent',
        badges:     ['bell', 'tasks'],
        dismissBy:  ['checkmark'],
        repeatDays: null,
    },
    task_declined: {       // Батькам — дитина відмовилась
        role:       'parent',
        badges:     ['bell', 'tasks'],
        dismissBy:  ['checkmark'],
        repeatDays: null,
    },
    task_confirmed: {      // Дитині — батьки підтвердили
        role:       'child',
        badges:     ['bell', 'tasks'],
        dismissBy:  ['checkmark'],
        repeatDays: null,
    },
    task_rejected: {       // Дитині — батьки відхилили
        role:       'child',
        badges:     ['bell', 'tasks'],
        dismissBy:  ['checkmark'],
        repeatDays: null,
    },
    task_updated: {        // Дитині — батьки змінили дедлайн/винагороду
        role:       'child',
        badges:     ['bell', 'tasks'],
        dismissBy:  ['checkmark'],
        repeatDays: null,
    },
    good_dynamics: {
        role:       'both',
        badges:     ['bell', 'stats'],
        dismissBy:  ['checkmark'],
        repeatDays: 7,
    },
    streak_risk: {
        role:       'both',
        badges:     ['bell'],
        dismissBy:  ['checkmark'],
        repeatDays: 1,
    },
    no_stars: {
        role:       'both',
        badges:     ['bell'],
        dismissBy:  ['checkmark'],
        repeatDays: 1,
    },
    goal_close: {
        role:       'both',
        badges:     ['bell'],
        dismissBy:  ['checkmark'],
        repeatDays: 1,
    },
    backup: {
        role:       'parent',
        badges:     ['bell', 'settings', 'backup-section'],
        dismissBy:  ['checkmark'],
        repeatDays: 1,
    },
};

// ════════════════════════════════════════════════════
// 🔥  FIREBASE — zirky/children/${childId}/notifications_feed/
// ════════════════════════════════════════════════════

let _db    = null;   // встановлюється з firebase.js через initNotificationsListener(childId, db)
let _subscribedChildId = null;  // childId на який слухає listener — для _saveItem/_removeItem
let _items = {};   // поточний стан: { id: NotifItem }

// 🐛 DEBUG — доступ до _items з консолі браузера
if (typeof window !== 'undefined') window.__notifItems = () => _items;

// Шлях до гілки сповіщень підписаної дитини.
// Використовує _subscribedChildId (встановлюється initNotificationsListener),
// а не state.activeChildId — бо activeChildId може бути тимчасово іншим
// (наприклад при введенні PIN дитини 2 поки підписка на дитину 1).
function _notifPath(childId, key) {
    const cid = childId || _subscribedChildId || state.activeChildId || 'child_1';
    return key
        ? `zirky/children/${cid}/notifications_feed/${key}`
        : `zirky/children/${cid}/notifications_feed`;
}

// Зберегти один запис
function _saveItem(item) {
    set(ref(_db, _notifPath(null, _fbKey(item.id))), item);
}

// Firebase не дозволяє крапки в ключах — замінюємо на тире
function _fbKey(id) { return id.replace(/\./g, '-'); }

// Видалити один запис
function _removeItem(id) {
    remove(ref(_db, _notifPath(null, _fbKey(id))));
    delete _items[id];
}

// Публічна обгортка — для видалення з feedback.js
export function removeNotification(id) {
    _removeItem(id);
}

// Slim-версія запису — маркер "переглянуто", мінімум полів
function _toSlim(item) {
    return {
        id:        item.id,
        type:      item.type,
        role:      item.role || 'both',
        createdAt: item.createdAt || null,
        readBy:    item.readBy   || { parent: null, child: null },
    };
}

// Перевірка чи запис повністю прочитаний
function _isFullyRead(item) {
    const role = item.role || 'both';
    const pr   = !!item.readBy?.parent;
    const cr   = !!item.readBy?.child;
    return role === 'parent' ? pr
         : role === 'child'  ? cr
         : pr && cr;
}

// Компакція: прочитані повні записи → slim або видалення.
// Один батчевий update() замість N окремих set() — щоб onValue не тригерився N разів.
// Для циклічних типів (no_stars, streak_risk тощо): якщо є новіший anchor того ж типу
// і цей запис вже прочитаний → видаляємо (а не слімуємо), бо anchor вже не потрібен.
const CYCLIC_TYPES = new Set(['no_stars','streak_risk','backup','good_dynamics','changelog']);

function _compactReadItems() {
    const SLIM_FIELDS = new Set(['id','type','role','createdAt','readBy']);
    const updates  = {};   // для slim-записів
    const toDelete = [];   // для видалення старих циклічних
    let compacted = 0;

    // Для кожного циклічного типу знаходимо найновіший ID (anchor)
    const newestByType = {};
    CYCLIC_TYPES.forEach(type => {
        const same = Object.values(_items).filter(i => i.type === type);
        if (same.length > 1) {
            newestByType[type] = same.sort((a, b) => b.id.localeCompare(a.id))[0].id;
        }
    });

    Object.values(_items).forEach(item => {
        // Вже slim — пропускаємо
        if (Object.keys(item).every(k => SLIM_FIELDS.has(k))) return;
        if (!_isFullyRead(item)) return;

        // Циклічний і є новіший anchor → видаляємо
        if (CYCLIC_TYPES.has(item.type) && newestByType[item.type] && newestByType[item.type] !== item.id) {
            toDelete.push(item.id);
            delete _items[item.id];
            compacted++;
            return;
        }

        // Інакше → slim
        const slim = _toSlim(item);
        _items[item.id] = slim;
        updates[_notifPath(null, _fbKey(item.id))] = slim;
        compacted++;
    });

    if (toDelete.length > 0) {
        toDelete.forEach(id => remove(ref(_db, _notifPath(null, _fbKey(id)))));
    }
    if (Object.keys(updates).length > 0) {
        update(ref(_db, '/'), updates);
    }
}

// Ініціалізація слухача Firebase.
// Приймає childId і db (переданий з firebase.js щоб уникнути циклічного імпорту).
// Повертає функцію відписки — зберігається у firebase.js._unsubNotifs.
// ════════════════════════════════════════════════════════════
// 🔐  НЕВДАЛИЙ ВХІД
// ════════════════════════════════════════════════════════════

// Генерує сповіщення про невдалу спробу входу.
// who: 'parent' або ім'я дитини (string).
// at:  nowKyiv() — рядок дати/часу.
export function generateLoginFailedNotif(who, at) {
    // Потрібен і _db і _subscribedChildId — якщо listener ще не стартував,
    // сповіщення нема куди зберігати (батько ще не увійшов у свій профіль)
    if (!_db || !_subscribedChildId) return;

    const id = `login_failed_${at.replace(/[:.]/g, '-')}`;

    // Форматуємо дату і час для тексту сповіщення
    const d   = new Date(at);
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const profile = who === 'parent' ? 'батьківського профілю' : `профілю «${who}»`;
    _upsertItem(_makeItem(id, 'login_failed',
        '🔐 Невдала спроба входу',
        `${dateStr} о ${timeStr} — спроба входу до ${profile}`,
        { createdAt: at }
    ));
}

export function initNotificationsListener(childId, db) {
    if (db) _db = db;   // зберігаємо для _saveItem/_removeItem/_compactReadItems
    const cid  = childId || state.activeChildId || 'child_1';
    _subscribedChildId = cid;   // фіксуємо — використовується у _notifPath/_saveItem
    const path = _notifPath(cid);
    const unsub = onValue(ref(_db, path), (snapshot) => {
        // Відновлюємо _items за item.id (не Firebase-ключем, бо в ключах крапки замінені)
        const raw = snapshot.val() || {};
        _items = {};
        Object.values(raw).forEach(item => { _items[item.id] = item; });
        _compactReadItems();
        if (window.updateBadges) window.updateBadges();
    });
    return unsub;
}

// ════════════════════════════════════════════════════
// 🛠️  УТИЛІТИ
// ════════════════════════════════════════════════════

function _kyivNow()   { return nowKyiv(); }
function _kyivToday() { return _kyivNow().split('T')[0]; }

function _fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('uk-UA', {
        timeZone: 'Europe/Kyiv',
        day: '2-digit', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

// Створити новий об'єкт сповіщення
function _makeItem(id, type, title, body, extra = {}) {
    const def = NOTIF_TYPES[type] || {};
    return {
        id,
        type,
        role:      def.role       || 'both',
        badges:    def.badges     || ['bell'],
        dismissBy: def.dismissBy  || ['checkmark'],
        repeatDays: def.repeatDays ?? null,
        title,
        body,
        createdAt: _kyivNow(),
        readBy:    { parent: null, child: null },
        push:      null,   // резерв для майбутніх push-сповіщень
        ...extra,
    };
}

// Перевірити чи сповіщення ще актуальне для цього профілю
function _isUnread(item, role) {
    if (item.role !== 'both' && item.role !== role) return false;
    return !item.readBy?.[role];
}

// ════════════════════════════════════════════════════
// 📥  ГЕНЕРАЦІЯ СПОВІЩЕНЬ
//     Викликається при zirky:dataLoaded.
//     Для кожного типу: детермінований ID,
//     якщо запис вже є — не перезаписуємо (крім reset).
// ════════════════════════════════════════════════════

export function generateNotifications() {
    const today    = _kyivToday();
    const records  = state.data.records || [];
    const earnRecs = records.filter(r => r.type === 'earn' && r.category !== 'achievement');
    const balance  = state.data.balance || 0;

    // ── 1. Changelog ─────────────────────────────────────
    const ver    = CHANGELOG[0]?.version || '';
    const clId   = `changelog_${ver}`;
    if (ver && !_items[clId]) {
        _upsertItem(_makeItem(clId, 'changelog',
            'Нова версія програми',
            `Доступна версія ${ver}`
        ));
    }
    // Старі changelog-записи (не поточна версія) — видаляємо якщо прочитані
    _pruneFullyReadByType('changelog', clId);

    // ── 2. Feedback ───────────────────────────────────────
    // Коротка мітка для сповіщень: title якщо є, інакше перші 35 символів тексту
    const _fbLabel = (item) => item.title
        ? `"${item.title}"`
        : `"${item.text.slice(0, 35)}${item.text.length > 35 ? '…' : ''}"`;

    getFeedbackItems().forEach(item => {
        // Відповідь батьків дитині
        if (item.commentAt) {
            const id = `fb_reply_${item.id}`;
            const existing = _items[id];
            // Нова або оновлена відповідь — скидаємо readBy.child
            if (!existing || existing.createdAt !== item.commentAt) {
                _upsertItem(_makeItem(id, 'feedback_reply',
                    'Відповідь батьків',
                    `До: ${_fbLabel(item)}`,
                    { createdAt: item.commentAt, feedbackId: item.id, readBy: { parent: existing?.readBy?.parent || null, child: null } }
                ));
            }
        }
        // Зміна статусу
        if (item.statusChangedAt) {
            const id = `fb_status_${item.id}`;
            const existing = _items[id];
            if (!existing || existing.createdAt !== item.statusChangedAt) {
                const NAMES = { '⏳': 'Нове', '🔄': 'В опрацюванні', '✅': 'Виконано', '❌': 'Відхилено' };
                _upsertItem(_makeItem(id, 'feedback_status',
                    'Оновлено статус запиту',
                    `${_fbLabel(item)} → ${item.status} ${NAMES[item.status] || ''}`,
                    { createdAt: item.statusChangedAt, feedbackId: item.id, readBy: { parent: existing?.readBy?.parent || null, child: null } }
                ));
            }
        }
        // Новий фідбек від дитини
        if (item.date) {
            const id = `fb_new_${item.id}`;
            if (!_items[id]) {
                // Ім'я дитини — лише у батьківському профілі
                const fbChildId  = item.childId || state.activeChildId;
                const fbMeta     = (state.parent?.children || {})[fbChildId] || {};
                const fbWho      = state.data.isParent && fbMeta.name
                    ? `від ${fbMeta.avatar?.value || '👤'} ${fbMeta.name}: `
                    : '';
                _upsertItem(_makeItem(id, 'feedback_new',
                    'Нове повідомлення',
                    `${fbWho}${item.category} · ${_fbLabel(item)}`,
                    { createdAt: item.date, feedbackId: item.id }
                ));
            }
        }
        // Коментар дитини
        if (item.childCommentAt) {
            const id = `fb_comment_${item.id}`;
            const existing = _items[id];
            if (!existing || existing.createdAt !== item.childCommentAt) {
                _upsertItem(_makeItem(id, 'feedback_comment',
                    'Дитина прокоментувала',
                    `До: ${_fbLabel(item)}`,
                    { createdAt: item.childCommentAt, feedbackId: item.id, readBy: { child: existing?.readBy?.child || null, parent: null } }
                ));
            }
        }
    });

    // ── 3. Завдання та запити ─────────────────────────────
    // Коротка мітка для сповіщень: title + зірки
    const _tkLabel = (t) => `"${(t.title || '').slice(0, 35)}${(t.title || '').length > 35 ? '…' : ''}" · ${t.stars}⭐`;

    const tasks = state.data.tasks || {};
    Object.values(tasks).forEach(t => {
        if (!t || !t.id) return;

        if (t.origin === 'child_request') {
            // Дитячий запит: батькам — task_request (за status='pending')
            if (t.status === 'pending') {
                const id = `task_request_${t.id}`;
                if (!_items[id]) {
                    _upsertItem(_makeItem(id, 'task_request',
                        'Запит від дитини',
                        _tkLabel(t),
                        { createdAt: t.createdAt }
                    ));
                }
            }
            // Підтверджено → дитині
            if (t.status === 'confirmed' && t.confirmedAt) {
                const id = `task_confirmed_${t.id}`;
                if (!_items[id]) {
                    _upsertItem(_makeItem(id, 'task_confirmed',
                        'Запит підтверджено',
                        `${_tkLabel(t)} — зараховано`,
                        { createdAt: t.confirmedAt }
                    ));
                }
            }
            // Відхилено → дитині
            if (t.status === 'rejected' && t.rejectedAt) {
                const id = `task_rejected_${t.id}`;
                if (!_items[id]) {
                    _upsertItem(_makeItem(id, 'task_rejected',
                        'Запит відхилено',
                        `${_tkLabel(t)} — ${t.rejectComment || 'без коментаря'}`,
                        { createdAt: t.rejectedAt }
                    ));
                }
            }
        }

        if (t.origin === 'parent_task') {
            // Нове активне завдання → дитині (task_new)
            if (t.status === 'active' && !t.childComment) {
                const id = `task_new_${t.id}`;
                if (!_items[id]) {
                    _upsertItem(_makeItem(id, 'task_new',
                        'Нове завдання від батьків',
                        _tkLabel(t),
                        { createdAt: t.createdAt }
                    ));
                }
            }
            // Завдання відредаговано батьками → дитині (task_updated)
            // Тільки якщо є lastEditNote і updatedAt
            if ((t.status === 'active' || t.status === 'done') && t.lastEditNote && t.updatedAt) {
                const id = `task_updated_${t.id}`;
                const existing = _items[id];
                // Нове редагування (updatedAt змінився) — оновлюємо сповіщення
                if (!existing || existing.createdAt !== t.updatedAt) {
                    _upsertItem(_makeItem(id, 'task_updated',
                        'Завдання оновлено',
                        `${_tkLabel(t)} — ${t.lastEditNote}`,
                        { createdAt: t.updatedAt, readBy: { child: null, parent: existing?.readBy?.parent || null } }
                    ));
                }
            }
            // Виконано дитиною → батькам (task_done)
            if (t.status === 'done' && t.doneAt) {
                const id = `task_done_${t.id}`;
                if (!_items[id]) {
                    _upsertItem(_makeItem(id, 'task_done',
                        'Дитина виконала завдання',
                        _tkLabel(t),
                        { createdAt: t.doneAt }
                    ));
                }
            }
            // Дитина відмовилась → батькам (task_declined)
            // Статус залишається 'active', але childComment з'являється
            if (t.status === 'active' && t.childComment && t.declinedAt) {
                const id = `task_declined_${t.id}`;
                const existing = _items[id];
                // Нова або оновлена відмова — скидаємо readBy.parent
                if (!existing || existing.createdAt !== t.declinedAt) {
                    _upsertItem(_makeItem(id, 'task_declined',
                        'Дитина відмовилась',
                        `${_tkLabel(t)} — ${t.childComment}`,
                        { createdAt: t.declinedAt, readBy: { child: existing?.readBy?.child || null, parent: null } }
                    ));
                }
            }
        }
    });

    // Прибираємо сповіщення про завдання, які більше неактуальні:
    //   • Завдання видалено з Firebase
    //   • Статус змінився (батьки/дитина відреагували на сповіщення)
    //
    // 🚩 ЗАХИСТ ВІД RACE CONDITION:
    //   Listener-и Firebase для zirky-data, tasks, notifications_feed
    //   стартують паралельно. zirky:dataLoaded може спрацювати раніше, ніж
    //   завантажаться tasks → state.data.tasks буде ще {} і цей блок
    //   видалив би всі tasks-сповіщення назавжди. Тому пропускаємо чистку,
    //   поки не отримано перший відгук tasks-listener-а.
    if (!state.tasksLoaded) {
        // tasks ще не завантажені — чистка відбудеться пізніше, коли
        // initTasks колбек повторно викличе generateNotifications()
    } else {
    Object.keys(_items).forEach(notifId => {
        const m = notifId.match(/^task_(request|done|new|declined|confirmed|rejected|updated)_(.+)$/);
        if (!m) return;
        const notifKind = m[1];
        const taskId    = m[2];
        const t = tasks[taskId];

        // 1. Завдання видалено — прибираємо
        if (!t) {
            _removeItem(notifId);
            return;
        }

        // 2. Статус-залежне прибирання
        // Кожен тип сповіщення живе тільки поки актуальний його стан.
        // Як тільки стан змінився — сповіщення стає неактуальним.
        switch (notifKind) {
            case 'request':
                // Жив поки status === 'pending'. Будь-яка реакція батьків → видалити.
                if (t.status !== 'pending') _removeItem(notifId);
                break;
            case 'done':
                // Жив поки дитина в стані 'done' (чекає підтвердження).
                if (t.status !== 'done') _removeItem(notifId);
                break;
            case 'declined':
                // Жив поки дитина відмовилась (active + childComment).
                if (t.status !== 'active' || !t.childComment) _removeItem(notifId);
                break;
            case 'new':
                // Жив поки нове активне завдання без жодних дій дитини.
                if (t.status !== 'active' || t.childComment) _removeItem(notifId);
                break;
            case 'updated':
                // Жив поки активне/done і є lastEditNote.
                // Зникає коли стан перейшов у confirmed/rejected.
                if (t.status === 'confirmed' || t.status === 'rejected') _removeItem(notifId);
                break;
            case 'confirmed':
                if (t.status !== 'confirmed') _removeItem(notifId);
                break;
            case 'rejected':
                if (t.status !== 'rejected') _removeItem(notifId);
                break;
        }
    });
    } // ← закриває else блок захисту tasksLoaded

    // ── 4. Досягнення ─────────────────────────────────────
    records
        .filter(r => r.category === 'achievement' && r.type === 'earn')
        .forEach(r => {
            const id = `achievement_${r.id}`;
            if (!_items[id]) {
                _upsertItem(_makeItem(id, 'achievement',
                    'Нове досягнення',
                    `${r.description || r.desc} +${r.stars}⭐`,
                    { createdAt: r.date, achId: r.achId || null }
                ));
            }
        });

    // ── 4. Умовні (циклічні) ──────────────────────────────
    _generateConditional('streak_risk', today, () => {
        const nowDate = new Date(_kyivNow());
        const dow     = nowDate.getDay();
        const streak  = state.data.achievements?.streaks?.earning?.current || 0;
        const todayEarn = earnRecs.filter(r => r.date.startsWith(today));
        // Не генеруємо якщо: серія < 3, вже перервана (0), або зірки сьогодні є
        if (streak < 3) return null;
        return dow >= 1 && dow <= 5 && nowDate.getHours() >= 16
            && todayEarn.length === 0
            ? {
                title: 'Ризик серії!',
                body:  `Сьогодні ще не додано зірок. Серія: ${streak} ${streak < 5 ? 'дні' : 'днів'}`,
              }
            : null;
    }, 1, true);  // autoRemove: видаляти якщо зірки вже додані

    _generateConditional('no_stars', today, () => {
        const lastEarn = earnRecs.length
            ? earnRecs.reduce((a, b) => a.date > b.date ? a : b) : null;
        // Порівнюємо за днями (не годинами), бо дата запису завжди T12:00:00
        // daysDiff=0 → сьогодні, daysDiff=1 → вчора, daysDiff>=2 → позавчора і давніше
        const lastEarnDay = lastEarn?.date?.split('T')[0] || null;
        const daysDiff = lastEarnDay
            ? Math.round((new Date(today) - new Date(lastEarnDay)) / 86_400_000)
            : 9999;
        return daysDiff >= 2
            ? { title: 'Зірки не додавались', body: 'Більше доби без нових зірок!' }
            : null;
    });

    _generateConditional('goal_close', today, () => {
        const goal = state.data.goal;
        return goal?.target && balance >= goal.target * 0.9 && balance < goal.target
            ? { title: 'Ціль майже досягнута!', body: `Ще ${goal.target - balance}⭐ до "${goal.name || 'мети'}"` }
            : null;
    });

    _generateConditional('good_dynamics', today, () => {
        const getWeek = (ago) => {
            const now = new Date(_kyivNow());
            const day = now.getDay() || 7;
            const mon = new Date(now);
            mon.setDate(now.getDate() - day + 1 - ago * 7);
            mon.setHours(0, 0, 0, 0);
            const sun = new Date(mon);
            sun.setDate(mon.getDate() + 6);
            sun.setHours(23, 59, 59, 999);
            return earnRecs.filter(r => { const d = new Date(r.date); return d >= mon && d <= sun; })
                           .reduce((s, r) => s + r.stars, 0);
        };
        const tw = getWeek(0), lw = getWeek(1);
        return lw > 0 && tw >= lw * 1.2 && tw >= 5
            ? { title: 'Чудова динаміка!', body: `Цього тижня ${tw}⭐ — на ${Math.round((tw / lw - 1) * 100)}% більше ніж минулого` }
            : null;
    }, 7);  // повторювати щотижня

    _generateConditional('backup', today, () => {
        // Беремо дату з state, або як fallback — з останнього backup_* запису в _items
        let last = state.parent.backupLastDate || '';
        if (!last) {
            const lastBackupItem = Object.values(_items)
                .filter(i => i.type === 'backup')
                .sort((a, b) => b.id.localeCompare(a.id))[0];
            if (lastBackupItem) {
                // ID має вигляд backup_2026-05-06 — беремо дату після _
                last = lastBackupItem.id.replace('backup_', '');
            }
        }
        const days = last
            ? Math.floor((new Date(today) - new Date(last)) / 86_400_000)
            : 999;
        return days >= 7
            ? { title: 'Час зробити резервну копію', body: `Минуло ${days < 999 ? days + ' дн.' : 'більше тижня'} з останнього бекапу` }
            : null;
    }, 1);  // 🔄 щоденна перевірка: умова `days >= 7` всередині condFn гарантує
            //    показ тільки якщо реальний бекап >= 7 днів тому (state.data.backupLastDate)

    // Оновлюємо бейджі
    if (window.updateBadges) window.updateBadges();
}

// Видаляє всі повністю прочитані записи типу type,
// КРІМ keepId (найновіший — anchor для throttle).
function _pruneFullyReadByType(type, keepId) {
    Object.values(_items)
        .filter(i => i.type === type && i.id !== keepId)
        .forEach(item => {
            const role = item.role || 'both';
            const pr   = !!item.readBy?.parent;
            const cr   = !!item.readBy?.child;
            const done = role === 'parent' ? pr
                       : role === 'child'  ? cr
                       : pr && cr;
            if (done) _removeItem(item.id);
        });
}

// Upsert без зайвих перезаписів
function _upsertItem(item) {
    _items[item.id] = item;
    _saveItem(item);
}

// Генератор циклічного умовного сповіщення
function _generateConditional(type, today, condFn, repeatDays = 1, autoRemove = false) {
    const id       = `${type}_${today}`;
    const existing = _items[id];

    // Перевіряємо умову
    const result = condFn();

    // autoRemove: якщо умова знята і сьогоднішній запис існує — видаляємо його
    // незалежно від readBy (сповіщення вже не актуальне)
    if (!result && autoRemove) {
        if (existing) _removeItem(id);
        return;
    }

    // Вже є сьогоднішній запис — не чіпаємо
    if (existing) return;

    if (!result) return;

    // Перевіряємо чи не було переглянуто нещодавно
    // (шукаємо останній запис цього типу)
    const lastSeen = Object.values(_items)
        .filter(i => i.type === type && i.id !== id)
        .map(i => ({
            date:       i.id.replace(`${type}_`, ''),
            readParent: i.readBy?.parent,
            readChild:  i.readBy?.child,
        }))
        .sort((a, b) => b.date.localeCompare(a.date))[0];

    // Якщо обидва переглянули нещодавно (< repeatDays) — не створюємо
    if (lastSeen) {
        const lastDate = new Date(lastSeen.date);
        const daysSince = (new Date(today) - lastDate) / 86_400_000;
        if (daysSince < repeatDays) return;
    }

    _upsertItem(_makeItem(id, type, result.title, result.body));
    // Новий запис створено — видаляємо старі прочитані того ж типу
    _pruneFullyReadByType(type, id);
}

// ════════════════════════════════════════════════════
// 📊  ГЕТТЕРИ ДЛЯ ПАНЕЛІ ТА БЕЙДЖІВ
// ════════════════════════════════════════════════════

export function getUnreadItems(role) {
    return Object.values(_items)
        .filter(i => _isUnread(i, role))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

// ════════════════════════════════════════════════════
// ✓  DISMISS — позначити прочитаним
// ════════════════════════════════════════════════════

export function dismissNotification(id) {
    const item = _items[id];
    if (!item) return;
    const role = state.data.isParent ? 'parent' : 'child';
    if (!item.readBy) item.readBy = { parent: null, child: null };
    item.readBy[role] = _kyivNow();

    _saveItem(item);

    // Через 500мс — компактуємо прочитані записи в slim
    // (затримка щоб Firebase встиг зберегти readBy перед читанням)
    setTimeout(_compactReadItems, 500);

    if (window.updateBadges) window.updateBadges();
}

// ════════════════════════════════════════════════════════════
// 🏆  ХЕЛПЕРИ ДЛЯ КАРТОК ДОСЯГНЕНЬ
// ════════════════════════════════════════════════════════════
//   • бейдж на конкретній картці досягнення
//   • dismiss при кліку на картку або «Прочитано»
// ════════════════════════════════════════════════════════════

// Чи є непрочитане сповіщення про досягнення для конкретного achId.
export function hasUnreadAchievementNotif(achId) {
    if (!achId) return false;
    const role = state.data.isParent ? 'parent' : 'child';
    return Object.values(_items).some(item =>
        item.type === 'achievement' &&
        item.achId === achId &&
        _isUnread(item, role)
    );
}

// Dismiss усіх непрочитаних сповіщень про досягнення для конкретного achId.
// Викликається при кліку на картку досягнення.
export function dismissAchievementNotifs(achId) {
    if (!achId) return;
    const role = state.data.isParent ? 'parent' : 'child';
    Object.values(_items)
        .filter(item =>
            item.type === 'achievement' &&
            item.achId === achId &&
            _isUnread(item, role)
        )
        .forEach(item => dismissNotification(item.id));
}

// ════════════════════════════════════════════════════════════
// 📋  ХЕЛПЕРИ ДЛЯ ВКЛАДКИ "ЗАВДАННЯ"
// ════════════════════════════════════════════════════════════
//   Використовуються у tasks.js для:
//     • показу бейджа на конкретній картці завдання
//     • dismiss-у всіх сповіщень цього завдання при кліку на картку
// ════════════════════════════════════════════════════════════

const TASK_NOTIF_KINDS = ['request', 'done', 'new', 'declined', 'confirmed', 'rejected', 'updated'];

// ════════════════════════════════════════════════════════════
// 💬  ХЕЛПЕРИ ДЛЯ КАРТОК ФІДБЕКУ
// ════════════════════════════════════════════════════════════
//   Аналог TASK_NOTIF_KINDS для вкладки "Зв'язок":
//     • бейдж на конкретній картці фідбеку
//     • dismiss при кліку на картку
// ════════════════════════════════════════════════════════════

const FB_NOTIF_PREFIXES = ['fb_new_', 'fb_reply_', 'fb_status_', 'fb_comment_'];

// Чи є непрочитане сповіщення пов'язане з конкретним фідбек-item.
export function hasUnreadFeedbackNotif(feedbackItemId) {
    if (!feedbackItemId) return false;
    const role = state.data.isParent ? 'parent' : 'child';
    return FB_NOTIF_PREFIXES.some(prefix => {
        const item = _items[`${prefix}${feedbackItemId}`];
        return item && _isUnread(item, role);
    });
}

// Dismiss усіх сповіщень пов'язаних з конкретним фідбек-item.
// Викликається при кліку на картку фідбеку.
export function dismissFeedbackNotifs(feedbackItemId) {
    if (!feedbackItemId) return;
    FB_NOTIF_PREFIXES.forEach(prefix => {
        const id = `${prefix}${feedbackItemId}`;
        if (_items[id]) dismissNotification(id);
    });
}

// Чи є хоч одне непрочитане сповіщення про конкретне завдання (для поточної ролі).
export function hasUnreadTaskNotification(taskId) {
    if (!taskId) return false;
    const role = state.data.isParent ? 'parent' : 'child';
    return TASK_NOTIF_KINDS.some(kind => {
        const item = _items[`task_${kind}_${taskId}`];
        return item && _isUnread(item, role);
    });
}

// Dismiss-ить всі сповіщення про конкретне завдання (всі kinds).
// Викликається при кліку на картку завдання.
export function dismissTaskNotifications(taskId) {
    if (!taskId) return;
    TASK_NOTIF_KINDS.forEach(kind => {
        const id = `task_${kind}_${taskId}`;
        if (_items[id]) dismissNotification(id);
    });
}

// ════════════════════════════════════════════════════════════
// 🎯  УНІВЕРСАЛЬНІ ХЕЛПЕРИ ЗА ТИПОМ СПОВІЩЕННЯ
// ════════════════════════════════════════════════════════════
//   Використовуються для бейджів на конкретних UI-блоках поза
//   вкладкою "Завдання" (наприклад: backup → акордеон/картка
//   "Резервні копії"). Працюють для будь-якого типу з NOTIF_TYPES.
//
//   Приклади:
//     hasUnreadByType('backup')      → true/false
//     dismissByType('backup')        → позначає всі прочитаними
// ════════════════════════════════════════════════════════════

// Чи є хоч одне непрочитане сповіщення вказаного типу (для поточної ролі).
export function hasUnreadByType(type) {
    if (!type) return false;
    const role = state.data.isParent ? 'parent' : 'child';
    return Object.values(_items).some(i =>
        i.type === type && _isUnread(i, role)
    );
}

// Dismiss-ить ВСІ непрочитані сповіщення вказаного типу для поточної ролі.
// Викликається при кліку на UI-елемент, прив'язаний до цього типу.
export function dismissByType(type) {
    if (!type) return;
    const role = state.data.isParent ? 'parent' : 'child';
    Object.values(_items)
        .filter(i => i.type === type && _isUnread(i, role))
        .forEach(item => dismissNotification(item.id));
}

// Dismiss через модалку або відкриття вкладки (dismissBy: modal/tab)
export function dismissByAction(type, action) {
    const role  = state.data.isParent ? 'parent' : 'child';    const match = Object.values(_items).filter(i =>
        i.type === type &&
        i.dismissBy?.includes(action) &&
        _isUnread(i, role)
    );
    if (!match.length) return;
    match.forEach(item => {
        if (!item.readBy) item.readBy = {};
        item.readBy[role] = _kyivNow();
        _saveItem(item);
    });
    if (window.updateBadges) window.updateBadges();
}

// ════════════════════════════════════════════════════
// 🎨  КОЛЬОРИ ТИПІВ
// ════════════════════════════════════════════════════

const TYPE_COLORS = {
    changelog:        { bg: 'var(--c-info-bg)',    border: 'var(--c-info-border)',    text: 'var(--c-info-text)'    },
    login_failed:     { bg: 'var(--c-warn-bg)',    border: 'var(--c-warn-border)',    text: 'var(--c-warn-text)'    },
    achievement:      { bg: 'var(--c-balance-bg)', border: 'var(--c-balance-border)', text: 'var(--c-balance-text)' },
    feedback_reply:   { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
    feedback_status:  { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
    feedback_new:     { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
    feedback_comment: { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
    // Завдання — блакитні (узгоджено зі стилем табу tasks)
    task_new:         { bg: 'var(--c-tk-light)',   border: 'var(--c-tk-border)',      text: 'var(--c-tk-text)'      },
    task_request:     { bg: 'var(--c-tk-light)',   border: 'var(--c-tk-border)',      text: 'var(--c-tk-text)'      },
    task_done:        { bg: 'var(--c-tk-light)',   border: 'var(--c-tk-border)',      text: 'var(--c-tk-text)'      },
    task_declined:    { bg: 'var(--c-tk-light)',   border: 'var(--c-tk-border)',      text: 'var(--c-tk-text)'      },
    task_confirmed:   { bg: 'var(--c-tk-light)',   border: 'var(--c-tk-border)',      text: 'var(--c-tk-text)'      },
    task_rejected:    { bg: 'var(--c-tk-light)',   border: 'var(--c-tk-border)',      text: 'var(--c-tk-text)'      },
    task_updated:     { bg: 'var(--c-tk-light)',   border: 'var(--c-tk-border)',      text: 'var(--c-tk-text)'      },
    good_dynamics:    { bg: 'var(--c-success-bg)', border: 'var(--c-success-border)', text: 'var(--c-success-text)' },
    streak_risk:      { bg: 'var(--c-danger-bg)',  border: 'var(--c-danger-border)',  text: 'var(--c-danger-text)'  },
    no_stars:         { bg: 'var(--c-warning-bg)', border: 'var(--c-warning-border)', text: 'var(--c-warning-text)' },
    goal_close:       { bg: 'var(--c-success-bg)', border: 'var(--c-success-border)', text: 'var(--c-success-text)' },
    backup:           { bg: 'var(--c-warning-bg)', border: 'var(--c-warning-border)', text: 'var(--c-warning-text)' },
};

const TYPE_ICONS = {
    changelog:        '📝',
    login_failed:     '🔐',
    achievement:      '🏆',
    feedback_reply:   '💬',
    feedback_status:  '✅',
    feedback_new:     '💬',
    feedback_comment: '✏️',
    task_new:         '📋',
    task_request:     '📨',
    task_done:        '✔️',
    task_declined:    '✖️',
    task_confirmed:   '✅',
    task_rejected:    '❌',
    task_updated:     '✏️',
    good_dynamics:    '📈',
    streak_risk:      '🔥',
    no_stars:         '⭐',
    goal_close:       '🎯',
    backup:           '💾',
};

// ════════════════════════════════════════════════════
// 🔔  ВІДКРИТТЯ ПАНЕЛІ
// ════════════════════════════════════════════════════

export function openNotifications() {
    const modal   = document.getElementById('notifModal');
    const content = document.getElementById('notifContent');
    if (!modal || !content) return;

    const role  = state.data.isParent ? 'parent' : 'child';
    const items = getUnreadItems(role);

    if (items.length === 0) {
        content.innerHTML = `<div class="notif-empty">
            <div class="notif-empty-icon">🔔</div>
            <div>Нових сповіщень немає</div>
        </div>`;
    } else {
        content.innerHTML = items.map(item => {
            const c    = TYPE_COLORS[item.type] || TYPE_COLORS.backup;
            const icon = TYPE_ICONS[item.type]  || '🔔';
            const time = item.createdAt ? `<div class="notif-item-time">${_fmt(item.createdAt)}</div>` : '';
            // Клік на тілі сповіщення — навігація залежно від типу
            let bodyClickAttr = '';
            if (item.type === 'changelog') {
                bodyClickAttr = ` onclick="window.__zOpenChangelog()" style="cursor:pointer;"`;
            } else if (item.type === 'achievement') {
                bodyClickAttr = ` onclick="window.__zSwitchTab('achievements')" style="cursor:pointer;"`;
            } else if (item.type === 'login_failed') {
                bodyClickAttr = ` onclick="window.__zOpenActivity()" style="cursor:pointer;"`;
            } else if (item.type.startsWith('feedback_')) {
                bodyClickAttr = ` onclick="window.__zSwitchTab('feedback')" style="cursor:pointer;"`;
            } else if (item.type.startsWith('task_')) {
                bodyClickAttr = ` onclick="window.__zSwitchTab('tasks')" style="cursor:pointer;"`;
            }
            return `
            <div class="notif-item" id="notifItem_${item.id}"
                style="background:${c.bg};border-color:${c.border};">
                <div class="notif-item-icon"${bodyClickAttr}>${icon}</div>
                <div class="notif-item-body"${bodyClickAttr}>
                    <div class="notif-item-title" style="color:${c.text};">${item.title}</div>
                    <div class="notif-item-text">${item.body}</div>
                    ${time}
                </div>
                <button class="notif-dismiss-btn"
                    onclick="window.__zDismiss('${item.id}')"
                    title="Ознайомлена">✓</button>
            </div>`;
        }).join('');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    window.__zDismiss = (id) => {
        dismissNotification(id);
        const el = document.getElementById(`notifItem_${id}`);
        if (el) {
            el.style.transition = 'opacity 0.2s, max-height 0.25s';
            el.style.opacity    = '0';
            el.style.overflow   = 'hidden';
            el.style.maxHeight  = el.offsetHeight + 'px';
            setTimeout(() => {
                el.style.maxHeight = '0';
                el.style.margin    = '0';
                el.style.padding   = '0';
            }, 50);
            setTimeout(() => {
                el.remove();
                if (!content.querySelector('.notif-item')) {
                    content.innerHTML = `<div class="notif-empty">
                        <div class="notif-empty-icon">🔔</div>
                        <div>Нових сповіщень немає</div>
                    </div>`;
                }
            }, 300);
        }
    };

    // Клік на тілі сповіщення про changelog — відкриває модалку історії змін поверх
    window.__zOpenChangelog = () => {
        if (window.showHelp) window.showHelp('changelog');
        // showHelp('changelog') автоматично викликає markChangelogRead()
        // → бейдж сам зникне
    };

    // Клік на тілі сповіщення login_failed — відкриває модалку Активність
    window.__zOpenActivity = () => {
        closeNotifications();
        if (window.showActivityModal) window.showActivityModal();
    };

    // Клік на тілі сповіщення feedback/task — закриває панель і переходить на таб
    window.__zSwitchTab = (tab) => {
        closeNotifications();
        if (window.switchTab) window.switchTab(tab, true);
    };
}

export function closeNotifications() {
    const modal = document.getElementById('notifModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

// ════════════════════════════════════════════════════
// 📌  API (заглушки для Етапу 2-3)
// ════════════════════════════════════════════════════

export function updateNotificationBadge() {
    // Замінюється у Етапі 2 на updateBadges()
    if (window.updateBadges) window.updateBadges();
}

export function updateChangelogBadge() {
    if (window.updateBadges) window.updateBadges();
}

export function markChangelogRead() {
    dismissByAction('changelog', 'modal');
    if (window.updateBadges) window.updateBadges();
}

export function notifyFeedbackChanged() {
    generateNotifications();
    if (window.updateBadges) window.updateBadges();
}
