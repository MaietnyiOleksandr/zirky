// ════════════════════════════════════════════════════
// 📋  tasks.js — Завдання та запити
//
//     Модуль реалізує дві функції:
//     1. child_request — дитина надсилає запит на нарахування
//        зі звичайних форм блоку "Додати". Батьки підтверджують
//        або відхиляють. Підтверджені → commitRecord() → запис
//        в Історії стандартний.
//     2. parent_task — батьки створюють завдання з опційним
//        дедлайном. Дитина виконує (або відмовляється з коментарем).
//        Виконані → батьки підтверджують → commitRecord().
//
//     Обидва потоки використовують спільну гілку Firebase
//     zirky-tasks/ та однакову схему даних, розрізняючи себе
//     полем `origin`.
//
//     Автовидалення confirmed/rejected через 7 днів.
//     Live-таймер дедлайну з паузою при прихованій вкладці.
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260522.1735';

import { state, tasksFilter } from './state.js';
import { isDoubleSubject } from './subjects.js';
import { gradeToStars } from './config.js';
import { commitRecord } from './records.js';
import { saveTask, deleteTask as fbDeleteTask, deleteTasks as fbDeleteTasks, initTasksListener } from './firebase.js';
import { nowKyiv, pulseElement } from './utils.js';
import { hasUnreadTaskNotification, dismissTaskNotifications } from './notifications.js';

// ════════════════════════════════════════════════════════════
// 🎛️  Константи
// ════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
    pending:   { label: '⏳ Чекає підтвердження', cls: 'tk-st-pending'   },
    active:    { label: '🎯 Активне',              cls: 'tk-st-active'    },
    done:      { label: '✔️ Виконано (на перевірці)', cls: 'tk-st-done'  },
    confirmed: { label: '✅ Підтверджено',         cls: 'tk-st-confirmed' },
    rejected:  { label: '❌ Відхилено',            cls: 'tk-st-rejected'  },
};

const REJECT_REASONS_PARENT = [
    'Не підтверджено',
    'Зроблено не повністю',
    'Ще раз перевір',
];

const DECLINE_REASONS_CHILD = [
    'Не хочу',
    'Не встигну',
    'Не маю змоги зараз',
];

const CLEANUP_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ════════════════════════════════════════════════════════════
// 🔧  Приватні утиліти
// ════════════════════════════════════════════════════════════

function _genId() {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function _todayISO() {
    return nowKyiv().slice(0, 10);
}

function _esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ════════════════════════════════════════════════════════════
// 🔴  Бейдж + клік на картку
// ════════════════════════════════════════════════════════════
//   _cardClasses(taskId) — повертає CSS-класи з ' has-badge' якщо
//     є непрочитане сповіщення про цю таску.
//   handleCardClick(taskId) — глобальний onclick картки:
//     • анімація pulseElement (glow якщо був бейдж, scale якщо ні)
//     • dismiss всіх tasks-сповіщень цього taskId
//     • знімає клас has-badge з DOM
//   Викликається з усіх рендер-функцій карток.
// ════════════════════════════════════════════════════════════
// 🔴  Бейдж через <span class="z-badge"> всередині картки
// ════════════════════════════════════════════════════════════
// Єдиний підхід — span, як і на дзвіночку, табах, акордеонах.
// _cardBadgeSpan() — генерує HTML span (прихований або видимий).
// _handleCardClick() — анімація + dismiss + ховає span.

function _cardClasses(taskId, baseClasses) {
    // z-badged більше не потрібен — span сам позиціонується
    return baseClasses;
}

function _cardBadgeSpan(taskId) {
    const hasBadge = taskId ? hasUnreadTaskNotification(taskId) : false;
    const hidden = hasBadge ? '' : ' z-badge--hidden';
    return `<span class="z-badge${hidden}" id="cardBadge_${taskId}"></span>`;
}

function _handleCardClick(taskId, evt) {
    if (evt && evt.target && evt.target.closest('button, input, textarea, select, a')) return;

    const card    = document.getElementById(`tkCard_${taskId}`);
    const badge   = document.getElementById(`cardBadge_${taskId}`);
    const hadBadge = badge && !badge.classList.contains('z-badge--hidden');

    // Анімація: glow+scale якщо був бейдж, тільки scale якщо ні
    if (card) pulseElement(card, hadBadge);

    if (hadBadge) {
        dismissTaskNotifications(taskId);
        badge.classList.add('z-badge--hidden');
    }
}

if (typeof window !== 'undefined') {
    window.tkCardClick = _handleCardClick;
}

function _fmtDateTime(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('uk-UA', {
            day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return iso; }
}

// Усі завдання як масив, відсортовані за createdAt desc
function _allTasks() {
    const obj = state.data.tasks || {};
    return Object.values(obj).sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || ''));
}

// Формуємо record з task — використовується в confirmTask
function _taskToRecord(task) {
    const dateField = task.date || (_todayISO() + 'T12:00:00');
    const base = {
        id: Date.now(),
        date: dateField,
        stars: Number(task.stars) || 0,
        type: 'earn',
        category: task.category,
    };

    if (task.category === 'grade') {
        base.subject = task.subject;
        base.grade = task.grade;
    } else if (task.category === 'diagnostic') {
        base.subject = task.subject; // вже "Діагностувальна робота з ..."
        base.grade = task.grade;
    } else if (task.category === 'bonus') {
        base.description = task.title;
        if (task.subcategory) base.subcategory = task.subcategory;
        if (task.counterKey)  base.counterKey  = task.counterKey;
        if (task.pages)       base.pages       = task.pages;
    } else if (task.category === 'special') {
        base.description = task.title;
    }
    return base;
}

// ════════════════════════════════════════════════════════════
// ⏰  Live-таймер дедлайну
// ════════════════════════════════════════════════════════════

let _timerInterval = null;

function _startTimer() {
    if (_timerInterval) return;
    _timerInterval = setInterval(updateTaskTimers, 60000);
}

function _stopTimer() {
    if (_timerInterval) {
        clearInterval(_timerInterval);
        _timerInterval = null;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        _stopTimer();
    } else {
        updateTaskTimers();
        _startTimer();
    }
});

function _deadlineLabel(deadlineISO) {
    if (!deadlineISO) return '';
    const now = Date.now();
    const dl = new Date(deadlineISO).getTime();
    if (isNaN(dl)) return '';
    const diff = dl - now;

    if (diff <= 0) {
        return `<span class="tk-deadline tk-deadline--overdue">⏰ Прострочено</span>`;
    }

    const min = Math.floor(diff / 60000);
    const h   = Math.floor(min / 60);
    const d   = Math.floor(h / 24);

    let txt;
    if (d > 0) txt = `${d}д ${h % 24}г`;
    else if (h > 0) txt = `${h}г ${min % 60}хв`;
    else txt = `${min}хв`;

    const cls = (diff < 60 * 60 * 1000) ? 'tk-deadline--warn' : '';
    return `<span class="tk-deadline ${cls}">⏰ ${txt}</span>`;
}

export function updateTaskTimers() {
    document.querySelectorAll('[data-deadline]').forEach(el => {
        const dl = el.getAttribute('data-deadline');
        el.innerHTML = _deadlineLabel(dl);
    });
}

// ════════════════════════════════════════════════════════════
// 🧹  Автовидалення старих завершених/відхилених (7 днів)
// ════════════════════════════════════════════════════════════

export function cleanupOldTasks() {
    const tasks = state.data.tasks || {};
    const now = Date.now();
    const toDelete = [];
    for (const id in tasks) {
        const t = tasks[id];
        if (t.status !== 'confirmed' && t.status !== 'rejected') continue;
        const ts = t.confirmedAt || t.rejectedAt;
        if (!ts) continue;
        if (now - new Date(ts).getTime() > CLEANUP_DAYS_MS) {
            toDelete.push(id);
        }
    }
    if (toDelete.length) {
        fbDeleteTasks(toDelete);
    }
}

// ════════════════════════════════════════════════════════════
// 📨  ДИТЯЧІ ЗАПИТИ (child_request) — створення з форм "Додати"
// ════════════════════════════════════════════════════════════

export function submitGradeRequest() {
    const date    = document.getElementById('gradeDate')?.value;
    const subject = document.getElementById('subject')?.value;
    const grade   = document.getElementById('grade')?.value;

    if (!date || !subject || !grade) {
        alert('❌ Заповніть всі поля!');
        return;
    }

    let stars = gradeToStars[grade];
    if (isDoubleSubject(subject)) stars *= 2;

    const task = {
        id: _genId(),
        origin: 'child_request',
        category: 'grade',
        title: `${subject} — ${grade} балів`,
        subject,
        grade,
        stars,
        date: date + 'T12:00:00',
        status: 'pending',
        createdAt: nowKyiv(),
    };

    saveTask(task);
    _clearFormFields(['subject', 'grade']);
    if (window.generateNotifications) window.generateNotifications();
    alert(`📨 Запит відправлено батькам на перевірку!\n\n${task.title}\nЗірок: ${stars}⭐`);
}

export function submitDiagnosticRequest() {
    const date    = document.getElementById('diagnosticDate')?.value;
    const subject = document.getElementById('diagnosticSubject')?.value;
    const grade   = document.getElementById('diagnosticGrade')?.value;

    if (!date || !subject || !grade) {
        alert('❌ Заповніть всі поля!');
        return;
    }

    let stars = gradeToStars[grade];
    const doubled = isDoubleSubject(subject);
    if (doubled) stars *= 6;
    else stars *= 3;

    const task = {
        id: _genId(),
        origin: 'child_request',
        category: 'diagnostic',
        title: `Діагностувальна робота з ${subject} — ${grade} балів`,
        subject: `Діагностувальна робота з ${subject}`,
        grade,
        stars,
        date: date + 'T12:00:00',
        status: 'pending',
        createdAt: nowKyiv(),
    };

    saveTask(task);
    _clearFormFields(['diagnosticSubject', 'diagnosticGrade']);
    if (window.generateNotifications) window.generateNotifications();
    alert(`📨 Запит відправлено батькам на перевірку!\n\n${task.title}\nЗірок: ${stars}⭐`);
}

export function submitBonusRequest() {
    const date      = document.getElementById('bonusDate')?.value;
    const bonusType = document.getElementById('bonusType')?.value;

    if (!date || !bonusType) {
        alert('❌ Заповніть всі поля!');
        return;
    }

    const [name, starsRaw, subcategory = '', counterKey = ''] = bonusType.split('|');
    const stars = parseInt(starsRaw);

    // Сторінки книги — обов'язкове поле
    const pagesInput = document.getElementById('bookPages');
    let pages;
    if (counterKey === 'books') {
        const pagesVal = pagesInput ? parseInt(pagesInput.value) : NaN;
        if (!pagesVal || pagesVal < 1) {
            alert('📄 Вкажіть кількість сторінок у книзі!');
            if (pagesInput) pagesInput.focus();
            return;
        }
        pages = pagesVal;
    }

    const task = {
        id: _genId(),
        origin: 'child_request',
        category: 'bonus',
        title: name,
        stars,
        date: date + 'T12:00:00',
        status: 'pending',
        createdAt: nowKyiv(),
    };
    if (subcategory) task.subcategory = subcategory;
    if (counterKey)  task.counterKey  = counterKey;
    if (pages)       task.pages       = pages;

    saveTask(task);
    _clearFormFields(['bonusType', 'bookPages']);
    if (window.generateNotifications) window.generateNotifications();
    alert(`📨 Запит відправлено батькам на перевірку!\n\n${task.title}\nЗірок: ${stars}⭐`);
}

function _clearFormFields(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// ════════════════════════════════════════════════════════════
// 👨‍👩‍👧  БАТЬКІВСЬКІ ЗАВДАННЯ (parent_task) — створення
// ════════════════════════════════════════════════════════════

export function openParentTaskForm() {
    const form = document.getElementById('parentTaskForm');
    if (form) form.style.display = 'block';
    const btn = document.getElementById('openParentTaskFormBtn');
    if (btn) btn.style.display = 'none';
}

export function closeParentTaskForm() {
    const form = document.getElementById('parentTaskForm');
    if (form) form.style.display = 'none';
    const btn = document.getElementById('openParentTaskFormBtn');
    if (btn) btn.style.display = '';
    _resetParentTaskForm();
}

function _resetParentTaskForm() {
    const ids = ['ptaskBonusType', 'ptaskBookPages', 'ptaskSpecialDesc',
                 'ptaskSpecialStars', 'ptaskDeadlineDate'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const cb = document.getElementById('ptaskHasDeadline');
    if (cb) cb.checked = false;
    const cbNoReward = document.getElementById('ptaskNoReward');
    if (cbNoReward) cbNoReward.checked = false;
    const rewardInput = document.getElementById('ptaskRewardStars');
    if (rewardInput) { rewardInput.value = '1'; rewardInput.disabled = false; rewardInput.style.opacity = ''; }
    onParentTaskDeadlineToggle();
    onParentTaskCategoryChange();
}

export function onParentTaskCategoryChange() {
    const cat = document.querySelector('input[name="ptaskCategory"]:checked')?.value || 'bonus';
    const bonusBlock   = document.getElementById('ptaskBonusBlock');
    const specialBlock = document.getElementById('ptaskSpecialBlock');
    if (bonusBlock)   bonusBlock.style.display   = (cat === 'bonus')   ? 'block' : 'none';
    if (specialBlock) specialBlock.style.display = (cat === 'special') ? 'block' : 'none';
    onParentTaskBonusChange();
}

export function onParentTaskBonusChange() {
    const sel = document.getElementById('ptaskBonusType');
    if (!sel) return;
    const val = sel.value;
    const pagesGroup = document.getElementById('ptaskBookPagesGroup');
    if (!pagesGroup) return;
    const isBook = val && val.split('|')[3] === 'books';
    pagesGroup.style.display = isBook ? 'block' : 'none';
}

export function onParentTaskDeadlineToggle() {
    const cb = document.getElementById('ptaskHasDeadline');
    const block = document.getElementById('ptaskDeadlineBlock');
    if (block) block.style.display = (cb && cb.checked) ? 'block' : 'none';
}

export function onParentTaskNoRewardToggle() {
    const cb = document.getElementById('ptaskNoReward');
    const input = document.getElementById('ptaskRewardStars');
    if (!cb || !input) return;
    input.disabled = cb.checked;
    if (cb.checked) {
        input.style.opacity = '0.5';
    } else {
        input.style.opacity = '';
        if (!input.value || input.value === '0') input.value = '1';
    }
}

export function submitParentTask() {
    const cat = document.querySelector('input[name="ptaskCategory"]:checked')?.value || 'bonus';

    let title, stars, extra = {};

    if (cat === 'bonus') {
        const bonusType = document.getElementById('ptaskBonusType')?.value;
        if (!bonusType) { alert('❌ Оберіть бонус!'); return; }
        const [name, starsRaw, subcategory = '', counterKey = ''] = bonusType.split('|');
        title = name;
        stars = parseInt(starsRaw);
        if (counterKey === 'books') {
            const pagesVal = parseInt(document.getElementById('ptaskBookPages')?.value);
            if (!pagesVal || pagesVal < 1) {
                alert('📄 Вкажіть кількість сторінок у книзі!');
                return;
            }
            extra.pages = pagesVal;
        }
        if (subcategory) extra.subcategory = subcategory;
        if (counterKey)  extra.counterKey  = counterKey;
        extra.category = 'bonus';
    } else {
        const desc = document.getElementById('ptaskSpecialDesc')?.value?.trim();
        const st   = parseInt(document.getElementById('ptaskSpecialStars')?.value);
        if (!desc || !st || st < 1) { alert('❌ Заповніть опис та кількість зірок!'); return; }
        title = desc;
        stars = st;
        extra.category = 'special';
    }

    const hasDeadline = document.getElementById('ptaskHasDeadline')?.checked || false;
    let deadline = null;
    if (hasDeadline) {
        deadline = document.getElementById('ptaskDeadlineDate')?.value;
        if (!deadline) { alert('⏰ Вкажіть дату і час дедлайну!'); return; }
        // Перевіряємо що дедлайн у майбутньому
        if (new Date(deadline).getTime() < Date.now()) {
            if (!confirm('⚠️ Вказаний дедлайн вже минув. Все одно створити?')) return;
        }
    }

    // Винагорода за виконання завдання
    const noReward = document.getElementById('ptaskNoReward')?.checked || false;
    let rewardStars = 0;
    if (!noReward) {
        const rs = parseInt(document.getElementById('ptaskRewardStars')?.value);
        if (isNaN(rs) || rs < 0) {
            alert('🎁 Вкажіть коректну кількість зірок винагороди або позначте "Без додаткової винагороди"');
            return;
        }
        rewardStars = rs;
    }

    const task = {
        id: _genId(),
        origin: 'parent_task',
        category: extra.category,
        title,
        stars,
        status: 'active',
        createdAt: nowKyiv(),
        hasDeadline,
        rewardStars,
    };
    if (deadline) task.deadline = deadline;
    if (extra.subcategory) task.subcategory = extra.subcategory;
    if (extra.counterKey)  task.counterKey  = extra.counterKey;
    if (extra.pages)       task.pages       = extra.pages;

    saveTask(task);
    closeParentTaskForm();
    if (window.generateNotifications) window.generateNotifications();
    const rewardLine = rewardStars > 0 ? `\n🎁 Винагорода: +${rewardStars}⭐` : '';
    alert(`✅ Завдання створено!\n\n${title}\nЗірок: ${stars}⭐${rewardLine}${deadline ? '\nДедлайн: ' + _fmtDateTime(deadline) : ''}`);
}

// ════════════════════════════════════════════════════════════
// ✅  ДІЇ — підтвердження / відхилення (батьки)
// ════════════════════════════════════════════════════════════

export function confirmTask(id) {
    const task = state.data.tasks?.[id];
    if (!task) { alert('Завдання не знайдено'); return; }

    // Захист від подвійного підтвердження
    if (task.status === 'confirmed') return;

    // Контекстна перевірка статусу
    if (task.origin === 'child_request' && task.status !== 'pending') {
        alert('Цей запит вже оброблено');
        return;
    }
    if (task.origin === 'parent_task' && task.status !== 'done') {
        alert('Дитина ще не виконала це завдання');
        return;
    }

    // Діалог підтвердження
    const rewardLine = (task.origin === 'parent_task' && task.rewardStars > 0)
        ? `\n🎁 + Винагорода: ${task.rewardStars}⭐\n💰 Всього буде нараховано: ${Number(task.stars) + Number(task.rewardStars)}⭐`
        : `\n💰 Буде нараховано: ${task.stars}⭐`;
    const confirmText = task.origin === 'child_request'
        ? `Підтвердити запит дитини?\n\n"${task.title}"${rewardLine}`
        : `Підтвердити виконання завдання?\n\n"${task.title}"${rewardLine}`;
    if (!confirm(confirmText)) return;

    // 1. Створюємо стандартний запис у records[] через спільну функцію
    const record = _taskToRecord(task);
    commitRecord(record);

    // 1b. Якщо це parent_task з винагородою — додаємо ДРУГИЙ запис категорії 'task_reward'
    // Дитячі запити (child_request) винагороди не отримують — ми домовились
    if (task.origin === 'parent_task' && task.rewardStars && Number(task.rewardStars) > 0) {
        commitRecord({
            id: Date.now() + 1,                       // унікальний id, щоб не співпав з основним
            date: record.date,                        // та сама дата що й основний запис
            description: `✅ Виконане завдання: ${task.title}`,
            stars: Number(task.rewardStars),
            type: 'earn',
            category: 'task_reward',
            taskId: task.id,                          // для діагностики/майбутніх фільтрів
        });
    }

    // 2. Оновлюємо task — статус confirmed
    task.status = 'confirmed';
    task.confirmedAt = nowKyiv();
    saveTask(task);

    if (window.generateNotifications) window.generateNotifications();
    renderTasks();
}

export function startRejectTask(id) {
    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const block = card.querySelector('.tk-reject-block');
    if (block) block.style.display = 'block';
}

export function cancelRejectTask(id) {
    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const block = card.querySelector('.tk-reject-block');
    if (block) block.style.display = 'none';
    const ta = card.querySelector('.tk-reject-input');
    if (ta) ta.value = '';
}

export function selectRejectReason(id, reason) {
    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const ta = card.querySelector('.tk-reject-input');
    if (ta) ta.value = reason;
}

export function submitRejectTask(id) {
    const task = state.data.tasks?.[id];
    if (!task) return;
    if (task.status === 'rejected' || task.status === 'confirmed') return;

    const card = document.getElementById(`tkCard_${id}`);
    const ta = card?.querySelector('.tk-reject-input');
    const comment = ta?.value?.trim();
    if (!comment) {
        alert('❗ Оберіть причину або напишіть свій коментар');
        return;
    }

    task.status = 'rejected';
    task.rejectedAt = nowKyiv();
    task.rejectComment = comment;
    saveTask(task);

    if (window.generateNotifications) window.generateNotifications();
    renderTasks();
}

// ════════════════════════════════════════════════════════════
// 👧  ДІЇ — виконання / відмова (дитина)
// ════════════════════════════════════════════════════════════

export function markTaskDone(id) {
    const task = state.data.tasks?.[id];
    if (!task) return;
    if (task.origin !== 'parent_task') return;
    if (task.status !== 'active') return;

    // Діалог підтвердження
    const rewardLine = (task.rewardStars > 0)
        ? `\n🎁 + Винагорода: ${task.rewardStars}⭐\n💰 Всього отримаєш: ${Number(task.stars) + Number(task.rewardStars)}⭐`
        : `\n💰 Отримаєш: ${task.stars}⭐`;
    if (!confirm(`Ти впевнена що виконала завдання?\n\n"${task.title}"${rewardLine}\n\nБатьки перевірять і підтвердять.`)) return;

    task.status = 'done';
    task.doneAt = nowKyiv();
    saveTask(task);

    if (window.generateNotifications) window.generateNotifications();
    renderTasks();
}

export function startDeclineTask(id) {
    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const block = card.querySelector('.tk-decline-block');
    if (block) block.style.display = 'block';
}

export function cancelDeclineTask(id) {
    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const block = card.querySelector('.tk-decline-block');
    if (block) block.style.display = 'none';
    const ta = card.querySelector('.tk-decline-input');
    if (ta) ta.value = '';
}

export function selectDeclineReason(id, reason) {
    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const ta = card.querySelector('.tk-decline-input');
    if (ta) ta.value = reason;
}

export function submitDeclineTask(id) {
    const task = state.data.tasks?.[id];
    if (!task) return;
    if (task.origin !== 'parent_task') return;
    if (task.status !== 'active') return;

    const card = document.getElementById(`tkCard_${id}`);
    const ta = card?.querySelector('.tk-decline-input');
    const comment = ta?.value?.trim();
    if (!comment) {
        alert('❗ Оберіть причину або напишіть свій коментар');
        return;
    }

    // Статус залишається active (батьки бачать коментар і вирішують самі)
    task.childComment = comment;
    task.declinedAt = nowKyiv();
    saveTask(task);

    if (window.generateNotifications) window.generateNotifications();
    renderTasks();
}

// Дитина передумала — кнопка "Все ж виконати" знімає childComment і дає виконати
export function clearChildDecline(id) {
    const task = state.data.tasks?.[id];
    if (!task) return;
    if (task.childComment) {
        if (!confirm('Видалити твою відмову та продовжити виконання?')) return;
        delete task.childComment;
        delete task.declinedAt;
        saveTask(task);
        renderTasks();
    }
}

// ════════════════════════════════════════════════════════════
// 🗑️  Видалення дитиною свого запиту
// ════════════════════════════════════════════════════════════
// Дитина може видалити свій child_request тільки якщо:
//   - запит ще pending (батьки ще не обробили)
//   - або вже rejected (прибрати з виду без очікування 7 днів)
// Confirmed запити НЕ можна — запис вже в Історії, його видаляє лише
// батьки звичайним способом через 🗑️ у Історії.
export function deleteOwnRequest(id) {
    const task = state.data.tasks?.[id];
    if (!task) return;
    if (task.origin !== 'child_request') {
        alert('Це не твій запит — видаляти його не можна');
        return;
    }
    if (task.status === 'confirmed') {
        alert('Підтверджений запит вже в Історії. Видалити його можуть лише батьки через розділ Історія.');
        return;
    }
    if (!confirm(`Видалити запит "${task.title}"?`)) return;
    fbDeleteTask(id);
    if (window.generateNotifications) window.generateNotifications();
}

// ════════════════════════════════════════════════════════════
// ✏️  Редагування завдання (батьки)
// ════════════════════════════════════════════════════════════
// Дозволено для parent_task у статусі active або done.
// Дитячих запитів не торкаємось.
// Редагуються: дедлайн (можна додати/змінити/зняти) і винагорода
// (можна змінити кількість або зняти зовсім).

export function startEditTask(id) {
    const task = state.data.tasks?.[id];
    if (!task) return;
    if (task.origin !== 'parent_task') return;
    if (task.status !== 'active' && task.status !== 'done') return;

    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const block = card.querySelector('.tk-edit-block');
    if (!block) return;

    // Заповнюємо поточними значеннями
    const cbDeadline = block.querySelector('.tk-edit-has-deadline');
    const inputDeadline = block.querySelector('.tk-edit-deadline');
    const deadlineWrap = block.querySelector('.tk-edit-deadline-wrap');
    if (cbDeadline) cbDeadline.checked = !!task.hasDeadline;
    if (inputDeadline) inputDeadline.value = task.deadline || '';
    if (deadlineWrap) deadlineWrap.style.display = task.hasDeadline ? 'block' : 'none';

    const cbNoReward = block.querySelector('.tk-edit-no-reward');
    const inputReward = block.querySelector('.tk-edit-reward');
    const noReward = !task.rewardStars || Number(task.rewardStars) === 0;
    if (cbNoReward) cbNoReward.checked = noReward;
    if (inputReward) {
        inputReward.value = noReward ? '1' : task.rewardStars;
        inputReward.disabled = noReward;
        inputReward.style.opacity = noReward ? '0.5' : '';
    }

    block.style.display = 'block';
}

export function cancelEditTask(id) {
    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const block = card.querySelector('.tk-edit-block');
    if (block) block.style.display = 'none';
}

export function onEditDeadlineToggle(id) {
    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const cb = card.querySelector('.tk-edit-has-deadline');
    const wrap = card.querySelector('.tk-edit-deadline-wrap');
    if (wrap) wrap.style.display = (cb && cb.checked) ? 'block' : 'none';
}

export function onEditNoRewardToggle(id) {
    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;
    const cb = card.querySelector('.tk-edit-no-reward');
    const input = card.querySelector('.tk-edit-reward');
    if (!cb || !input) return;
    input.disabled = cb.checked;
    input.style.opacity = cb.checked ? '0.5' : '';
    if (!cb.checked && (!input.value || input.value === '0')) input.value = '1';
}

export function saveEditTask(id) {
    const task = state.data.tasks?.[id];
    if (!task) return;
    if (task.origin !== 'parent_task') return;
    if (task.status !== 'active' && task.status !== 'done') return;

    const card = document.getElementById(`tkCard_${id}`);
    if (!card) return;

    // Дедлайн
    const hasDeadline = !!card.querySelector('.tk-edit-has-deadline')?.checked;
    let deadline = null;
    if (hasDeadline) {
        deadline = card.querySelector('.tk-edit-deadline')?.value || '';
        if (!deadline) { alert('⏰ Вкажіть дату і час дедлайну!'); return; }
        if (new Date(deadline).getTime() < Date.now()) {
            if (!confirm('⚠️ Вказаний дедлайн вже минув. Все одно зберегти?')) return;
        }
    }

    // Винагорода
    const noReward = !!card.querySelector('.tk-edit-no-reward')?.checked;
    let rewardStars = 0;
    if (!noReward) {
        const rs = parseInt(card.querySelector('.tk-edit-reward')?.value);
        if (isNaN(rs) || rs < 0) {
            alert('🎁 Вкажіть коректну кількість зірок винагороди або позначте "Без додаткової винагороди"');
            return;
        }
        rewardStars = rs;
    }

    // Чи реально щось змінилось — щоб не створювати зайве сповіщення
    const oldDeadline = task.hasDeadline ? (task.deadline || '') : '';
    const newDeadline = hasDeadline ? deadline : '';
    const deadlineChanged = oldDeadline !== newDeadline;
    const oldReward = Number(task.rewardStars) || 0;
    const rewardChanged = oldReward !== rewardStars;

    if (!deadlineChanged && !rewardChanged) {
        cancelEditTask(id);
        return; // нічого не змінилось — мовчки виходимо
    }

    task.hasDeadline = hasDeadline;
    if (hasDeadline) task.deadline = deadline;
    else delete task.deadline;
    task.rewardStars = rewardStars;
    task.updatedAt = nowKyiv();

    // Опис зміни для сповіщення дитини
    const changes = [];
    if (deadlineChanged) {
        if (hasDeadline) changes.push(`новий дедлайн: ${_fmtDateTime(deadline)}`);
        else changes.push('дедлайн знято');
    }
    if (rewardChanged) {
        if (rewardStars > 0) changes.push(`винагорода: +${rewardStars}⭐`);
        else changes.push('винагороду знято');
    }
    task.lastEditNote = changes.join(' · ');

    saveTask(task);
    cancelEditTask(id);
    if (window.generateNotifications) window.generateNotifications();
    renderTasks();
}

// ════════════════════════════════════════════════════════════
// 🗑️  Повне видалення (батьки можуть видалити будь-яке завдання)
// ════════════════════════════════════════════════════════════

export function deleteTaskByParent(id) {
    const task = state.data.tasks?.[id];
    if (!task) return;
    if (!confirm(`Видалити завдання "${task.title}"?\n\nЯкщо воно вже було підтверджене — запис в Історії залишиться.`)) return;
    fbDeleteTask(id);
    if (window.generateNotifications) window.generateNotifications();
}

// ════════════════════════════════════════════════════════════
// 🚀  Ініціалізація — підписка на Firebase
// ════════════════════════════════════════════════════════════

export function initTasks() {
    initTasksListener((rawData) => {
        // state.data.tasks вже синхронізується всередині initTasksListener
        // Тут лише перерендеримо UI якщо таб відкритий
        const block = document.getElementById('tasksBlock');
        if (block) renderTasks();
        if (window.generateNotifications) window.generateNotifications();
        if (window.updateBadges) window.updateBadges();
    });
}

// ════════════════════════════════════════════════════════════
// 🎨  Рендер табу
// ════════════════════════════════════════════════════════════

export function renderTasks() {
    const container = document.getElementById('tasksBlock');
    if (!container) return;
    cleanupOldTasks(); // викликаємо при кожному відкритті табу
    container.innerHTML = state.data.isParent ? _renderParentView() : _renderChildView();
    // Запускаємо таймер тільки якщо є завдання з дедлайном
    if (document.querySelector('[data-deadline]')) {
        updateTaskTimers();
        if (!document.hidden) _startTimer();
    } else {
        _stopTimer();
    }
}

export function applyTasksFilter(type, value) {
    if (type === 'status') tasksFilter.status = value;
    if (type === 'origin') tasksFilter.origin = value;
    renderTasks();
}

function _applyFilter(list) {
    let res = list;
    if (tasksFilter.status !== 'all') res = res.filter(t => t.status === tasksFilter.status);
    if (tasksFilter.origin !== 'all') res = res.filter(t => t.origin === tasksFilter.origin);
    return res;
}

// ── Спільна частина фільтрів ──────────────────────────────────
function _renderFilterBar(showOriginFilter = true) {
    const all = _allTasks();
    if (all.length < 2) return '';

    const filtered = _applyFilter(all);
    const isFiltered = tasksFilter.status !== 'all' || tasksFilter.origin !== 'all';

    const statusBtns = [
        ['all', 'Усі'],
        ['pending', '⏳ Очікують'],
        ['active', '🎯 Активні'],
        ['done', '✔️ На перевірці'],
        ['confirmed', '✅ Підтверджені'],
        ['rejected', '❌ Відхилені'],
    ].map(([val, label]) => `
        <button class="tk-filter-btn${tasksFilter.status === val ? ' active' : ''}"
            onclick="applyTasksFilter('status','${val}')">${label}</button>
    `).join('');

    const originBtns = showOriginFilter ? [
        ['all', 'Усі'],
        ['child_request', '📨 Запити'],
        ['parent_task', '📋 Завдання'],
    ].map(([val, label]) => `
        <button class="tk-filter-btn${tasksFilter.origin === val ? ' active' : ''}"
            onclick="applyTasksFilter('origin','${val}')">${label}</button>
    `).join('') : '';

    const countHint = isFiltered
        ? `<span class="tk-filter-count">${filtered.length} з ${all.length}</span>`
        : '';

    return `
        <div class="tk-filter-section">
            <div class="tk-filter-row">${statusBtns}</div>
            ${showOriginFilter ? `<div class="tk-filter-row">${originBtns}${countHint}</div>` : `<div class="tk-filter-row">${countHint}</div>`}
        </div>`;
}

// ════════════════════════════════════════════════════════════
// 👨‍👩‍👧  ВИГЛЯД ДЛЯ БАТЬКІВ
// ════════════════════════════════════════════════════════════

function _renderParentView() {
    const all = _allTasks();
    const filtered = _applyFilter(all);

    // Розділяємо за станами для логічних секцій
    const pendingRequests = filtered.filter(t => t.origin === 'child_request' && t.status === 'pending');
    const activeTasks     = filtered.filter(t => t.origin === 'parent_task' && (t.status === 'active' || t.status === 'done'));
    const completed       = filtered.filter(t => t.status === 'confirmed' || t.status === 'rejected');

    return `
        ${_renderParentTaskFormBlock()}

        ${pendingRequests.length ? `
            <h4 class="tk-list-title">📨 Запити дитини на підтвердження (${pendingRequests.length})</h4>
            <div>${pendingRequests.map(_renderParentRequestCard).join('')}</div>
        ` : ''}

        ${activeTasks.length ? `
            <h4 class="tk-list-title mt-lg">📋 Активні завдання (${activeTasks.length})</h4>
            <div>${activeTasks.map(_renderParentTaskCard).join('')}</div>
        ` : ''}

        ${completed.length ? `
            <h4 class="tk-list-title mt-lg">📜 Завершені (7 днів)</h4>
            <div>${completed.map(_renderCompletedCard).join('')}</div>
        ` : ''}

        ${all.length > 0 ? _renderFilterBar(true) : ''}

        ${all.length === 0 ? '<div class="tk-empty">Завдань ще немає. Створіть перше завдання вище 🙂</div>' : ''}
        ${all.length > 0 && filtered.length === 0 ? '<div class="tk-empty">🔍 Немає завдань за цим фільтром</div>' : ''}
    `;
}

function _renderParentTaskFormBlock() {
    return `
        <div class="tk-create-block">
            <button id="openParentTaskFormBtn" class="tk-submit-btn"
                onclick="openParentTaskForm()">➕ Створити нове завдання</button>

            <div id="parentTaskForm" class="tk-form" style="display:none">
                <div class="tk-form-title">📋 Нове завдання для дитини</div>

                <div class="tk-form-group">
                    <label class="tk-label">Тип завдання</label>
                    <div class="tk-radio-row">
                        <label class="tk-radio">
                            <input type="radio" name="ptaskCategory" value="bonus" checked
                                onchange="onParentTaskCategoryChange()"> 🌟 Бонус
                        </label>
                        <label class="tk-radio">
                            <input type="radio" name="ptaskCategory" value="special"
                                onchange="onParentTaskCategoryChange()"> ✨ Особливе нарахування
                        </label>
                    </div>
                </div>

                <div id="ptaskBonusBlock">
                    <div class="tk-form-group">
                        <label class="tk-label">🌟 Бонус</label>
                        <select id="ptaskBonusType" class="tk-select" onchange="onParentTaskBonusChange()">
                            <option value="">Оберіть бонус</option>
                            <optgroup label="📚 Навчання">
                                <option value="📝 Виконано Д/З|2|study|homework">📝 Виконано Д/З (+2⭐)</option>
                                <option value="🎯 Важке завдання|5|study|hard_tasks">🎯 Важке завдання (+5⭐)</option>
                                <option value="📖 Прочитав книгу|10|study|books">📖 Прочитав книгу (+10⭐)</option>
                            </optgroup>
                            <optgroup label="🤝 Допомога батькам">
                                <option value="🤝 Допомога батькам: проста|3|help|help">🤝 Допомога: проста (+3⭐)</option>
                                <option value="💪 Допомога батькам: важка|5|help|help">💪 Допомога: важка (+5⭐)</option>
                            </optgroup>
                            <optgroup label="🏠 По дому">
                                <option value="🧹 Прибрала кімнату|3|home_chore|home_chores">🧹 Прибрала кімнату (+3⭐)</option>
                                <option value="👕 Поскладала одяг|3|home_chore|home_chores">👕 Поскладала одяг (+3⭐)</option>
                                <option value="🛏️ Застелила ліжко|2|home_chore|home_chores">🛏️ Застелила ліжко (+2⭐)</option>
                                <option value="🫧 Помила посуд|3|home_chore|home_chores">🫧 Помила посуд (+3⭐)</option>
                                <option value="🍳 Допомогла готувати|5|home_chore|home_chores">🍳 Допомогла готувати (+5⭐)</option>
                            </optgroup>
                            <optgroup label="🏸 Активність">
                                <option value="🚶 Прогулянка 30+ хв|3|activity|activity">🚶 Прогулянка 30+ хв (+3⭐)</option>
                                <option value="🏃 Тренування 60+ хв|5|activity|activity">🏃 Тренування 60+ хв (+5⭐)</option>
                            </optgroup>
                            <optgroup label="🧼 Гігієна">
                                <option value="💇 Причесати волосся|5|hygiene|">💇 Причесатись (+5⭐)</option>
                                <option value="🪥 Почистити зуби|2|hygiene|">🪥 Почистити зуби (+2⭐)</option>
                            </optgroup>
                        </select>
                    </div>
                    <div class="tk-form-group" id="ptaskBookPagesGroup" style="display:none">
                        <label class="tk-label">📄 Кількість сторінок</label>
                        <input type="number" id="ptaskBookPages" class="tk-input" min="1" max="9999" placeholder="Скільки сторінок?">
                    </div>
                </div>

                <div id="ptaskSpecialBlock" style="display:none">
                    <div class="tk-form-group">
                        <label class="tk-label">📝 Опис завдання</label>
                        <input type="text" id="ptaskSpecialDesc" class="tk-input" placeholder="Опис завдання" maxlength="80">
                    </div>
                    <div class="tk-form-group">
                        <label class="tk-label">⭐ Кількість зірок</label>
                        <input type="number" id="ptaskSpecialStars" class="tk-input" min="1" max="200" placeholder="Скільки зірок?">
                    </div>
                </div>

                <div class="tk-form-group">
                    <label class="tk-checkbox">
                        <input type="checkbox" id="ptaskHasDeadline" onchange="onParentTaskDeadlineToggle()">
                        ⏰ Встановити дедлайн
                    </label>
                </div>
                <div class="tk-form-group" id="ptaskDeadlineBlock" style="display:none">
                    <label class="tk-label">Дедлайн</label>
                    <input type="datetime-local" id="ptaskDeadlineDate" class="tk-input">
                </div>

                <div class="tk-form-group">
                    <label class="tk-label">🎁 Додаткова винагорода за виконання завдання</label>
                    <input type="number" id="ptaskRewardStars" class="tk-input" min="0" max="100" value="1" placeholder="Додаткові зірки">
                    <label class="tk-checkbox" style="margin-top:6px">
                        <input type="checkbox" id="ptaskNoReward" onchange="onParentTaskNoRewardToggle()">
                        Без додаткової винагороди
                    </label>
                </div>

                <div class="tk-actions">
                    <button class="tk-action-btn tk-action-btn--primary"
                        onclick="submitParentTask()">✅ Створити завдання</button>
                    <button class="tk-action-btn tk-action-btn--cancel"
                        onclick="closeParentTaskForm()">✕ Скасувати</button>
                </div>
            </div>
        </div>
    `;
}

// Карточка дитячого запиту (батьківський вигляд)
function _renderParentRequestCard(task) {
    const cfg = STATUS_CONFIG.pending;
    const dateStr = _fmtDateTime(task.createdAt);

    return `
        <div id="tkCard_${task.id}" class="${_cardClasses(task.id, 'tk-card tk-card--request')}" onclick="tkCardClick('${task.id}', event)">
            ${_cardBadgeSpan(task.id)}
            <div class="tk-card-header">
                <span class="tk-card-origin">📨 Запит від дитини</span>
                <div class="tk-card-meta">
                    <span class="tk-card-date">${dateStr}</span>
                    <span class="tk-status-badge ${cfg.cls}">${cfg.label}</span>
                </div>
            </div>
            <div class="tk-card-title">${_esc(task.title)}</div>
            <div class="tk-card-stars">⭐ ${task.stars} зірок · 📅 ${_esc((task.date || '').slice(0,10))}</div>

            <div class="tk-actions">
                <button class="tk-action-btn tk-action-btn--primary"
                    onclick="confirmTask('${task.id}')">✅ Підтвердити</button>
                <button class="tk-action-btn tk-action-btn--danger"
                    onclick="startRejectTask('${task.id}')">❌ Відхилити</button>
            </div>

            <div class="tk-reject-block" style="display:none">
                <div class="tk-reject-title">Причина відхилення:</div>
                <div class="tk-reason-chips">
                    ${REJECT_REASONS_PARENT.map(r =>
                        `<button class="tk-chip" onclick="selectRejectReason('${task.id}','${_esc(r)}')">${r}</button>`
                    ).join('')}
                </div>
                <textarea class="tk-reject-input tk-textarea" placeholder="Або напиши свій коментар..."></textarea>
                <div class="tk-actions">
                    <button class="tk-action-btn tk-action-btn--danger"
                        onclick="submitRejectTask('${task.id}')">❌ Відхилити</button>
                    <button class="tk-action-btn tk-action-btn--cancel"
                        onclick="cancelRejectTask('${task.id}')">✕ Скасувати</button>
                </div>
            </div>
        </div>
    `;
}

// Карточка батьківського завдання (батьківський вигляд)
function _renderParentTaskCard(task) {
    const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.active;
    const dateStr = _fmtDateTime(task.createdAt);
    const childDeclined = !!task.childComment;

    const deadlineHtml = task.hasDeadline && task.deadline
        ? `<span data-deadline="${task.deadline}">${_deadlineLabel(task.deadline)}</span>`
        : '';

    const rewardHtml = (task.rewardStars && Number(task.rewardStars) > 0)
        ? `<span class="tk-reward-badge">🎁 +${task.rewardStars}⭐ за виконання</span>` : '';

    return `
        <div id="tkCard_${task.id}" class="${_cardClasses(task.id, 'tk-card tk-card--task ' + (childDeclined ? 'tk-card--declined' : ''))}" onclick="tkCardClick('${task.id}', event)">
            ${_cardBadgeSpan(task.id)}
            <div class="tk-card-header">
                <span class="tk-card-origin">📋 Моє завдання</span>
                <div class="tk-card-meta">
                    <span class="tk-card-date">${dateStr}</span>
                    <span class="tk-status-badge ${cfg.cls}">${cfg.label}</span>
                </div>
            </div>
            <div class="tk-card-title">${_esc(task.title)}</div>
            <div class="tk-card-stars">⭐ ${task.stars} зірок ${deadlineHtml} ${rewardHtml}</div>

            ${childDeclined ? `
                <div class="tk-child-comment">
                    <strong>💬 Дитина відмовилась:</strong>
                    <div class="tk-comment-body">${_esc(task.childComment)}</div>
                </div>` : ''}

            <div class="tk-actions">
                ${task.status === 'done' ? `
                    <button class="tk-action-btn tk-action-btn--primary"
                        onclick="confirmTask('${task.id}')">✅ Підтвердити</button>
                    <button class="tk-action-btn tk-action-btn--danger"
                        onclick="startRejectTask('${task.id}')">❌ Відхилити</button>
                ` : ''}
                <button class="tk-action-btn"
                    onclick="startEditTask('${task.id}')">✏️ Редагувати</button>
                <button class="tk-action-btn tk-action-btn--cancel"
                    onclick="deleteTaskByParent('${task.id}')">🗑️ Видалити</button>
            </div>

            <div class="tk-edit-block" style="display:none">
                <div class="tk-reject-title">✏️ Редагування завдання</div>

                <label class="tk-checkbox" style="margin-top:6px">
                    <input type="checkbox" class="tk-edit-has-deadline"
                        onchange="onEditDeadlineToggle('${task.id}')">
                    ⏰ Встановити дедлайн
                </label>
                <div class="tk-edit-deadline-wrap" style="display:none;margin-top:6px">
                    <input type="datetime-local" class="tk-input tk-edit-deadline">
                </div>

                <label class="tk-label" style="margin-top:10px">🎁 Винагорода</label>
                <input type="number" class="tk-input tk-edit-reward" min="0" max="100" value="1">
                <label class="tk-checkbox" style="margin-top:6px">
                    <input type="checkbox" class="tk-edit-no-reward"
                        onchange="onEditNoRewardToggle('${task.id}')">
                    Без додаткової винагороди
                </label>

                <div class="tk-actions" style="margin-top:8px">
                    <button class="tk-action-btn tk-action-btn--primary"
                        onclick="saveEditTask('${task.id}')">💾 Зберегти</button>
                    <button class="tk-action-btn tk-action-btn--cancel"
                        onclick="cancelEditTask('${task.id}')">✕ Скасувати</button>
                </div>
            </div>

            <div class="tk-reject-block" style="display:none">
                <div class="tk-reject-title">Причина відхилення:</div>
                <div class="tk-reason-chips">
                    ${REJECT_REASONS_PARENT.map(r =>
                        `<button class="tk-chip" onclick="selectRejectReason('${task.id}','${_esc(r)}')">${r}</button>`
                    ).join('')}
                </div>
                <textarea class="tk-reject-input tk-textarea" placeholder="Або напиши свій коментар..."></textarea>
                <div class="tk-actions">
                    <button class="tk-action-btn tk-action-btn--danger"
                        onclick="submitRejectTask('${task.id}')">❌ Відхилити</button>
                    <button class="tk-action-btn tk-action-btn--cancel"
                        onclick="cancelRejectTask('${task.id}')">✕ Скасувати</button>
                </div>
            </div>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════
// 👧  ВИГЛЯД ДЛЯ ДИТИНИ
// ════════════════════════════════════════════════════════════

function _renderChildView() {
    const all = _allTasks();
    const filtered = _applyFilter(all);

    const activeTasks = filtered.filter(t => t.origin === 'parent_task' && t.status === 'active');
    const doneTasks   = filtered.filter(t => t.origin === 'parent_task' && t.status === 'done');
    const myRequests  = filtered.filter(t => t.origin === 'child_request');
    const completed   = filtered.filter(t => t.status === 'confirmed' || t.status === 'rejected');

    return `
        <p class="tk-intro">📋 Виконуй завдання від батьків та надсилай їм свої запити на нарахування зірок 💙</p>

        ${activeTasks.length ? `
            <h4 class="tk-list-title">🎯 Активні завдання (${activeTasks.length})</h4>
            <div>${activeTasks.map(_renderChildTaskCard).join('')}</div>
        ` : ''}

        ${doneTasks.length ? `
            <h4 class="tk-list-title mt-lg">✔️ На перевірці у батьків (${doneTasks.length})</h4>
            <div>${doneTasks.map(_renderChildTaskCard).join('')}</div>
        ` : ''}

        ${myRequests.filter(t => t.status === 'pending').length ? `
            <h4 class="tk-list-title mt-lg">📨 Мої запити на перевірці</h4>
            <div>${myRequests.filter(t => t.status === 'pending').map(_renderChildRequestCard).join('')}</div>
        ` : ''}

        ${completed.length ? `
            <h4 class="tk-list-title mt-lg">📜 Завершено (7 днів)</h4>
            <div>${completed.map(_renderChildCompletedCard).join('')}</div>
        ` : ''}

        ${all.length > 0 ? _renderFilterBar(true) : ''}

        ${all.length === 0 ? '<div class="tk-empty">Поки що немає завдань. Перевір ще раз пізніше 🙂</div>' : ''}
        ${all.length > 0 && filtered.length === 0 ? '<div class="tk-empty">🔍 Немає завдань за цим фільтром</div>' : ''}
    `;
}

function _renderChildTaskCard(task) {
    const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.active;
    const dateStr = _fmtDateTime(task.createdAt);
    const isActive = task.status === 'active';
    const isDone   = task.status === 'done';
    const hasDecline = !!task.childComment && isActive;

    const deadlineHtml = task.hasDeadline && task.deadline
        ? `<span data-deadline="${task.deadline}">${_deadlineLabel(task.deadline)}</span>`
        : '';

    const rewardHtml = (task.rewardStars && Number(task.rewardStars) > 0)
        ? `<span class="tk-reward-badge">🎁 +${task.rewardStars}⭐ за виконання</span>` : '';

    return `
        <div id="tkCard_${task.id}" class="${_cardClasses(task.id, 'tk-card tk-card--task ' + (hasDecline ? 'tk-card--declined' : ''))}" onclick="tkCardClick('${task.id}', event)">
            ${_cardBadgeSpan(task.id)}
            <div class="tk-card-header">
                <span class="tk-card-origin">📋 Завдання від батьків</span>
                <div class="tk-card-meta">
                    <span class="tk-card-date">${dateStr}</span>
                    <span class="tk-status-badge ${cfg.cls}">${cfg.label}</span>
                </div>
            </div>
            <div class="tk-card-title">${_esc(task.title)}</div>
            <div class="tk-card-stars">⭐ ${task.stars} зірок ${deadlineHtml} ${rewardHtml}</div>

            ${task.lastEditNote ? `
                <div class="tk-edit-note">
                    <strong>✏️ Оновлено батьками:</strong> ${_esc(task.lastEditNote)}
                </div>` : ''}

            ${hasDecline ? `
                <div class="tk-child-comment">
                    <strong>💬 Моя відмова:</strong>
                    <div class="tk-comment-body">${_esc(task.childComment)}</div>
                    <button class="tk-action-btn tk-action-btn--primary tk-action-btn--sm mt-sm"
                        onclick="clearChildDecline('${task.id}')">↩️ Все ж виконати</button>
                </div>` : ''}

            ${isActive && !hasDecline ? `
                <div class="tk-actions">
                    <button class="tk-action-btn tk-action-btn--primary"
                        onclick="markTaskDone('${task.id}')">✔️ Виконала</button>
                    <button class="tk-action-btn tk-action-btn--danger"
                        onclick="startDeclineTask('${task.id}')">✖️ Не можу</button>
                </div>

                <div class="tk-decline-block" style="display:none">
                    <div class="tk-reject-title">Чому не можеш?</div>
                    <div class="tk-reason-chips">
                        ${DECLINE_REASONS_CHILD.map(r =>
                            `<button class="tk-chip" onclick="selectDeclineReason('${task.id}','${_esc(r)}')">${r}</button>`
                        ).join('')}
                    </div>
                    <textarea class="tk-decline-input tk-textarea" placeholder="Або напиши свою причину..."></textarea>
                    <div class="tk-actions">
                        <button class="tk-action-btn tk-action-btn--danger"
                            onclick="submitDeclineTask('${task.id}')">✖️ Відмовитись</button>
                        <button class="tk-action-btn tk-action-btn--cancel"
                            onclick="cancelDeclineTask('${task.id}')">↩️ Передумала</button>
                    </div>
                </div>
            ` : ''}

            ${isDone ? `
                <div class="tk-info-hint">⏳ Очікую підтвердження від батьків</div>
            ` : ''}
        </div>
    `;
}

function _renderChildRequestCard(task) {
    const cfg = STATUS_CONFIG.pending;
    const dateStr = _fmtDateTime(task.createdAt);

    return `
        <div id="tkCard_${task.id}" class="${_cardClasses(task.id, 'tk-card tk-card--request')}" onclick="tkCardClick('${task.id}', event)">
            ${_cardBadgeSpan(task.id)}
            <div class="tk-card-header">
                <span class="tk-card-origin">📨 Мій запит</span>
                <div class="tk-card-meta">
                    <span class="tk-card-date">${dateStr}</span>
                    <span class="tk-status-badge ${cfg.cls}">${cfg.label}</span>
                </div>
            </div>
            <div class="tk-card-title">${_esc(task.title)}</div>
            <div class="tk-card-stars">⭐ ${task.stars} зірок · 📅 ${_esc((task.date || '').slice(0,10))}</div>
            <div class="tk-info-hint">⏳ Очікую перевірки батьками</div>
            <div class="tk-actions">
                <button class="tk-action-btn tk-action-btn--cancel"
                    onclick="deleteOwnRequest('${task.id}')">🗑️ Скасувати запит</button>
            </div>
        </div>
    `;
}

function _renderChildCompletedCard(task) {
    const cfg = STATUS_CONFIG[task.status];
    const isConfirmed = task.status === 'confirmed';
    const dateStr = _fmtDateTime(task.confirmedAt || task.rejectedAt);

    const originLabel = task.origin === 'child_request' ? '📨 Мій запит' : '📋 Завдання від батьків';

    // Дитина може видалити свій відхилений запит достроково (до 7 днів)
    const canDelete = task.origin === 'child_request' && task.status === 'rejected';

    // Винагорода нараховується тільки для parent_task і тільки якщо confirmed
    const hasReward = task.origin === 'parent_task' && isConfirmed
        && task.rewardStars && Number(task.rewardStars) > 0;
    const totalStars = hasReward ? Number(task.stars) + Number(task.rewardStars) : null;
    const starsLine = hasReward
        ? `⭐ ${task.stars} + 🎁 ${task.rewardStars} = <strong>${totalStars}⭐</strong>`
        : `⭐ ${task.stars} зірок`;

    return `
        <div id="tkCard_${task.id}" class="${_cardClasses(task.id, 'tk-card tk-card--completed')}" onclick="tkCardClick('${task.id}', event)">
            ${_cardBadgeSpan(task.id)}
            <div class="tk-card-header">
                <span class="tk-card-origin">${originLabel}</span>
                <div class="tk-card-meta">
                    <span class="tk-card-date">${dateStr}</span>
                    <span class="tk-status-badge ${cfg.cls}">${cfg.label}</span>
                </div>
            </div>
            <div class="tk-card-title">${_esc(task.title)}</div>
            <div class="tk-card-stars">${starsLine}</div>
            ${!isConfirmed && task.rejectComment ? `
                <div class="tk-reject-comment">
                    <strong>💬 Коментар батьків:</strong>
                    <div class="tk-comment-body">${_esc(task.rejectComment)}</div>
                </div>` : ''}
            ${canDelete ? `
                <div class="tk-actions">
                    <button class="tk-action-btn tk-action-btn--cancel"
                        onclick="deleteOwnRequest('${task.id}')">🗑️ Прибрати</button>
                </div>` : ''}
        </div>
    `;
}

// Завершені — універсальна карточка для батьків
function _renderCompletedCard(task) {
    const cfg = STATUS_CONFIG[task.status];
    const isConfirmed = task.status === 'confirmed';
    const dateStr = _fmtDateTime(task.confirmedAt || task.rejectedAt);

    const originLabel = task.origin === 'child_request' ? '📨 Запит дитини' : '📋 Моє завдання';

    // Винагорода — тільки для parent_task і тільки якщо confirmed
    const hasReward = task.origin === 'parent_task' && isConfirmed
        && task.rewardStars && Number(task.rewardStars) > 0;
    const totalStars = hasReward ? Number(task.stars) + Number(task.rewardStars) : null;
    const starsLine = hasReward
        ? `⭐ ${task.stars} + 🎁 ${task.rewardStars} = <strong>${totalStars}⭐</strong>`
        : `⭐ ${task.stars} зірок`;

    return `
        <div id="tkCard_${task.id}" class="${_cardClasses(task.id, 'tk-card tk-card--completed')}" onclick="tkCardClick('${task.id}', event)">
            ${_cardBadgeSpan(task.id)}
            <div class="tk-card-header">
                <span class="tk-card-origin">${originLabel}</span>
                <div class="tk-card-meta">
                    <span class="tk-card-date">${dateStr}</span>
                    <span class="tk-status-badge ${cfg.cls}">${cfg.label}</span>
                </div>
            </div>
            <div class="tk-card-title">${_esc(task.title)}</div>
            <div class="tk-card-stars">${starsLine}</div>
            ${!isConfirmed && task.rejectComment ? `
                <div class="tk-reject-comment">
                    <strong>💬 Причина відхилення:</strong>
                    <div class="tk-comment-body">${_esc(task.rejectComment)}</div>
                </div>` : ''}
            <div class="tk-actions">
                <button class="tk-action-btn tk-action-btn--cancel"
                    onclick="deleteTaskByParent('${task.id}')">🗑️ Видалити зараз</button>
            </div>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════
// 🔢  Лічильники для сповіщень та badge
// ════════════════════════════════════════════════════════════

// Скільки невирішених завдань "вимагає уваги" для поточної ролі
export function getTasksUnreadCount(isParent) {
    const tasks = state.data.tasks || {};
    let count = 0;
    for (const id in tasks) {
        const t = tasks[id];
        if (isParent) {
            // Батькам — запити на pending і виконані parent_task
            if (t.origin === 'child_request' && t.status === 'pending') count++;
            else if (t.origin === 'parent_task' && t.status === 'done') count++;
            else if (t.origin === 'parent_task' && t.status === 'active' && t.childComment) count++;
        } else {
            // Дитині — нові parent_task і нещодавно вирішені запити
            if (t.origin === 'parent_task' && t.status === 'active' && !t.childComment) count++;
        }
    }
    return count;
}

export function getAllTasks() { return _allTasks(); }
