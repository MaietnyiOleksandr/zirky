// ════════════════════════════════════════════════════
// 💬  feedback.js — Зворотній зв'язок
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260613.0749';

import { state, feedbackFilter } from './state.js';
import { notifyFeedbackChanged, removeNotification, hasUnreadFeedbackNotif, dismissFeedbackNotifs } from './notifications.js';
import { nowKyiv } from './utils.js';
import { saveFeedbackItem, deleteFeedbackItem, db } from './firebase.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const CATEGORIES = [
    '💬 Побажання',
    '⚠️ Зауваження',
    '❓ Питання',
    '📅 Розклад',
    '💡 Ідея',
];

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

// ════════════════════════════════════════════════════
// 🔍  Стан фільтрів
// ════════════════════════════════════════════════════

// Кеш фідбеку всіх дітей для батьківського вигляду
// { child_1: [item, ...], child_2: [...] }
let _allFeedbackCache = {};
let _allFeedbackCacheLoaded = false;

export function resetAllFeedbackCache() {
    _allFeedbackCache = {};
    _allFeedbackCacheLoaded = false;
}

// Шукає item за id у _items (активна дитина) і у _allFeedbackCache (всі діти).
// Повертає { item, childId } або null.
// Використовується батьківськими операціями (saveParentComment, setFeedbackStatus, deleteFeedback)
// щоб коректно знаходити та зберігати фідбек будь-якої дитини.
function _findItem(id) {
    // Спочатку — активна дитина (найшвидший пошук)
    const fromActive = _items.find(i => i.id === id);
    if (fromActive) return { item: fromActive, childId: state.activeChildId };

    // Потім — кеш всіх дітей
    for (const [childId, items] of Object.entries(_allFeedbackCache)) {
        const found = items.find(i => i.id === id);
        if (found) return { item: found, childId };
    }
    return null;
}

async function _loadAllChildrenFeedback() {
    const children = state.parent.children || {};
    _allFeedbackCache = {};
    for (const childId of Object.keys(children)) {
        if (childId === state.activeChildId) {
            _allFeedbackCache[childId] = _items;
        } else {
            try {
                const snap = await get(ref(db, `zirky/children/${childId}/feedback`));
                const raw  = snap.val() || {};
                _allFeedbackCache[childId] = Object.entries(raw)
                    .map(([id, val]) => ({ id, childId, ...val }))
                    .sort((a, b) => b.date.localeCompare(a.date));
            } catch(e) {
                console.warn('feedback: не вдалося завантажити для', childId, e);
                _allFeedbackCache[childId] = [];
            }
        }
    }
    _allFeedbackCacheLoaded = true;
}

function _allFeedbackForParent() {
    const children = state.parent.children || {};
    const result = [];
    for (const childId of Object.keys(children)) {
        const items = _allFeedbackCache[childId] || [];
        for (const item of items) {
            result.push({ ...item, childId });
        }
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
}

export function applyFeedbackFilter(type, value) {
    if (type === 'cat')     feedbackFilter.cat     = value;
    if (type === 'status')  feedbackFilter.status  = value;
    if (type === 'childId') feedbackFilter.childId = value;
    renderFeedback();
}

function _getFilteredItems(list) {
    let result = list;
    if (feedbackFilter.cat     !== 'all') result = result.filter(i => i.category === feedbackFilter.cat);
    if (feedbackFilter.status  !== 'all') result = result.filter(i => i.status   === feedbackFilter.status);
    if (feedbackFilter.childId !== 'all') result = result.filter(i => i.childId  === feedbackFilter.childId);
    return result;
}

function _renderFilterBar(allList = _items) {
    const isFiltered = feedbackFilter.cat !== 'all' || feedbackFilter.status !== 'all' || feedbackFilter.childId !== 'all';
    const filteredCount = _getFilteredItems(allList).length;
    const totalCount    = allList.length;

    const catAll = `<button class="fb-filter-btn${feedbackFilter.cat === 'all' ? ' active' : ''}"
        onclick="applyFeedbackFilter('cat','all')">Всі категорії</button>`;
    const catBtns = CATEGORIES.map(cat => {
        return `<button class="fb-filter-btn${feedbackFilter.cat === cat ? ' active' : ''}"
            onclick="applyFeedbackFilter('cat','${cat}')">${cat}</button>`;
    }).join('');

    const statusAll = `<button class="fb-filter-btn${feedbackFilter.status === 'all' ? ' active' : ''}"
        onclick="applyFeedbackFilter('status','all')">Всі статуси</button>`;
    const statusBtns = Object.entries(STATUS_CONFIG).map(([status, cfg]) =>
        `<button class="fb-filter-btn${feedbackFilter.status === status ? ' active' : ''}"
            onclick="applyFeedbackFilter('status','${status}')">${status} ${cfg.label}</button>`
    ).join('');

    // Фільтр по дитині — тільки батьки з 2+ дітьми
    const children = state.parent.children || {};
    const childIds = Object.keys(children);
    const childFilterRow = (state.data.isParent && childIds.length > 1) ? `
        <div class="fb-filter-row">
            <button class="fb-filter-btn${feedbackFilter.childId === 'all' ? ' active' : ''}"
                onclick="applyFeedbackFilter('childId','all')">👨‍👩‍👧 Всі</button>
            ${childIds.map(id => {
                const meta  = children[id] || {};
                const color = meta.color || 'var(--accent)';
                return `<button class="fb-filter-btn${feedbackFilter.childId === id ? ' active' : ''}"
                    style="${feedbackFilter.childId === id ? `border-color:${color};` : ''}"
                    onclick="applyFeedbackFilter('childId','${id}')">${meta.avatar?.value || '👤'} ${meta.name || id}</button>`;
            }).join('')}
        </div>` : '';

    const countHint = isFiltered
        ? `<span class="fb-filter-count">${filteredCount} з ${totalCount}</span>`
        : '';

    return `
        <div class="fb-filter-section">
            <div class="fb-filter-row">${catAll}${catBtns}</div>
            <div class="fb-filter-row">${statusAll}${statusBtns}${countHint}</div>
            ${childFilterRow}
        </div>`;
}

export function initFeedbackData(rawData) {
    _items = !rawData ? [] : Object.entries(rawData)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => b.date.localeCompare(a.date));
}

export function getFeedbackNewCount() { return _items.filter(i => i.status === '⏳').length; }
export function getFeedbackItems()    { return _items; }

export async function renderFeedback() {
    const container = document.getElementById('feedbackBlock');
    if (!container) return;

    if (state.data.isParent) {
        if (!_allFeedbackCacheLoaded) {
            container.innerHTML = '<div class="fb-empty">Завантаження...</div>';
            await _loadAllChildrenFeedback();
        } else {
            _allFeedbackCache[state.activeChildId] = _items;
        }
        container.innerHTML = _renderParentView();
    } else {
        container.innerHTML = _renderChildView();
    }
    _updateFeedbackMonthNav();
    updateFeedbackBadge();
}

// ── Навігація по місяцях фідбеку ─────────────────────────────
export function changeFeedbackMonth(delta) {
    state.currentFeedbackMonth.setMonth(state.currentFeedbackMonth.getMonth() + delta);
    renderFeedback();
}

export function toggleShowAllFeedback(checked) {
    state.showAllFeedback = checked;
    renderFeedback();
}

function _updateFeedbackMonthNav() {
    const navEl      = document.getElementById('feedbackMonthNav');
    const labelEl    = document.getElementById('feedbackCurrentMonth');
    const prevBtn    = document.getElementById('feedbackPrevMonthBtn');
    const nextBtn    = document.getElementById('feedbackNextMonthBtn');
    const cbEl       = document.getElementById('feedbackShowAllCb');
    const selectorEl = document.getElementById('feedbackMonthSelector');
    if (!navEl || !labelEl) return;

    const all = state.data.isParent ? _allFeedbackForParent() : _items;

    if (all.length === 0) {
        navEl.style.display = 'none';
        return;
    }

    // Синхронізуємо чекбокс
    if (cbEl) cbEl.checked = state.showAllFeedback;

    // Навігатор — ховаємо якщо «показати все»
    if (selectorEl) selectorEl.style.display = state.showAllFeedback ? 'none' : '';

    if (!state.showAllFeedback) {
        const dates    = all.map(i => new Date(i.date));
        const minDate  = new Date(Math.min(...dates));
        const now      = new Date();
        const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        const maxMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const cur      = new Date(state.currentFeedbackMonth.getFullYear(), state.currentFeedbackMonth.getMonth(), 1);

        if (cur < minMonth) state.currentFeedbackMonth = new Date(minMonth);
        if (cur > maxMonth) state.currentFeedbackMonth = new Date(maxMonth);

        const monthNames = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                            'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
        labelEl.textContent = `${monthNames[state.currentFeedbackMonth.getMonth()]} ${state.currentFeedbackMonth.getFullYear()}`;

        if (prevBtn) prevBtn.disabled = cur <= minMonth;
        if (nextBtn) nextBtn.disabled = cur >= maxMonth;
    }

    navEl.style.display = '';
}

function _filterByMonth(list) {
    if (state.showAllFeedback) return list;
    const m = state.currentFeedbackMonth;
    return list.filter(i => {
        const d = new Date(i.date);
        return d.getMonth()    === m.getMonth() &&
               d.getFullYear() === m.getFullYear();
    });
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

    const childItems = _filterByMonth(_items);
    const filtered = _getFilteredItems(childItems);
    const isFiltered = feedbackFilter.cat !== 'all' || feedbackFilter.status !== 'all';

    const list = filtered.length === 0
        ? `<div class="fb-empty">${isFiltered ? '🔍 Немає повідомлень за цим фільтром' : 'Повідомлень за цей місяць немає 🙂'}</div>`
        : filtered.map(item => _renderChildCard(item)).join('');

    return `
        <div class="mb-md">
            <p class="fb-intro">Напиши батькам своє побажання або запитання 💜</p>
            <div class="fb-categories">${catBtns}</div>
            <input id="feedbackTitle" class="fb-title-input"
                maxlength="40"
                placeholder="Коротка назва (до 40 символів), напр. «Розклад уроків»">
            <textarea id="feedbackText" class="fb-textarea"
                placeholder="Докладніше опиши своє побажання або питання..."></textarea>
            <button onclick="submitFeedback()" class="fb-submit-btn">📨 Надіслати</button>
        </div>
        <div>
            <h4 class="fb-list-title">📋 Мої повідомлення</h4>
            ${_items.length > 1 ? _renderFilterBar(childItems) : ''}
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
            style="border-left-color:${cfg.border};"
            onclick="window.fbCardClick && window.fbCardClick('${item.id}', event)">
            <span class="z-badge${hasUnreadFeedbackNotif(item.id) ? '' : ' z-badge--hidden'}" id="fbCardBadge_${item.id}"></span>

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

            ${item.title ? `<div class="fb-card-title">${item.title}</div>` : ''}
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
    const allItems   = _allFeedbackForParent();
    const newCount   = allItems.filter(i => i.status === '⏳').length;
    const header = newCount > 0
        ? `<span style="color:var(--c-warning-text);font-size:13px;"><strong>⏳ Нових: ${newCount}</strong></span>`
        : `<span class="text-hint font-sm">Нових повідомлень немає</span>`;

    const monthItems = _filterByMonth(allItems);
    const filtered   = _getFilteredItems(monthItems);
    const isFiltered = feedbackFilter.cat !== 'all' || feedbackFilter.status !== 'all' || feedbackFilter.childId !== 'all';

    const list = filtered.length === 0
        ? `<div class="fb-empty">${isFiltered ? '🔍 Немає повідомлень за цим фільтром' : 'Повідомлень за цей місяць немає'}</div>`
        : filtered.map(item => _renderParentCard(item)).join('');

    return `
        <div class="fb-parent-header mb-md">${header}</div>
        ${_renderFilterBar(monthItems)}
        ${list}`;
}

function _renderParentCard(item) {
    const cfg       = STATUS_CONFIG[item.status] || STATUS_CONFIG['⏳'];
    const dateStr   = new Date(item.date).toLocaleDateString('uk-UA',
        { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    // childId — з item або fallback на activeChildId (для старих записів без childId)
    const resolvedChildId = item.childId || state.activeChildId;
    const childMeta  = (state.parent.children || {})[resolvedChildId] || {};
    const childColor = childMeta.color || '';
    const childLabel = resolvedChildId
        ? `<span class="fb-child-label">${childMeta.avatar?.value || '👤'} ${childMeta.name || resolvedChildId}</span>`
        : '';

    // Опції dropdown — всі статуси крім поточного
    const dropdownItems = Object.entries(STATUS_CONFIG).map(([status, scfg]) => `
        <button onclick="setFeedbackStatus('${item.id}','${status}');closeFbDropdown()"
            class="fb-dropdown-item ${item.status === status ? 'fb-dropdown-item--active' : ''}"
            style="color:${scfg.color};">
            ${status} ${scfg.label}
        </button>`).join('');

    return `
        <div id="feedbackCard_${item.id}" class="fb-card${childColor ? ' fb-card--child' : ''}"
            ${childColor ? `style="--child-color:${childColor}"` : ''}
            onclick="window.fbCardClick && window.fbCardClick('${item.id}', event)">
            <span class="z-badge${hasUnreadFeedbackNotif(item.id) ? '' : ' z-badge--hidden'}" id="fbCardBadge_${item.id}"></span>

            <div class="fb-card-header">
                <span class="fb-card-category">${item.category}${childLabel ? ' · ' + childLabel : ''}</span>
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

            ${item.title ? `<div class="fb-card-title">${item.title}</div>` : ''}
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
    const title = document.getElementById('feedbackTitle')?.value?.trim();
    const text  = document.getElementById('feedbackText')?.value?.trim();
    if (!_selectedCategory) { alert('❗ Оберіть категорію'); return; }
    if (!title)             { alert('❗ Введіть коротку назву повідомлення'); return; }
    if (!text)              { alert('❗ Введіть текст повідомлення'); return; }
    const item = { id: Date.now().toString(), date: nowKyiv(), category: _selectedCategory,
        title, text, status: '⏳', comment: '', childComment: '', updatedAt: null };
    _items.unshift(item);
    saveFeedbackItem(item);
    _selectedCategory = null;
    const titleEl = document.getElementById('feedbackTitle');
    if (titleEl) titleEl.value = '';
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
    notifyFeedbackChanged();
    renderFeedback();
}

export function deleteFeedback(id) {
    const found = _findItem(id);
    if (!found) return;
    const { item, childId } = found;

    if (!confirm('Видалити це повідомлення?')) return;

    // Автоматично видаляємо всі пов'язані сповіщення — вони вже не актуальні
    [`fb_new_${id}`, `fb_reply_${id}`, `fb_status_${id}`, `fb_comment_${id}`]
        .forEach(nid => removeNotification(nid));

    // Видаляємо з _items (якщо це активна дитина)
    _items = _items.filter(i => i.id !== id);
    // Видаляємо з кешу (якщо є)
    if (_allFeedbackCache[childId]) {
        _allFeedbackCache[childId] = _allFeedbackCache[childId].filter(i => i.id !== id);
    }
    deleteFeedbackItem(id, childId);
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
    const found = _findItem(id);
    if (!found) return;
    const { item, childId } = found;
    item.prevStatus       = item.status;
    item.status           = status;
    item.statusChangedAt  = nowKyiv();
    item.updatedAt        = nowKyiv();
    saveFeedbackItem(item, childId);
    if (window.generateNotifications) window.generateNotifications();
    renderFeedback();
    if (window.updateBadges) window.updateBadges();
}

export function saveParentComment(id) {
    const input = document.getElementById(`parentCommentInput_${id}`);
    const found = _findItem(id);
    if (!found || !input) return;
    const { item, childId } = found;
    item.comment   = input.value.trim();
    item.commentAt = nowKyiv();
    item.updatedAt = nowKyiv();
    saveFeedbackItem(item, childId);
    notifyFeedbackChanged();
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
    const found = _findItem(id);
    if (!found) return;
    const { item, childId } = found;
    item.comment   = '';
    item.commentAt = null;
    item.updatedAt = nowKyiv();
    saveFeedbackItem(item, childId);
    notifyFeedbackChanged();
    renderFeedback();
}
// updateFeedbackBadge — тепер керується через updateBadges() у notifications
export function updateFeedbackBadge() {
    if (window.updateBadges) window.updateBadges();
}
