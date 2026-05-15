// ════════════════════════════════════════════════════
// 📊  stats.js — Статистика та графіки
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260515.1939';

import { state } from './state.js';
import { getSubjectEmoji } from './subjects.js';

// Зчитуємо CSS змінну з поточної теми
function cssVar(name, fallback = '') {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// ════════════════════════════════════════════════════
// 📚  АНАЛІТИКА ПО ПРЕДМЕТАХ
// ════════════════════════════════════════════════════
export function renderSubjectAnalytics() {
    const container = document.getElementById('subjectAnalytics');
    if (!container) return;

    const records = state.data.records || [];
    const subjectData = {};

    records.forEach(r => {
        if (r.category !== 'grade' && r.category !== 'diagnostic') return;
        if (!r.subject || !r.grade) return;

        let subject = r.subject;
        if (subject.startsWith('Діагностувальна робота з ')) {
            subject = subject.replace('Діагностувальна робота з ', '');
        }

        if (!subjectData[subject]) {
            subjectData[subject] = { grades: [], gradesByDate: [], stars: 0, count: 0 };
        }
        const grade = parseInt(r.grade);
        subjectData[subject].grades.push(grade);
        subjectData[subject].gradesByDate.push({ grade, date: new Date(r.date) });
        subjectData[subject].stars += r.stars || 0;
        subjectData[subject].count++;
    });

    if (Object.keys(subjectData).length === 0) {
        container.innerHTML = '<div class="text-hint font-sm text-center">Ще немає оцінок для аналізу</div>';
        return;
    }

    const subjects = Object.entries(subjectData)
        .map(([name, data]) => {
            const avg = data.grades.reduce((s, g) => s + g, 0) / data.grades.length;

            const now = new Date();
            const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
            const d60 = new Date(now - 60 * 24 * 60 * 60 * 1000);
            const recent = data.gradesByDate.filter(g => g.date >= d30).map(g => g.grade);
            const prev   = data.gradesByDate.filter(g => g.date >= d60 && g.date < d30).map(g => g.grade);
            const avgRecent = recent.length ? recent.reduce((s,g)=>s+g,0)/recent.length : null;
            const avgPrev   = prev.length   ? prev.reduce((s,g)=>s+g,0)/prev.length     : null;

            let trend = null;
            if (avgRecent !== null && avgPrev !== null) {
                const diff = avgRecent - avgPrev;
                if (diff > 0.5)       trend = { icon: '📈', cls: 'trend-up',      text: `+${diff.toFixed(1)}` };
                else if (diff < -0.5) trend = { icon: '📉', cls: 'trend-down',    text: diff.toFixed(1)       };
                else                  trend = { icon: '➡️', cls: 'trend-neutral', text: '~'                   };
            }

            return { name, avg, count: data.count, stars: data.stars, grades: data.grades, gradesByDate: data.gradesByDate, trend };
        })
        .sort((a, b) => b.avg - a.avg);

    const maxAvg = 12;

    // Колір бару залежно від оцінки — через CSS класи
    const barClass = avg => avg >= 10 ? 'subject-bar--good' : avg >= 7 ? 'subject-bar--mid' : 'subject-bar--bad';

    let html = `<div style="display:grid;gap:10px;">`;

    subjects.forEach(s => {
        const emojiRaw = getSubjectEmoji(s.name);
        const emoji = emojiRaw !== s.name ? emojiRaw.split(' ')[0] : '📚';
        const avgRounded = Math.round(s.avg * 10) / 10;
        const barWidth = Math.round((s.avg / maxAvg) * 100);
        const cls = barClass(s.avg);
        const countWord = s.count === 1 ? 'оцінка' : s.count < 5 ? 'оцінки' : 'оцінок';

        html += `
        <div class="subject-card">
            <div class="subject-card-header">
                <span class="subject-card-name">${emoji} ${s.name}</span>
                <div class="subject-card-right">
                    ${s.trend ? `<span class="subject-trend ${s.trend.cls}">${s.trend.icon} ${s.trend.text}</span>` : ''}
                    <div class="subject-card-score">
                        <span class="subject-avg ${cls}">${avgRounded}</span>
                        <span class="subject-count">(${s.count} ${countWord})</span>
                    </div>
                </div>
            </div>
            <div class="subject-bar-track">
                <div class="subject-bar-fill ${cls}" style="width:${barWidth}%"></div>
            </div>
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

    renderSubjectChartSelector(subjects);
}

export function renderSubjectChartSelector(subjects) {
    const container = document.getElementById('subjectAnalytics');
    if (!container || !subjects.length) return;

    const options = subjects.map(s => {
        const er = getSubjectEmoji(s.name);
        const em = er !== s.name ? er.split(' ')[0] : '📚';
        return `<option value="${s.name}">${em} ${s.name}</option>`;
    }).join('');

    container.innerHTML += `
        <div class="subject-chart-block">
            <div class="subject-chart-label">📈 Динаміка оцінок</div>
            <select id="subjectChartSelect" class="filter-select" style="margin-bottom:10px">${options}</select>
            <div id="subjectChartContainer"></div>
        </div>`;

    const select = document.getElementById('subjectChartSelect');
    select.addEventListener('change', () => drawSubjectChart(select.value, subjects));
    drawSubjectChart(subjects[0].name, subjects);
}

export function drawSubjectChart(subjectName, subjects) {
    const container = document.getElementById('subjectChartContainer');
    if (!container) return;

    const s = subjects.find(x => x.name === subjectName);
    if (!s || !s.gradesByDate.length) {
        container.innerHTML = '<div class="text-hint font-sm text-center">Немає даних</div>';
        return;
    }

    const allPoints = [...s.gradesByDate].sort((a,b) => a.date - b.date);
    const MAX_POINTS = 12;
    let points = allPoints;
    let aggregated = false;

    if (allPoints.length > MAX_POINTS) {
        aggregated = true;
        const weeks = {};
        allPoints.forEach(p => {
            const d = new Date(p.date);
            const day = d.getDay() || 7;
            d.setDate(d.getDate() - day + 1);
            d.setHours(0,0,0,0);
            const key = d.toISOString();
            if (!weeks[key]) weeks[key] = { grades: [], date: d };
            weeks[key].grades.push(p.grade);
        });
        points = Object.values(weeks)
            .sort((a,b) => a.date - b.date)
            .map(w => ({
                grade: Math.round(w.grades.reduce((s,g)=>s+g,0) / w.grades.length * 10) / 10,
                date: w.date,
                count: w.grades.length,
                isAvg: true
            }));
    }

    // Кольори з теми
    const colSecondary = cssVar('--secondary', '#0057B7');
    const colText      = cssVar('--text-hint', '#999');
    const colBorder    = cssVar('--border-light', '#E0E0E0');
    const colPrimary   = cssVar('--primary', '#FFD700');

    const w = container.clientWidth || 300;
    const h = 180;
    const pad = { top: 24, right: 16, bottom: 32, left: 28 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const scaleX = i => pad.left + (points.length < 2 ? cw/2 : (i / (points.length-1)) * cw);
    const scaleY = g => pad.top + ch - ((g - 7) / (12 - 7)) * ch;

    const avg  = s.avg;
    const avgY = scaleY(avg);
    const dateStep = Math.max(1, Math.ceil(points.length / 6));

    let svg = `<svg width="${w}" height="${h}" style="display:block;overflow:visible;">`;

    // Сітка
    [7, 9, 10, 12].forEach(val => {
        const y   = scaleY(val);
        const col = val === 10 ? 'rgba(76,175,80,0.25)' : colBorder;
        svg += `<line x1="${pad.left}" y1="${y}" x2="${w-pad.right}" y2="${y}" stroke="${col}" stroke-width="1"/>`;
        svg += `<text x="${pad.left-3}" y="${y+3}" font-size="8" fill="${colText}" text-anchor="end">${val}</text>`;
    });

    // Середня (пунктир)
    svg += `<line x1="${pad.left}" y1="${avgY}" x2="${w-pad.right}" y2="${avgY}"
        stroke="${colPrimary}" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>`;

    // Лінія
    if (points.length >= 2) {
        const path = points.map((p,i) => `${i===0?'M':'L'}${scaleX(i).toFixed(1)},${scaleY(p.grade).toFixed(1)}`).join(' ');
        svg += `<path d="${path}" fill="none" stroke="${colSecondary}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    // Точки
    points.forEach((p, i) => {
        const x   = scaleX(i);
        const y   = scaleY(p.grade);
        const col = p.grade >= 10 ? '#4CAF50' : p.grade >= 7 ? '#FFC107' : '#f44336';
        const labelY = i % 2 === 0 ? y - 9 : y + 16;
        const label  = p.isAvg ? p.grade.toFixed(1) : p.grade;
        const dateStr = p.date.toLocaleDateString('uk-UA', {day:'2-digit', month:'2-digit'});

        svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"
            fill="${col}" stroke="${cssVar('--card','#fff')}" stroke-width="1.5"/>`;
        svg += `<text x="${x.toFixed(1)}" y="${labelY}"
            font-size="9" font-weight="bold" fill="${col}" text-anchor="middle">${label}</text>`;

        if (i % dateStep === 0 || i === points.length - 1) {
            svg += `<text x="${x.toFixed(1)}" y="${h-4}"
                font-size="8" fill="${colText}" text-anchor="middle">${dateStr}</text>`;
        }
    });

    if (aggregated) {
        svg += `<text x="${w-pad.right}" y="${h-40}" font-size="10" fill="${colText}"
            text-anchor="end">~ середнє по тижнях</text>`;
    }

    svg += '</svg>';
    container.innerHTML = svg;
}

// ════════════════════════════════════════════════════
// 📈  ГОЛОВНИЙ ГРАФІК
// ════════════════════════════════════════════════════
export function renderStats() {
    updateChart();

    const totalEarned  = (state.data.records||[]).filter(r=>r.type==='earn' && r.category!=='correction').reduce((s,r)=>s+r.stars,0);
    const totalSpent   = (state.data.records||[]).filter(r=>r.type==='spend' && r.category!=='correction').reduce((s,r)=>s+r.stars,0);
    const thisMonth    = new Date().getMonth();
    const recordsCount = (state.data.records||[]).filter(r=>new Date(r.date).getMonth()===thisMonth).length;

    document.getElementById('totalEarned').textContent  = totalEarned + '⭐';
    document.getElementById('totalSpent').textContent   = totalSpent + '⭐';
    document.getElementById('recordsCount').textContent = recordsCount;

    setTimeout(renderSubjectAnalytics, 0);
    setTimeout(updateBalanceChart, 0);
    setTimeout(updateHeatmap, 0);
    setTimeout(renderSourceDonut, 0);
}

export function updateChart() {
    const chartContainer = document.querySelector('.chart-container');
    const showEarned = document.getElementById('showEarned').checked;
    const showSpent  = document.getElementById('showSpent').checked;
    const now = new Date();

    let periods = [], labelFormat, pointWidth = 60, periodName = '';

    document.getElementById('chartNextBtn').disabled = state.chartOffset === 0;

    if (state.chartPeriod === 'week') {
        const weekStart = new Date(now);
        const dayOfWeek = now.getDay();
        const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        weekStart.setDate(now.getDate() - daysFromMonday + (state.chartOffset * 7));
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            periods.push(d);
        }
        const months = ['січ','лют','бер','кві','тра','чер','лип','сер','вер','жов','лис','гру'];
        const weekEnd = periods[6];
        periodName = `${periods[0].getDate()} ${months[periods[0].getMonth()]} — ${weekEnd.getDate()} ${months[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
        labelFormat = d => d.getDate();
        pointWidth = 50;
    } else if (state.chartPeriod === 'month') {
        const target = new Date(now.getFullYear(), now.getMonth() + state.chartOffset, 1);
        const days = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= days; i++) periods.push(new Date(target.getFullYear(), target.getMonth(), i));
        const months = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
        periodName = `${months[target.getMonth()]} ${target.getFullYear()}`;
        labelFormat = d => d.getDate();
        pointWidth = 35;
    } else {
        const targetYear = now.getFullYear() + state.chartOffset;
        for (let i = 0; i < 12; i++) periods.push(new Date(targetYear, i, 1));
        periodName = `${targetYear} рік`;
        labelFormat = d => ['Сі','Лю','Бе','Кв','Тр','Че','Ли','Се','Ве','Жо','Ли','Гр'][d.getMonth()];
        pointWidth = 55;
    }

    document.getElementById('chartPeriodDisplay').textContent = periodName;

    const chartData = periods.map(d => {
        const recs = (state.data.records||[]).filter(r => {
            const rd = new Date(r.date);
            if (state.chartPeriod === 'year') return rd.getMonth()===d.getMonth() && rd.getFullYear()===d.getFullYear();
            return rd.toDateString() === d.toDateString();
        });
        return {
            date:   d,
            earned: recs.filter(r=>r.type==='earn' && r.category!=='correction').reduce((s,r)=>s+r.stars,0),
            spent:  recs.filter(r=>r.type==='spend').reduce((s,r)=>s+r.stars,0),
            label:  labelFormat(d),
        };
    });

    const maxValue = Math.max(...chartData.map(d=>Math.max(d.earned,d.spent)), 10);

    let width;
    if (state.chartPeriod === 'week') width = chartContainer.clientWidth - 20;
    else width = Math.max(periods.length * pointWidth, chartContainer.clientWidth);

    const height  = 250;
    const padding = { top: 30, right: 20, bottom: 40, left: 40 };
    const chartW  = width - padding.left - padding.right;
    const chartH  = height - padding.top - padding.bottom;

    const scaleY = v => padding.top + chartH - (v / maxValue) * chartH;
    const scaleX = i => padding.left + (i / (periods.length - 1)) * chartW;

    // Кольори з теми
    const colSecondary = cssVar('--secondary', '#0057B7');
    const colPrimary   = cssVar('--primary',   '#FFD700');
    const colAccent    = cssVar('--accent',     '#FF6B6B');
    const colBorder    = cssVar('--border-light','#E0E0E0');
    const colTextHint  = cssVar('--text-hint',  '#999');
    const colTextMuted = cssVar('--text-muted', '#666');
    const colCard      = cssVar('--card',       '#ffffff');

    let svg = `<svg width="${width}" height="${height}" style="display:block;">`;

    // Сітка
    for (let i = 0; i <= 5; i++) {
        const y     = padding.top + (chartH / 5) * i;
        const value = Math.round(maxValue * (1 - i / 5));
        svg += `<line x1="${padding.left}" y1="${y}" x2="${width-padding.right}" y2="${y}" stroke="${colBorder}" stroke-width="1"/>`;
        svg += `<text x="${padding.left-10}" y="${y+5}" fill="${colTextHint}" font-size="9" text-anchor="end">${value}⭐</text>`;
    }

    // Зони канікул
    const freezePeriods = state.chartPeriod !== 'year' ? (state.data.achievements?.freezePeriods||[]) : [];
    freezePeriods.forEach(period => {
        const fromDate  = new Date(period.from);  fromDate.setHours(0,0,0,0);
        const untilDate = new Date(period.until); untilDate.setHours(23,59,59,999);

        let xStart = null, xEnd = null;
        periods.forEach((p,i) => {
            const pDate = new Date(p); pDate.setHours(12,0,0,0);
            if (pDate >= fromDate && pDate <= untilDate) {
                const x = scaleX(i);
                if (xStart===null) xStart = x;
                xEnd = x;
            }
        });

        if (xStart===null) {
            for (let i=0; i<periods.length-1; i++) {
                if (new Date(periods[i])<=untilDate && new Date(periods[i+1])>=fromDate) {
                    xStart = xStart??scaleX(i);
                    xEnd   = scaleX(i+1);
                }
            }
        }

        if (xStart!==null && xEnd!==null) {
            const isActive    = untilDate >= new Date();
            const fillColor   = isActive ? `${colSecondary}22` : 'rgba(180,180,180,0.15)';
            const strokeColor = isActive ? `${colSecondary}66` : 'rgba(150,150,150,0.25)';
            const rx = xStart - (xStart===scaleX(0) ? 0 : 5);
            svg += `<rect x="${rx}" y="${padding.top}" width="${xEnd-rx+5}" height="${chartH}"
                fill="${fillColor}" stroke="${strokeColor}" stroke-width="1" rx="3"/>`;
            svg += `<text x="${rx+(xEnd-rx+5)/2}" y="${padding.top-4}"
                font-size="9" text-anchor="middle" fill="${isActive ? colSecondary : colTextHint}">❄️</text>`;
        }
    });

    // Лінія доходів
    if (showEarned && chartData.some(d=>d.earned>0)) {
        const path = 'M' + chartData.map((d,i)=>`${scaleX(i)},${scaleY(d.earned)}`).join(' L');
        svg += `<path d="${path}" fill="none" stroke="${colSecondary}" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round"/>`;
        chartData.forEach((d,i) => {
            if (d.earned>0) {
                const x=scaleX(i), y=scaleY(d.earned);
                svg += `<circle cx="${x}" cy="${y}" r="5" fill="${colPrimary}" stroke="${colSecondary}" stroke-width="2"/>`;
                svg += `<text x="${x-8}" y="${y+4}" fill="${colSecondary}" font-size="9" font-weight="bold" text-anchor="end">+${d.earned}</text>`;
            }
        });
    }

    // Лінія витрат
    if (showSpent && chartData.some(d=>d.spent>0)) {
        const path = 'M' + chartData.map((d,i)=>`${scaleX(i)},${scaleY(d.spent)}`).join(' L');
        svg += `<path d="${path}" fill="none" stroke="${colAccent}" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round"/>`;
        chartData.forEach((d,i) => {
            if (d.spent>0) {
                const x=scaleX(i), y=scaleY(d.spent);
                svg += `<circle cx="${x}" cy="${y}" r="5" fill="${colAccent}" stroke="${colAccent}" stroke-width="2"/>`;
                svg += `<text x="${x+8}" y="${y+4}" fill="${colAccent}" font-size="9" font-weight="bold" text-anchor="start">-${d.spent}</text>`;
            }
        });
    }

    // Підписи осі X
    chartData.forEach((d,i) => {
        svg += `<text x="${scaleX(i)}" y="${height-10}" fill="${colTextMuted}"
            font-size="9" font-weight="bold" text-anchor="middle">${d.label}</text>`;
    });

    svg += '</svg>';
    chartContainer.innerHTML = `<div class="chart-wrapper" style="width:${width}px;">${svg}</div>`;
}

// ════════════════════════════════════════════════════
// 💰  ГРАФІК БАЛАНСУ
// ════════════════════════════════════════════════════

export function updateBalanceChart() {
    const container = document.getElementById('balanceChartContainer');
    if (!container) return;

    const now = new Date();
    document.getElementById('balanceNextBtn').disabled = state.balanceOffset === 0;

    // Будуємо перелік дат і мітки
    let periods = [], labelFormat, periodName, isYear = false;
    const months = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                    'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
    const monthsShort = ['Сі','Лю','Бе','Кв','Тр','Че','Ли','Се','Ве','Жо','Ли','Гр'];

    if (state.balancePeriod === 'week') {
        const dow = now.getDay();
        const daysFromMon = (dow === 0 ? 6 : dow - 1);
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysFromMon + state.balanceOffset * 7);
        weekStart.setHours(0,0,0,0);
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            periods.push(d);
        }
        const we = periods[6];
        periodName = `${periods[0].getDate()} ${months[periods[0].getMonth()].slice(0,3).toLowerCase()} — ${we.getDate()} ${months[we.getMonth()].slice(0,3).toLowerCase()} ${we.getFullYear()}`;
        labelFormat = d => ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'][(d.getDay())];
    } else if (state.balancePeriod === 'month') {
        const target = new Date(now.getFullYear(), now.getMonth() + state.balanceOffset, 1);
        const days = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= days; i++) {
            periods.push(new Date(target.getFullYear(), target.getMonth(), i));
        }
        periodName = `${months[target.getMonth()]} ${target.getFullYear()}`;
        labelFormat = d => d.getDate();
    } else {
        isYear = true;
        const yr = now.getFullYear() + state.balanceOffset;
        for (let i = 0; i < 12; i++) periods.push(new Date(yr, i, 1));
        periodName = `${yr} рік`;
        labelFormat = (_, i) => monthsShort[i];
    }

    document.getElementById('balancePeriodDisplay').textContent = periodName;

    // Рахуємо баланс на кінець кожного дня/місяця
    const records = state.data.records || [];

    const balanceAt = (endDate) => {
        const cutoff = new Date(endDate);
        if (!isYear) cutoff.setHours(23, 59, 59, 999);
        else {
            cutoff.setMonth(cutoff.getMonth() + 1, 0);
            cutoff.setHours(23, 59, 59, 999);
        }
        return records.reduce((sum, r) => {
            const rd = new Date(r.date);
            if (rd > cutoff) return sum;
            if (r.type === 'earn')  return sum + (r.stars || 0);
            if (r.type === 'spend') return sum - (r.stars || 0);
            return sum;
        }, 0);
    };

    // Визначаємо до якої дати показувати (не в майбутньому)
    const today = new Date(); today.setHours(23,59,59,999);
    const data = periods.map((d, i) => ({
        date:    d,
        balance: d <= today ? Math.max(0, balanceAt(d)) : null,
        label:   typeof labelFormat === 'function' ? labelFormat(d, i) : i,
    }));

    // Фільтруємо null (майбутні дати)
    const validData = data.filter(d => d.balance !== null);
    if (validData.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-hint);font-size:14px;">Немає даних за цей період</div>';
        return;
    }

    // Розміри SVG
    const w       = container.clientWidth || 300;
    const h       = 200;
    const pad     = { top: 28, right: 16, bottom: 32, left: 44 };
    const cw      = w - pad.left - pad.right;
    const ch      = h - pad.top - pad.bottom;

    const maxBal  = Math.max(...validData.map(d => d.balance), 10);
    const n       = data.length;

    const scaleX  = i => pad.left + (n < 2 ? cw / 2 : (i / (n - 1)) * cw);
    const scaleY  = v => pad.top + ch - Math.max(0, Math.min(1, v / maxBal)) * ch;

    // Кольори з теми
    const colLine    = cssVar('--secondary',      '#0057B7');
    const colFrom    = cssVar('--progress-from',  '#0057B7');
    const colTo      = cssVar('--progress-to',    '#4A90E2');
    const colText    = cssVar('--text-hint',      '#999');
    const colMuted   = cssVar('--text-muted',     '#666');
    const colGrid    = cssVar('--border-light',   '#E0E0E0');
    const colCard    = cssVar('--card',           '#ffffff');
    const colPrimary = cssVar('--primary',        '#FFD700');

    // Smooth bezier path для лінії та заливки
    const pts = validData.map(d => [scaleX(data.indexOf(d)), scaleY(d.balance)]);

    const smoothPath = (points) => {
        if (points.length < 2) return `M${points[0][0]},${points[0][1]}`;
        let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
        for (let i = 0; i < points.length - 1; i++) {
            const x0 = points[i][0],   y0 = points[i][1];
            const x1 = points[i+1][0], y1 = points[i+1][1];
            const cpx = (x0 + x1) / 2;
            d += ` C${cpx.toFixed(1)},${y0.toFixed(1)} ${cpx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
        }
        return d;
    };

    const linePath  = smoothPath(pts);
    const lastPt    = pts[pts.length - 1];
    const firstPt   = pts[0];
    const areaPath  = linePath
        + ` L${lastPt[0].toFixed(1)},${(pad.top + ch).toFixed(1)}`
        + ` L${firstPt[0].toFixed(1)},${(pad.top + ch).toFixed(1)} Z`;

    // Унікальний ID для градієнта (щоб не конфліктувало з іншими SVG)
    const gradId = 'balGrad_' + Date.now();

    let svg = `<svg width="${w}" height="${h}" style="display:block;overflow:visible;">`;

    // Gradient def
    svg += `<defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="${colFrom}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${colTo}"   stop-opacity="0.03"/>
        </linearGradient>
    </defs>`;

    // Сітка (горизонтальні лінії)
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
        const val = Math.round(maxBal * (1 - i / gridSteps));
        const y   = pad.top + (ch / gridSteps) * i;
        svg += `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${w - pad.right}" y2="${y.toFixed(1)}"
            stroke="${colGrid}" stroke-width="1"/>`;
        svg += `<text x="${pad.left - 5}" y="${(y + 4).toFixed(1)}"
            font-size="9" fill="${colText}" text-anchor="end">${val}⭐</text>`;
    }

    // Область заливки
    svg += `<path d="${areaPath}" fill="url(#${gradId})"/>`;

    // Крива лінія
    svg += `<path d="${linePath}" fill="none" stroke="${colLine}" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"/>`;

    // Підписи осі X і точки
    const totalPts   = data.length;
    const labelStep  = state.balancePeriod === 'month'
        ? Math.max(1, Math.ceil(totalPts / 10))
        : 1;

    data.forEach((d, i) => {
        const x = scaleX(i);
        // Мітки X
        if (i % labelStep === 0 || i === totalPts - 1) {
            svg += `<text x="${x.toFixed(1)}" y="${h - 6}"
                font-size="9" fill="${colMuted}" text-anchor="middle">${d.label}</text>`;
        }
        // Точки тільки для валідних даних
        if (d.balance !== null) {
            const y = scaleY(d.balance);
            const isLast = i === validData[validData.length - 1] ? true : false;
            const showDot = state.balancePeriod === 'week' || isLast
                || i === 0
                || (state.balancePeriod === 'year');

            if (showDot) {
                svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"
                    fill="${colPrimary}" stroke="${colLine}" stroke-width="2"/>`;
            }
        }
    });

    // Поточний баланс — велика мітка
    const curBalance = state.data.balance || 0;
    svg += `<text x="${w - pad.right}" y="${pad.top - 8}"
        font-size="11" font-weight="bold" fill="${colLine}" text-anchor="end">${curBalance}⭐ зараз</text>`;

    svg += '</svg>';
    container.innerHTML = svg;
}

export function changeBalancePeriod(period) {
    state.balancePeriod = period;
    state.balanceOffset = 0;
    document.querySelectorAll('#balanceChartCard .period-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    updateBalanceChart();
}

export function changeBalanceOffset(delta) {
    state.balanceOffset += delta;
    updateBalanceChart();
}

// ════════════════════════════════════════════════════
// 🔥  ТЕПЛОВА КАРТА АКТИВНОСТІ
// ════════════════════════════════════════════════════

function hexToRgba(hex, opacity) {
    hex = (hex || '').replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return `rgba(0,0,0,${opacity})`;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
}

// Динамічний рівень: нормалізація по [min, max] місяця
function heatDynLevel(stars, min, max) {
    if (!stars || stars <= 0) return -1;
    if (min === max) return 4; // одне унікальне значення — максимальна насиченість
    const ratio = (stars - min) / (max - min); // 0..1
    return Math.min(4, Math.floor(ratio * 4.99)); // 0..4
}

export function updateHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    const now    = new Date();
    const isEarn = state.heatmapMode === 'earn';
    const target = new Date(now.getFullYear(), now.getMonth() + state.heatmapOffset, 1);
    const year   = target.getFullYear();
    const month  = target.getMonth();
    const days   = new Date(year, month + 1, 0).getDate();
    const today  = new Date(); today.setHours(23, 59, 59, 999);

    const MONTH_NAMES = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                         'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
    const MONTH_SHORT = ['Сі','Лю','Бе','Кв','Тр','Че','Ли','Се','Ве','Жо','Ли','Гр'];

    document.getElementById('heatmapNextBtn').disabled = state.heatmapOffset === 0;
    document.getElementById('heatmapPeriodDisplay').textContent =
        `${MONTH_NAMES[month]} ${year}`;

    // Кольори — залежать від теми через CSS змінні
    const baseHex = isEarn
        ? cssVar('--secondary', '#0057B7')
        : cssVar('--accent',    '#FF6B6B');

    const OPACITIES  = [0.12, 0.28, 0.52, 0.75, 1.0];
    const TEXT_DARK  = cssVar('--text-muted', '#666');
    const TEXT_LIGHT = '#ffffff';

    // ── Підрахунок зірок по днях ──────────────────────
    const records  = state.data.records || [];
    const dayStars = {};
    records.forEach(r => {
        const rd = new Date(r.date);
        if (rd.getFullYear() !== year || rd.getMonth() !== month) return;
        const d = rd.getDate();
        if (!dayStars[d]) dayStars[d] = 0;
        if (isEarn  && r.type === 'earn')  dayStars[d] += (r.stars || 0);
        if (!isEarn && r.type === 'spend') dayStars[d] += (r.stars || 0);
    });

    // ── Динамічна шкала: min/max по активних днях ─────
    const activeVals = Object.values(dayStars).filter(v => v > 0);
    const dynMin = activeVals.length ? Math.min(...activeVals) : 0;
    const dynMax = activeVals.length ? Math.max(...activeVals) : 0;

    // ── Підрахунок зірок по тижнях місяця ─────────────
    // Тиждень визначається за ISO-понеділком
    const weekStars = {}; // ключ: "d1-d2" (перший і останній день тижня в межах місяця)
    for (let d = 1; d <= days; d++) {
        const dow = new Date(year, month, d).getDay();
        const isMon = (dow === 1) || (d === 1);  // початок тижня — понеділок або 1-е число
        if (isMon) {
            // Знаходимо кінець тижня (неділя або кінець місяця)
            let end = d;
            for (let e = d; e <= days; e++) {
                end = e;
                if (new Date(year, month, e).getDay() === 0) break;
            }
            const key = `${d}-${end}`;
            weekStars[key] = 0;
            for (let e = d; e <= end; e++) weekStars[key] += (dayStars[e] || 0);
        }
    }

    // ── Статистика ────────────────────────────────────
    const allVals    = Object.values(dayStars);
    const totalSt    = allVals.reduce((s, v) => s + v, 0);
    const activeDays = activeVals.length;

    const bestDay = Object.entries(dayStars)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])[0];

    const bestWeek = Object.entries(weekStars)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])[0];

    // ── Перший день тижня в місяці ────────────────────
    let firstDow = new Date(year, month, 1).getDay();
    firstDow = firstDow === 0 ? 6 : firstDow - 1;

    // ── Сітка ─────────────────────────────────────────
    const DOW_LABELS = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
    let html = `<div class="hm-day-labels">${DOW_LABELS.map(l =>
        `<div class="hm-day-label">${l}</div>`).join('')}</div>`;
    html += `<div class="hm-grid">`;

    for (let e = 0; e < firstDow; e++) {
        html += `<div class="hm-cell" style="background:transparent;"></div>`;
    }

    for (let d = 1; d <= days; d++) {
        const date     = new Date(year, month, d);
        const future   = date > today;
        const stars    = dayStars[d] || 0;
        const lv       = future ? -2 : heatDynLevel(stars, dynMin, dynMax);
        const hasStars = stars > 0 && !future;

        let bg, textDay, textStars;
        if (future) {
            bg        = cssVar('--border-light', '#E0E0E0');
            textDay   = cssVar('--text-hint', '#999');
            textStars = textDay;
        } else if (lv === -1) {
            bg        = cssVar('--bg', '#FFF9E6');
            textDay   = cssVar('--text-hint', '#999');
            textStars = textDay;
        } else {
            bg        = hexToRgba(baseHex, OPACITIES[lv]);
            textDay   = lv >= 3 ? TEXT_LIGHT : TEXT_DARK;
            textStars = lv >= 3 ? TEXT_LIGHT : baseHex;
        }

        html += `<div class="hm-cell${!future ? ' hm-past' : ''}" style="background:${bg};"
            data-day="${d}" data-stars="${stars}">
            <span class="hm-num hm-num-day"  style="color:${textDay};">${d}</span>
            <span class="hm-num hm-num-stars" style="color:${textStars};">${!future ? (stars > 0 ? stars + '⭐' : '—') : ''}</span>
        </div>`;
    }
    html += `</div>`;

    // ── Легенда ───────────────────────────────────────
    const swatches = [cssVar('--bg', '#FFF9E6'), ...OPACITIES.map(op => hexToRgba(baseHex, op))]
        .map(col => `<div class="hm-legend-swatch" style="background:${col};"></div>`).join('');
    html += `<div class="hm-legend"><span>Менше</span>${swatches}<span>Більше</span></div>`;

    // ── Зведення ──────────────────────────────────────
    const mo = MONTH_SHORT[month];
    const labelTotal   = isEarn ? 'Всього зароблено'   : 'Всього витрачено';
    const labelDays    = isEarn ? 'Активних днів'       : 'Днів з витратами';
    const labelBestDay = isEarn ? 'Найкращий день'      : 'Найвитратніший день';
    const labelBestWk  = isEarn ? 'Найкращий тиждень'  : 'Найвитратніший тиждень';

    const bestDayStr = bestDay
        ? `${bestDay[0]} ${mo} — ${bestDay[1]}⭐`
        : '—';

    let bestWeekStr = '—';
    if (bestWeek) {
        const [range, val] = bestWeek;
        const [wFrom, wTo] = range.split('-');
        bestWeekStr = `${wFrom}-${wTo} ${mo} — ${val}⭐`;
    }

    html += `<div class="hm-summary">
        <div class="hm-summary-item">${labelTotal}<br><strong>${totalSt}⭐</strong></div>
        <div class="hm-summary-item">${labelDays}<br><strong>${activeDays} з ${days}</strong></div>
        <div class="hm-summary-item">${labelBestDay}<br><strong>${bestDayStr}</strong></div>
        <div class="hm-summary-item">${labelBestWk}<br><strong>${bestWeekStr}</strong></div>
    </div>`;

    container.innerHTML = html;

    // Обробники кліків — окремо після рендерингу, щоб таймери тримали актуальні DOM-елементи
    container.querySelectorAll('.hm-cell.hm-past').forEach(cell => {
        cell.addEventListener('click', function () {
            if (this._hmTimer) clearTimeout(this._hmTimer);
            this.classList.remove('unpinning');
            this.classList.add('pinned');

            const el = this;
            el._hmTimer = setTimeout(function () {
                el.classList.add('unpinning');
                // rAF гарантує що браузер "бачить" новий transition-duration
                // перед тим як змінити opacity
                requestAnimationFrame(function () {
                    el.classList.remove('pinned');
                });
            }, 3000);
        });
    });
}

export function changeHeatmapMode(mode) {
    state.heatmapMode = mode;
    document.querySelectorAll('#heatmapCard .hm-mode-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    updateHeatmap();
}

export function changeHeatmapOffset(delta) {
    state.heatmapOffset += delta;
    updateHeatmap();
}

export function changeChartPeriod(period) {
    state.chartPeriod = period;
    state.chartOffset = 0;
    document.querySelectorAll('.stats-controls .period-btn').forEach(b=>b.classList.remove('active'));
    event.target.classList.add('active');
    updateChart();
}

export function changeChartOffset(delta) {
    state.chartOffset += delta;
    updateChart();
}

export function checkStreakWarning() {
    const today = new Date();
    if (today.getDay() !== 1) return;

    // Показуємо не більше одного разу за сесію (захист від повторних Firebase onValue)
    const sessionKey = 'streakWarnShown_' + today.toISOString().split('T')[0];
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    const friday = new Date(today);
    friday.setDate(today.getDate() - 3);
    const fridayStr = friday.toISOString().split('T')[0];

    const hadRecords    = state.data.records.some(r=>r.date.startsWith(fridayStr)&&r.type==='earn'&&r.category!=='achievement');
    const hasStreak     = (state.data.achievements.streaks.earning?.current||0) > 0;
    const freezeActive  = state.data.achievements.freezeMode?.active;

    if (hasStreak && !hadRecords && !freezeActive && state.data.isParent) {
        setTimeout(() => {
            const streak = state.data.achievements.streaks.earning.current;
            if (confirm(`⚠️ Вихідні минули!\n\nАктивна серія: ${streak} ${streak===1?'день':streak<5?'дні':'днів'}\n\nЯкщо були канікули — додайте їх у розділі "+Додати"`)) {
                document.dispatchEvent(new CustomEvent('zirky:switchTab', { detail: 'add' }));
                document.dispatchEvent(new CustomEvent('zirky:showForm',  { detail: 'freeze' }));
            }
        }, 1000);
    }
}

// ════════════════════════════════════════════════════
// 🍩  РОЗПОДІЛ ЗІРОК ПО ДЖЕРЕЛАХ
// ════════════════════════════════════════════════════

const DONUT_COLORS = {
    grade:       '#378ADD',
    diagnostic:  '#1D9E75',
    bonus:       '#EF9F27',
    special:     '#D4537E',
    achievement: '#7F77DD',
};

// Групи бонусів — key-слова з r.description
const BONUS_GROUPS = {
    'Додаткове навчання': {
        icon: '📚', color: '#EF9F27',
        matches: ['Виконано Д/З', 'Важке завдання', 'Прочитав книгу'],
    },
    'Допомога батькам': {
        icon: '🤝', color: '#E87828',
        matches: ['Допомога батькам'],
    },
    'Гігієна': {
        icon: '🧼', color: '#D4537E',
        matches: ['Почистити зуби', 'Причесати волосся'],
    },
};

// Імена досягнень для групування
const ACH_NAMES = [
    'Відмінник', 'Зіркова', 'Тверда десятка', 'Книголюб',
    'Fire Streak', 'Ощадливий', 'Транжира', 'Чистюля',
    'Красуня', 'Швидкий старт', 'Цілеспрямована',
];
// Кольори для сегментів суб'єктів/досягнень (10+)
const PALETTE = [
    '#378ADD','#1D9E75','#EF9F27','#D4537E','#7F77DD',
    '#D85A30','#5DCAA5','#E87828','#993556','#534AB7',
    '#BA7517','#0F6E56',
];

function _donutPeriodBounds() {
    const now = new Date();
    if (state.donutPeriod === 'all') return null;
    let start, end;
    if (state.donutPeriod === 'week') {
        const daysFromMon = (now.getDay() === 0 ? 6 : now.getDay() - 1);
        start = new Date(now);
        start.setDate(now.getDate() - daysFromMon + state.donutOffset * 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
    } else if (state.donutPeriod === 'month') {
        const t = new Date(now.getFullYear(), now.getMonth() + state.donutOffset, 1);
        start = t;
        end = new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
        const yr = now.getFullYear() + state.donutOffset;
        start = new Date(yr, 0, 1);
        end   = new Date(yr, 11, 31, 23, 59, 59, 999);
    }
    return { start, end };
}

function _donutPeriodLabel() {
    const MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                    'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
    const now = new Date();
    if (state.donutPeriod === 'week') {
        const daysFromMon = (now.getDay() === 0 ? 6 : now.getDay() - 1);
        const ws = new Date(now);
        ws.setDate(now.getDate() - daysFromMon + state.donutOffset * 7);
        ws.setHours(0, 0, 0, 0);
        const we = new Date(ws); we.setDate(ws.getDate() + 6);
        return `${ws.getDate()} ${MONTHS[ws.getMonth()].slice(0,3).toLowerCase()} — ${we.getDate()} ${MONTHS[we.getMonth()].slice(0,3).toLowerCase()}`;
    } else if (state.donutPeriod === 'month') {
        const t = new Date(now.getFullYear(), now.getMonth() + state.donutOffset, 1);
        return `${MONTHS[t.getMonth()]} ${t.getFullYear()}`;
    } else {
        return `${now.getFullYear() + state.donutOffset} рік`;
    }
}

function _getEarnRecords() {
    const bounds = _donutPeriodBounds();
    return (state.data.records || []).filter(r => {
        if (r.type !== 'earn') return false;
        if (r.category === 'correction') return false;
        if (!bounds) return true;
        const d = new Date(r.date);
        return d >= bounds.start && d <= bounds.end;
    });
}

function _buildDonutSVG(segments, total) {
    if (!segments.length || total === 0) return '';
    const cx = 90, cy = 90, R = 80, ri = 50;
    const TAU = Math.PI * 2;
    let a = -Math.PI / 2;
    const gap = segments.length > 1 ? 0.018 : 0;
    let paths = '';
    segments.forEach(seg => {
        const sweep = (seg.stars / total) * TAU;
        const s = a + gap, e = a + sweep - gap;
        const lg = sweep - 2 * gap > Math.PI ? 1 : 0;
        const x1 = cx + R  * Math.cos(s), y1 = cy + R  * Math.sin(s);
        const x2 = cx + R  * Math.cos(e), y2 = cy + R  * Math.sin(e);
        const x3 = cx + ri * Math.cos(e), y3 = cy + ri * Math.sin(e);
        const x4 = cx + ri * Math.cos(s), y4 = cy + ri * Math.sin(s);
        const d = `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${lg} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${x3.toFixed(2)},${y3.toFixed(2)} A${ri},${ri} 0 ${lg} 0 ${x4.toFixed(2)},${y4.toFixed(2)} Z`;
        const click = seg.onclick ? `onclick="${seg.onclick}" style="cursor:pointer"` : '';
        paths += `<path d="${d}" fill="${seg.color}" ${click} opacity="0.9"><title>${seg.label}: ${seg.stars}⭐ (${Math.round(seg.stars/total*100)}%)</title></path>`;
        a += sweep;
    });
    const totalLabel = total > 999 ? (total/1000).toFixed(1)+'k' : total;
    return `<svg viewBox="0 0 180 180" class="donut-svg">
        ${paths}
        <text x="90" y="84"  text-anchor="middle" class="donut-center-val">${totalLabel}</text>
        <text x="90" y="102" text-anchor="middle" class="donut-center-lbl">⭐ всього</text>
    </svg>`;
}

function _buildLegend(segments, total, drillable) {
    return segments.map(seg => {
        const pct = Math.round(seg.stars / total * 100);
        const click = drillable && seg.onclick
            ? `onclick="${seg.onclick}" style="cursor:pointer" tabindex="0"`
            : '';
        const arrow = drillable && seg.onclick ? '<span class="donut-arrow">›</span>' : '';
        return `<div class="donut-leg-item" ${click}>
            <span class="donut-leg-dot" style="background:${seg.color}"></span>
            <span class="donut-leg-name">${seg.label}${arrow}</span>
            <span class="donut-leg-pct">${pct}%</span>
            <span class="donut-leg-stars">${seg.stars}⭐</span>
        </div>`;
    }).join('');
}

export function renderSourceDonut() {
    const navRow = document.getElementById('donutNavRow');
    const nextBtn = document.getElementById('donutNextBtn');
    if (navRow) {
        const isAll = state.donutPeriod === 'all';
        navRow.style.display = isAll ? 'none' : '';
        if (!isAll) {
            const display = document.getElementById('donutPeriodDisplay');
            if (display) display.textContent = _donutPeriodLabel();
            if (nextBtn) nextBtn.disabled = state.donutOffset === 0;
        }
    }
    updateSourceDonut();
}

function updateSourceDonut() {
    const container = document.getElementById('sourceDonutContainer');
    if (!container) return;

    const records = _getEarnRecords();
    const drilldown = state.donutDrilldown;

    let segments = [], total = 0, drillTitle = '';

    if (!drilldown) {
        // ── Головний рівень ────────────────────────────
        const cats = { grade: 0, diagnostic: 0, bonus: 0, special: 0, achievement: 0 };
        records.forEach(r => { if (cats[r.category] !== undefined) cats[r.category] += (r.stars || 0); });
        total = Object.values(cats).reduce((s, v) => s + v, 0);
        const DEFS = [
            { key: 'grade',       label: '🎓 Оцінки',     drillable: true  },
            { key: 'diagnostic',  label: '🔬 Діагностичні',drillable: true  },
            { key: 'bonus',       label: '🌟 Бонуси',      drillable: true  },
            { key: 'special',     label: '✨ Особливі',    drillable: false },
            { key: 'achievement', label: '🏆 Досягнення',  drillable: true  },
        ];
        segments = DEFS
            .filter(d => cats[d.key] > 0)
            .map(d => ({
                label: d.label,
                color: DONUT_COLORS[d.key],
                stars: cats[d.key],
                onclick: d.drillable ? `drillDonut('${d.key}')` : null,
            }));
    } else {
        // ── Дриллдаун ─────────────────────────────────
        const cat = drilldown.category;
        const catRecs = records.filter(r => r.category === cat);

        if (cat === 'grade' || cat === 'diagnostic') {
            const bySubj = {};
            catRecs.forEach(r => {
                let subj = r.subject || 'Інше';
                if (subj.startsWith('Діагностувальна робота з ')) subj = subj.replace('Діагностувальна робота з ', '');
                bySubj[subj] = (bySubj[subj] || 0) + (r.stars || 0);
            });
            const sorted = Object.entries(bySubj).sort((a, b) => b[1] - a[1]);
            total = sorted.reduce((s, [, v]) => s + v, 0);
            segments = sorted.map(([name, stars], i) => ({
                label: name, color: PALETTE[i % PALETTE.length], stars, onclick: null,
            }));
            drillTitle = cat === 'grade' ? '🎓 Оцінки — по предметах' : '🔬 Діагностичні — по предметах';

        } else if (cat === 'bonus') {
            const grpStars = Object.fromEntries(Object.keys(BONUS_GROUPS).map(g => [g, 0]));
            catRecs.forEach(r => {
                const desc = r.description || '';
                for (const [gname, gdata] of Object.entries(BONUS_GROUPS)) {
                    if (gdata.matches.some(m => desc.includes(m))) {
                        grpStars[gname] += (r.stars || 0);
                        break;
                    }
                }
            });
            total = Object.values(grpStars).reduce((s, v) => s + v, 0);
            segments = Object.entries(BONUS_GROUPS)
                .filter(([g]) => grpStars[g] > 0)
                .map(([gname, gdata]) => ({
                    label: `${gdata.icon} ${gname}`, color: gdata.color,
                    stars: grpStars[gname], onclick: null,
                }));
            drillTitle = '🌟 Бонуси — по групах';

        } else if (cat === 'achievement') {
            const byAch = {};
            catRecs.forEach(r => {
                const desc = r.description || '';
                const matched = ACH_NAMES.find(n => desc.includes(n));
                const key = matched || 'Інше';
                byAch[key] = (byAch[key] || 0) + (r.stars || 0);
            });
            const sorted = Object.entries(byAch).sort((a, b) => b[1] - a[1]);
            total = sorted.reduce((s, [, v]) => s + v, 0);
            segments = sorted.map(([name, stars], i) => ({
                label: name, color: PALETTE[i % PALETTE.length], stars, onclick: null,
            }));
            drillTitle = '🏆 Досягнення — по типах';
        }
    }

    if (total === 0) {
        container.innerHTML = `<div class="text-hint font-sm text-center" style="padding:24px 0">Немає даних за цей період</div>`;
        return;
    }

    const svg    = _buildDonutSVG(segments, total);
    const legend = _buildLegend(segments, total, !drilldown);

    const topbar = drilldown
        ? `<div class="donut-topbar">
               <button class="donut-back-btn" onclick="drillDonut(null)">← Назад</button>
               <span class="donut-subtitle">${drillTitle}</span>
           </div>`
        : `<div class="donut-topbar">
               <span class="donut-hint">Натисни на категорію — деталі</span>
           </div>`;

    container.innerHTML = `${topbar}<div class="donut-layout">${svg}<div class="donut-legend">${legend}</div></div>`;
}

export function changeDonutPeriod(period) {
    state.donutPeriod    = period;
    state.donutOffset    = 0;
    state.donutDrilldown = null;
    document.querySelectorAll('#sourceDonutCard .period-btn:not(.donut-back-btn)').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderSourceDonut();
}

export function changeDonutOffset(delta) {
    state.donutOffset    += delta;
    state.donutDrilldown  = null;
    renderSourceDonut();
}

export function drillDonut(category) {
    state.donutDrilldown = category ? { category } : null;
    updateSourceDonut();
}
