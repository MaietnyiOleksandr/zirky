// ════════════════════════════════════════════════════════════
// 📊  compare.js — Порівняльна статистика профілів
//     Доступна тільки батькам. Показує зведені дані
//     по всіх дітях та порівняльні графіки.
// ════════════════════════════════════════════════════════════

export const VERSION = 'v4.20261001.2207';

import { state } from './state.js';
import { db } from './firebase.js';
import { buildSummaryStats } from './stats.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ── Локальний кеш даних дітей для порівняння ──────────────
// { child_1: { records, achievements }, child_2: { ... } }
let _cache = {};
let _loading = false;
let _period = 'all';
let _offset = 0;

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

    const now = new Date();
    const range = compareRange(_period, _offset, now);
    const buckets = compareBuckets(_period, range, Object.values(_cache).flatMap(d => d.records), now);
    // Зведені картки по кожній дитині
    const cards = childIds.map(childId => {
        const meta  = children[childId] || {};
        const data  = _cache[childId];
        if (!data) return '';

        const selected = recordsInRange(data.records, range);
        const stats = buildSummaryStats(selected, data.achievements);
        stats.currentBalance = buildSummaryStats(data.records, data.achievements).currentBalance;
        stats.avgPerWeek = compareAverage(selected, range, now);
        const bestStreak = Math.max(data.achievements?.streaks?.earning?.best || 0, stats.streak);
        const isActive = childId === state.activeChildId;

        return `
            <div class="compare-card ${isActive ? 'compare-card--active' : ''}">
                <div class="compare-card-header">
                    <span class="compare-card-avatar">${meta.avatar?.value || '👤'}</span>
                    <div>
                        <div class="compare-card-name">${meta.name || childId}</div>
                        ${isActive ? '<div class="compare-card-badge">активний</div>' : ''}
                    </div>
                    <div class="compare-card-balance" title="Поточний баланс">${stats.currentBalance}⭐</div>
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
                        <span class="compare-stat-label">Поточна серія</span>
                        <span class="compare-stat-value">${stats.streak} д.</span>
                    </div>
                    <div class="compare-stat">
                        <span class="compare-stat-label">Найдовша серія</span>
                        <span class="compare-stat-value">${bestStreak} д.</span>
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
    const chartHtml = childIds.length > 1 ? _buildCompareChart(childIds, children, buckets) : '';

    container.innerHTML = `
        <div class="compare-controls">
            <label>Період
                <select id="comparePeriod">
                    ${[['all', 'За весь час'], ['week', 'По тижнях'], ['month', 'По місяцях'], ['school', 'По навчальних роках']].map(([value, label]) => `<option value="${value}" ${value === _period ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
            </label>
            <div class="compare-period-nav">
                ${_period !== 'all' ? '<button type="button" id="comparePrev" aria-label="Попередній період">‹</button>' : ''}
                <span aria-live="polite">${range.label}</span>
                ${_period !== 'all' ? `<button type="button" id="compareNext" aria-label="Наступний період" ${_offset >= 0 ? 'disabled' : ''}>›</button>` : ''}
            </div>
        </div>
        <p class="text-hint font-sm">Зароблено, витрачено та середнє — за обраний період. Баланс і поточна серія — на зараз; найдовша серія — за весь час.${_period === 'school' ? ' Навчальний рік: 1 вересня — 31 серпня.' : ''}</p>
        <div class="compare-cards">${cards}</div>
        ${chartHtml}
    `;
    container.querySelector('#comparePeriod').addEventListener('change', event => {
        _period = event.target.value;
        _offset = 0;
        renderCompare();
        container.querySelector('#comparePeriod').focus();
    });
    for (const [id, delta] of [['comparePrev', -1], ['compareNext', 1]]) {
        container.querySelector(`#${id}`)?.addEventListener('click', () => {
            _offset = Math.min(0, _offset + delta);
            renderCompare();
            const button = container.querySelector(`#${id}`);
            (button.disabled ? container.querySelector('#comparePrev') : button).focus();
        });
    }
}

// ════════════════════════════════════════════════════════════
// 📈  ПОРІВНЯЛЬНИЙ ГРАФІК
// ════════════════════════════════════════════════════════════

function _buildCompareChart(childIds, children, buckets) {

    const COLORS = ['#ff6b6b','#4dabf7','#69db7c','#ffa94d','#da77f2','#f783ac'];

    // Будуємо datasets для кожної дитини
    const datasets = childIds.map((childId, idx) => {
        const data  = _cache[childId];
        if (!data) return null;
        const meta  = children[childId] || {};
        const color = meta.color || COLORS[idx % COLORS.length];
        const points = buckets.map(bucket => ({
            label: bucket.label,
            earned: recordsInRange(data.records, bucket).filter(r => r.type === 'earn' && r.category !== 'correction').reduce((sum, r) => sum + r.stars, 0),
        }));
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

        return `<polyline points="${pts}" fill="none" stroke="${ds.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` + ds.points.map((p, i) => `<circle cx="${PAD + i * step}" cy="${H - BOTTOM - (p.earned / maxVal) * chartH}" r="2.5" fill="${ds.color}"><title>${p.label}: ${p.earned}⭐</title></circle>`).join('');
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
        if (i % Math.ceil(labels.length / 12) !== 0 && i !== labels.length - 1) return '';
        const x = PAD + i * step;
        return `<text x="${x}" y="${H}" font-size="9" text-anchor="middle" fill="var(--text-hint)">${l}</text>`;
    }).join('');

    return `
        <div class="compare-chart-wrap">
            <div class="compare-chart-title">Зароблено ${_period === 'all' ? 'за весь час · по роках' : 'за обраний період'}</div>
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

// Межі періодів у місцевому часі; кінець інтервалу не включається.
function compareRange(period, offset = 0, now = new Date()) {
    const year = now.getFullYear(), month = now.getMonth();
    let start, end;
    if (period === 'week') {
        start = new Date(year, month, now.getDate() - (now.getDay() + 6) % 7 + offset * 7);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    } else if (period === 'month') {
        start = new Date(year, month + offset, 1);
        end = new Date(year, month + offset + 1, 1);
    } else if (period === 'school') {
        const firstYear = year - (month < 8 ? 1 : 0) + offset;
        start = new Date(firstYear, 8, 1);
        end = new Date(firstYear + 1, 8, 1);
    } else {
        return { start: null, end: null, label: 'За весь час' };
    }
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
    const format = d => d.toLocaleDateString('uk-UA');
    const label = period === 'school' ? `${start.getFullYear()}/${end.getFullYear()} навчальний рік`
        : period === 'month' ? start.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
        : `${format(start)} — ${format(last)}`;
    return { start, end, label };
}

function recordsInRange(records, range) {
    return records.filter(r => {
        const date = new Date(r.date);
        return Number.isFinite(+date) && (!range.start || date >= range.start) && (!range.end || date < range.end);
    });
}

function compareBuckets(period, range, records, now = new Date()) {
    let start = range.start, end = range.end;
    if (!start) {
        const dates = records.map(r => new Date(r.date)).filter(d => Number.isFinite(+d));
        const first = new Date(Math.min(+now, ...dates.map(Number)));
        const last = new Date(Math.max(+now, ...dates.map(Number)));
        start = new Date(first.getFullYear(), 0, 1);
        end = new Date(last.getFullYear() + 1, 0, 1);
    }
    const buckets = [];
    for (let date = new Date(start); date < end;) {
        const next = new Date(date);
        if (period === 'all') next.setFullYear(next.getFullYear() + 1);
        else if (period === 'school') next.setMonth(next.getMonth() + 1);
        else next.setDate(next.getDate() + 1);
        const label = period === 'all' ? String(date.getFullYear())
            : period === 'school' ? date.toLocaleDateString('uk-UA', { month: 'short' })
            : period === 'week' ? date.toLocaleDateString('uk-UA', { weekday: 'short' }) : String(date.getDate());
        buckets.push({ start: date, end: next, label });
        date = next;
    }
    return buckets;
}

function compareAverage(records, range, now = new Date()) {
    if (!records.length) return 0;
    const start = range.start || new Date(Math.min(...records.map(r => +new Date(r.date))));
    const end = range.end && range.end < now ? range.end : now;
    // Календарні дні не залежать від переходу на літній час.
    const day = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
    const days = Math.max(1, day(end) - day(start) + (end === now ? 1 : 0));
    const earned = records.filter(r => r.type === 'earn' && r.category !== 'correction').reduce((sum, r) => sum + r.stars, 0);
    return Math.round(earned / Math.max(1, days / 7));
}
