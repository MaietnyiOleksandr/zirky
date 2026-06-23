// ════════════════════════════════════════════════════
// 👤 ui.js — Видимість елементів за профілем + оновлення UI
// ════════════════════════════════════════════════════
// Цей модуль робить дві речі:
//   1) updateUI() — оновлює видимі значення (баланс, заголовки, поля)
//   2) applyProfileVisibility() — централізовано керує видимістю
//      елементів залежно від профілю (батько / дитина).
//
// 🔧 Додавання нового елемента, який залежить від профілю:
//   просто додай рядок у масив PROFILE_VISIBILITY нижче.
//   Жодних розкиданих .style.display = ... по інших модулях.
// ════════════════════════════════════════════════════════════

export const VERSION = 'v4.20260623.1835';

import { state } from './state.js';
import { buildSubjectSelects } from './subjects.js';
import { renderAchievementsHome } from './achievements.js';
import { renderGoal } from './goals.js';
import { renderFreezePeriods } from './freeze.js';

// ════════════════════════════════════════════════════════════
// 👤   Декларативний список: видимість за профілем
// ════════════════════════════════════════════════════════════
//   show:    'parent' — видно лише батькам
//            'child'  — видно лише дитині
//   display: який display встановити, коли елемент видимий
//            (за замовчуванням 'block'; для flex/grid — вказуй явно)
// ════════════════════════════════════════════════════════════
const PROFILE_VISIBILITY = [
    // Таби та інструкції
    { id: 'tabBtnGuide',                      show: 'child'                   },
    { id: 'childInstructions',                show: 'child'                   },

    // Налаштування — блок "Корекція даних"
    { id: 'settingsAccordionWrap_correction', show: 'parent'                  },
    { id: 'settingsAccordionWrap_backup',     show: 'parent'                  },

    // Розклад — батьківські кнопки
    { id: 'scheduleSubjectsBtnWrap',          show: 'parent'                  },
    { id: 'scheduleParentBtns',               show: 'parent', display: 'flex' },

    // Теми — кнопка режиму розробника
    { id: 'devModeBlock',                     show: 'parent'                  },
    { id: 'activityBtn',                      show: 'parent'                  },
    { id: 'compareSectionWrap',               show: 'parent'                  },

    // Блок "Додати" — кнопки, що не делегуються дитині
    { id: 'quickActionSpecial',               show: 'parent'                  },
    { id: 'quickActionFreeze',                show: 'parent'                  },
];

function applyProfileVisibility() {
    const isParent = !!state.data.isParent;
    PROFILE_VISIBILITY.forEach(rule => {
        const el = document.getElementById(rule.id);
        if (!el) return;
        const shouldShow = (rule.show === 'parent') === isParent;
        el.style.display = shouldShow ? (rule.display || 'block') : 'none';
    });
}

// ════════════════════════════════════════════════════════════
// 🔄   updateUI — оновлення видимих значень
// ════════════════════════════════════════════════════════════
//   Викликається при зміні стану (auth, freeze, firebase loaded).
//   Робить дві речі:
//     • застосовує видимість через applyProfileVisibility()
//     • оновлює тексти / значення полів, що відображають дані
// ════════════════════════════════════════════════════════════
export function updateUI() {
    buildSubjectSelects(); // оновлюємо select-и предметів з subjects.js

    // Загальні значення (баланс, статистика місяця)
    document.getElementById('balance').textContent = Number(state.data.balance) + '⭐';

    let records = state.data.records || [];
    if (state.showPeriod === 'month') {
        const thisMonth = new Date().getMonth();
        const thisYear  = new Date().getFullYear();
        records = records.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
    }
    const earned = records.filter(r => r.type === 'earn').reduce((s, r) => s + r.stars, 0);
    const spent  = records.filter(r => r.type === 'spend').reduce((s, r) => s + r.stars, 0);
    document.getElementById('earnedStats').textContent = earned + '⭐';
    document.getElementById('spentStats').textContent  = spent  + '⭐';

    // 👤 Видимість елементів за профілем — централізовано
    applyProfileVisibility();

    // 4б — оновлюємо батьківський child-bar
    if (window.updateParentChildBar) window.updateParentChildBar();

    // Оновлюємо список канікул при перемиканні профілю
    renderFreezePeriods();

    // Гендерні елементи guide та форм (opt-boy / opt-girl)
    const gender = state.parent.children?.[state.activeChildId]?.gender || 'girl';
    document.querySelectorAll('.opt-girl').forEach(el => el.hidden = gender !== 'girl');
    document.querySelectorAll('.opt-boy').forEach(el => el.hidden  = gender !== 'boy');

    // Гендерні назви і value опцій у bonusForm
    _updateBonusGender(gender);

    // 📝 Оновлення значень у видимих батьківських полях
    //    (видимість встановлюється вище, тут — лише значення)

    // Назва акордіону профілів
    const profilesLabel = document.getElementById('profilesAccordionLabel');
    if (profilesLabel) profilesLabel.textContent = state.data.isParent ? 'Дитячі профілі' : 'Мій профіль';

    if (state.data.isParent) {
        // PIN
        const pinEl = document.getElementById('currentPin');
        if (pinEl) pinEl.textContent = state.parent.pin;

        // Баланс у блоці корекції
        const balEl = document.getElementById('currentBalanceDisplay');
        if (balEl) balEl.textContent = (state.data.balance || 0) + '⭐';

        // Курси конвертації
        const rates = state.parent.conversionRates || { minutesPerStar: 2, moneyPerStar: 1 };
        const mEl    = document.getElementById('minutesPerStar');
        const gEl    = document.getElementById('moneyPerStar');
        const mSpan  = document.getElementById('currentMinutesRate');
        const gSpan  = document.getElementById('currentMoneyRate');
        if (mEl)   mEl.value         = rates.minutesPerStar;
        if (gEl)   gEl.value         = rates.moneyPerStar;
        if (mSpan) mSpan.textContent = rates.minutesPerStar;
        if (gSpan) gSpan.textContent = rates.moneyPerStar;
    }

    // Досягнення на головній + (за потреби) повна сторінка досягнень
    renderAchievementsHome();
    if (document.getElementById('achievementsSection')?.classList.contains('active')) {
        if (window.renderAchievements) window.renderAchievements();
    }

    renderGoal();
}

// ════════════════════════════════════════════════════════════
// ⏳   Loading overlay
// ════════════════════════════════════════════════════════════
export function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

// ════════════════════════════════════════════════════════════
// 🚻  _updateBonusGender — оновлення гендерних назв у bonusForm
// ════════════════════════════════════════════════════════════
// Для кожної option що має data-boy і data-girl:
//   оновлює .value і .textContent відповідно до гендеру дитини.
// Так record.description правильно записується у Firebase.
function _updateBonusGender(gender) {
    const select = document.getElementById('bonusType');
    if (select) {
        const currentVal = select.value;
        select.querySelectorAll('option[data-boy][data-girl]').forEach(opt => {
            const val   = opt.getAttribute(gender === 'girl' ? 'data-girl' : 'data-boy');
            const parts = val.split('|');
            opt.value       = val;
            opt.textContent = `${parts[0]} (+${parts[1]}⭐)`;
        });
        if (currentVal) {
            const stillExists = [...select.options].some(o => o.value === currentVal);
            if (stillExists) select.value = currentVal;
        }
    }

    // Гендерні мітки у guide
    document.querySelectorAll('.gender-label[data-boy][data-girl]').forEach(el => {
        el.textContent = el.getAttribute(gender === 'girl' ? 'data-girl' : 'data-boy');
    });
}

// ── Слухаємо зміни стану (від freeze.js та інших) ────────────
document.addEventListener('zirky:stateChanged', () => {
    updateUI();
});
