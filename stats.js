// ════════════════════════════════════════════════════
// STATS  stats.js — Stats
//     Зірки Успіху | v3.20260426.0912
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
                svg += `<text x="${x}" y="${y - 10}" fill="#0057B7" font-size="9" font-weight="bold" text-anchor="middle">+${d.earned}</text>`;
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
                svg += `<text x="${x}" y="${y - 10}" fill="#E74C3C" font-size="9" font-weight="bold" text-anchor="middle">-${d.spent}</text>`;
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
                        switchTab('add');
                        showForm('freeze');
                    }
                }, 1000);
            }
        }
    }
}

export function updateUI() {
    document.getElementById('balance').textContent = Number(state.data.balance) + '⭐';

    let records = state.data.records || [];
    if (state.showPeriod === 'month') {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        records = records.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
    }
    const earned = records.filter(r=>r.type==='earn').reduce((s,r)=>s+r.stars,0);
    const spent = records.filter(r=>r.type==='spend').reduce((s,r)=>s+r.stars,0);

    document.getElementById('earnedStats').textContent = earned + '⭐';
    document.getElementById('spentStats').textContent = spent + '⭐';

    if (!state.data.isParent) {
        document.querySelectorAll('.tab').forEach(t => {
            if (t.textContent.includes('Додати')) t.style.display = 'none';
        });
        document.getElementById('parentInstructions').style.display = 'none';
        document.getElementById('childInstructions').style.display = 'block';
    } else {
        // Відновлюємо всі вкладки для батьків
        document.querySelectorAll('.tab').forEach(t => t.style.display = '');
        document.getElementById('parentInstructions').style.display = 'block';
        document.getElementById('childInstructions').style.display = 'none';
        document.getElementById('currentPin').textContent = state.data.pin;
    }
    
    renderAchievementsHome();
    renderGoal();
}

// PIN підтвердження для дитини при обміні
let pendingRewardIndex = null;
// state.pendingCustomReward → state.state.pendingCustomReward
let rewardPinValue = '';

export function buyRewardWithPin(index) {
    pendingRewardIndex = index;
    state.pendingCustomReward = null;
    showRewardPin();
}

// 🔐 Reward PIN функції → auth.js
