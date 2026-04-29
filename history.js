// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260426.1552';
// HISTORY  history.js — History
//     Зірки Успіху | v3.20260426.1552
// ════════════════════════════════════════════════════

import { state } from './state.js';
import { deleteFreezePeriod, editFreezePeriod } from './freeze.js';
import { deleteRecord } from './records.js';

// ════════════════════════════════════════════════════════════
// 📜  БЛОК: Історія
// ════════════════════════════════════════════════════════════
export function getSubjectEmoji(subject) {
    const emojiMap = {
        'Математика': '📐',
        'Українська мова': '🇺🇦',
        'Я пізнаю світ': '🌍',
        'Читання': '📖',
        'Англійська мова': '🇬🇧',
        'Інформатика': '💻',
        'Мистецтво': '🎨',
        'Вірш': '📝',
        'Фізкультура': '⚽'
    };
    
    // Перевіряємо чи предмет містить назву з мапи
    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (subject.includes(key)) {
            return emoji + ' ' + subject;
        }
    }
    return subject;
}

export function renderHistory() {
    const list = document.getElementById('historyList');
    const monthNames = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
    document.getElementById('currentMonth').textContent = `${monthNames[state.currentViewMonth.getMonth()]} ${state.currentViewMonth.getFullYear()}`;

    const filtered = (state.data.records || []).filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === state.currentViewMonth.getMonth() &&
               d.getFullYear() === state.currentViewMonth.getFullYear();
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>Ще немає записів за цей місяць</p></div>`;
        return;
    }

    list.innerHTML = filtered.map(r => {
        const date = new Date(r.date);
        const dateStr = `${date.getDate()}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getFullYear()}`;
        let desc = r.category === 'grade' ? `${getSubjectEmoji(r.subject)} — ${r.grade} балів`
                 : r.category === 'diagnostic' ? `${getSubjectEmoji(r.subject)} — ${r.grade} балів`
                 : r.type === 'spend' ? (r.reward || r.description)
                 : r.description;
        const starClass = r.type === 'earn' ? 'positive' : (r.type === 'info' || r.type === 'freeze') ? 'info' : 'negative';
        
        // Кнопки для різних типів записів
        let actionButtons = '';
        if (state.data.isParent) {
            if (r.type === 'freeze' && r.freezeId) {
                // Для канікул - редагувати та видалити
                const freezeIndex = state.data.achievements.freezePeriods.findIndex(p => p.id === r.freezeId);
                if (freezeIndex !== -1) {
                    actionButtons = `
                        <button class="delete-btn" onclick="editFreezePeriod(${freezeIndex}); document.dispatchEvent(new CustomEvent('zirky:switchTab', { detail: 'add' })); document.dispatchEvent(new CustomEvent('zirky:showForm', { detail: 'freeze' }));" style="background: #2196F3; margin-right: 5px;">✏️</button>
                        <button class="delete-btn" onclick="deleteFreezePeriod(${freezeIndex})">🗑️</button>
                    `;
                }
            } else if (r.type !== 'info' && r.type !== 'freeze') {
                // Для звичайних записів - тільки видалити
                actionButtons = `<button class="delete-btn" onclick="deleteRecord(${r.id})">🗑️</button>`;
            }
        }
        
        const starsDisplay = (r.type === 'info' || r.type === 'freeze') ? '' : `<div class="history-stars ${starClass}">${r.type === 'earn' ? '+' : '-'}${r.stars}⭐</div>`;
        return `
            <div class="history-item ${r.type === 'spend' ? 'expense' : ''} ${r.type === 'info' || r.type === 'freeze' ? 'info-item' : ''}">
                <div class="history-info">
                    <div class="history-date">${dateStr}</div>
                    <div class="history-desc">${desc}</div>
                </div>
                ${starsDisplay}
                ${actionButtons}
            </div>`;
    }).join('');
}

export function changeMonth(delta) {
    state.currentViewMonth.setMonth(state.currentViewMonth.getMonth() + delta);
    renderHistory();
}

