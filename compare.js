// ════════════════════════════════════════════════════════════
// 📊  compare.js — Порівняльна статистика профілів
//     Доступна тільки батькам. Показує зведені дані
//     по всіх дітях та порівняльні графіки.
// ════════════════════════════════════════════════════════════

export const VERSION = 'v4.20260606.0746';

import { state } from './state.js';
import { db } from './firebase.js';
import { buildChartData, buildBalanceData, buildSummaryStats } from './stats.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ── Локальний кеш даних дітей для порівняння ──────────────
// { child_1: { records, achievements }, child_2: { ... } }
let _cache = {};
let _loading = false;

// Скидається при switchChild() — дані іншої дитини не мають залишатись
export function resetCompareCache() {
    _cache   = {};
    _loading = false;
}

// ── Автозапуск після завантаження даних ──────────────────
document.addEventListener('zirky:dataLoaded', () => {
    if (state.parent.isParent) initCompare();
});

// Завантажує дані всіх дітей (крім вже активної — вона в state.data)
export async function initCompare() {
    if (_loading) return;
    _loading = true;

    const container = document.getElementById('compareSection');
    if (!container) { _loading = false; return; }

    _showLoading(container);

    const children = state.parent.children || {};
    const childIds  = Object.keys(children);

    if (childIds.length < 1) {
        container.innerHTML = _emptyMsg('Немає профілів дітей для порівняння.');
        _loading = false;
        return;
    }

    // Завантажуємо дані кожної дитини з Firebase
    _cache = {};
    for (const childId of childIds) {
        // Активна дитина вже є в state.data
        if (childId === state.activeChildId) {
            _cache[childId] = {
                records:      state.data.records      || [],
                achievements: state.data.achievements || {},
                balance:      state.data.balance      || 0,
            };
        } else {
            try {
                const snap = await get(ref(db, `zirky/children/${childId}`));
                const data = snap.val() || {};
                _cache[childId] = {
                    records:      data.records      || [],
                    achievements: data.achievements || {},
                    balance:      data.balance      || 0,
                };
            } catch(e) {
                console.warn(`compare: не вдалося завантажити ${childId}`, e);
                _cache[childId] = { records: [], achievements: {}, balance: 0 };
            }
        }
    }

    _loading = false;
    renderCompare();
}

// ════════════════════════════════════════════════════════════
// 🎨  РЕНДЕР
// ════════════════════════════════════════════════════════════

export function renderCompare() {
    const container = document.getElementById('compareSection');
    if (!container) return;

    const children = state.parent.children || {};
    const childIds  = Object.keys(children);

    if (!childIds.length) {
        container.innerHTML = _emptyMsg('Немає профілів для порівняння.');
        return;
    }

    // Зведені картки по кожній дитині
    const cards = childIds.map(childId => {
        const meta  = children[childId] || {};
        const data  = _cache[childId];
        if (!data) return '';

        const stats = buildSummaryStats(data.records, data.achievements);
        const isActive = childId === state.activeChildId;

        return `
            <div class="compare-card ${isActive ? 'compare-card--active' : ''}">
                <div class="compare-card-header">
                    <span class="compare-card-avatar">${meta.avatar?.value || '👤'}</span>
                    <div>
                        <div class="compare-card-name">${meta.name || childId}</div>
                        ${isActive ? '<div class="compare-card-badge">активний</div>' : ''}
                    </div>
                    <div class="compare-card-balance">${stats.currentBalance}⭐</div>
                </div>
                <div class="compare-card-stats">
                    <div class="compare-stat">
                        <span class="compare-stat-label">Зароблено</span>
                        <span class="compare-stat-value">+${stats.totalEarned}⭐</span>
                    </div>
                    <div class="compare-stat">
                        <span class="compare-stat-label">Витрачено</span>
                        <span class="compare-stat-value">−${stats.totalSpent}⭐</span>
                    </div>
                    <div class="compare-stat">
                        <span class="compare-stat-label">Серія</span>
                        <span class="compare-stat-value">${stats.streak} д.</span>
                    </div>
                    <div class="compare-stat">
                        <span class="compare-stat-label">Сер/тиждень</span>
                        <span class="compare-stat-value">${stats.avgPerWeek}⭐</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Порівняльний графік (тільки якщо більше 1 дитини і є дані)
    const chartHtml = childIds.length > 1 ? _buildCompareChart(childIds, children) : '';

    container.innerHTML = `
        <div class="compare-cards">${cards}</div>
        ${chartHtml}
    `;
}

// ════════════════════════════════════════════════════════════
// 📈  ПОРІВНЯЛЬНИЙ ГРАФІК
// ════════════════════════════════════════════════════════════

function _buildCompareChart(childIds, children) {
    const period = 'week';
    const offset = 0;

    const COLORS = ['#ff6b6b','#4dabf7','#69db7c','#ffa94d','#da77f2','#f783ac'];

    // Будуємо datasets для кожної дитини
    const datasets = childIds.map((childId, idx) => {
        const data  = _cache[childId];
        if (!data) return null;
        const meta  = children[childId] || {};
        const color = meta.color || COLORS[idx % COLORS.length];
        const points = buildChartData(data.records, period, offset);
        return { childId, name: meta.name || childId, color, points };
    }).filter(Boolean);

    if (!datasets.length) return '';

    const allValues = datasets.flatMap(d => d.points.map(p => p.earned));
    const maxVal = Math.max(...allValues, 5);
    const labels = datasets[0].points.map(p => p.label);

    const W = 320, H = 140, PAD = 28, BOTTOM = 20;
    const chartW = W - PAD;
    const chartH = H - BOTTOM;
    const step   = chartW / Math.max(labels.length - 1, 1);

    // Лінії для кожної дитини
    const lines = datasets.map(ds => {
        const pts = ds.points.map((p, i) => {
            const x = PAD + i * step;
            const y = H - BOTTOM - (p.earned / maxVal) * chartH;
            return `${x},${y}`;
        }).join(' ');

        return `<polyline points="${pts}" fill="none" stroke="${ds.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');

    // Легенда
    const legend = datasets.map(ds => `
        <div class="compare-legend-item">
            <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${ds.color};margin-right:4px;"></span>
            ${ds.name}
        </div>
    `).join('');

    // Підписи осі X
    const xLabels = labels.map((l, i) => {
        const x = PAD + i * step;
        return `<text x="${x}" y="${H}" font-size="9" text-anchor="middle" fill="var(--text-hint)">${l}</text>`;
    }).join('');

    return `
        <div class="compare-chart-wrap">
            <div class="compare-chart-title">Зароблено за тиждень</div>
            <div class="compare-legend">${legend}</div>
            <svg viewBox="0 0 ${W} ${H + 4}" style="width:100%;overflow:visible;">
                <line x1="${PAD}" y1="0" x2="${PAD}" y2="${H - BOTTOM}" stroke="var(--border)" stroke-width="1"/>
                <line x1="${PAD}" y1="${H - BOTTOM}" x2="${W}" y2="${H - BOTTOM}" stroke="var(--border)" stroke-width="1"/>
                ${lines}
                ${xLabels}
            </svg>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════
// 🛠️  УТИЛІТИ
// ════════════════════════════════════════════════════════════

function _showLoading(container) {
    container.innerHTML = '<div class="text-hint font-sm text-center" style="padding:24px;">Завантаження...</div>';
}

function _emptyMsg(msg) {
    return `<div class="text-hint font-sm text-center" style="padding:24px;">${msg}</div>`;
}
