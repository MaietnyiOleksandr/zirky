// ════════════════════════════════════════════════════
// 🏆  achievements.js — Система досягнень
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260625.0825';

// ════════════════════════════════════════════════════════════

import { state } from './state.js';
import { ACHIEVEMENTS } from './config.js';
import { g, achText, nowKyiv } from './utils.js';
import { hasUnreadAchievementNotif, dismissAchievementNotifs } from './notifications.js';

// Хелпер для level.desc — підтримує рядок і {boy,girl}
function _levelDesc(level, childId) {
    const d = level?.desc;
    if (!d) return '';
    if (typeof d === 'object') return g(childId, d);
    return d;
}

// ════════════════════════════════════════════════════════════
// 🔄  МІГРАЦІЯ — проставляємо achId у старих записах
//   Ідемпотентна: пропускає записи де achId вже є.
//   Залишається у коді назавжди — спрацьовує один раз на профіль.
// ════════════════════════════════════════════════════════════

// Карта: підрядок опису → achId (обидва варіанти назв)
const _DESC_TO_ACH_ID = (() => {
    const map = {};
    Object.values(ACHIEVEMENTS).forEach(ach => {
        const names = typeof ach.name === 'object'
            ? Object.values(ach.name)
            : [ach.name];
        names.forEach(n => { if (n) map[n] = ach.id; });
    });
    return map;
})();

export function migrateAchievementIds() {
    const records = state.data.records;
    if (!Array.isArray(records)) return;

    let changed = false;
    records.forEach(r => {
        if (r.category !== 'achievement' || r.achId) return;
        const desc = r.description || '';
        for (const [namePart, achId] of Object.entries(_DESC_TO_ACH_ID)) {
            if (desc.includes(namePart)) {
                r.achId = achId;
                // Рівень: шукаємо тир-рівень у рядку (I, II, III…)
                const tierMatch = desc.match(/\b(I{1,3}|IV|V?I{0,3})\s*$/);
                const tierMap = { 'I':0,'II':1,'III':2,'IV':3,'V':4,'VI':5,'VII':6,'VIII':7,'IX':8,'X':9 };
                if (tierMatch) r.achLevel = tierMap[tierMatch[1].trim()] ?? 0;
                else r.achLevel = 0;
                changed = true;
                break;
            }
        }
    });

    if (changed) {
        // Зберігаємо оновлені записи у Firebase
        import('./firebase.js').then(({ saveAll }) => saveAll());
    }
}
// ════════════════════════════════════════════════════════════
export function initAchievements() {
    if (!state.data.achievements) {
        state.data.achievements = { counters: {}, streaks: {}, levels: {}, weekly: {} };
    }
    if (!state.data.achievements.counters) state.data.achievements.counters = {};
    if (!state.data.achievements.streaks) state.data.achievements.streaks = {};
    if (!state.data.achievements.levels) state.data.achievements.levels = {};
    if (!state.data.achievements.weekly) state.data.achievements.weekly = {};
    if (!state.data.achievements.repeatableHistory) state.data.achievements.repeatableHistory = {};
    if (!state.data.achievements.freezePeriods) state.data.achievements.freezePeriods = [];
}

// ПОВНЕ перерахунок всіх досягнень з нуля
export function recalculateAchievements() {
    initAchievements();
    
    // Скидаємо всі лічильники
    state.data.achievements.counters = {};
    state.data.achievements.streaks = {};
    
    // Проходимо ВСІ записи в хронологічному порядку
    const sortedRecords = [...(state.data.records || [])].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
    );
    
    sortedRecords.forEach(record => {
        // Лічильник досягнутих цілей — через achId (нові записи) або через назву (старі)
        if (record.category === 'achievement' && (
            record.achId === 'цілеспрямована' ||
            (record.description && (
                record.description.includes('Цілеспрямована') ||
                record.description.includes('Ціленаправлений')  // сумісність зі старими записами
            ))
        )) {
            state.data.achievements.counters.goalsReached =
                (state.data.achievements.counters.goalsReached || 0) + 1;
        }
        
        // Оцінка 12
        if (record.category === 'grade' && record.grade === '12') {
            state.data.achievements.counters.grades_12 = (state.data.achievements.counters.grades_12 || 0) + 1;
        }

        // Оцінки 11 і 10
        if (record.category === 'grade' && record.grade === '11') {
            state.data.achievements.counters.grades_11 = (state.data.achievements.counters.grades_11 || 0) + 1;
        }
        if (record.category === 'grade' && record.grade === '10') {
            state.data.achievements.counters.grades_10 = (state.data.achievements.counters.grades_10 || 0) + 1;
        }

        // Книги (Книголюб) — fallback по description для старих записів без subcategory
        if (record.category === 'bonus' && (
            record.counterKey === 'books' ||
            (!record.subcategory && record.description && record.description.includes('Прочитав книгу'))
        )) {
            state.data.achievements.counters.books = (state.data.achievements.counters.books || 0) + 1;
        }

        // Сторінки (Читачка) — з поля pages у записі
        if (record.category === 'bonus' && record.counterKey === 'books' && record.pages) {
            state.data.achievements.counters.pages =
                (state.data.achievements.counters.pages || 0) + Number(record.pages);
        }

        // Нові counters по subcategory (з fallback по description для старих записів)
        if (record.category === 'bonus') {
            const sub = record.subcategory;
            const ck  = record.counterKey;
            const desc = record.description || '';

            // homework (Старанна)
            if (ck === 'homework' || (!sub && desc.includes('Виконано Д/З'))) {
                state.data.achievements.counters.homework =
                    (state.data.achievements.counters.homework || 0) + 1;
            }
            // hard_tasks (Мегамозок)
            if (ck === 'hard_tasks' || (!sub && desc.includes('Важке завдання'))) {
                state.data.achievements.counters.hard_tasks =
                    (state.data.achievements.counters.hard_tasks || 0) + 1;
            }
            // help (Помічниця)
            if (ck === 'help' || (!sub && desc.includes('Допомога батькам'))) {
                state.data.achievements.counters.help =
                    (state.data.achievements.counters.help || 0) + 1;
            }
            // home_chores (Господиня)
            if (sub === 'home_chore') {
                state.data.achievements.counters.home_chores =
                    (state.data.achievements.counters.home_chores || 0) + 1;
            }
            // activity (Активна)
            if (sub === 'activity') {
                state.data.achievements.counters.activity =
                    (state.data.achievements.counters.activity || 0) + 1;
            }
        }
        
        // Витрати (для Транжира)
        if (record.type === 'spend') {
            state.data.achievements.counters.total_spent = (state.data.achievements.counters.total_spent || 0) + record.stars;
        }

        // Максимальний баланс (для Ощадливий) — відстежуємо пік, не реагуємо на витрати
        // Рахуємо ВСІ earn (включаючи бонуси досягнень) — інакше витрати бонусних зірок занижують пік
        if (record.type === 'earn') {
            state.data.achievements.counters._runningBalance =
                (state.data.achievements.counters._runningBalance || 0) + Number(record.stars || 0);
        } else if (record.type === 'spend') {
            state.data.achievements.counters._runningBalance =
                (state.data.achievements.counters._runningBalance || 0) - Number(record.stars || 0);
        }
        state.data.achievements.counters.maxBalance = Math.max(
            state.data.achievements.counters.maxBalance || 0,
            state.data.achievements.counters._runningBalance || 0
        );
        
        // Earning streak
        if (record.type === 'earn' && record.category !== 'achievement') {
            const recordDate = new Date(record.date);
            const recordDay = recordDate.toDateString();
            const streak = state.data.achievements.streaks.earning || { current: 0, best: 0, lastDate: null };
            
            if (streak.lastDate === recordDay) {
                // Сьогодні вже заробляв - нічого не робимо
            } else if (streak.current === 0) {
                // Перший запис - починаємо streak
                streak.current = 1;
                streak.lastDate = recordDay;
            } else {
                // Перевіряємо скільки днів пройшло
                const lastDate = new Date(streak.lastDate);
                const daysDiff = Math.floor((recordDate - lastDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff === 1) {
                    // Наступний день - продовжуємо
                    streak.current += 1;
                    streak.best = Math.max(streak.best, streak.current);
                    streak.lastDate = recordDay;
                } else if (daysDiff > 1) {
                    // Пропуск більше одного дня — перевіряємо режим
                    const inFreeze = _isDateInFreeze(lastDate, recordDate);

                    if (inFreeze) {
                        // Під час канікул: вихідні не є винятком,
                        // дозволений gap = 1 день (daysDiff === 2 → 1 пропущений день → ОК)
                        if (daysDiff === 2) {
                            // Рівно 1 пропущений день — дозволено
                            streak.current += 1;
                            streak.best = Math.max(streak.best, streak.current);
                        } else {
                            // 2+ пропущених дні під час канікул — скидаємо
                            streak.current = 1;
                        }
                    } else {
                        // Поза канікулами: перевіряємо вихідні/freeze по-старому
                        let allSkippable = true;
                        for (let i = 1; i < daysDiff; i++) {
                            const checkDate = new Date(lastDate);
                            checkDate.setDate(lastDate.getDate() + i);
                            if (!shouldSkipDayForStreak(checkDate, 'grade')) {
                                allSkippable = false;
                                break;
                            }
                        }
                        if (allSkippable) {
                            streak.current += 1;
                            streak.best = Math.max(streak.best, streak.current);
                        } else {
                            streak.current = 1;
                        }
                    }
                    streak.lastDate = recordDay;
                } else {
                    // Невідомий випадок - скидаємо
                    streak.current = 1;
                    streak.lastDate = recordDay;
                }
            }
            
            state.data.achievements.streaks.earning = streak;
        }
    });
    
    // Підрахунок teeth streak (2 рази на добу N днів підряд)
    const dayGroups = {};
    sortedRecords.forEach(record => {
        const day = record.date.split('T')[0]; // тільки дата без часу
        if (!dayGroups[day]) dayGroups[day] = [];
        dayGroups[day].push(record);
    });
    
    const allDays = Object.keys(dayGroups).sort();
    let teethStreak   = { current: 0, best: 0 };
    let hairStreak    = { current: 0, best: 0 };
    let workoutStreak = { current: 0, best: 0 };
    let lastDay = null;
    
    allDays.forEach(day => {
        const records      = dayGroups[day];
        const teethCount   = records.filter(r => r.description && r.description.includes('Почистити зуби')).length;
        // hair — лише «Причесати волосся» (тільки для дівчаток)
        const hairCount    = records.filter(r => r.description && r.description.includes('Причесати волосся')).length;
        // workout — лише «Зробити зарядку» (для всіх)
        const workoutCount = records.filter(r => r.description && r.description.includes('Зробити зарядку')).length;
        
        // Teeth streak
        if (teethCount >= 2) {
            if (lastDay) {
                const yesterday = new Date(day);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                
                if (lastDay === yesterdayStr) {
                    teethStreak.current += 1;
                } else {
                    teethStreak.current = 1;
                }
            } else {
                teethStreak.current = 1;
            }
            teethStreak.best = Math.max(teethStreak.best, teethStreak.current);
        } else {
            teethStreak.current = 0;
        }
        
        // Hair streak (тільки для дівчаток — «Причесати волосся»)
        if (hairCount >= 1) {
            if (lastDay) {
                const yesterday = new Date(day);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                if (lastDay === yesterdayStr) {
                    hairStreak.current += 1;
                } else {
                    hairStreak.current = 1;
                }
            } else {
                hairStreak.current = 1;
            }
            hairStreak.best = Math.max(hairStreak.best, hairStreak.current);
        } else {
            hairStreak.current = 0;
        }

        // Workout streak («Зробити зарядку» — для всіх)
        if (workoutCount >= 1) {
            if (lastDay) {
                const yesterday = new Date(day);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                if (lastDay === yesterdayStr) {
                    workoutStreak.current += 1;
                } else {
                    workoutStreak.current = 1;
                }
            } else {
                workoutStreak.current = 1;
            }
            workoutStreak.best = Math.max(workoutStreak.best, workoutStreak.current);
        } else {
            workoutStreak.current = 0;
        }

        lastDay = day;
    });

    state.data.achievements.streaks.teeth   = teethStreak;
    state.data.achievements.streaks.hair    = hairStreak;
    state.data.achievements.streaks.workout = workoutStreak;
    
    // Визначаємо поточний рівень для кожного досягнення
    // Пропускаємо досягнення що не відповідають gender дитини
    const childGender = state.parent?.children?.[state.activeChildId]?.gender || 'girl';
    Object.keys(ACHIEVEMENTS).forEach(achId => {
        const ach = ACHIEVEMENTS[achId];
        if (ach.gender && ach.gender !== childGender) return;
        let currentValue = 0;
        
        // Отримуємо поточне значення
        if (ach.type === 'cumulative') {
            currentValue = state.data.achievements.counters[ach.counter] || 0;
        } else if (ach.type === 'streak' || ach.type === 'repeatable_streak') {
            const streak = state.data.achievements.streaks[ach.streak] || { current: 0 };
            currentValue = streak.current;
        } else if (ach.type === 'balance') {
            currentValue = state.data.achievements.counters.maxBalance || 0;
        } else if (ach.type === 'goal_counter') {
            // Читаємо лічильник досягнутих цілей
            // (збільшується тільки в checkGoalReached, не тут!)
            currentValue = state.data.achievements.counters.goalsReached || 0;
        } else if (ach.type === 'weekly') {
            // Для weekly рахуємо зірки за поточний тиждень
            const now = new Date();
            const dayOfWeek = now.getDay();
            const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - daysFromMonday);
            weekStart.setHours(0, 0, 0, 0);
            
            const weekRecords = (state.data.records || []).filter(r => {
                const d = new Date(r.date);
                return d >= weekStart && r.type === 'earn' && r.category !== 'achievement';
            });
            currentValue = weekRecords.reduce((sum, r) => sum + r.stars, 0);
        }
        
        // Визначаємо поточний рівень (0 якщо не досягнуто жодного)
        let achievedLevel = 0;
        for (let i = 0; i < ach.levels.length; i++) {
            const level = ach.levels[i];
            const target = ach.type === 'goal_counter'
                ? level.target   // 1, 2, 3 рази
                : level.target;
            
            if (currentValue >= target) {
                achievedLevel = i + 1; // рівні нумеруються з 1
            } else {
                break; // не досягнуто цього рівня - припиняємо
            }
        }
        
        // Зберігаємо поточний рівень
        if (achievedLevel > 0) {
            state.data.achievements.levels[achId] = achievedLevel;
        } else {
            delete state.data.achievements.levels[achId]; // не досягнуто жодного рівня
        }
    });
}

// Перевірка тижневих досягнень (Швидкий старт)

// ── Перевірка досягнення мети (викликається тільки при нарахуванні зірок) ──
export function checkGoalReached(recordDate = null) {
    if (!state.data.goal || state.data.goal.reached) return false;
    
    const balance = Number(state.data.balance) || 0;
    const target = Number(state.data.goal.target);
    
    if (balance < target) return false;
    
    // Мета досягнута! Позначаємо як досягнуту
    state.data.goal.reached = true;
    // goalsReached буде автоматично підраховано з записів в recalculateAchievements
    const newCount = (state.data.achievements.counters.goalsReached || 0) + 1;
    
    // Рівень оновиться автоматично через recalculateAchievements після цього виклику
    
    // Знаходимо нагороду для поточного рівня
    const goalAch = ACHIEVEMENTS['цілеспрямована'];
    const levelIndex = newCount - 1; // 0-based
    
    if (levelIndex < goalAch.levels.length) {
        const level = goalAch.levels[levelIndex];
        const tierName = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][levelIndex] ?? String(levelIndex+1);
        const goalIcon = typeof goalAch.icon === 'object' ? g(state.activeChildId, goalAch.icon) : goalAch.icon;
        const fullName = `${goalIcon} ${achText(goalAch, state.activeChildId)} ${tierName}`;
        
        // Нараховуємо зірки
        state.data.balance = Number(state.data.balance) + level.reward;
        state.data.records.push({
            id:          Date.now() + Math.random(),
            date:        recordDate
                ? new Date(new Date(recordDate).getTime() + 1000).toISOString()
                : nowKyiv(),
            description: fullName,
            achId:       'цілеспрямована',
            achLevel:    levelIndex,
            stars:       level.reward,
            type:        'earn',
            category:    'achievement',
        });
        
        // Показуємо сповіщення
        const timesWord = newCount === 1 ? 'вперше' : `${newCount}-й раз`;
        setTimeout(() => {
            alert(`🎉 Ціль досягнута ${timesWord}!\n\n${fullName}\n+${level.reward}⭐`);
        }, 500);
    }
    
    return true;
}

export function checkWeeklyAchievements() {
    initAchievements();
    
    // Отримуємо номер поточного тижня
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    const weekNum = Math.ceil((dayOfYear + 1) / 7);
    const weekKey = `${now.getFullYear()}-W${weekNum}`;
    
    // Знаходимо понеділок цього тижня
    const dayOfWeek = now.getDay();
    const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Рахуємо зірки за цей тиждень (без досягнень)
    const weekRecords = (state.data.records || []).filter(r => {
        const d = new Date(r.date);
        return d >= weekStart && d <= weekEnd && r.type === 'earn' && r.category !== 'achievement';
    });
    
    const weekStars = weekRecords.reduce((sum, r) => sum + r.stars, 0);
    
    // Перевіряємо кожне тижневе досягнення
    const newWeeklyUnlocks = [];
    Object.keys(ACHIEVEMENTS).forEach(achId => {
        const ach = ACHIEVEMENTS[achId];
        if (ach.type !== 'weekly') return;
        
        // Перевіряємо який рівень досягнуто
        const weeklyLevels = state.data.achievements.weekly[weekKey] || {};
        const currentWeekLevel = weeklyLevels[achId] || 0;
        
        // Визначаємо найвищий досягнутий рівень
        let achievedLevel = 0;
        for (let i = 0; i < ach.levels.length; i++) {
            if (weekStars >= ach.levels[i].target) {
                achievedLevel = i + 1;
            } else {
                break;
            }
        }
        
        // Якщо рівень підвищився — нараховуємо
        if (achievedLevel > currentWeekLevel) {
            for (let i = currentWeekLevel; i < achievedLevel; i++) {
                const level = ach.levels[i];
                newWeeklyUnlocks.push({ achId, ach, level, levelNum: i + 1 });
            }
            if (!state.data.achievements.weekly[weekKey]) {
                state.data.achievements.weekly[weekKey] = {};
            }
            state.data.achievements.weekly[weekKey][achId] = achievedLevel;
        
        // Якщо рівень знизився — забираємо нараховані зірки і видаляємо записи
        } else if (achievedLevel < currentWeekLevel) {
            // Видаляємо записи досягнення за рівні що були скасовані
            for (let i = achievedLevel; i < currentWeekLevel; i++) {
                const level = ach.levels[i];
                const tierName = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][ach.levels.indexOf(level)] ?? String(ach.levels.indexOf(level)+1);
                const fullName = `${(typeof ach.icon === 'object' ? g(state.activeChildId, ach.icon) : ach.icon)} ${achText(ach, state.activeChildId)} ${tierName}`;
                
                // Видаляємо запис з цього тижня і повертаємо зірки
                const before = state.data.records.length;
                state.data.records = state.data.records.filter(r => {
                    if (r.category !== 'achievement') return true;
                    const rDate = new Date(r.date);
                    if (rDate < weekStart || rDate > weekEnd) return true;
                    // Новий: по achId+achLevel; старий: по description
                    const matches = (r.achId === achId && r.achLevel === i) ||
                                    (!r.achId && r.description === fullName);
                    if (!matches) return true;
                    state.data.balance = Number(state.data.balance) - (r.stars || 0);
                    return false;
                });
            }
            
            // Оновлюємо рівень вниз
            if (!state.data.achievements.weekly[weekKey]) {
                state.data.achievements.weekly[weekKey] = {};
            }
            state.data.achievements.weekly[weekKey][achId] = achievedLevel;
        }
    });
    
    // Видаємо бонуси
    newWeeklyUnlocks.forEach(({ achId, ach, level, levelNum }) => {
        const tierName = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][ach.levels.indexOf(level)] ?? String(ach.levels.indexOf(level)+1);
        const fullName = `${(typeof ach.icon === 'object' ? g(state.activeChildId, ach.icon) : ach.icon)} ${achText(ach, state.activeChildId)} ${tierName}`;
        
        state.data.balance = Number(state.data.balance) + level.reward;
        const achLvlIdx = ach.levels.indexOf(level);
        state.data.records.push({
            id:          Date.now() + Math.random(),
            date:        nowKyiv(),
            description: fullName,
            achId:       achId,
            achLevel:    achLvlIdx,
            stars:       level.reward,
            type:        'earn',
            category:    'achievement'
        });

        setTimeout(() => {
            alert(`🎉 Тижневе досягнення!

${fullName}
${_levelDesc(level, state.activeChildId)}

+${level.reward}⭐ нараховано!`);
        }, 500);
    });
    
    return newWeeklyUnlocks.length > 0;
}

// Видаляємо бонуси за втрачені рівні досягнень
export function removeRewardsForLostAchievements(levelsBefore) {
    const levelsAfter = state.data.achievements.levels || {};
    
    // Перевіряємо кожне досягнення
    Object.keys(levelsBefore).forEach(achId => {
        const ach = ACHIEVEMENTS[achId];
        if (!ach) return;
        
        // Для streak, balance, repeatable та goal_counter НЕ забираємо бонуси при втраті рівня
        if (ach.type === 'streak') return;          // серія — зірки не забираємо при перериванні
        if (ach.type === 'balance') return;         // максимум незворотній — зірки не знімаємо
        if (ach.type === 'repeatable_streak') return;
        if (ach.type === 'goal_counter') return;   // мета — незворотня
        
        const levelBefore = levelsBefore[achId] || 0;
        const levelAfter = levelsAfter[achId] || 0;
        
        // Якщо рівень зменшився - видаляємо бонуси за втрачені рівні
        if (levelAfter < levelBefore) {
            for (let i = levelAfter; i < levelBefore; i++) {
                const level = ach.levels[i];
                if (!level) continue;
                
                const tierName = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][ach.levels.indexOf(level)] ?? String(ach.levels.indexOf(level)+1);
                const fullName = ach.levels.length > 1 ? `${(typeof ach.icon === 'object' ? g(state.activeChildId, ach.icon) : ach.icon)} ${achText(ach, state.activeChildId)} ${tierName}` : `${(typeof ach.icon === 'object' ? g(state.activeChildId, ach.icon) : ach.icon)} ${achText(ach, state.activeChildId)}`;
                
                // Знаходимо записи про цей рівень
                // Нові: по achId+achLevel; старі (до міграції): по description
                const recordsToRemove = state.data.records.filter(r =>
                    r.category === 'achievement' && (
                        (r.achId === achId && r.achLevel === i) ||
                        (!r.achId && r.description === fullName)
                    )
                );
                
                // Видаляємо
                recordsToRemove.forEach(record => {
                    const index = state.data.records.indexOf(record);
                    if (index > -1) {
                        state.data.records.splice(index, 1);
                        state.data.balance = Number(state.data.balance) - record.stars;
                    }
                });
            }
        }
    });
    
    // Оновлюємо показ
    renderAchievementsHome();
}

// Нараховуємо бонуси за нові рівні досягнень
export function giveRewardsForNewAchievements(levelsBefore) {
    const levelsAfter = state.data.achievements.levels || {};
    
    // Перевіряємо кожне досягнення
    Object.keys(ACHIEVEMENTS).forEach(achId => {
        const ach = ACHIEVEMENTS[achId];
        const levelBefore = levelsBefore[achId] || 0;
        const levelAfter = levelsAfter[achId] || 0;
        
        // goal_counter обробляється окремо в checkGoalReached()
        if (ach.type === 'goal_counter') return;
        // weekly обробляється окремо в checkWeeklyAchievements()
        if (ach.type === 'weekly') return;
        
        // Для repeatable - перевіряємо чи це повторне отримання
        const isRepeatable = ach.type === 'repeatable_streak';
        
        // Якщо рівень збільшився - даємо бонуси за нові рівні
        if (levelAfter > levelBefore) {
            for (let i = levelBefore; i < levelAfter; i++) {
                const level = ach.levels[i];
                if (!level) continue;
                
                const levelNum = i + 1;
                const tierName = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][ach.levels.indexOf(level)] ?? String(ach.levels.indexOf(level)+1);
                const fullName = ach.levels.length > 1 ? `${(typeof ach.icon === 'object' ? g(state.activeChildId, ach.icon) : ach.icon)} ${achText(ach, state.activeChildId)} ${tierName}` : `${(typeof ach.icon === 'object' ? g(state.activeChildId, ach.icon) : ach.icon)} ${achText(ach, state.activeChildId)}`;
                
                // Для repeatable - зберігаємо історію
                if (isRepeatable) {
                    if (!state.data.achievements.repeatableHistory[achId]) {
                        state.data.achievements.repeatableHistory[achId] = {};
                    }
                    const count = state.data.achievements.repeatableHistory[achId][levelNum] || 0;
                    state.data.achievements.repeatableHistory[achId][levelNum] = count + 1;
                    
                    // Додаємо позначку про повторне отримання
                    const repeatCount = state.data.achievements.repeatableHistory[achId][levelNum];
                    const repeatText = repeatCount > 1 ? ` (×${repeatCount})` : '';
                    
                    // Додаємо зірки
                    state.data.balance = Number(state.data.balance) + level.reward;
                    
                    // Створюємо запис
                    state.data.records.push({
                        id:          Date.now() + Math.random(),
                        date:        nowKyiv(),
                        description: fullName + repeatText,
                        achId:       achId,
                        achLevel:    i,
                        stars:       level.reward,
                        type:        'earn',
                        category:    'achievement'
                    });
                    
                    // Показуємо popup
                    setTimeout(() => {
                        alert(`🎉 ${repeatCount > 1 ? 'Знову отримано!' : 'Нове досягнення!'}

${fullName}${repeatText}
${_levelDesc(level, state.activeChildId)}

+${level.reward}⭐ нараховано!`);
                        if (window.generateNotifications) window.generateNotifications();
                    }, 300);
                } else {
                    // Звичайні досягнення — перевіряємо чи бонус вже є в records
                    // (захист від ситуації коли levels є але запис був видалений старим removeRewards)
                    const alreadyRewarded = state.data.records.some(r =>
                        r.category === 'achievement' && (
                            // Нові записи — по achId+achLevel
                            (r.achId === achId && r.achLevel === i) ||
                            // Старі записи (до міграції) — по description
                            (!r.achId && r.description === fullName)
                        )
                    );
                    if (alreadyRewarded) continue;

                    state.data.balance = Number(state.data.balance) + level.reward;
                    
                    state.data.records.push({
                        id:          Date.now() + Math.random(),
                        date:        nowKyiv(),
                        description: fullName,
                        achId:       achId,
                        achLevel:    i,
                        stars:       level.reward,
                        type:        'earn',
                        category:    'achievement'
                    });
                    
                    setTimeout(() => {
                        alert(`🎉 Нове досягнення!

${fullName}
${_levelDesc(level, state.activeChildId)}

+${level.reward}⭐ нараховано!`);
                            if (window.generateNotifications) window.generateNotifications();
                    }, 300);
                }
            }
        }
    });
    
    // Оновлюємо показ
    renderAchievementsHome();
}

// Рендеринг досягнень
export function renderAchievements() {
    initAchievements();
    
    const achievementsHTML = [];
    
    const childGender = state.parent?.children?.[state.activeChildId]?.gender || 'girl';

    Object.keys(ACHIEVEMENTS).forEach(achId => {
        const ach = ACHIEVEMENTS[achId];

        // Пропускаємо досягнення що не відповідають gender дитини
        if (ach.gender && ach.gender !== childGender) return;

        const currentLevel = state.data.achievements.levels[achId] || 0;
        
        // Отримуємо поточне значення
        let currentValue = 0;
        let bestValue = 0;
        
        if (ach.type === 'cumulative') {
            currentValue = state.data.achievements.counters[ach.counter] || 0;
            bestValue = currentValue;
        } else if (ach.type === 'streak' || ach.type === 'repeatable_streak') {
            const streak = state.data.achievements.streaks[ach.streak] || { current: 0, best: 0 };
            currentValue = streak.current;
            bestValue = streak.best;
        } else if (ach.type === 'balance') {
            currentValue = state.data.achievements.counters.maxBalance || 0;
            bestValue = currentValue;
        } else if (ach.type === 'weekly') {
            // Рахуємо за поточний тиждень
            const now = new Date();
            const dayOfWeek = now.getDay();
            const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - daysFromMonday);
            weekStart.setHours(0, 0, 0, 0);
            
            const weekRecords = (state.data.records || []).filter(r => {
                const d = new Date(r.date);
                return d >= weekStart && r.type === 'earn' && r.category !== 'achievement';
            });
            currentValue = weekRecords.reduce((sum, r) => sum + r.stars, 0);
            bestValue = currentValue;
        } else if (ach.type === 'goal_counter') {
            currentValue = state.data.achievements.counters.goalsReached || 0;
            bestValue = currentValue;
        }
        
        // Визначаємо наступний рівень для прогресу
        const nextLevelIndex = currentLevel; // індекс наступного рівня (0-based)
        const nextLevel = ach.levels[nextLevelIndex];
        
        // Для weekly перевіряємо чи досягнуто в ПОТОЧНОМУ тижні
        let allLevelsCompleted = currentLevel >= ach.levels.length;
        
        // Для weekly - перевіряємо цей тиждень окремо
        if (ach.type === 'weekly') {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
            const weekNum = Math.ceil((dayOfYear + 1) / 7);
            const weekKey = `${now.getFullYear()}-W${weekNum}`;
            const weeklyLevels = state.data.achievements.weekly?.[weekKey];
            const thisWeekLevel = weeklyLevels?.[achId] || 0;
            
            allLevelsCompleted = thisWeekLevel >= ach.levels.length;
        }
        
        // Рахуємо прогрес для наступного рівня
        let progressPercent = 0;
        let progressText = '';
        
        if (allLevelsCompleted && ach.type === 'weekly') {
            progressPercent = 100;
            progressText = '✅ Всі рівні отримані цього тижня';
        } else if (allLevelsCompleted) {
            progressPercent = 100;
            progressText = '✅ Всі рівні досягнуті';
        } else if (nextLevel) {
            const target = nextLevel.target;
            progressPercent = Math.min((currentValue / target) * 100, 100);
            
            if (ach.type === 'weekly') {
                // Перевіряємо чи отримували цього тижня
                const now = new Date();
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
                const weekNum = Math.ceil((dayOfYear + 1) / 7);
                const weekKey = `${now.getFullYear()}-W${weekNum}`;
                const thisWeekLevel = state.data.achievements.weekly?.[weekKey]?.[achId] || 0;
                
                // Перевіряємо чи рівень ЦЬОГО тижня >= наступного рівня
                // nextLevelIndex - це індекс наступного рівня (0-based)
                // якщо thisWeekLevel >= nextLevelIndex + 1 - значить вже отримали цей рівень
                if (thisWeekLevel >= nextLevelIndex + 1) {
                    progressText = '✅ Отримано цього тижня';
                } else {
                    progressText = `${currentValue}⭐ / ${target}⭐ цього тижня`;
                }
            } else if (ach.type === 'goal_counter') {
                const timesText = currentValue === 1 ? 'раз' : currentValue < 5 ? 'рази' : 'разів';
                progressText = currentValue > 0 
                    ? `✅ Досягнуто ${currentValue} ${timesText} / потрібно ${target}`
                    : `Досягни мету ${target} ${target === 1 ? 'раз' : 'рази'}`;
            } else {
                progressText = `${currentValue} / ${target}`;
            }
        }
        
        // Медаль поточного рівня
        const levelMedal = currentLevel === 0 ? '' : 
                          currentLevel === 1 ? '🥉' :
                          currentLevel === 2 ? '🥈' : '🥇';
        
        // Рамка картки
        const currentTier = currentLevel === 0 ? '' :
                           ach.levels[currentLevel - 1].tier;
        
        // Опис рівнів (короткий)
        const levelsDesc = ach.levels.map((l, i) => {
            const medal = i === 0 ? '🥉' : i === 1 ? '🥈' : '🥇';
            return `${medal} ${_levelDesc(l, state.activeChildId)} → +${l.reward}⭐`;
        }).join(' • ');
        
        // Best value текст
        let bestText = '';
        if (ach.type === 'cumulative') {
            bestText = `Всього: ${bestValue}`;
        } else if (ach.type === 'streak') {
            bestText = `Рекорд: ${bestValue} ${bestValue === 1 ? 'день' : bestValue < 5 ? 'дні' : 'днів'}`;
        } else if (ach.type === 'repeatable_streak') {
            // Для repeatable показуємо скільки разів отримано кожен рівень
            const history = state.data.achievements.repeatableHistory[achId] || {};
            const counts = Object.keys(history).map(level => {
                const count = history[level];
                const medal = level === '1' ? '🥉' : level === '2' ? '🥈' : '🥇';
                return count > 0 ? `${medal}×${count}` : '';
            }).filter(x => x).join(' ');
            bestText = counts || `Рекорд: ${bestValue} ${bestValue === 1 ? 'день' : bestValue < 5 ? 'дні' : 'днів'}`;
        } else if (ach.type === 'goal_counter') {
            const timesWord = bestValue === 1 ? 'раз' : bestValue < 5 ? 'рази' : 'разів';
            bestText = bestValue > 0 ? `Досягнуто мети: ${bestValue} ${timesWord}` : '';
        } else if (ach.type === 'balance') {
            bestText = `Максимум: ${bestValue}⭐`;
        } else if (ach.type === 'weekly') {
            bestText = `За тиждень: ${bestValue}⭐`;
        } else if (ach.type === 'goal_counter') {
            const cnt = state.data.achievements.counters.goalsReached || 0;
            const cntWord = cnt === 1 ? 'раз' : cnt < 5 ? 'рази' : 'разів';
            bestText = cnt > 0 ? `Досягнуто ${cnt} ${cntWord}` : 'Ще не досягнуто';
        }
        
        const cardHTML = `
            <div class="achievement-card ${currentTier}" data-ach-id="${achId}"
                style="position:relative"
                onclick="window.achCardClick && window.achCardClick('${achId}', event)">
                <span class="z-badge${hasUnreadAchievementNotif(achId) ? '' : ' z-badge--hidden'}" id="achCardBadge_${achId}"></span>
                <div class="achievement-header">
                    <div class="achievement-icon-large">${typeof ach.icon === 'object' ? g(state.activeChildId, ach.icon) : ach.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-name">${achText(ach, state.activeChildId)} ${levelMedal}</div>
                        <div class="achievement-best">${bestText}</div>
                    </div>
                </div>
                <div class="achievement-desc">${achText(ach, state.activeChildId, 'desc')}</div>
                <div class="achievement-progress-bar">
                    <div class="achievement-progress-fill" style="width: ${progressPercent}%">
                        ${progressPercent >= 20 ? `<span class="achievement-progress-text">${Math.round(progressPercent)}%</span>` : ''}
                    </div>
                </div>
                <div class="achievement-status">${progressText}</div>
                <div class="achievement-levels-info">${levelsDesc}</div>
            </div>
        `;
        
        achievementsHTML.push(cardHTML);
    });
    
    document.getElementById('achievementsInProgress').innerHTML = achievementsHTML.join('');
    document.getElementById('achievementsUnlocked').innerHTML = ''; // Не використовується більше
}



// ═══════════════ РЕЖИМ КАНІКУЛ ═══════════════





export function renderAchievementsHome() {
    const container = document.getElementById('achievementsHome');
    if (!container) return;
    
    initAchievements();
    
    // Fire Streak
    const streak = state.data.achievements.streaks?.earning || { current: 0, best: 0 };
    const showStreak = streak.current >= 2;
    
    // Останні отримані досягнення (максимум 5)
    const levels = state.data.achievements.levels || {};
    const achievedAchievements = Object.keys(levels).filter(id => levels[id] > 0);
    
    // Сортуємо по рівню (вищі рівні спочатку)
    achievedAchievements.sort((a, b) => (levels[b] || 0) - (levels[a] || 0));
    const lastUnlocked = achievedAchievements.slice(0, 5);
    
    if (!showStreak && lastUnlocked.length === 0) {
        container.innerHTML = ''; // Нічого не показуємо
        return;
    }
    
    let html = '<div class="achievements-home">';
    
    // Fire Streak
    if (showStreak) {
        const daysWord = streak.current === 1 ? 'день' : streak.current < 5 ? 'дні' : 'днів';
        
        // Перевіряємо чи є активні періоди канікул
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const periods = state.data.achievements.freezePeriods || [];
        const activePeriod = periods.find(p => {
            const until = new Date(p.until);
            until.setHours(23, 59, 59, 999);
            return until >= today;
        });
        
        let freezeText = '';
        if (activePeriod) {
            const fromStr = new Date(activePeriod.from).toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit'});
            const untilStr = new Date(activePeriod.until).toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit'});
            freezeText = ` (❄️ ${fromStr}-${untilStr})`;
        }
        
        html += `
            <div class="streak-display streak-display--clickable" onclick="showStreakModal()">
                <span class="streak-fire">🔥</span>
                <span>Серія: ${streak.current} ${daysWord}${freezeText}</span>
            </div>
        `;
    }
    
    // Бейджі досягнень
    if (lastUnlocked.length > 0) {
        html += '<div class="badges-home">';
        lastUnlocked.forEach(achId => {
            const ach = ACHIEVEMENTS[achId];
            if (ach) {
                // Використовуємо іконку досягнення
                const currentLevel = state.data.achievements.levels[achId] || 0;
                const tier = currentLevel === 0 ? '' : ach.levels[currentLevel - 1].tier;
                html += `<div class="badge-home ${tier}" data-ach-id="${achId}">${typeof ach.icon === 'object' ? g(state.activeChildId, ach.icon) : ach.icon}</div>`;
            }
        });
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
    
// Додаємо event listeners для бейджів (для мобільних)
    setTimeout(() => {
        document.querySelectorAll('.badge-home').forEach(badge => {
            badge.addEventListener('click', function(e) {
                const achId = this.getAttribute('data-ach-id');
                const ach = ACHIEVEMENTS[achId];
                if (!ach) return;
                
                // Видаляємо старий tooltip якщо є
                const oldTooltip = document.querySelector('.achievement-tooltip');
                if (oldTooltip) oldTooltip.remove();
                
                // Створюємо tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'achievement-tooltip';
                tooltip.innerHTML = `${achText(ach, state.activeChildId)}<br><small style="font-size: 11px; opacity: 0.9;">${achText(ach, state.activeChildId, 'desc')}</small>`;
                // Ставимо горизонтальну позицію ДО appendChild — без мерехтіння
                const rect = this.getBoundingClientRect();
                tooltip.style.left      = (rect.left + rect.width / 2) + 'px';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.top       = '-9999px';
                document.body.appendChild(tooltip);
                // Після вставки знаємо висоту — позиціонуємо і плавно показуємо
                tooltip.style.top = Math.max(8, rect.top - tooltip.offsetHeight - 10) + 'px';
                requestAnimationFrame(() => { tooltip.style.opacity = '1'; });
                
                // Автоматично прибираємо через 3 секунди
                setTimeout(() => tooltip.remove(), 3000);
                
                // Або по кліку поза tooltip
                setTimeout(() => {
                    document.addEventListener('click', function removeTooltip(e) {
                        if (!tooltip.contains(e.target) && e.target !== badge) {
                            tooltip.remove();
                            document.removeEventListener('click', removeTooltip);
                        }
                    });
                }, 100);
            });
        });
    }, 100);
}

// Перевіряє чи будь-який день між двома датами (не включно) потрапляє в freeze-період.
// Використовується для визначення режиму канікул при розриві в streak.
function _isDateInFreeze(fromDate, toDate) {
    const freezePeriods = state.data.achievements.freezePeriods || [];
    if (!freezePeriods.length) return false;
    // Перевіряємо чи хоча б один день між записами (не включно з крайніми) в freeze
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(0, 0, 0, 0);
    for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
        const check = new Date(d);
        for (const period of freezePeriods) {
            const freezeFrom  = new Date(period.from);  freezeFrom.setHours(0, 0, 0, 0);
            const freezeUntil = new Date(period.until); freezeUntil.setHours(23, 59, 59, 999);
            if (check >= freezeFrom && check <= freezeUntil) return true;
        }
    }
    return false;
}

export function shouldSkipDayForStreak(date, streakType) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const dayOfWeek = checkDate.getDay();
    
    // Для серій з оцінок (earning, grade-based)
    if (streakType === 'grade') {
        // Суботи/неділі завжди пропускаємо
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return true;
        }
        
        // Перевіряємо всі періоди канікул
        const freezePeriods = state.data.achievements.freezePeriods || [];
        for (const period of freezePeriods) {
            const freezeFrom = new Date(period.from);
            freezeFrom.setHours(0, 0, 0, 0);
            const freezeUntil = new Date(period.until);
            freezeUntil.setHours(23, 59, 59, 999);
            
            // Пропускаємо тільки якщо день В МЕЖАХ цього періоду канікул
            if (checkDate >= freezeFrom && checkDate <= freezeUntil) {
                return true;  // День в канікулах - пропускаємо
            }
        }
    }
    
    // Для інших серій (teeth, hair) - канікули не діють
    return false;
}

// ════════════════════════════════════════════════════
// 🔥  Модалка серії
// ════════════════════════════════════════════════════
export function showStreakModal() {
    const modal = document.getElementById('streakModal');
    if (!modal) return;
    const body = document.getElementById('streakModalBody');
    if (body) body.innerHTML = getStreakModalContent(state.activeChildId);
    if (window.updateUI) window.updateUI();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeStreakModal() {
    const modal = document.getElementById('streakModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}
