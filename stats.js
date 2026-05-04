// ════════════════════════════════════════════════════
// 📊  stats.js — Статистика та графіки
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260504.1041';

import { state } from './state.js';

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

    const emojiMap = {
        'Математика': '📐', 'Українська мова': '🇺🇦', 'Я пізнаю світ': '🌍',
        'Читання': '📖', 'Англійська мова': '🇬🇧', 'Інформатика': '💻',
        'Мистецтво': '🎨', 'Вірш': '📝', 'Фізкультура': '⚽'
    };

    const maxAvg = 12;

    // Колір бару залежно від оцінки — через CSS класи
    const barClass = avg => avg >= 10 ? 'subject-bar--good' : avg >= 7 ? 'subject-bar--mid' : 'subject-bar--bad';

    let html = `<div style="display:grid;gap:10px;">`;

    subjects.forEach(s => {
        const emoji = emojiMap[s.name] || '📚';
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

    const emojiMap = {
        'Математика':'📐','Українська мова':'🇺🇦','Я пізнаю світ':'🌍',
        'Читання':'📖','Англійська мова':'🇬🇧','Інформатика':'💻',
        'Мистецтво':'🎨','Вірш':'📝','Фізкультура':'⚽'
    };

    const options = subjects.map(s =>
        `<option value="${s.name}">${emojiMap[s.name]||'📚'} ${s.name}</option>`
    ).join('');

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

    const totalEarned  = (state.data.records||[]).filter(r=>r.type==='earn').reduce((s,r)=>s+r.stars,0);
    const totalSpent   = (state.data.records||[]).filter(r=>r.type==='spend').reduce((s,r)=>s+r.stars,0);
    const thisMonth    = new Date().getMonth();
    const recordsCount = (state.data.records||[]).filter(r=>new Date(r.date).getMonth()===thisMonth).length;

    document.getElementById('totalEarned').textContent  = totalEarned + '⭐';
    document.getElementById('totalSpent').textContent   = totalSpent + '⭐';
    document.getElementById('recordsCount').textContent = recordsCount;

    setTimeout(renderSubjectAnalytics, 0);
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
            earned: recs.filter(r=>r.type==='earn').reduce((s,r)=>s+r.stars,0),
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
