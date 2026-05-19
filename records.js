// ════════════════════════════════════════════════════
// RECORDS  records.js — Records
//
//   commitRecord(recordData) — спільна функція додавання запису.
//   Робить весь стандартний цикл: push → balance → goal →
//   achievements → save → UI. Викликається з усіх місць
//   що додають запис: addGradeRecord/Bonus/Special/Diagnostic
//   та з tasks.js при підтвердженні запиту/завдання.
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260519.1029';

import { state } from './state.js';
import { isDoubleSubject } from './subjects.js';
import { gradeToStars } from './config.js';
import { recalculateAchievements, checkWeeklyAchievements, checkGoalReached, giveRewardsForNewAchievements, removeRewardsForLostAchievements } from './achievements.js';
import { saveRecords } from './firebase.js';
import { updateUI } from './ui.js';

// ════════════════════════════════════════════════════════════
// 💾  СПІЛЬНА ФУНКЦІЯ — commitRecord
//
//     Уніфікований шлях додавання запису у state.
//     Будь-який запис (оцінка, бонус, особливе, task-підтвердження)
//     проходить через ОДИН і той самий пайплайн.
//
//     recordData має містити мінімум: id, date, stars, type, category
//     Поведінка для type:
//       'earn'  → balance += stars
//       'spend' → balance -= stars
//
//     Повертає створений запис.
// ════════════════════════════════════════════════════════════
export function commitRecord(recordData) {
    if (!recordData || typeof recordData !== 'object') {
        console.error('⚠️ commitRecord: некоректний recordData', recordData);
        return null;
    }
    if (!recordData.id)   recordData.id   = Date.now();
    if (!recordData.type) recordData.type = 'earn';

    // 1. Прибираємо undefined-поля (Firebase не приймає undefined)
    for (const key in recordData) {
        if (recordData[key] === undefined) delete recordData[key];
    }

    // 2. Додаємо запис
    state.data.records.push(recordData);

    // 3. Оновлюємо баланс
    const stars = Number(recordData.stars) || 0;
    if (recordData.type === 'earn') {
        state.data.balance = Number(state.data.balance) + stars;
    } else if (recordData.type === 'spend') {
        state.data.balance = Number(state.data.balance) - stars;
    }

    // 4. Перевіряємо мету ДО recalculate — щоб goalsReached був оновлений
    checkGoalReached(recordData.date);

    // 5. Запам'ятовуємо рівні ДО перерахунку
    const levelsBefore = { ...(state.data.achievements.levels || {}) };

    // 6. Перераховуємо ВСЕ — тепер goal_counter має правильний лічильник
    recalculateAchievements();

    // 7. Даємо бонуси тільки за НОВІ досягнення
    giveRewardsForNewAchievements(levelsBefore);

    // 8. Перевіряємо тижневі досягнення
    checkWeeklyAchievements();

    // 9. Зберігаємо в Firebase
    saveRecords();

    // 10. Оновлюємо UI
    updateUI();

    return recordData;
}

// ════════════════════════════════════════════════════════════
// ➕  БЛОК: Нарахування (оцінки, бонуси, діагностика)
// ════════════════════════════════════════════════════════════
export function addGradeRecord() {
    const date = document.getElementById('gradeDate').value;
    const subject = document.getElementById('subject').value;
    const grade = document.getElementById('grade').value;

    if (!date || !subject || !grade) { alert('❌ Заповніть всі поля!'); return; }

    let stars = gradeToStars[grade];
    if (isDoubleSubject(subject)) stars *= 2;

    commitRecord({
        id: Date.now(),
        date: date + 'T12:00:00',
        subject, grade, stars,
        type: 'earn',
        category: 'grade'
    });

    document.getElementById('subject').value = '';
    document.getElementById('grade').value = '';
    alert(`✅ Додано ${stars}⭐!`);
}

export function addDiagnosticWork() {
    const date = document.getElementById('diagnosticDate').value;
    const subject = document.getElementById('diagnosticSubject').value;
    const grade = document.getElementById('diagnosticGrade').value;

    if (!date || !subject || !grade) {
        alert('❌ Заповніть всі поля!');
        return;
    }

    let stars = gradeToStars[grade];

    // Діагностувальна робота: ×3 для всіх, ×6 для математики
    if (isDoubleSubject(subject)) {
        stars *= 6;  // ×2 (подвійний предмет) × ×3 (діагностувальна) = ×6
    } else {
        stars *= 3;  // ×3 для всіх інших предметів
    }

    commitRecord({
        id: Date.now(),
        date: date + 'T12:00:00',
        subject: `Діагностувальна робота з ${subject}`,
        grade,
        stars,
        type: 'earn',
        category: 'diagnostic'
    });

    document.getElementById('diagnosticSubject').value = '';
    document.getElementById('diagnosticGrade').value = '';

    const multiplier = isDoubleSubject(subject) ? '×6' : '×3';
    alert(`✅ Додано діагностувальну роботу!\n\n${subject}: ${grade} балів\nБонус: ${multiplier}\nОтримано: ${stars}⭐`);
}

export function addBonusRecord() {
    const date = document.getElementById('bonusDate').value;
    const bonusType = document.getElementById('bonusType').value;

    if (!date || !bonusType) { alert('❌ Заповніть всі поля!'); return; }

    const [name, starsRaw, subcategory = '', counterKey = ''] = bonusType.split('|');
    const stars = parseInt(starsRaw);

    // Сторінки — обов'язкове поле для книги
    const pagesInput = document.getElementById('bookPages');
    if (counterKey === 'books') {
        const pagesVal = pagesInput ? parseInt(pagesInput.value) : NaN;
        if (!pagesVal || pagesVal < 1) {
            alert('📄 Вкажіть кількість сторінок у книзі!');
            if (pagesInput) pagesInput.focus();
            return;
        }
    }
    const pages = (counterKey === 'books' && pagesInput && pagesInput.value)
        ? parseInt(pagesInput.value)
        : undefined;

    commitRecord({
        id: Date.now(),
        date: date + 'T12:00:00',
        description: name,
        stars,
        type: 'earn',
        category: 'bonus',
        subcategory: subcategory || undefined,
        counterKey:  counterKey  || undefined,
        pages,
    });

    document.getElementById('bonusType').value = '';
    alert(`✅ Додано ${stars}⭐!`);
}

export function addSpecialRecord() {
    const date = document.getElementById('specialDate').value;
    const desc = document.getElementById('specialDesc').value;
    const stars = parseInt(document.getElementById('specialStars').value);

    if (!date || !desc.trim() || !stars || stars < 1) { alert('❌ Заповніть всі поля!'); return; }

    commitRecord({
        id: Date.now(),
        date: date + 'T12:00:00',
        description: desc, stars,
        type: 'earn',
        category: 'special'
    });

    document.getElementById('specialDesc').value = '';
    document.getElementById('specialStars').value = '';
    alert(`✅ Додано ${stars}⭐!`);
}

export function deleteRecord(id) {
    if (!confirm('Видалити цей запис?')) return;
    const record = state.data.records.find(r => r.id === id);
    if (!record) return;

    if (record.type === 'earn') state.data.balance = Number(state.data.balance) - record.stars;
    else state.data.balance = Number(state.data.balance) + record.stars;

    // Запам'ятовуємо які досягнення були ДО видалення
    const levelsBefore = {...(state.data.achievements.levels || {})};

    state.data.records = state.data.records.filter(r => r.id !== id);
    recalculateAchievements();  // Перераховуємо після видалення

    // Якщо видалили витрату — баланс виріс, перевіряємо Ощадливу
    if (record.type === 'spend') {
        giveRewardsForNewAchievements(levelsBefore);
    }

    // Видаляємо бонуси за втрачені досягнення (якщо видалили нарахування)
    removeRewardsForLostAchievements(levelsBefore);

    // Перераховуємо weekly (може знизитись рівень після видалення)
    checkWeeklyAchievements();

    // Якщо баланс впав нижче цілі — скидаємо goal.reached
    // щоб при наступному досягненні мети знову зарахувалось
    if (state.data.goal && state.data.goal.reached) {
        const balance = Number(state.data.balance) || 0;
        const target = Number(state.data.goal.target);
        if (balance < target) {
            state.data.goal.reached = false;
        }
    }

    saveRecords();
    updateUI();
}

// Відображення

// Мапа емоджі для предметів
