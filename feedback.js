// ════════════════════════════════════════════════════
// 💬  feedback.js — Зворотній зв'язок
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260506.1130';

import { state } from './state.js';
import { nowKyiv } from './utils.js';
import { saveFeedbackItem, deleteFeedbackItem } from './firebase.js';

const CATEGORIES = ['💬 Побажання', '⚠️ Зауваження', '❓ Питання'];

function _formatCommentDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('uk-UA', {
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit'
    });
}


// Кольори статусів — через CSS змінні де можливо,
// хард-коди тільки для семантичних (ці кольори НЕ мають змінюватись з темою)
const STATUS_CONFIG = {
    '⏳': { label: 'Нове',           color: 'var(--c-warning-text)',  bg: 'var(--c-warning-bg)',  border: 'var(--c-warning-border)' },
    '🔄': { label: 'В опрацюванні', color: 'var(--c-info-text)',     bg: 'var(--c-info-bg)',     border: 'var(--c-info-border)'    },
    '✅': { label: 'Виконано',       color: 'var(--c-success-text)',  bg: 'var(--c-success-bg)',  border: 'var(--c-success-border)' },
    '❌': { label: 'Відхилено',      color: 'var(--c-danger-text)',   bg: 'var(--c-danger-bg)',   border: 'var(--c-danger-border)'  },
};

let _items = [];
let _selectedCategory = null;

export function initFeedbackData(rawData) {
    _items = !rawData ? [] : Object.entries(rawData)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => b.date.localeCompare(a.date));
}

export function getFeedbackNewCount() { return _items.filter(i => i.status === '⏳').length; }
export function getFeedbackItems()    { return _items; }

export function renderFeedback() {
    const container = document.getElementById('feedbackBlock');
    if (!container) return;
    container.innerHTML = state.data.isParent ? _renderParentView() : _renderChildView();
    updateFeedbackBadge();
}

// ════════════════════════════════════════════════════
// 👧 ДИТЯЧИЙ ВИГЛЯД
// ════════════════════════════════════════════════════
function _renderChildView() {
    const catBtns = CATEGORIES.map(cat => `
        <button onclick="selectFeedbackCategory('${cat}')"
            id="catBtn_${cat.replace(/\s/g,'_')}"
            class="fb-cat-btn">${cat}</button>
    `).join('');

    const list = _items.length === 0
        ? `<div class="fb-empty">Повідомлень ще немає 🙂</div>`
        : _items.map(item => _renderChildCard(item)).join('');

    return `
        <div class="mb-md">
            <p class="fb-intro">Напиши батькам своє побажання або запитання 💜</p>
            <div class="fb-categories">${catBtns}</div>
            <textarea id="feedbackText" class="fb-textarea"
                placeholder="Введи текст повідомлення..."></textarea>
            <button onclick="submitFeedback()" class="fb-submit-btn">📨 Надіслати</button>
        </div>
        <div>
            <h4 class="fb-list-title">📋 Мої повідомлення</h4>
            ${list}
        </div>`;
}

function _renderChildCard(item) {
    const cfg     = STATUS_CONFIG[item.status] || STATUS_CONFIG['⏳'];
    const dateStr = new Date(item.date).toLocaleDateString('uk-UA',
        { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    // canEdit — тільки для ⏳ (дитина може редагувати/видаляти лише нові)
    const canEdit = item.status === '⏳';

    return `
        <div id="feedbackCard_${item.id}" class="fb-card"
            style="border-left-color:${cfg.border};">

            <div class="fb-card-header">
                <span class="fb-card-category">${item.category}</span>
                <div class="fb-card-meta">
                    <span class="fb-card-date">${dateStr}</span>
                    <span class="fb-status-badge"
                        style="background:${cfg.bg};color:${cfg.color};">
                        ${item.status} ${cfg.label}
                    </span>
                </div>
            </div>

            <div id="fbText_${item.id}" class="fb-card-text">${item.text}</div>

            <div id="fbEdit_${item.id}" style="display:none;margin-bottom:8px;">
                <textarea id="fbEditInput_${item.id}"
                    class="fb-textarea fb-textarea--sm">${item.text}</textarea>
                <div class="fb-actions mt-sm">
                    <button onclick="saveEditFeedback('${item.id}')"
                        class="fb-action-btn fb-action-btn--save">💾 Зберегти</button>
                    <button onclick="cancelEditFeedback('${item.id}')"
                        class="fb-action-btn fb-action-btn--cancel">✕ Скасувати</button>
                </div>
            </div>

            ${item.comment ? `
                <div class="fb-parent-reply">
                    <div class="fb-comment-header">
                        <strong>💬 Відповідь батьків</strong>
                        ${item.commentAt ? `<span class="fb-comment-date">${_formatCommentDate(item.commentAt)}</span>` : ''}
                    </div>
                    <div class="fb-comment-body">${item.comment}</div>
                </div>` : ''}

            <!-- Коментар дитини — доступний при будь-якому статусі -->
            <div>
                ${item.childComment
                    ? `<div id="childCommentDisplay_${item.id}" class="fb-child-comment">
                           <div class="fb-comment-header">
                               <strong>✏️ Мій коментар</strong>
                               ${item.childCommentAt ? `<span class="fb-comment-date">${_formatCommentDate(item.childCommentAt)}</span>` : ''}
                           </div>
                           <div class="fb-comment-body">${item.childComment}</div>
                       </div>`
                    : `<div id="childCommentDisplay_${item.id}"></div>`}
                <div id="childCommentEdit_${item.id}" style="display:none;">
                    <textarea id="childCommentInput_${item.id}"
                        placeholder="Твій коментар..."
                        class="fb-textarea fb-textarea--xs mb-sm"
                    >${item.childComment || ''}</textarea>
                    <div class="fb-actions">
                        <button onclick="saveChildComment('${item.id}')"
                            class="fb-action-btn fb-action-btn--save">💾 Зберегти</button>
                        <button onclick="cancelChildComment('${item.id}')"
                            class="fb-action-btn fb-action-btn--cancel">✕ Скасувати</button>
                    </div>
                </div>
                <button onclick="toggleChildComment('${item.id}')"
                    id="childCommentBtn_${item.id}"
                    class="fb-action-btn fb-action-btn--purple w-full mt-sm">
                    ${item.childComment ? '✏️ Редагувати коментар' : '💬 Додати коментар'}
                </button>
            </div>

            <!-- Редагувати/видалити повідомлення — тільки для ⏳ -->
            ${canEdit ? `
                <div class="fb-actions mt-sm">
                    <button onclick="startEditFeedback('${item.id}')"
                        class="fb-action-btn fb-action-btn--purple">✏️ Редагувати</button>
                    <button onclick="deleteFeedbackConfirm('${item.id}')"
                        class="fb-action-btn fb-action-btn--danger">🗑️ Видалити</button>
                </div>` : ''}
        </div>`;
}

// ════════════════════════════════════════════════════
// 👨‍👩‍👧 БАТЬКІВСЬКИЙ ВИГЛЯД
// ════════════════════════════════════════════════════
function _renderParentView() {
    const newCount = getFeedbackNewCount();
    const header = newCount > 0
        ? `<span style="color:var(--c-warning-text);font-size:13px;"><strong>⏳ Нових: ${newCount}</strong></span>`
        : `<span class="text-hint font-sm">Нових повідомлень немає</span>`;

    const list = _items.length === 0
        ? `<div class="fb-empty">Повідомлень ще немає</div>`
        : _items.map(item => _renderParentCard(item)).join('');

    return `
        <div class="mb-md">${header}</div>
        ${list}`;
}

function _renderParentCard(item) {
    const cfg     = STATUS_CONFIG[item.status] || STATUS_CONFIG['⏳'];
    const dateStr = new Date(item.date).toLocaleDateString('uk-UA',
        { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    // Опції dropdown — всі статуси крім поточного
    const dropdownItems = Object.entries(STATUS_CONFIG).map(([status, scfg]) => `
        <button onclick="setFeedbackStatus('${item.id}','${status}');closeFbDropdown()"
            class="fb-dropdown-item ${item.status === status ? 'fb-dropdown-item--active' : ''}"
            style="color:${scfg.color};">
            ${status} ${scfg.label}
        </button>`).join('');

    return `
        <div id="feedbackCard_${item.id}" class="fb-card"
            style="border-left-color:${cfg.border};">

            <div class="fb-card-header">
                <span class="fb-card-category">${item.category}</span>
                <div class="fb-card-meta">
                    <span class="fb-card-date">${dateStr}</span>
                    <div class="fb-status-dropdown-wrap">
                        <button class="fb-status-badge fb-status-badge--btn"
                            style="background:${cfg.bg};color:${cfg.color};"
                            onclick="toggleFbDropdown('fbDrop_${item.id}')">
                            ${item.status} ${cfg.label} <span class="fb-dropdown-arrow">▾</span>
                        </button>
                        <div id="fbDrop_${item.id}" class="fb-dropdown" style="display:none;">
                            ${dropdownItems}
                        </div>
                    </div>
                </div>
            </div>

            <div class="fb-card-text">${item.text}</div>

            ${item.childComment ? `
                <div class="fb-child-comment mb-sm">
                    <div class="fb-comment-header">
                        <strong>✏️ Коментар дитини</strong>
                        ${item.childCommentAt ? `<span class="fb-comment-date">${_formatCommentDate(item.childCommentAt)}</span>` : ''}
                    </div>
                    <div class="fb-comment-body">${item.childComment}</div>
                </div>` : ''}

            ${item.comment ? `
                <div id="parentCommentDisplay_block_${item.id}" class="fb-parent-reply mb-sm">
                    <div class="fb-comment-header">
                        <strong>💬 Ваш коментар</strong>
                        ${item.commentAt ? '<span class="fb-comment-date">' + _formatCommentDate(item.commentAt) + '</span>' : ''}
                    </div>
                    <div class="fb-comment-body">${item.comment}</div>
                    <div class="fb-actions mt-sm">
                        <button onclick="startEditParentComment('${item.id}')"
                            class="fb-action-btn fb-action-btn--purple">✏️ Редагувати</button>
                        <button onclick="deleteParentComment('${item.id}')"
                            class="fb-action-btn fb-action-btn--danger">🗑️ Видалити коментар</button>
                    </div>
                </div>
                <div id="parentCommentEdit_block_${item.id}" style="display:none;">
                    <textarea id="parentCommentInput_${item.id}"
                        placeholder="Коментар для дитини..."
                        class="fb-textarea fb-textarea--xs mb-sm"
                    >${item.comment || ''}</textarea>
                    <div class="fb-actions">
                        <button onclick="saveParentComment('${item.id}')"
                            class="fb-action-btn fb-action-btn--save">💾 Зберегти</button>
                        <button onclick="cancelEditParentComment('${item.id}')"
                            class="fb-action-btn fb-action-btn--cancel">✕ Скасувати</button>
                    </div>
                </div>` : `
                <div id="parentCommentEdit_block_${item.id}">
                    <textarea id="parentCommentInput_${item.id}"
                        placeholder="Коментар для дитини (опційно)..."
                        class="fb-textarea fb-textarea--xs mb-sm"
                    ></textarea>
                    <button onclick="saveParentComment('${item.id}')"
                        class="fb-action-btn fb-action-btn--save w-full">💾 Зберегти коментар</button>
                </div>`}

            <div class="fb-actions mt-sm">
                <button onclick="deleteFeedbackConfirm('${item.id}')"
                    class="fb-action-btn fb-action-btn--danger">🗑️ Видалити повідомлення</button>
            </div>
        </div>`;
}

// ════════════════════════════════════════════════════
// ✏️ ДІЇ
// ════════════════════════════════════════════════════
export function selectFeedbackCategory(cat) {
    _selectedCategory = cat;
    CATEGORIES.forEach(c => {
        const btn = document.getElementById(`catBtn_${c.replace(/\s/g,'_')}`);
        if (btn) btn.classList.toggle('active', c === cat);
    });
}

export function submitFeedback() {
    const text = document.getElementById('feedbackText')?.value?.trim();
    if (!_selectedCategory) { alert('❗ Оберіть категорію'); return; }
    if (!text)               { alert('❗ Введіть текст повідомлення'); return; }
    const item = { id: Date.now().toString(), date: nowKyiv(), category: _selectedCategory,
        text, status: '⏳', comment: '', childComment: '', updatedAt: null };
    _items.unshift(item);
    saveFeedbackItem(item);
    _selectedCategory = null;
    if (window.generateNotifications) window.generateNotifications();
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
    if (btn) btn.textContent = isOpen
        ? (_items.find(i=>i.id===id)?.childComment ? '✏️ Редагувати коментар' : '💬 Додати коментар')
        : '▲ Сховати';
}

export function cancelChildComment(id) {
    document.getElementById(`childCommentEdit_${id}`).style.display = 'none';
    const btn = document.getElementById(`childCommentBtn_${id}`);
    if (btn) btn.textContent = _items.find(i=>i.id===id)?.childComment
        ? '✏️ Редагувати коментар' : '💬 Додати коментар';
}

export function saveChildComment(id) {
    const input = document.getElementById(`childCommentInput_${id}`);
    const item  = _items.find(i => i.id === id);
    if (!item || !input) return;
    item.childComment   = input.value.trim();
    item.childCommentAt = nowKyiv();
    item.updatedAt      = nowKyiv();
    saveFeedbackItem(item);
    if (window.generateNotifications) window.generateNotifications();
    renderFeedback();
    if (window.updateNotificationBadge) window.updateNotificationBadge();
}

export function setFeedbackStatus(id, status) {
    const item = _items.find(i => i.id === id);
    if (!item) return;
    item.prevStatus       = item.status;
    item.status           = status;
    item.statusChangedAt  = nowKyiv();
    item.updatedAt        = nowKyiv();
    saveFeedbackItem(item);
    if (window.generateNotifications) window.generateNotifications();
    renderFeedback();
    if (window.updateBadges) window.updateBadges();
}

export function saveParentComment(id) {
    const input = document.getElementById(`parentCommentInput_${id}`);
    const item  = _items.find(i => i.id === id);
    if (!item || !input) return;
    item.comment   = input.value.trim();
    item.commentAt = nowKyiv();
    item.updatedAt = nowKyiv();
    saveFeedbackItem(item);
    renderFeedback();
}



export function toggleFbDropdown(id) {
    // Закриваємо всі інші dropdown
    document.querySelectorAll('.fb-dropdown').forEach(d => {
        if (d.id !== id) d.style.display = 'none';
    });
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

export function closeFbDropdown() {
    document.querySelectorAll('.fb-dropdown').forEach(d => d.style.display = 'none');
}
export function deleteFeedbackConfirm(id) {
    const item = _items.find(i => i.id === id);
    if (!item) return;
    const preview = item.text.length > 60 ? item.text.slice(0, 60) + '...' : item.text;
    if (!confirm(`Видалити це повідомлення?\n\n"${preview}"\n\nДія незворотна.`)) return;
    deleteFeedback(id);
}

export function startEditParentComment(id) {
    const displayBlock = document.getElementById(`parentCommentDisplay_block_${id}`);
    const editBlock    = document.getElementById(`parentCommentEdit_block_${id}`);
    if (displayBlock) displayBlock.style.display = 'none';
    if (editBlock)    editBlock.style.display    = 'block';
}

export function cancelEditParentComment(id) {
    const displayBlock = document.getElementById(`parentCommentDisplay_block_${id}`);
    const editBlock    = document.getElementById(`parentCommentEdit_block_${id}`);
    if (displayBlock) displayBlock.style.display = 'block';
    if (editBlock)    editBlock.style.display    = 'none';
}

export function deleteParentComment(id) {
    if (!confirm('Видалити ваш коментар до цього повідомлення?')) return;
    const item = _items.find(i => i.id === id);
    if (!item) return;
    item.comment   = '';
    item.commentAt = null;
    item.updatedAt = nowKyiv();
    saveFeedbackItem(item);
    renderFeedback();
}
// updateFeedbackBadge — тепер керується через updateBadges() у notifications
export function updateFeedbackBadge() {
    if (window.updateBadges) window.updateBadges();
}
