// ════════════════════════════════════════════════════
// 🔔  notifications.js — Система сповіщень
//     Етап 1: Фундамент — структура + Firebase
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260511.1322';

import { state }    from './state.js';
import { nowKyiv }  from './utils.js';
import { CHANGELOG } from './changelog.js';
import { getFeedbackItems } from './feedback.js';
import { getDatabase, ref, set, remove, onValue }
    from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { saveData } from './firebase.js';

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
        badges:     ['bell', 'changelog'],
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
        badges:     ['bell', 'settings'],
        dismissBy:  ['checkmark'],
        repeatDays: 7,
    },
};

// ════════════════════════════════════════════════════
// 🔥  FIREBASE — окрема гілка zirky-notifications
// ════════════════════════════════════════════════════

let _db = null;
let _items = {};   // поточний стан: { id: NotifItem }

// Викликається з firebase.js після ініціалізації
export function setNotifDb(db) { _db = db; }

function _getDb() {
    if (!_db) throw new Error('🔔 NotifDB не ініціалізовано — setNotifDb() не викликано');
    return _db;
}

// Зберегти один запис
function _saveItem(item) {
    set(ref(_getDb(), `zirky-notifications/${_fbKey(item.id)}`), item);
}

// Firebase не дозволяє крапки в ключах — замінюємо на тире
function _fbKey(id) { return id.replace(/\./g, '-'); }

// Видалити один запис
function _removeItem(id) {
    remove(ref(_getDb(), `zirky-notifications/${_fbKey(id)}`));
    delete _items[id];
}

// Ініціалізація слухача Firebase
export function initNotificationsListener() {
    onValue(ref(_getDb(), 'zirky-notifications'), (snapshot) => {
        // Відновлюємо _items за item.id (не Firebase-ключем, бо в ключах крапки замінені)
        const raw = snapshot.val() || {};
        _items = {};
        Object.values(raw).forEach(item => { _items[item.id] = item; });
        if (window.updateBadges) window.updateBadges();
    });
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

    // ── 2. Feedback ───────────────────────────────────────
    getFeedbackItems().forEach(item => {
        // Відповідь батьків дитині
        if (item.commentAt) {
            const id = `fb_reply_${item.id}`;
            const existing = _items[id];
            // Нова або оновлена відповідь — скидаємо readBy.child
            if (!existing || existing.createdAt !== item.commentAt) {
                _upsertItem(_makeItem(id, 'feedback_reply',
                    'Відповідь батьків',
                    `${item.category}: "${item.text.slice(0, 60)}"`,
                    { createdAt: item.commentAt, readBy: { parent: existing?.readBy?.parent || null, child: null } }
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
                    `${item.category} → ${item.status} ${NAMES[item.status] || ''}`,
                    { createdAt: item.statusChangedAt, readBy: { parent: existing?.readBy?.parent || null, child: null } }
                ));
            }
        }
        // Новий фідбек від дитини
        if (item.date) {
            const id = `fb_new_${item.id}`;
            if (!_items[id]) {
                _upsertItem(_makeItem(id, 'feedback_new',
                    'Нове повідомлення від дитини',
                    `${item.category}: "${item.text.slice(0, 60)}"`,
                    { createdAt: item.date }
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
                    `До запиту: "${item.text.slice(0, 60)}"`,
                    { createdAt: item.childCommentAt, readBy: { child: existing?.readBy?.child || null, parent: null } }
                ));
            }
        }
    });

    // ── 3. Досягнення ─────────────────────────────────────
    records
        .filter(r => r.category === 'achievement' && r.type === 'earn')
        .forEach(r => {
            const id = `achievement_${r.id}`;
            if (!_items[id]) {
                _upsertItem(_makeItem(id, 'achievement',
                    'Нове досягнення',
                    `${r.description || r.desc} +${r.stars}⭐`,
                    { createdAt: r.date }
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
    });

    _generateConditional('no_stars', today, () => {
        const lastEarn = earnRecs.length
            ? earnRecs.reduce((a, b) => a.date > b.date ? a : b) : null;
        const diffH = lastEarn
            ? (new Date(_kyivNow()) - new Date(lastEarn.date)) / 3_600_000
            : 9999;
        return diffH >= 24
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
        const last = state.data.backupLastDate || '';
        const days = last
            ? Math.floor((new Date(today) - new Date(last)) / 86_400_000)
            : 999;
        return days >= 7
            ? { title: 'Час зробити резервну копію', body: `Минуло ${days < 999 ? days + ' днів' : 'більше тижня'}` }
            : null;
    }, 7);

    // Оновлюємо бейджі
    if (window.updateBadges) window.updateBadges();
}

// Upsert без зайвих перезаписів
function _upsertItem(item) {
    _items[item.id] = item;
    _saveItem(item);
}

// Генератор циклічного умовного сповіщення
function _generateConditional(type, today, condFn, repeatDays = 1) {
    const id       = `${type}_${today}`;
    const existing = _items[id];

    // Вже є сьогоднішній запис — не чіпаємо
    if (existing) return;

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

    // Перевіряємо умову
    const result = condFn();
    if (!result) return;

    _upsertItem(_makeItem(id, type, result.title, result.body));
}

// ════════════════════════════════════════════════════
// 📊  ГЕТТЕРИ ДЛЯ ПАНЕЛІ ТА БЕЙДЖІВ
// ════════════════════════════════════════════════════

export function getUnreadItems(role) {
    return Object.values(_items)
        .filter(i => _isUnread(i, role))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function getAllItems() { return _items; }

// ════════════════════════════════════════════════════
// ✓  DISMISS — позначити прочитаним
// ════════════════════════════════════════════════════

export function dismissNotification(id) {
    const item = _items[id];
    if (!item) return;
    const role = state.data.isParent ? 'parent' : 'child';
    if (!item.readBy) item.readBy = { parent: null, child: null };
    item.readBy[role] = _kyivNow();

    // Якщо резервна копія — записуємо дату в хмару
    if (item.type === 'backup') {
        state.data.backupLastDate = _kyivToday();
        saveData();
    }

    _saveItem(item);
    if (window.updateBadges) window.updateBadges();
}

// Dismiss через модалку або відкриття вкладки (dismissBy: modal/tab)
export function dismissByAction(type, action) {
    const role  = state.data.isParent ? 'parent' : 'child';
    const match = Object.values(_items).filter(i =>
        i.type === type &&
        i.dismissBy?.includes(action) &&
        _isUnread(i, role)
    );
    if (!match.length) return;
    match.forEach(item => {
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
    achievement:      { bg: 'var(--c-balance-bg)', border: 'var(--c-balance-border)', text: 'var(--c-balance-text)' },
    feedback_reply:   { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
    feedback_status:  { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
    feedback_new:     { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
    feedback_comment: { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
    good_dynamics:    { bg: 'var(--c-success-bg)', border: 'var(--c-success-border)', text: 'var(--c-success-text)' },
    streak_risk:      { bg: 'var(--c-danger-bg)',  border: 'var(--c-danger-border)',  text: 'var(--c-danger-text)'  },
    no_stars:         { bg: 'var(--c-warning-bg)', border: 'var(--c-warning-border)', text: 'var(--c-warning-text)' },
    goal_close:       { bg: 'var(--c-success-bg)', border: 'var(--c-success-border)', text: 'var(--c-success-text)' },
    backup:           { bg: 'var(--c-warning-bg)', border: 'var(--c-warning-border)', text: 'var(--c-warning-text)' },
};

const TYPE_ICONS = {
    changelog:        '📝',
    achievement:      '🏆',
    feedback_reply:   '💬',
    feedback_status:  '✅',
    feedback_new:     '💬',
    feedback_comment: '✏️',
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
            return `
            <div class="notif-item" id="notifItem_${item.id}"
                style="background:${c.bg};border-color:${c.border};">
                <div class="notif-item-icon">${icon}</div>
                <div class="notif-item-body">
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

export function notifyAchievementEarned() {
    generateNotifications();
}

export function notifyFeedbackChanged() {
    generateNotifications();
    if (window.updateBadges) window.updateBadges();
}
