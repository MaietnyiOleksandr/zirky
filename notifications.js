// ════════════════════════════════════════════════════
// 🔔  notifications.js — Центр сповіщень
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260506.0745';

import { state }    from './state.js';
import { saveData } from './firebase.js';
import { nowKyiv }  from './utils.js';
import { CHANGELOG } from './changelog.js';
import { getFeedbackItems } from './feedback.js';

// ════════════════════════════════════════════════════
// 🛠️  УТИЛІТИ
// ════════════════════════════════════════════════════

function _kyivNow()     { return nowKyiv(); }
function _kyivToday()   { return _kyivNow().split('T')[0]; }
function _kyivDate(iso) { return iso ? iso.split('T')[0] : null; }

function _fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('uk-UA', {
        timeZone: 'Europe/Kyiv',
        day: '2-digit', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// ── Dismissed set — кожне сповіщення незалежно ───────────────
// Ключ НЕ залежить від isParent — зберігається по пристрою
const LS_DISMISSED = 'zirky_notif_dismissed';

function _getDismissed() {
    try { return JSON.parse(localStorage.getItem(LS_DISMISSED) || '{}'); }
    catch { return {}; }
}

function _isDismissedToday(id) {
    const d = _getDismissed();
    return d[id] === _kyivToday();
}

function _dismissId(id) {
    const d = _getDismissed();
    d[id] = _kyivToday();
    // Очищаємо старі записи (старше 30 днів)
    const today = new Date(_kyivToday());
    Object.keys(d).forEach(k => {
        if ((today - new Date(d[k])) > 30 * 86400000) delete d[k];
    });
    localStorage.setItem(LS_DISMISSED, JSON.stringify(d));
}

// Changelog — окремий ключ без прив'язки до профілю або дати
function _currentRole() { return state.data.isParent ? 'parent' : 'child'; }

function _getChangelogSeen() {
    return localStorage.getItem(`zirky_changelog_${_currentRole()}`) || '';
}
function _setChangelogSeen(ver) {
    localStorage.setItem(`zirky_changelog_${_currentRole()}`, ver);
}

// ── Firebase-профіль (тільки для подійних сповіщень) ─────────
function _fbProfile() {
    if (!state.data.notifications) state.data.notifications = {};
    const n = state.data.notifications;
    if (!n.child)  n.child  = {};
    if (!n.parent) n.parent = {};
    return state.data.isParent ? n.parent : n.child;
}

// ════════════════════════════════════════════════════
// 📥  ГЕНЕРАЦІЯ СПОВІЩЕНЬ
// ════════════════════════════════════════════════════

function _buildNotifications() {
    const isParent = !!state.data.isParent;
    const today    = _kyivToday();
    const items    = [];

    // ── 1. Changelog ─────────────────────────────────────
    const currentVer = CHANGELOG[0]?.version || '';
    if (_getChangelogSeen() !== currentVer) {
        items.push({
            id:    'changelog',
            icon:  '📝',
            title: 'Нова версія програми',
            body:  `Доступна версія ${currentVer}`,
            type:  'version',
        });
    }

    // ── 2. Feedback (Firebase) ────────────────────────────
    const feedbackItems = getFeedbackItems();
    const fbP = _fbProfile();

    if (!isParent) {
        const seenAt = fbP.feedbackReplySeenAt || '1970-01-01T00:00';
        feedbackItems.forEach(item => {
            if (item.commentAt && item.commentAt > seenAt) {
                items.push({
                    id:    `fb_reply_${item.id}`,
                    icon:  '💬',
                    title: 'Нова або змінена відповідь батьків',
                    body:  `${item.category}: "${item.text.slice(0, 50)}${item.text.length > 50 ? '…' : ''}"`,
                    time:  item.commentAt,
                    type:  'feedback',
                });
            }
            if (item.statusChangedAt && item.statusChangedAt > seenAt) {
                const NAMES = { '⏳': 'Нове', '🔄': 'В опрацюванні', '✅': 'Виконано', '❌': 'Відхилено' };
                items.push({
                    id:    `fb_status_${item.id}`,
                    icon:  '✅',
                    title: 'Оновлено статус запиту',
                    body:  `${item.category} → ${item.status} ${NAMES[item.status] || ''}`,
                    time:  item.statusChangedAt,
                    type:  'feedback',
                });
            }
        });
    } else {
        const newSeenAt     = fbP.feedbackNewSeenAt   || '1970-01-01T00:00';
        const commentSeenAt = fbP.childCommentSeenAt  || '1970-01-01T00:00';
        feedbackItems.forEach(item => {
            if (item.date > newSeenAt) {
                items.push({
                    id:    `fb_new_${item.id}`,
                    icon:  '💬',
                    title: 'Нове повідомлення від дитини',
                    body:  `${item.category}: "${item.text.slice(0, 50)}${item.text.length > 50 ? '…' : ''}"`,
                    time:  item.date,
                    type:  'feedback',
                });
            }
            if (item.childCommentAt && item.childCommentAt > commentSeenAt) {
                items.push({
                    id:    `fb_comment_${item.id}`,
                    icon:  '✏️',
                    title: 'Дитина додала або змінила коментар',
                    body:  `До запиту: "${item.text.slice(0, 50)}${item.text.length > 50 ? '…' : ''}"`,
                    time:  item.childCommentAt,
                    type:  'feedback',
                });
            }
        });
    }

    // ── 3. Досягнення (Firebase) ──────────────────────────
    const achSeenAt = fbP.achievementSeenAt || '1970-01-01T00:00';
    (state.data.records || [])
        .filter(r => r.category === 'achievement' && r.type === 'earn' && r.date > achSeenAt)
        .forEach(r => items.push({
            id:    `ach_${r.id}`,
            icon:  '🏆',
            title: 'Нове досягнення',
            body:  `${r.description || r.desc} +${r.stars}⭐`,
            time:  r.date,
            type:  'achievement',
        }));

    // ── 4. Умовні — кожне зі своїм dismissed ключем ──────
    const records  = state.data.records || [];
    const earnRecs = records.filter(r => r.type === 'earn' && r.category !== 'achievement');

    // Зірки не додавались > 24 годин
    if (!_isDismissedToday('cond_no_stars')) {
        const lastEarn = earnRecs.length
            ? earnRecs.reduce((a, b) => a.date > b.date ? a : b) : null;
        const diffH = lastEarn
            ? (new Date(_kyivNow()) - new Date(lastEarn.date)) / 3_600_000
            : 9999;
        if (diffH >= 24) {
            items.push({
                id:   'cond_no_stars',
                icon: '⭐',
                title: 'Зірки не додавались',
                body:  lastEarn ? 'Більше доби без нових зірок. Час щось заробити!' : 'Ще не було жодного нарахування.',
                type:  'reminder',
            });
        }
    }

    // Ризик серії
    if (!_isDismissedToday('cond_streak_risk')) {
        const todayEarn = earnRecs.filter(r => _kyivDate(r.date) === today);
        const nowDate   = new Date(_kyivNow());
        const dow       = nowDate.getDay();
        const streak    = state.data.achievements?.streaks?.earning?.current || 0;
        if (dow >= 1 && dow <= 5 && nowDate.getHours() >= 16 && todayEarn.length === 0 && streak > 0) {
            items.push({
                id:   'cond_streak_risk',
                icon: '🔥',
                title: 'Ризик серії!',
                body:  `Сьогодні ще не додано зірок. Серія: ${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дні' : 'днів'}`,
                type:  'warning',
            });
        }
    }

    // Ціль близько
    if (!_isDismissedToday('cond_goal_close')) {
        const goal    = state.data.goal;
        const balance = state.data.balance || 0;
        if (goal?.target && balance >= goal.target * 0.9 && balance < goal.target) {
            items.push({
                id:   'cond_goal_close',
                icon: '🎯',
                title: 'Ціль майже досягнута!',
                body:  `Ще ${goal.target - balance}⭐ до "${goal.name || 'мети'}"`,
                type:  'progress',
            });
        }
    }

    // Хороша динаміка
    if (!_isDismissedToday('cond_good_dynamics')) {
        const getWeekEarned = (weeksAgo) => {
            const now = new Date(_kyivNow());
            const day = now.getDay() || 7;
            const monday = new Date(now);
            monday.setDate(now.getDate() - day + 1 - weeksAgo * 7);
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            return earnRecs
                .filter(r => { const d = new Date(r.date); return d >= monday && d <= sunday; })
                .reduce((s, r) => s + r.stars, 0);
        };
        const thisWeek = getWeekEarned(0), lastWeek = getWeekEarned(1);
        if (lastWeek > 0 && thisWeek >= lastWeek * 1.2 && thisWeek >= 5) {
            items.push({
                id:   'cond_good_dynamics',
                icon: '📈',
                title: 'Чудова динаміка!',
                body:  `Цього тижня ${thisWeek}⭐ — на ${Math.round((thisWeek / lastWeek - 1) * 100)}% більше ніж минулого`,
                type:  'praise',
            });
        }
    }

    // Резервна копія (тільки батькам) — ОКРЕМО від інших умовних
    if (isParent && !_isDismissedToday('cond_backup')) {
        const lastBackup = localStorage.getItem('backupReminderSeenDate') || '';
        const daysSince  = lastBackup
            ? Math.floor((new Date(today) - new Date(lastBackup)) / 86_400_000)
            : 999;
        if (daysSince >= 7) {
            items.push({
                id:   'cond_backup',
                icon: '💾',
                title: 'Час зробити резервну копію',
                body:  `Минуло ${daysSince < 999 ? daysSince + ' днів' : 'більше тижня'} з останнього збереження`,
                type:  'reminder',
            });
        }
    }

    // Сортування
    const order = { feedback: 0, achievement: 1, version: 2, warning: 3, progress: 4, praise: 5, reminder: 6 };
    items.sort((a, b) => {
        const od = (order[a.type] ?? 9) - (order[b.type] ?? 9);
        return od !== 0 ? od : (a.time && b.time ? b.time.localeCompare(a.time) : 0);
    });

    return items;
}

// ════════════════════════════════════════════════════
// 🔴  БЕЙДЖІ
// ════════════════════════════════════════════════════

export function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    badge.style.display = _buildNotifications().length > 0 ? 'block' : 'none';
}

export function updateChangelogBadge() {
    const badge = document.getElementById('changelogBadge');
    if (!badge) return;
    const currentVer = CHANGELOG[0]?.version || '';
    badge.style.display = _getChangelogSeen() !== currentVer ? 'block' : 'none';
}

export function markChangelogRead() {
    _setChangelogSeen(CHANGELOG[0]?.version || '');
    updateChangelogBadge();
    updateNotificationBadge();
}

// ════════════════════════════════════════════════════
// 📬  ВІДКРИТТЯ ПАНЕЛІ
// ════════════════════════════════════════════════════

export function openNotifications() {
    const modal   = document.getElementById('notifModal');
    const content = document.getElementById('notifContent');
    if (!modal || !content) return;

    const items = _buildNotifications();

    const TYPE_COLORS = {
        feedback:    { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
        achievement: { bg: 'var(--c-balance-bg)', border: 'var(--c-balance-border)', text: 'var(--c-balance-text)' },
        version:     { bg: 'var(--c-info-bg)',    border: 'var(--c-info-border)',    text: 'var(--c-info-text)'    },
        warning:     { bg: 'var(--c-danger-bg)',  border: 'var(--c-danger-border)',  text: 'var(--c-danger-text)'  },
        progress:    { bg: 'var(--c-success-bg)', border: 'var(--c-success-border)', text: 'var(--c-success-text)' },
        praise:      { bg: 'var(--c-success-bg)', border: 'var(--c-success-border)', text: 'var(--c-success-text)' },
        reminder:    { bg: 'var(--c-warning-bg)', border: 'var(--c-warning-border)', text: 'var(--c-warning-text)' },
    };

    if (items.length === 0) {
        content.innerHTML = `<div class="notif-empty">
            <div class="notif-empty-icon">🔔</div>
            <div>Нових сповіщень немає</div>
        </div>`;
    } else {
        content.innerHTML = items.map(item => {
            const c = TYPE_COLORS[item.type] || TYPE_COLORS.reminder;
            return `
            <div class="notif-item" id="notifItem_${item.id}" style="background:${c.bg};border-color:${c.border};">
                <div class="notif-item-icon">${item.icon}</div>
                <div class="notif-item-body">
                    <div class="notif-item-title" style="color:${c.text};">${item.title}</div>
                    <div class="notif-item-text">${item.body}</div>
                    ${item.time ? `<div class="notif-item-time">${_fmt(item.time)}</div>` : ''}
                </div>
                <button class="notif-dismiss-btn" onclick="window.__zDismissNotif('${item.id}')" title="Ознайомлена">✓</button>
            </div>`;
        }).join('');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    window.__zDismissNotif = _dismissNotification;
}

export function closeNotifications() {
    const modal = document.getElementById('notifModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    updateNotificationBadge();
}

// ════════════════════════════════════════════════════
// ✓  DISMISS ОКРЕМОГО СПОВІЩЕННЯ
// ════════════════════════════════════════════════════

function _dismissNotification(id) {
    const fbP = _fbProfile();
    const now  = _kyivNow();
    let needSave = false;

    if (id === 'changelog') {
        markChangelogRead();                          // localStorage, без saveData
    } else if (id.startsWith('fb_')) {
        if (!state.data.isParent) {
            fbP.feedbackReplySeenAt = now;
        } else {
            fbP.feedbackNewSeenAt  = now;
            fbP.childCommentSeenAt = now;
        }
        needSave = true;
    } else if (id.startsWith('ach_')) {
        fbP.achievementSeenAt = now;
        needSave = true;
    } else if (id === 'cond_backup') {
        localStorage.setItem('backupReminderSeenDate', _kyivToday());
        _dismissId(id);
    } else {
        // cond_no_stars, cond_streak_risk, cond_goal_close, cond_good_dynamics
        _dismissId(id);
    }

    if (needSave) saveData();

    // Плавно прибираємо картку
    const el = document.getElementById(`notifItem_${id}`);
    if (el) {
        el.style.transition = 'opacity 0.2s';
        el.style.opacity = '0';
        setTimeout(() => {
            el.remove();
            const content = document.getElementById('notifContent');
            if (content && !content.querySelector('.notif-item')) {
                content.innerHTML = `<div class="notif-empty">
                    <div class="notif-empty-icon">🔔</div>
                    <div>Нових сповіщень немає</div>
                </div>`;
            }
        }, 200);
    }

    updateNotificationBadge();
    updateChangelogBadge();
}

// ════════════════════════════════════════════════════
// 📌  API
// ════════════════════════════════════════════════════

export function notifyAchievementEarned() { updateNotificationBadge(); }
export function notifyFeedbackChanged()   { updateNotificationBadge(); }
