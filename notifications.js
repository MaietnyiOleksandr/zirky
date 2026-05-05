// ════════════════════════════════════════════════════
// 🔔  notifications.js — Центр сповіщень
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260506.0009';

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

function _notif() {
    if (!state.data.notifications) state.data.notifications = {};
    const n = state.data.notifications;
    if (!n.child)  n.child  = {};
    if (!n.parent) n.parent = {};
    return n;
}

function _profile() {
    return state.data.isParent ? _notif().parent : _notif().child;
}

// ════════════════════════════════════════════════════
// 📥  ГЕНЕРАЦІЯ СПОВІЩЕНЬ
// ════════════════════════════════════════════════════

function _buildNotifications() {
    const isParent = !!state.data.isParent;
    const p        = _profile();
    const today    = _kyivToday();
    const items    = [];

    // ── 1. Changelog ─────────────────────────────────────
    // Показується у сповіщеннях АЛЕ не позначається прочитаним тут —
    // тільки через markChangelogRead() при відкритті модалки changelog
    const currentVer = CHANGELOG[0]?.version || '';
    if (p.changelogSeen !== currentVer) {
        items.push({
            id:    'changelog',
            icon:  '📝',
            title: 'Нова версія програми',
            body:  `Доступна версія ${currentVer}`,
            type:  'version',
        });
    }

    // ── 2. Feedback ───────────────────────────────────────
    const feedbackItems = getFeedbackItems();

    if (!isParent) {
        // Дитина: нові/змінені відповіді батьків та зміни статусу
        const seenAt = p.feedbackReplySeenAt || '1970-01-01T00:00';
        feedbackItems.forEach(item => {
            // Нова або змінена відповідь батьків
            if (item.commentAt && item.commentAt > seenAt) {
                const isNew = !item.prevCommentAt || item.commentAt === item.prevCommentAt;
                items.push({
                    id:   `fb_reply_${item.id}`,
                    icon: '💬',
                    title: isNew ? 'Нова відповідь батьків' : 'Змінено відповідь батьків',
                    body: `${item.category}: "${item.text.slice(0, 50)}${item.text.length > 50 ? '…' : ''}"`,
                    time: item.commentAt,
                    type: 'feedback',
                });
            }
            // Зміна статусу
            if (item.statusChangedAt && item.statusChangedAt > seenAt) {
                const STATUS_NAMES = { '⏳': 'Нове', '🔄': 'В опрацюванні', '✅': 'Виконано', '❌': 'Відхилено' };
                items.push({
                    id:   `fb_status_${item.id}`,
                    icon: '✅',
                    title: 'Оновлено статус запиту',
                    body: `${item.category} → ${item.status} ${STATUS_NAMES[item.status] || ''}`,
                    time: item.statusChangedAt,
                    type: 'feedback',
                });
            }
        });
    } else {
        // Батьки: нові фідбеки та коментарі дитини
        const newSeenAt     = p.feedbackNewSeenAt     || '1970-01-01T00:00';
        const commentSeenAt = p.childCommentSeenAt    || '1970-01-01T00:00';
        feedbackItems.forEach(item => {
            if (item.date > newSeenAt) {
                items.push({
                    id:   `fb_new_${item.id}`,
                    icon: '💬',
                    title: 'Нове повідомлення від дитини',
                    body: `${item.category}: "${item.text.slice(0, 50)}${item.text.length > 50 ? '…' : ''}"`,
                    time: item.date,
                    type: 'feedback',
                });
            }
            if (item.childCommentAt && item.childCommentAt > commentSeenAt) {
                const isEdit = item.prevChildCommentAt && item.childCommentAt !== item.prevChildCommentAt;
                items.push({
                    id:   `fb_comment_${item.id}`,
                    icon: '✏️',
                    title: isEdit ? 'Дитина змінила коментар' : 'Дитина додала коментар',
                    body: `До запиту: "${item.text.slice(0, 50)}${item.text.length > 50 ? '…' : ''}"`,
                    time: item.childCommentAt,
                    type: 'feedback',
                });
            }
        });
    }

    // ── 3. Досягнення ─────────────────────────────────────
    const achSeenAt = p.achievementSeenAt || '1970-01-01T00:00';
    const newAch = (state.data.records || []).filter(r =>
        r.category === 'achievement' && r.type === 'earn' &&
        r.date > achSeenAt
    );
    newAch.forEach(r => {
        items.push({
            id:   `ach_${r.id}`,
            icon: '🏆',
            title: 'Нове досягнення',
            body:  `${r.description || r.desc} +${r.stars}⭐`,
            time:  r.date,
            type:  'achievement',
        });
    });

    // ── 4. Умовні (перевіряємо щодня) ────────────────────
    const condSeen = p.conditionsSeenDate;
    const showCond = condSeen !== today;

    if (showCond) {
        const records  = state.data.records || [];
        const earnRecs = records.filter(r => r.type === 'earn' && r.category !== 'achievement');

        // Зірки не додавались > 24 годин
        const lastEarn = earnRecs.length
            ? earnRecs.reduce((a, b) => a.date > b.date ? a : b)
            : null;
        if (lastEarn) {
            const lastDate = new Date(lastEarn.date);
            const now      = new Date(_kyivNow());
            const diffH    = (now - lastDate) / 3_600_000;
            if (diffH >= 24) {
                items.push({
                    id:   'cond_no_stars',
                    icon: '⭐',
                    title: 'Зірки не додавались',
                    body:  `Більше доби без нових зірок. Час щось заробити!`,
                    type:  'reminder',
                });
            }
        } else {
            items.push({
                id:   'cond_no_stars',
                icon: '⭐',
                title: 'Зірки не додавались',
                body:  'Ще не було жодного нарахування. Час почати!',
                type:  'reminder',
            });
        }

        // Ризик серії: сьогодні будній день і ще немає записів
        const todayEarn = earnRecs.filter(r => _kyivDate(r.date) === today);
        const nowDate   = new Date(_kyivNow());
        const dayOfWeek = nowDate.getDay(); // 0=нд, 6=сб
        const hour      = nowDate.getHours();
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const streak    = state.data.achievements?.streaks?.earning?.current || 0;
        if (isWeekday && hour >= 16 && todayEarn.length === 0 && streak > 0) {
            items.push({
                id:   'cond_streak_risk',
                icon: '🔥',
                title: 'Ризик серії!',
                body:  `Сьогодні ще не додано зірок. Серія: ${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дні' : 'днів'}`,
                type:  'warning',
            });
        }

        // Ціль близько (≥ 90%)
        const goal    = state.data.goal;
        const balance = state.data.balance || 0;
        if (goal?.target && balance >= goal.target * 0.9 && balance < goal.target) {
            const left = goal.target - balance;
            items.push({
                id:   'cond_goal_close',
                icon: '🎯',
                title: 'Ціль майже досягнута!',
                body:  `Ще ${left}⭐ до "${goal.name || 'мети'}"`,
                type:  'progress',
            });
        }

        // Хороша динаміка (цей тиждень > минулий на ≥ 20%)
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
        const thisWeek = getWeekEarned(0);
        const lastWeek = getWeekEarned(1);
        if (lastWeek > 0 && thisWeek >= lastWeek * 1.2 && thisWeek >= 5) {
            items.push({
                id:   'cond_good_dynamics',
                icon: '📈',
                title: 'Чудова динаміка!',
                body:  `Цього тижня ${thisWeek}⭐ — на ${Math.round((thisWeek/lastWeek - 1)*100)}% більше ніж минулого`,
                type:  'praise',
            });
        }

        // Резервна копія (тільки батькам, через localStorage)
        if (isParent) {
            const lastBackup = localStorage.getItem('backupReminderSeenDate');
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

    }


    // Сортуємо: подійні по часу, умовні в кінці
    const order = { feedback: 0, achievement: 1, version: 2, warning: 3, progress: 4, praise: 5, reminder: 6, info: 7 };
    items.sort((a, b) => {
        const od = (order[a.type] ?? 9) - (order[b.type] ?? 9);
        if (od !== 0) return od;
        if (a.time && b.time) return b.time.localeCompare(a.time);
        return 0;
    });

    return items;
}

// ════════════════════════════════════════════════════
// 🔴  БЕЙДЖ — червона крапка
// ════════════════════════════════════════════════════

export function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const items = _buildNotifications();
    if (items.length > 0) {
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// ════════════════════════════════════════════════════
// 📝  БЕЙДЖ CHANGELOG
// ════════════════════════════════════════════════════

export function updateChangelogBadge() {
    const badge      = document.getElementById('changelogBadge');
    if (!badge) return;
    const currentVer = CHANGELOG[0]?.version || '';
    const seenVer    = _profile().changelogSeen || '';
    badge.style.display = seenVer !== currentVer ? 'block' : 'none';
}

export function markChangelogRead() {
    const p   = _profile();
    const ver = CHANGELOG[0]?.version || '';
    p.changelogSeen = ver;
    saveData();
    updateChangelogBadge();
    updateNotificationBadge();  // синхронізуємо обидва бейджі
}

// ════════════════════════════════════════════════════
// 📬  ВІДКРИТТЯ ПАНЕЛІ
// ════════════════════════════════════════════════════

export function openNotifications() {
    const modal   = document.getElementById('notifModal');
    const content = document.getElementById('notifContent');
    if (!modal || !content) return;

    const items = _buildNotifications();

    if (items.length === 0) {
        content.innerHTML = `<div class="notif-empty">
            <div class="notif-empty-icon">🔔</div>
            <div>Нових сповіщень немає</div>
        </div>`;
    } else {
        const TYPE_COLORS = {
            feedback:    { bg: 'var(--c-purple-bg)',  border: 'var(--c-purple-border)',  text: 'var(--c-purple-text)'  },
            achievement: { bg: 'var(--c-balance-bg)', border: 'var(--c-balance-border)', text: 'var(--c-balance-text)' },
            version:     { bg: 'var(--c-info-bg)',    border: 'var(--c-info-border)',    text: 'var(--c-info-text)'    },
            warning:     { bg: 'var(--c-danger-bg)',  border: 'var(--c-danger-border)',  text: 'var(--c-danger-text)'  },
            progress:    { bg: 'var(--c-success-bg)', border: 'var(--c-success-border)', text: 'var(--c-success-text)' },
            praise:      { bg: 'var(--c-success-bg)', border: 'var(--c-success-border)', text: 'var(--c-success-text)' },
            reminder:    { bg: 'var(--c-warning-bg)', border: 'var(--c-warning-border)', text: 'var(--c-warning-text)' },
            info:        { bg: 'var(--c-info-bg)',    border: 'var(--c-info-border)',    text: 'var(--c-info-text)'    },
        };

        content.innerHTML = items.map(item => {
            const c = TYPE_COLORS[item.type] || TYPE_COLORS.info;
            return `
            <div class="notif-item" style="background:${c.bg};border-color:${c.border};">
                <div class="notif-item-icon">${item.icon}</div>
                <div class="notif-item-body">
                    <div class="notif-item-title" style="color:${c.text};">${item.title}</div>
                    <div class="notif-item-text">${item.body}</div>
                    ${item.time ? `<div class="notif-item-time">${_fmt(item.time)}</div>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Позначаємо як прочитані
    _markAllRead();
}

export function closeNotifications() {
    const modal = document.getElementById('notifModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    updateNotificationBadge();
    // updateChangelogBadge — не чіпаємо, changelog прибирається тільки через markChangelogRead
}

function _markAllRead() {
    const p       = _profile();
    const now     = _kyivNow();
    const today   = _kyivToday();
    const isParent = !!state.data.isParent;

    if (!isParent) {
        p.feedbackReplySeenAt  = now;
        p.achievementSeenAt    = now;
        p.conditionsSeenDate   = today;
        // changelogSeen — не торкаємось, позначається тільки через markChangelogRead()
    } else {
        p.feedbackNewSeenAt    = now;
        p.childCommentSeenAt   = now;
        p.achievementSeenAt    = now;
        p.conditionsSeenDate   = today;
        // changelogSeen — не торкаємось, позначається тільки через markChangelogRead()
        localStorage.setItem('backupReminderSeenDate', today);
    }

    saveData();
}

// ════════════════════════════════════════════════════
// 📌  ЗОВНІШНІЙ API для інших модулів
// ════════════════════════════════════════════════════

// Викликати після отримання нового досягнення
export function notifyAchievementEarned() {
    updateNotificationBadge();
}

// Викликати після збереження/зміни статусу feedback
export function notifyFeedbackChanged() {
    updateNotificationBadge();
}
