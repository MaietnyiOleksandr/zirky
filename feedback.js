// ════════════════════════════════════════════════════
// 💬  feedback.js — Зворотній зв'язок
//     Зірки Успіху
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260503.2158';

import { state } from './state.js';
import { nowKyiv } from './utils.js';
import { saveFeedbackItem, deleteFeedbackItem } from './firebase.js';

// ════════════════════════════════════════════════════════════

const CATEGORIES = ['💬 Побажання', '⚠️ Зауваження', '❓ Питання'];

const STATUS_CONFIG = {
    '⏳': { label: 'Нове',            color: '#E65100', bg: '#FFF3E0', border: '#FF9800' },
    '🔄': { label: 'В опрацюванні',  color: '#1565C0', bg: '#E3F2FD', border: '#2196F3' },
    '✅': { label: 'Виконано',        color: '#2E7D32', bg: '#E8F5E9', border: '#4CAF50' },
    '❌': { label: 'Відхилено',       color: '#b71c1c', bg: '#FFEBEE', border: '#f44336' },
};

// Локальний стан
let _items = [];
let _selectedCategory = null;

// ── Ініціалізація даних з Firebase ───────────────────────────
export function initFeedbackData(rawData) {
    if (!rawData) {
        _items = [];
    } else {
        _items = Object.entries(rawData)
            .map(([id, val]) => ({ id, ...val }))
            .sort((a, b) => b.date.localeCompare(a.date)); // нові зверху
    }
}

// ── Кількість нових повідомлень (для бейджу) ─────────────────
export function getFeedbackNewCount() {
    return _items.filter(i => i.status === '⏳').length;
}

// ── Головний рендер ───────────────────────────────────────────
export function renderFeedback() {
    const container = document.getElementById('feedbackBlock');
    if (!container) return;
    container.innerHTML = state.data.isParent
        ? _renderParentView()
        : _renderChildView();
    updateFeedbackBadge();
}

// ════════════════════════════════════════════════════════════
// 👧 ДИТЯЧИЙ ВИГЛЯД
// ════════════════════════════════════════════════════════════

function _renderChildView() {
    return `
        <!-- Форма відправки -->
        <div style="margin-bottom:16px;">
            <p style="font-size:13px; color:#6A1B9A; margin:0 0 10px;">
                Напиши батькам своє побажання або запитання 💜
            </p>
            <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
                ${CATEGORIES.map(cat => `
                    <button onclick="selectFeedbackCategory('${cat}')"
                        id="catBtn_${cat.replace(/\s/g,'_')}"
                        style="padding:6px 14px; border-radius:20px;
                               border:2px solid #9C27B0; background:none;
                               font-size:13px; cursor:pointer; color:#9C27B0; font-weight:600;">
                        ${cat}
                    </button>
                `).join('')}
            </div>
            <textarea id="feedbackText"
                placeholder="Введи текст повідомлення..."
                style="width:100%; min-height:85px; padding:12px; border-radius:12px;
                       border:2px solid #CE93D8; background:white; color:var(--text);
                       font-size:14px; font-family:inherit; resize:none;
                       box-sizing:border-box;"></textarea>
            <button onclick="submitFeedback()"
                style="width:100%; margin-top:8px; padding:12px; border-radius:12px;
                       border:none; background:linear-gradient(135deg,#9C27B0,#7B1FA2);
                       color:white; font-size:15px; font-weight:700; cursor:pointer;">
                📨 Надіслати
            </button>
        </div>

        <!-- Моя历史 -->
        <div>
            <h4 style="color:#6A1B9A; margin:0 0 10px; font-size:14px; font-weight:700;">
                📋 Мої повідомлення
            </h4>
            ${_items.length === 0
                ? `<div style="text-align:center; color:#aaa; font-size:13px; padding:16px 0;">
                       Повідомлень ще немає 🙂
                   </div>`
                : _items.map(item => _renderChildCard(item)).join('')
            }
        </div>
    `;
}

function _renderChildCard(item) {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['⏳'];
    const dateStr = new Date(item.date).toLocaleDateString('uk-UA',
        { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const canEdit = item.status === '⏳';

    return `
        <div id="feedbackCard_${item.id}"
            style="background:white; border-radius:14px; padding:14px; margin-bottom:10px;
                   border-left:4px solid ${cfg.border};
                   box-shadow:0 1px 4px rgba(0,0,0,0.07);">

            <!-- Шапка картки -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <span style="font-size:13px; font-weight:700; color:#555;">${item.category}</span>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px;">
                    <span style="font-size:11px; color:#aaa;">${dateStr}</span>
                    <span style="font-size:11px; padding:2px 8px; border-radius:10px;
                                 background:${cfg.bg}; color:${cfg.color}; font-weight:600;">
                        ${item.status} ${cfg.label}
                    </span>
                </div>
            </div>

            <!-- Текст повідомлення -->
            <div id="fbText_${item.id}"
                style="font-size:14px; color:var(--text); line-height:1.5; margin-bottom:8px;">
                ${item.text}
            </div>

            <!-- Поле редагування (приховане) -->
            <div id="fbEdit_${item.id}" style="display:none; margin-bottom:8px;">
                <textarea id="fbEditInput_${item.id}"
                    style="width:100%; min-height:70px; padding:10px; border-radius:10px;
                           border:2px solid #9C27B0; background:white; color:var(--text);
                           font-size:14px; font-family:inherit; resize:none;
                           box-sizing:border-box;">${item.text}</textarea>
                <div style="display:flex; gap:8px; margin-top:6px;">
                    <button onclick="saveEditFeedback('${item.id}')"
                        style="flex:1; padding:8px; border-radius:10px; border:none;
                               background:#9C27B0; color:white; font-size:13px;
                               font-weight:600; cursor:pointer;">
                        💾 Зберегти
                    </button>
                    <button onclick="cancelEditFeedback('${item.id}')"
                        style="flex:1; padding:8px; border-radius:10px;
                               border:2px solid #ddd; background:none;
                               font-size:13px; cursor:pointer; color:#666;">
                        ✕ Скасувати
                    </button>
                </div>
            </div>

            <!-- Відповідь батьків -->
            ${item.comment ? `
                <div style="background:#F3E5F5; border-radius:10px; padding:10px;
                            margin-bottom:8px; font-size:13px; color:#4A148C;
                            border-left:3px solid #CE93D8;">
                    <strong>💬 Відповідь батьків:</strong><br>${item.comment}
                </div>
            ` : ''}

            <!-- Коментар дитини (для карток що не можна редагувати) -->
            ${!canEdit ? `
                <div style="margin-bottom:4px;">
                    ${item.childComment ? `
                        <div id="childCommentDisplay_${item.id}"
                            style="background:#EDE7F6; border-radius:10px; padding:10px;
                                   margin-bottom:8px; font-size:13px; color:#4A148C;
                                   border-left:3px solid #9C27B0;">
                            <strong>✏️ Мій коментар:</strong><br>${item.childComment}
                        </div>
                    ` : `<div id="childCommentDisplay_${item.id}"></div>`}
                    <div id="childCommentEdit_${item.id}" style="display:none;">
                        <textarea id="childCommentInput_${item.id}"
                            placeholder="Твій коментар..."
                            style="width:100%; min-height:60px; padding:10px; border-radius:10px;
                                   border:2px solid #9C27B0; background:white; color:var(--text);
                                   font-size:13px; font-family:inherit; resize:none;
                                   box-sizing:border-box; margin-bottom:6px;"
                        >${item.childComment || ''}</textarea>
                        <div style="display:flex; gap:8px;">
                            <button onclick="saveChildComment('${item.id}')"
                                style="flex:1; padding:7px; border-radius:10px; border:none;
                                       background:#9C27B0; color:white; font-size:13px;
                                       font-weight:600; cursor:pointer;">
                                💾 Зберегти
                            </button>
                            <button onclick="cancelChildComment('${item.id}')"
                                style="flex:1; padding:7px; border-radius:10px;
                                       border:2px solid #ddd; background:none;
                                       font-size:13px; cursor:pointer; color:#666;">
                                ✕ Скасувати
                            </button>
                        </div>
                    </div>
                    <button onclick="toggleChildComment('${item.id}')"
                        id="childCommentBtn_${item.id}"
                        style="width:100%; padding:6px; border-radius:8px;
                               border:1px solid #CE93D8; background:none;
                               font-size:12px; cursor:pointer; color:#9C27B0; margin-top:4px;">
                        ${item.childComment ? '✏️ Редагувати коментар' : '💬 Додати коментар'}
                    </button>
                </div>
            ` : ''}

            <!-- Кнопки дій (тільки для нових) -->
            ${canEdit ? `
                <div style="display:flex; gap:8px;">
                    <button onclick="startEditFeedback('${item.id}')"
                        style="flex:1; padding:6px; border-radius:8px;
                               border:1px solid #CE93D8; background:none;
                               font-size:12px; cursor:pointer; color:#9C27B0;">
                        ✏️ Редагувати
                    </button>
                    <button onclick="deleteFeedback('${item.id}')"
                        style="flex:1; padding:6px; border-radius:8px;
                               border:1px solid #ffcdd2; background:none;
                               font-size:12px; cursor:pointer; color:#f44336;">
                        🗑️ Видалити
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// ════════════════════════════════════════════════════════════
// 👨‍👩‍👧 БАТЬКІВСЬКИЙ ВИГЛЯД
// ════════════════════════════════════════════════════════════

function _renderParentView() {
    const newCount = getFeedbackNewCount();
    return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:13px;">
                ${newCount > 0
                    ? `<strong style="color:#E65100;">⏳ Нових: ${newCount}</strong>`
                    : `<span style="color:#aaa;">Нових повідомлень немає</span>`}
            </span>
        </div>
        ${_items.length === 0
            ? `<div style="text-align:center; color:#aaa; font-size:13px; padding:16px 0;">
                   Повідомлень ще немає
               </div>`
            : _items.map(item => _renderParentCard(item)).join('')
        }
    `;
}

function _renderParentCard(item) {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['⏳'];
    const dateStr = new Date(item.date).toLocaleDateString('uk-UA',
        { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    return `
        <div id="feedbackCard_${item.id}"
            style="background:white; border-radius:14px; padding:14px; margin-bottom:10px;
                   border-left:4px solid ${cfg.border};
                   box-shadow:0 1px 4px rgba(0,0,0,0.07);">

            <!-- Шапка -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <span style="font-size:13px; font-weight:700; color:#555;">${item.category}</span>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px;">
                    <span style="font-size:11px; color:#aaa;">${dateStr}</span>
                    <span style="font-size:11px; padding:2px 8px; border-radius:10px;
                                 background:${cfg.bg}; color:${cfg.color}; font-weight:600;">
                        ${item.status} ${cfg.label}
                    </span>
                </div>
            </div>

            <!-- Текст -->
            <div style="font-size:14px; color:var(--text); line-height:1.5; margin-bottom:12px;">
                ${item.text}
            </div>

            <!-- Кнопки статусів -->
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
                ${Object.entries(STATUS_CONFIG).map(([status, scfg]) => `
                    <button onclick="setFeedbackStatus('${item.id}', '${status}')"
                        style="padding:5px 10px; border-radius:12px;
                               border:2px solid ${scfg.border};
                               background:${item.status === status ? scfg.bg : 'none'};
                               color:${scfg.color}; font-size:12px; cursor:pointer;
                               font-weight:600;">
                        ${status} ${scfg.label}
                    </button>
                `).join('')}
            </div>

            <!-- Поле коментаря -->
            <textarea id="parentCommentInput_${item.id}"
                placeholder="Коментар для дитини (опційно)..."
                style="width:100%; min-height:60px; padding:10px; border-radius:10px;
                       border:2px solid #CE93D8; background:white; color:var(--text);
                       font-size:13px; font-family:inherit; resize:none;
                       box-sizing:border-box; margin-bottom:8px;"
            >${item.comment || ''}</textarea>

            <!-- Кнопки дій -->
            <div style="display:flex; gap:8px;">
                <button onclick="saveParentComment('${item.id}')"
                    style="flex:1; padding:9px; border-radius:10px; border:none;
                           background:linear-gradient(135deg,#9C27B0,#7B1FA2);
                           color:white; font-size:13px; font-weight:600; cursor:pointer;">
                    💾 Зберегти коментар
                </button>
                <button onclick="deleteFeedback('${item.id}')"
                    style="padding:9px 14px; border-radius:10px;
                           border:1px solid #ffcdd2; background:none;
                           font-size:13px; cursor:pointer; color:#f44336;">
                    🗑️
                </button>
            </div>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════
// ✏️ ДІЇ ДИТИНИ
// ════════════════════════════════════════════════════════════

export function selectFeedbackCategory(cat) {
    _selectedCategory = cat;
    CATEGORIES.forEach(c => {
        const btn = document.getElementById(`catBtn_${c.replace(/\s/g,'_')}`);
        if (!btn) return;
        btn.style.background = c === cat ? '#9C27B0' : 'none';
        btn.style.color      = c === cat ? 'white'   : '#9C27B0';
    });
}

export function submitFeedback() {
    const text = document.getElementById('feedbackText')?.value?.trim();
    if (!_selectedCategory) { alert('❗ Оберіть категорію'); return; }
    if (!text)               { alert('❗ Введіть текст повідомлення'); return; }

    const item = {
        id:        Date.now().toString(),
        date:      nowKyiv(),
        category:  _selectedCategory,
        text,
        status:       '⏳',
        comment:      '',
        childComment: '',
        updatedAt:    null,
    };

    _items.unshift(item);
    saveFeedbackItem(item);
    _selectedCategory = null;
    renderFeedback();
}

export function startEditFeedback(id) {
    document.getElementById(`fbText_${id}`).style.display = 'none';
    document.getElementById(`fbEdit_${id}`).style.display = 'block';
}

export function cancelEditFeedback(id) {
    document.getElementById(`fbText_${id}`).style.display = 'block';
    document.getElementById(`fbEdit_${id}`).style.display = 'none';
}

export function saveEditFeedback(id) {
    const newText = document.getElementById(`fbEditInput_${id}`)?.value?.trim();
    if (!newText) { alert('❗ Текст не може бути порожнім'); return; }
    const item = _items.find(i => i.id === id);
    if (!item) return;
    item.text = newText;
    saveFeedbackItem(item);
    renderFeedback();
}

export function deleteFeedback(id) {
    if (!confirm('Видалити це повідомлення?')) return;
    _items = _items.filter(i => i.id !== id);
    deleteFeedbackItem(id);
    renderFeedback();
}

export function toggleChildComment(id) {
    const editBlock = document.getElementById(`childCommentEdit_${id}`);
    const btn       = document.getElementById(`childCommentBtn_${id}`);
    const isOpen    = editBlock.style.display !== 'none';
    editBlock.style.display = isOpen ? 'none' : 'block';
    btn.textContent = isOpen
        ? (_items.find(i => i.id === id)?.childComment ? '✏️ Редагувати коментар' : '💬 Додати коментар')
        : '▲ Сховати';
}

export function cancelChildComment(id) {
    const item = _items.find(i => i.id === id);
    document.getElementById(`childCommentEdit_${id}`).style.display = 'none';
    const btn = document.getElementById(`childCommentBtn_${id}`);
    if (btn) btn.textContent = item?.childComment ? '✏️ Редагувати коментар' : '💬 Додати коментар';
}

export function saveChildComment(id) {
    const input = document.getElementById(`childCommentInput_${id}`);
    const item  = _items.find(i => i.id === id);
    if (!item || !input) return;
    item.childComment = input.value.trim();
    item.updatedAt    = nowKyiv();
    saveFeedbackItem(item);
    renderFeedback();
}

// ════════════════════════════════════════════════════════════
// 👨‍👩‍👧 ДІЇ БАТЬКІВ
// ════════════════════════════════════════════════════════════

export function setFeedbackStatus(id, status) {
    const item = _items.find(i => i.id === id);
    if (!item) return;
    item.status    = status;
    item.updatedAt = nowKyiv();
    saveFeedbackItem(item);
    renderFeedback();
}

export function saveParentComment(id) {
    const input = document.getElementById(`parentCommentInput_${id}`);
    const item  = _items.find(i => i.id === id);
    if (!item || !input) return;
    item.comment   = input.value.trim();
    item.updatedAt = nowKyiv();
    saveFeedbackItem(item);
    renderFeedback();
}

// ════════════════════════════════════════════════════════════
// 🔴 БЕЙДЖ
// ════════════════════════════════════════════════════════════

export function updateFeedbackBadge() {
    const badge = document.getElementById('feedbackBadge');
    if (!badge) return;
    const count = getFeedbackNewCount();
    if (count > 0 && state.data.isParent) {
        badge.textContent  = count > 9 ? '9+' : count;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}
