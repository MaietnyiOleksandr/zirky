// ════════════════════════════════════════════════════
// HISTORY  history.js — History
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260510.2050';

import { getSubjectEmoji } from './subjects.js';

// ════════════════════════════════════════════════════════════

import { state } from './state.js';
import { deleteFreezePeriod, editFreezePeriod } from './freeze.js';
import { deleteRecord } from './records.js';

// ════════════════════════════════════════════════════
// getSubjectEmoji — імпортується з subjects.js

// ════════════════════════════════════════════════════
// 🔍  Фільтрація
// ════════════════════════════════════════════════════

export function applyHistoryFilter() {
    const typeEl    = document.getElementById('filterType');
    const subjectEl = document.getElementById('filterSubject');
    const spendEl   = document.getElementById('filterSpendCategory');
    if (!typeEl) return;

    const type = typeEl.value;

    // Предметний фільтр — для оцінок, діагностувальних, всіх нарахувань
    if (subjectEl) {
        const showSubject = type === 'earn' || type === 'grade' || type === 'diagnostic';
        subjectEl.style.display = showSubject ? 'block' : 'none';
        if (!showSubject) subjectEl.value = 'all';
    }

    // Фільтр категорії витрат
    if (spendEl) {
        spendEl.style.display = type === 'spend' ? 'block' : 'none';
        if (type !== 'spend') spendEl.value = 'all';
    }

    renderHistory();
}

// ════════════════════════════════════════════════════
// 📜  Рендер історії
// ════════════════════════════════════════════════════

export function renderHistory() {
    const list = document.getElementById('historyList');
    const monthNames = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                        'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
    document.getElementById('currentMonth').textContent =
        `${monthNames[state.currentViewMonth.getMonth()]} ${state.currentViewMonth.getFullYear()}`;

    // Читаємо фільтри
    const filterType          = document.getElementById('filterType')?.value          || 'all';
    const filterSubject       = document.getElementById('filterSubject')?.value       || 'all';
    const filterSpendCategory = document.getElementById('filterSpendCategory')?.value || 'all';

    // Фільтр по місяцю
    let records = (state.data.records || []).filter(r => {
        const d = new Date(r.date);
        return d.getMonth()    === state.currentViewMonth.getMonth() &&
               d.getFullYear() === state.currentViewMonth.getFullYear();
    });

    // Фільтр по типу/категорії
    if (filterType === 'earn')        records = records.filter(r => r.type === 'earn');
    if (filterType === 'grade')       records = records.filter(r => r.category === 'grade');
    if (filterType === 'diagnostic')  records = records.filter(r => r.category === 'diagnostic');
    if (filterType === 'bonus')       records = records.filter(r => r.category === 'bonus');
    if (filterType === 'special')     records = records.filter(r => r.category === 'special');
    if (filterType === 'achievement') records = records.filter(r => r.category === 'achievement');
    if (filterType === 'spend')       records = records.filter(r => r.type === 'spend');
    if (filterType === 'freeze')      records = records.filter(r => r.type === 'freeze');

    // Предметний фільтр
    if (filterSubject !== 'all' && (filterType === 'earn' || filterType === 'grade' || filterType === 'diagnostic')) {
        records = records.filter(r =>
            (r.category === 'grade' || r.category === 'diagnostic') &&
            (r.subject === filterSubject || r.subject?.includes(filterSubject))
        );
    }

    // Фільтр категорії витрат
    if (filterType === 'spend' && filterSpendCategory !== 'all') {
        records = records.filter(r => {
            const cat = r.category || 'other'; // старі записи без категорії = other
            return cat === filterSpendCategory;
        });
    }

    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Порожній стан
    if (records.length === 0) {
        const isFiltered = filterType !== 'all' || filterSubject !== 'all' || filterSpendCategory !== 'all';
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${isFiltered ? '🔍' : '📝'}</div>
                <p>${isFiltered ? 'Немає записів що відповідають фільтру' : 'Ще немає записів за цей місяць'}</p>
            </div>`;
        return;
    }

    list.innerHTML = records.map(r => {
        const date    = new Date(r.date);
        const dateStr = `${date.getDate()}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getFullYear()}`;

        let desc = r.category === 'grade'      ? `${getSubjectEmoji(r.subject)} — ${r.grade} балів`
                 : r.category === 'diagnostic' ? `${getSubjectEmoji(r.subject)} — ${r.grade} балів`
                 : r.type === 'spend'          ? (r.desc || r.description || r.reward || '—')
                 : (r.desc || r.description || '—');

        const starClass = r.type === 'earn' ? 'positive'
                        : (r.type === 'info' || r.type === 'freeze') ? 'info'
                        : 'negative';

        // Кнопки дій
        let actionButtons = '';
        if (state.data.isParent) {
            if (r.type === 'freeze' && r.freezeId) {
                const freezeIndex = state.data.achievements.freezePeriods.findIndex(p => p.id === r.freezeId);
                if (freezeIndex !== -1) {
                    actionButtons = `
                        <button class="delete-btn" style="background:#2196F3; margin-right:5px;"
                            onclick="editFreezePeriod(${freezeIndex});
                                     document.dispatchEvent(new CustomEvent('zirky:switchTab', { detail: 'add' }));
                                     document.dispatchEvent(new CustomEvent('zirky:showForm', { detail: 'freeze' }));">✏️</button>
                        <button class="delete-btn" onclick="deleteFreezePeriod(${freezeIndex})">🗑️</button>`;
                }
            } else if (r.type !== 'info' && r.type !== 'freeze') {
                actionButtons = `<button class="delete-btn" onclick="deleteRecord(${r.id})">🗑️</button>`;
            }
        }

        const starsDisplay = (r.type === 'info' || r.type === 'freeze') ? ''
            : `<div class="history-stars ${starClass}">${r.type === 'earn' ? '+' : '-'}${r.stars}⭐</div>`;

        return `
            <div class="history-item ${r.type === 'spend' ? 'expense' : ''}
                                      ${r.type === 'info' || r.type === 'freeze' ? 'info-item' : ''}">
                <div class="history-info">
                    <div class="history-date">${dateStr}</div>
                    <div class="history-desc">${desc}</div>
                </div>
                ${starsDisplay}
                ${actionButtons}
            </div>`;
    }).join('');
}

// ════════════════════════════════════════════════════
// 📅  Навігація по місяцях
// ════════════════════════════════════════════════════

export function changeMonth(delta) {
    state.currentViewMonth.setMonth(state.currentViewMonth.getMonth() + delta);
    renderHistory();
}