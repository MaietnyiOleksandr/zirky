// ════════════════════════════════════════════════════
// FREEZE  freeze.js — Freeze
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260514.1530';

// ════════════════════════════════════════════════════

import { state } from './state.js';
import { recalculateAchievements } from './achievements.js';
import { saveRecords } from './firebase.js';

// ════════════════════════════════════════════════════════════
// ❄️   БЛОК: Канікули
// ════════════════════════════════════════════════════════════
export function addFreezePeriod() {
    const fromInput = document.getElementById('freezeFromDate');
    const untilInput = document.getElementById('freezeUntilDate');
    const fromDate = fromInput.value;
    const untilDate = untilInput.value;
    
    if (!fromDate || !untilDate) {
        alert('Оберіть дату початку та закінчення канікул');
        return;
    }
    
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const until = new Date(untilDate);
    until.setHours(0, 0, 0, 0);
    
    if (from > until) {
        alert('Дата початку має бути раніше або дорівнювати даті закінчення');
        return;
    }
    
    // Перевіряємо чи новий період не перетинається з існуючими
    const periods = state.data.achievements.freezePeriods || [];
    for (let i = 0; i < periods.length; i++) {
        // Пропускаємо період який редагуємо
        if (state.editingFreezeIndex !== undefined && i === state.editingFreezeIndex) {
            continue;
        }
        
        const existing = periods[i];
        const existingFrom = new Date(existing.from);
        existingFrom.setHours(0, 0, 0, 0);
        const existingUntil = new Date(existing.until);
        existingUntil.setHours(23, 59, 59, 999);
        
        // Перевірка на перетинання:
        // Новий період перетинається з існуючим якщо:
        // (новий_початок <= існуючий_кінець) && (новий_кінець >= існуючий_початок)
        if (from <= existingUntil && until >= existingFrom) {
            const existingStr = `${existingFrom.toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit', year: 'numeric'})} - ${existingUntil.toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit', year: 'numeric'})}`;
            const newStr = `${from.toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit', year: 'numeric'})} - ${until.toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit', year: 'numeric'})}`;
            
            alert(`⚠️ Період перетинається з існуючим!\n\nНовий період:\n${newStr}\n\nІснуючий період:\n${existingStr}\n\nБудь ласка, оберіть інші дати.`);
            return;
        }
    }
    
    // Якщо редагуємо існуючий період - видаляємо старий
    if (state.editingFreezeIndex !== undefined) {
        const oldPeriod = state.data.achievements.freezePeriods[state.editingFreezeIndex];
        // Видаляємо запис з історії (тільки якщо є ID!)
        if (oldPeriod && oldPeriod.id) {
            state.data.records = state.data.records.filter(r => r.freezeId !== oldPeriod.id);
        }
        // Видаляємо період
        state.data.achievements.freezePeriods.splice(state.editingFreezeIndex, 1);
        state.editingFreezeIndex = undefined;
    }
    
    // Додаємо новий період канікул
    if (!state.data.achievements.freezePeriods) state.data.achievements.freezePeriods = [];
    
    state.data.achievements.freezePeriods.push({
        from: fromDate,
        until: untilDate,
        id: Date.now() + Math.random()
    });
    
    // Сортуємо періоди по даті початку
    state.data.achievements.freezePeriods.sort((a, b) => new Date(a.from) - new Date(b.from));
    
    // Додаємо запис в історію (дата = початок канікул)
    state.data.records.push({
        id: Date.now() + Math.random(),
        date: fromDate + 'T12:00:00',
        description: `❄️ Канікули (${from.toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit'})} - ${until.toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit'})})`,
        stars: 0,
        type: 'freeze',
        category: 'system',
        freezeId: state.data.achievements.freezePeriods[state.data.achievements.freezePeriods.length - 1].id
    });
    
    // Очищаємо поля
    fromInput.value = '';
    untilInput.value = '';
    
    // Перераховуємо серії
    recalculateAchievements();
    saveRecords();
    document.dispatchEvent(new CustomEvent('zirky:stateChanged'));  // ui.js оновить UI
    renderFreezePeriods();
    
    alert(`❄️ Період канікул додано!

${from.toLocaleDateString('uk-UA')} - ${until.toLocaleDateString('uk-UA')}

Серії перераховані.`);
}

export function deleteFreezePeriod(index) {
    const period = state.data.achievements.freezePeriods[index];
    const from = new Date(period.from);
    const until = new Date(period.until);
    
    if (!confirm(`Видалити період канікул?

${from.toLocaleDateString('uk-UA')} - ${until.toLocaleDateString('uk-UA')}`)) return;
    
    // Видаляємо запис з історії (тільки якщо є ID!)
    if (period && period.id) {
        state.data.records = state.data.records.filter(r => r.freezeId !== period.id);
    }
    
    // Видаляємо період
    state.data.achievements.freezePeriods.splice(index, 1);
    
    // Перераховуємо серії
    recalculateAchievements();
    saveRecords();
    document.dispatchEvent(new CustomEvent('zirky:stateChanged'));  // ui.js оновить UI
    renderFreezePeriods();
}

export function editFreezePeriod(index) {
    const period = state.data.achievements.freezePeriods[index];
    
    // ТІЛЬКИ завантажуємо дати в поля - НІЧОГО НЕ ВИДАЛЯЄМО!
    document.getElementById('freezeFromDate').value = period.from;
    document.getElementById('freezeUntilDate').value = period.until;
    
    // Зберігаємо індекс для видалення при збереженні
    state.editingFreezeIndex = index;
    
    // Прокручуємо до форми
    document.getElementById('freezeFromDate').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function renderFreezePeriods() {
    const container = document.getElementById('freezePeriodsList');
    const periods = state.data.achievements.freezePeriods || [];
    
    if (periods.length === 0) {
        container.innerHTML = '<div style="margin-top: 15px; color: #999; font-size: 13px; text-align: center; padding: 20px; background: var(--bg); border-radius: 12px;">Поки немає збережених періодів канікул</div>';
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = '<div style="padding-top: 15px; border-top: 2px solid #ddd;"><strong style="color: var(--secondary);">Збережені періоди:</strong></div>';
    periods.forEach((period, index) => {
        const from = new Date(period.from);
        const until = new Date(period.until);
        const isActive = until >= today;
        const statusIcon = isActive ? '✅' : '⏸️';
        
        html += `
            <div style="background: ${isActive ? '#E3F2FD' : '#f5f5f5'}; padding: 12px; border-radius: 10px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-weight: 700; font-size: 14px;">${statusIcon} ${from.toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit', year: 'numeric'})} - ${until.toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit', year: 'numeric'})}</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="freeze-period-btn" data-action="edit" data-index="${index}" style="padding: 6px 12px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">✏️ Редагувати</button>
                    <button class="freeze-period-btn" data-action="delete" data-index="${index}" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">🗑️</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Додаємо event listeners для кнопок
    setTimeout(() => {
        document.querySelectorAll('.freeze-period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.dataset.action;
                const index = parseInt(this.dataset.index);
                
                if (action === 'edit') {
                    editFreezePeriod(index);
                } else if (action === 'delete') {
                    deleteFreezePeriod(index);
                }
            });
        });
    }, 10);
}

// Перевіряємо чи день має пропускатися (канікули або вихідні)
// shouldSkipDayForStreak → achievements.js

// Firebase: читаємо дані і слухаємо зміни в реальному часі
