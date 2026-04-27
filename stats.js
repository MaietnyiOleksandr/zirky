
// ── Аналітика по предметах ────────────────────────────────
export function renderSubjectAnalytics() {
    const container = document.getElementById('subjectAnalytics');
    if (!container) return;

    const records = state.data.records || [];

    // Збираємо дані по предметах (оцінки та діагностичні)
    const subjectData = {};
    records.forEach(r => {
        if (r.category !== 'grade' && r.category !== 'diagnostic') return;
        if (!r.subject || !r.grade) return;

        // Нормалізуємо назву (прибираємо "Діагностувальна робота з ")
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
        container.innerHTML = '<div style="color:#999; font-size:14px; text-align:center;">Ще немає оцінок для аналізу</div>';
        return;
    }

    // Сортуємо за середньою оцінкою (спадання)
    const subjects = Object.entries(subjectData)
        .map(([name, data]) => {
            const avg = data.grades.reduce((s, g) => s + g, 0) / data.grades.length;

            // Тренд: порівнюємо останні 30 днів з попередніми 30 днями
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
                if (diff > 0.5)       trend = { icon: '📈', color: '#4CAF50', text: `+${diff.toFixed(1)}` };
                else if (diff < -0.5) trend = { icon: '📉', color: '#f44336', text: diff.toFixed(1) };
                else                  trend = { icon: '➡️', color: '#999',    text: '~' };
            }

            return { name, avg, count: data.count, stars: data.stars, grades: data.grades, trend };
        })
        .sort((a, b) => b.avg - a.avg);

    const emojiMap = {
        'Математика': '📐', 'Українська мова': '🇺🇦', 'Я пізнаю світ': '🌍',
        'Читання': '📖', 'Англійська мова': '🇬🇧', 'Інформатика': '💻',
        'Мистецтво': '🎨', 'Вірш': '📝', 'Фізкультура': '⚽'
    };

    // Максимальна середня для шкали
    const maxAvg = 12;

    let html = `<div style="display: grid; gap: 10px;">`;

    subjects.forEach(s => {
        const emoji = emojiMap[s.name] || '📚';
        const avgRounded = Math.round(s.avg * 10) / 10;
        const barWidth = Math.round((s.avg / maxAvg) * 100);

        // Колір залежно від середньої
        const barColor = s.avg >= 10 ? '#4CAF50' : s.avg >= 7 ? '#FFC107' : '#f44336';

        html += `
        <div style="background: white; padding: 12px; border-radius: 12px; border: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 14px; font-weight: 600;">${emoji} ${s.name}</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    ${s.trend ? `<span style="font-size: 12px; color: ${s.trend.color}; font-weight: 600;">${s.trend.icon} ${s.trend.text}</span>` : ''}
                    <div style="text-align: right;">
                        <span style="font-size: 16px; font-weight: 700; color: ${barColor};">${avgRounded}</span>
                        <span style="font-size: 11px; color: #999; margin-left: 4px;">(${s.count} ${s.count === 1 ? 'оцінка' : s.count < 5 ? 'оцінки' : 'оцінок'})</span>
                    </div>
                </div>
            </div>
            <div style="background: #f0f0f0; border-radius: 6px; height: 8px; overflow: hidden;">
                <div style="width: ${barWidth}%; height: 100%; background: ${barColor}; border-radius: 6px; transition: width 0.3s;"></div>
            </div>
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260427.1729';
// STATS  stats.js — Stats
//     Зірки Успіху | v3.20260427.1729
// ════════════════════════════════════════════════════

import { state } from './state.js';

// ════════════════════════════════════════════════════════════
// 📊  БЛОК: Статистика / Графіки
// ════════════════════════════════════════════════════════════
export function renderStats() {
    updateChart();
    
    const totalEarned = (state.data.records||[]).filter(r=>r.type==='earn').reduce((s,r)=>s+r.stars,0);
    const totalSpent = (state.data.records||[]).filter(r=>r.type==='spend').reduce((s,r)=>s+r.stars,0);
    const thisMonth = new Date().getMonth();
    const recordsCount = (state.data.records||[]).filter(r=>new Date(r.date).getMonth()===thisMonth).length;

    document.getElementById('totalEarned').textContent = totalEarned + '⭐';
    document.getElementById('totalSpent').textContent = totalSpent + '⭐';
    document.getElementById('recordsCount').textContent = recordsCount;
    
    // setTimeout гарантує що DOM вже показаний
    setTimeout(renderSubjectAnalytics, 0);
}


export function updateChart() {
    const chartContainer = document.querySelector('.chart-container');
    const showEarned = document.getElementById('showEarned').checked;
    const showSpent = document.getElementById('showSpent').checked;
    const now = new Date();
    
    let periods = [];
    let labelFormat;
    let pointWidth = 60;
    let periodName = '';
    
    // Вимикаємо кнопку "вперед" якщо дивимось поточний період
    document.getElementById('chartNextBtn').disabled = state.chartOffset === 0;
    
    // Визначаємо періоди з урахуванням offset
    if (state.chartPeriod === 'week') {
        const weekStart = new Date(now);
        const dayOfWeek = now.getDay();
        const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Неділя = 6 днів від понеділка
        weekStart.setDate(now.getDate() - daysFromMonday + (state.chartOffset * 7)); // Понеділок поточного тижня + offset
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            periods.push(d);
        }
        
        const weekEnd = new Date(periods[6]);
        periodName = `${periods[0].getDate()} ${['січ','лют','бер','кві','тра','чер','лип','сер','вер','жов','лис','гру'][periods[0].getMonth()]} — ${weekEnd.getDate()} ${['січ','лют','бер','кві','тра','чер','лип','сер','вер','жов','лис','гру'][weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
        labelFormat = d => d.getDate();
        pointWidth = 50;
    } else if (state.chartPeriod === 'month') {
        const targetMonth = new Date(now.getFullYear(), now.getMonth() + state.chartOffset, 1);
        const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            periods.push(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), i));
        }
        
        periodName = `${['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'][targetMonth.getMonth()]} ${targetMonth.getFullYear()}`;
        labelFormat = d => d.getDate();
        pointWidth = 35;
    } else if (state.chartPeriod === 'year') {
        const targetYear = now.getFullYear() + state.chartOffset;
        
        for (let i = 0; i < 12; i++) {
            periods.push(new Date(targetYear, i, 1));
        }
        
        periodName = `${targetYear} рік`;
        labelFormat = d => ['Сі','Лю','Бе','Кв','Тр','Че','Ли','Се','Ве','Жо','Ли','Гр'][d.getMonth()];
        pointWidth = 55;
    }
    
    // Оновлюємо назву періоду
    document.getElementById('chartPeriodDisplay').textContent = periodName;
                // Збираємо дані
    const chartData = periods.map(d => {
        const records = (state.data.records || []).filter(r => {
            const rd = new Date(r.date);
            if (state.chartPeriod === 'year') {
                return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
            } else {
                return rd.toDateString() === d.toDateString();
            }
        });
        
        const earned = records.filter(r => r.type === 'earn').reduce((s, r) => s + r.stars, 0);
        const spent = records.filter(r => r.type === 'spend').reduce((s, r) => s + r.stars, 0);
        
        return { date: d, earned, spent, label: labelFormat(d) };
    });
    
    // Знаходимо максимум
    const maxValue = Math.max(
        ...chartData.map(d => Math.max(d.earned, d.spent)),
        10 // мінімум 10 для масштабу
    );
    
    // Розміри SVG
    let width;
    if (state.chartPeriod === 'week') {
        // Для тижня - завжди 100% контейнера (без скролу)
        width = chartContainer.clientWidth - 20;
    } else {
        // Для місяця/року - може бути ширше (зі скролом)
        width = Math.max(periods.length * pointWidth, chartContainer.clientWidth);
    }
    const height = 250;
    const padding = { top: 30, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Функція для перетворення значення в Y координату
    const scaleY = (value) => {
        return padding.top + chartHeight - (value / maxValue) * chartHeight;
    };
    
    // Функція для X координати
    const scaleX = (index) => {
        return padding.left + (index / (periods.length - 1)) * chartWidth;
    };
    
    // Створюємо SVG
    let svg = `<svg width="${width}" height="${height}" style="display: block;">`;
    
    // Сітка
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        const value = Math.round(maxValue * (1 - i / 5));
        svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#E0E0E0" stroke-width="1"/>`;
        svg += `<text x="${padding.left - 10}" y="${y + 5}" fill="#999" font-size="9" text-anchor="end">${value}⭐</text>`;
    }
    
    // ── Сірі зони канікул (тільки для тижня та місяця) ──────────
    const freezePeriods = state.chartPeriod !== 'year'
        ? (state.data.achievements?.freezePeriods || [])
        : [];
    freezePeriods.forEach(period => {
        const fromDate = new Date(period.from);
        fromDate.setHours(0, 0, 0, 0);
        const untilDate = new Date(period.until);
        untilDate.setHours(23, 59, 59, 999);

        // Знаходимо індекси точок що попадають у канікули
        let xStart = null;
        let xEnd = null;

        periods.forEach((p, i) => {
            const pDate = new Date(p);
            pDate.setHours(12, 0, 0, 0);
            if (pDate >= fromDate && pDate <= untilDate) {
                const x = scaleX(i);
                if (xStart === null) xStart = x;
                xEnd = x;
            }
        });

        // Якщо жодна точка не потрапила — шукаємо між точками
        if (xStart === null) {
            for (let i = 0; i < periods.length - 1; i++) {
                const p1 = new Date(periods[i]);
                const p2 = new Date(periods[i + 1]);
                if (p1 <= untilDate && p2 >= fromDate) {
                    xStart = xStart ?? scaleX(i);
                    xEnd = scaleX(i + 1);
                }
            }
        }

        if (xStart !== null && xEnd !== null) {
            const isActive = untilDate >= new Date();
            const fillColor = isActive ? 'rgba(100,149,237,0.15)' : 'rgba(180,180,180,0.2)';
            const strokeColor = isActive ? 'rgba(100,149,237,0.4)' : 'rgba(150,150,150,0.3)';
            const rectX = xStart - (xStart === scaleX(0) ? 0 : 5);
            const rectWidth = xEnd - rectX + 5;

            svg += `<rect x="${rectX}" y="${padding.top}" width="${rectWidth}"
                height="${chartHeight}" fill="${fillColor}"
                stroke="${strokeColor}" stroke-width="1" rx="3"/>`;

            // Підпис ❄️ зверху зони
            const labelX = rectX + rectWidth / 2;
            svg += `<text x="${labelX}" y="${padding.top - 4}" fill="${isActive ? '#6495ED' : '#aaa'}"
                font-size="9" text-anchor="middle">❄️</text>`;
        }
    });

    // Лінія доходів
    if (showEarned && chartData.some(d => d.earned > 0)) {
        let earnedPath = 'M';
        chartData.forEach((d, i) => {
            const x = scaleX(i);
            const y = scaleY(d.earned);
            earnedPath += i === 0 ? `${x},${y}` : ` L${x},${y}`;
        });
        svg += `<path d="${earnedPath}" fill="none" stroke="#0057B7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
        
        // Точки доходів
        chartData.forEach((d, i) => {
            if (d.earned > 0) {
                const x = scaleX(i);
                const y = scaleY(d.earned);
                svg += `<circle cx="${x}" cy="${y}" r="5" fill="#FFD700" stroke="#0057B7" stroke-width="2"/>`;
                svg += `<text x="${x - 8}" y="${y + 4}" fill="#0057B7" font-size="9" font-weight="bold" text-anchor="end">+${d.earned}</text>`;
            }
        });
    }
    
    // Лінія витрат
    if (showSpent && chartData.some(d => d.spent > 0)) {
        let spentPath = 'M';
        chartData.forEach((d, i) => {
            const x = scaleX(i);
            const y = scaleY(d.spent);
            spentPath += i === 0 ? `${x},${y}` : ` L${x},${y}`;
        });
        svg += `<path d="${spentPath}" fill="none" stroke="#E74C3C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
        
        // Точки витрат
        chartData.forEach((d, i) => {
            if (d.spent > 0) {
                const x = scaleX(i);
                const y = scaleY(d.spent);
                svg += `<circle cx="${x}" cy="${y}" r="5" fill="#FF6B6B" stroke="#E74C3C" stroke-width="2"/>`;
                svg += `<text x="${x + 8}" y="${y + 4}" fill="#E74C3C" font-size="9" font-weight="bold" text-anchor="start">-${d.spent}</text>`;
            }
        });
    }
    
    // Підписи осі X
    chartData.forEach((d, i) => {
        const x = scaleX(i);
        svg += `<text x="${x}" y="${height - 10}" fill="#666" font-size="9" font-weight="bold" text-anchor="middle">${d.label}</text>`;
    });
    
    svg += '</svg>';
    
    chartContainer.innerHTML = `<div class="chart-wrapper" style="width: ${width}px;">${svg}</div>`;
}

export function changeChartPeriod(period) {
    state.chartPeriod = period;
    state.chartOffset = 0; // Скидаємо на поточний період
    document.querySelectorAll('.stats-controls .period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updateChart();
}

export function changeChartOffset(delta) {
    state.chartOffset += delta;
    updateChart();
}


// Нагадування про серію при вході в понеділок
export function checkStreakWarning() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Якщо сьогодні понеділок
    if (dayOfWeek === 1) {
        const friday = new Date(today);
        friday.setDate(today.getDate() - 3);
        const fridayStr = friday.toISOString().split('T')[0];
        
        // Перевіряємо чи були записи в п'ятницю
        const hadRecordsOnFriday = state.data.records.some(r => 
            r.date.startsWith(fridayStr) && r.type === 'earn' && r.category !== 'achievement'
        );
        
        const hasActiveStreak = (state.data.achievements.streaks.earning?.current || 0) > 0;
        
        // Якщо є серія але не було записів у п'ятницю і канікули не активні
        if (hasActiveStreak && !hadRecordsOnFriday && !state.data.achievements.freezeMode?.active) {
            // Показуємо нагадування тільки для батьків
            if (state.data.isParent) {
                setTimeout(() => {
                    const streak = state.data.achievements.streaks.earning.current;
                    if (confirm(`⚠️ Вихідні минули!

Активна серія: ${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дні' : 'днів'}

Якщо були канікули - додайте період канікул у розділі "+Додати"`)) {
                        document.dispatchEvent(new CustomEvent('zirky:switchTab', { detail: 'add' }));
                        document.dispatchEvent(new CustomEvent('zirky:showForm', { detail: 'freeze' }));
                    }
                }, 1000);
            }
        }
    }
}
// PIN підтвердження для дитини при обміні
// state.pendingCustomReward → state.state.pendingCustomReward
let rewardPinValue = '';
// 🔐 Reward PIN функції → auth.js
