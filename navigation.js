// ════════════════════════════════════════════════════
// 🗂️  navigation.js — Навігація між вкладками та формами
//
//     Виокремлено для розриву циклічних залежностей:
//     history.js, stats.js, freeze.js потребували
//     showForm/switchTab, а ui.js потребував їх модулів
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260621.2237';

import { state } from './state.js';
import { getTodayDate } from './utils.js';
import { renderAchievements, renderAchievementsHome } from './achievements.js';
import { renderGoal } from './goals.js';
import { renderFreezePeriods } from './freeze.js';
import { renderHistory } from './history.js';
import { renderRewards } from './rewards.js';
import { renderStats, checkStreakWarning } from './stats.js';
import { renderFeedback } from './feedback.js';
import { renderSchedule } from './schedule.js';
import { renderTasks } from './tasks.js';
import { applyAppearance, renderThemeShop, stopPreview, resetPendingBorder, resetBorderToNone } from './appearance.js';
import { dismissByAction, generateNotifications } from './notifications.js';
import { initCompare } from './compare.js';

document.addEventListener('zirky:dataLoaded', generateNotifications);

// ════════════════════════════════════════════════════
// 🎨  Налаштування блоку "Додати" залежно від ролі
// ════════════════════════════════════════════════════
//   Батьки бачать всі 5 форм: оцінка, діагностувальна, бонус, особливе, канікули
//   Дитина бачить лише 3: оцінка, діагностувальна, бонус
//   Особливе та канікули — закриті, бо їх не можна делегувати
//
//   Видимість кнопок "Особливе" та "Канікули" керується централізовано
//   через applyProfileVisibility() в ui.js (id=quickActionSpecial / quickActionFreeze).
//   Тут залишається лише поведінка: перемикання форми і тексти кнопок submit.
function applyAddSectionVisibility() {
    const isParent = !!state.data.isParent;

    // Якщо у дитини була активна закрита форма — перемикаємо на оцінку
    if (!isParent) {
        const specialForm = document.getElementById('specialForm');
        const freezeForm  = document.getElementById('freezeForm');
        if ((specialForm && specialForm.style.display === 'block') ||
            (freezeForm  && freezeForm.style.display  === 'block')) {
            _showFormProgrammatic('grade');
        }
    }

    // Текст головних кнопок-сабмітів — залежить від ролі
    //   Батьки: "Додати ..." (одразу нараховується)
    //   Дитина: "Надіслати ..." (надсилається запит)
    const labels = {
        submitGradeOrRequest:      { parent: '✨ Додати оцінку',                 child: '📨 Надіслати оцінку на перевірку' },
        submitDiagnosticOrRequest: { parent: '📝 Додати діагностувальну роботу', child: '📨 Надіслати діагностувальну на перевірку' },
        submitBonusOrRequest:      { parent: '✨ Додати бонус',                  child: '📨 Надіслати бонус на перевірку' },
    };
    for (const fn in labels) {
        const btn = document.querySelector(`#addSection button[onclick="${fn}()"]`);
        if (btn) btn.textContent = isParent ? labels[fn].parent : labels[fn].child;
    }
}

// Внутрішня: показати форму без event (для дитячого режиму при перемиканні)
function _showFormProgrammatic(type) {
    document.querySelectorAll('#addSection .quick-action-btn').forEach(btn => btn.classList.remove('active'));
    const firstVisible = document.querySelector(`#addSection .quick-action-btn[onclick*="'${type}'"]`);
    if (firstVisible) firstVisible.classList.add('active');
    document.getElementById('gradeForm').style.display      = 'none';
    document.getElementById('diagnosticForm').style.display = 'none';
    document.getElementById('bonusForm').style.display      = 'none';
    document.getElementById('specialForm').style.display    = 'none';
    document.getElementById('freezeForm').style.display     = 'none';
    const target = document.getElementById(type + 'Form');
    if (target) target.style.display = 'block';
}

export function showForm(type) {
    // Захист: дитина не має відкривати special / freeze
    if (!state.data.isParent && (type === 'special' || type === 'freeze')) {
        return;
    }

    document.querySelectorAll('.quick-action-btn').forEach(btn => btn.classList.remove('active'));
    if (event?.target?.classList) event.target.classList.add('active');
    document.getElementById('gradeForm').style.display = 'none';
    document.getElementById('diagnosticForm').style.display = 'none';
    document.getElementById('bonusForm').style.display = 'none';
    document.getElementById('specialForm').style.display = 'none';
    document.getElementById('freezeForm').style.display = 'none';
    document.getElementById(type + 'Form').style.display = 'block';

    // Встановлюємо дефолтні дати
    if (type === 'diagnostic') {
        const today = getTodayDate();
        document.getElementById('diagnosticDate').value = today;
    }

    // Якщо відкрили канікули - встановлюємо дефолтні дати та оновлюємо список
    if (type === 'freeze') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        document.getElementById('freezeFromDate').value = today.toISOString().split('T')[0];
        document.getElementById('freezeUntilDate').value = tomorrow.toISOString().split('T')[0];

        renderFreezePeriods();
    }
}

// Додавання записів

// Порядок табів для анімації напрямку зсуву
const TAB_ORDER = ['add','schedule','tasks','rewards','achievements','history','stats','feedback','guide','instructions','settings'];
let _lastTab = null;   // запам'ятовуємо попередній таб для визначення напрямку

export function switchTab(tab, fromClick = false) {
    // Зупиняємо preview теми якщо активний
    stopPreview(false);
    resetPendingBorder();   // скидаємо pending рамку при зміні табу

    // Довідник → перемикаємо на instructionsSection, але підсвічуємо кнопку guide.
    // instructions не має окремої кнопки в навбарі, тому підсвітку ставимо вручну
    // після рекурсивного виклику (який скидає всі active).
    if (tab === 'guide') {
        switchTab('instructions');
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const guideBtn = document.querySelector('.tab[data-tab="guide"]');
        if (guideBtn) guideBtn.classList.add('active');
        return;
    }

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    // Завжди знаходимо кнопку по data-tab — не залежить від event.target (може бути span)
    const activeBtn = document.querySelector(`.tab[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const newSection = document.getElementById(tab + 'Section');
    newSection.classList.add('active');

    // Анімація: визначаємо напрямок за позицією табів
    const prevIdx = _lastTab ? (TAB_ORDER.indexOf(_lastTab)) : -1;
    const nextIdx = TAB_ORDER.indexOf(tab);
    if (_lastTab && prevIdx !== -1 && nextIdx !== -1 && prevIdx !== nextIdx) {
        const enterClass = nextIdx > prevIdx ? 'section--enter-right' : 'section--enter-left';
        newSection.classList.remove('section--enter-right', 'section--enter-left');
        // Форсуємо reflow щоб анімація рестартувала якщо той самий клас
        void newSection.offsetWidth;
        newSection.classList.add(enterClass);
        newSection.addEventListener('animationend', () => {
            newSection.classList.remove('section--enter-right', 'section--enter-left');
        }, { once: true });
    }
    _lastTab = tab;

    if (tab === 'add') {
        // При відкритті блоку Додати — застосовуємо видимість форм за роллю
        applyAddSectionVisibility();
    }
    else if (tab === 'instructions') {
        // Застосовуємо гендерні мітки і opt-girl/opt-boy у статичному HTML довідника
        if (window.updateUI) window.updateUI();
    }
    else if (tab === 'history') renderHistory();
    else if (tab === 'rewards') {
        renderRewards();
        // Встановлюємо дефолтну дату для витрат
        const rewardDateInput = document.getElementById('customRewardDate');
        if (rewardDateInput && !rewardDateInput.value) {
            rewardDateInput.value = getTodayDate();
        }
    }
    else if (tab === 'achievements') renderAchievements();
    else if (tab === 'stats') {
        renderStats();
        if (state.parent.isParent) initCompare();
    }
    else if (tab === 'schedule') renderSchedule();
    else if (tab === 'tasks') {
        renderTasks();
        // Сповіщення про завдання НЕ скидаються при відкритті табу.
        // Вони dismiss-яться:
        //   • кліком на конкретну картку завдання (через dismissTaskNotifications)
        //   • кнопкою ✓ "Ознайомлена" у сповіщенні
        //   • автоматично при зміні статусу таски (у generateNotifications)
    }
    else if (tab === 'feedback') {
        renderFeedback();
        dismissByAction('feedback_new',     'tab');
        dismissByAction('feedback_comment', 'tab');
        dismissByAction('feedback_reply',   'tab');
        dismissByAction('feedback_status',  'tab');
    }
    else if (tab === 'settings') { renderThemeShop(); }

    // Оновлюємо badge для feedback/tasks після кожного відкриття
    if ((tab === 'feedback' || tab === 'tasks') && window.updateBadges) window.updateBadges();
}

// ── Слухаємо події від firebase.js та freeze.js ──────────────
document.addEventListener('zirky:dataLoaded', () => {
    applyAppearance();
    // Бейджі оновлюються після авторизації у auth.js — не тут,
    // бо при dataLoaded ще невідомо хто заходить (isParent = false)
    const activeSection = document.querySelector('.section.active');
    if (activeSection) {
        if (activeSection.id === 'historySection')      renderHistory();
        if (activeSection.id === 'statsSection')        renderStats();
        if (activeSection.id === 'rewardsSection')      renderRewards();
        if (activeSection.id === 'tasksSection')        renderTasks();
        if (activeSection.id === 'addSection')          applyAddSectionVisibility();
        // Секції що раніше не оброблялись — дані приходять після switchTab
        if (activeSection.id === 'scheduleSection')     renderSchedule();
        if (activeSection.id === 'feedbackSection')     renderFeedback();
        if (activeSection.id === 'achievementsSection') { if (window.renderAchievements) window.renderAchievements(); }
    }
    checkStreakWarning();
});

// ── Слухаємо навігаційні події від інших модулів ─────────────
document.addEventListener('zirky:showForm', (e) => showForm(e.detail));
document.addEventListener('zirky:switchTab', (e) => switchTab(e.detail, true));

// ── При досягненні мети — одразу оновлюємо badges без очікування Firebase ──
document.addEventListener('zirky:goalReached', () => {
    renderAchievementsHome();
    renderGoal();
});
