// ════════════════════════════════════════════════════
// RECORDS  records.js — Records
//     Зірки Успіху | v3.20260426.1650
// ════════════════════════════════════════════════════

import { state } from './state.js';
import { ACHIEVEMENTS, gradeToStars } from './config.js';
import { recalculateAchievements, checkWeeklyAchievements, giveRewardsForNewAchievements, removeRewardsForLostAchievements } from './achievements.js';
import { saveData } from './firebase.js';

// ════════════════════════════════════════════════════════════
// ➕  БЛОК: Нарахування (оцінки, бонуси, діагностика)
// ════════════════════════════════════════════════════════════
export function addGradeRecord() {
    const date = document.getElementById('gradeDate').value;
    const subject = document.getElementById('subject').value;
    const grade = document.getElementById('grade').value;

    if (!date || !subject || !grade) { alert('❌ Заповніть всі поля!'); return; }

    let stars = gradeToStars[grade];
    if (subject === 'Математика') stars *= 2;

    state.data.records.push({
        id: Date.now(),
        date: date + 'T12:00:00',
        subject, grade, stars,
        type: 'earn',
        category: 'grade'
    });
    state.data.balance = Number(state.data.balance) + stars;
    
    const newRecord = state.data.records[state.data.records.length - 1];
    
    // Запам'ятовуємо які досягнення були ДО додавання
    const levelsBefore = {...(state.data.achievements.levels || {})};
    
    // Перераховуємо ВСЕ (бо могли додати заднім числом)
    recalculateAchievements();
    
    // Даємо бонуси тільки за НОВІ досягнення
    giveRewardsForNewAchievements(levelsBefore);
    
    // Перевіряємо тижневі досягнення
    if (checkWeeklyAchievements()) {
        saveData(); // Зберігаємо якщо були зміни
    }
    
    saveData();

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

    // gradeToStars береться з config.js
    
    let stars = gradeToStars[grade];
    
    // Діагностувальна робота: ×3 для всіх, ×6 для математики
    if (subject === 'Математика') {
        stars *= 6;  // ×2 (математика) × ×3 (діагностувальна) = ×6
    } else {
        stars *= 3;  // ×3 для всіх інших предметів
    }

    state.data.records.push({
        id: Date.now(),
        date: date + 'T12:00:00',
        subject: `Діагностувальна робота з ${subject}`,
        grade,
        stars,
        type: 'earn',
        category: 'diagnostic'
    });
    
    state.data.balance = Number(state.data.balance) + stars;
    
    // Запам'ятовуємо які досягнення були ДО додавання
    const levelsBefore = {...(state.data.achievements.levels || {})};
    
    // Перераховуємо ВСЕ (бо могли додати заднім числом)
    recalculateAchievements();
    
    // Даємо бонуси тільки за НОВІ досягнення
    giveRewardsForNewAchievements(levelsBefore);
    
    // Перевіряємо тижневі досягнення
    if (checkWeeklyAchievements()) {
        saveData();
    }
    
    saveData();

    document.getElementById('diagnosticSubject').value = '';
    document.getElementById('diagnosticGrade').value = '';
    
    const multiplier = subject === 'Математика' ? '×6' : '×3';
    alert(`✅ Додано діагностувальну роботу!\n\n${subject}: ${grade} балів\nБонус: ${multiplier}\nОтримано: ${stars}⭐`);
}

export function addBonusRecord() {
    const date = document.getElementById('bonusDate').value;
    const bonusType = document.getElementById('bonusType').value;

    if (!date || !bonusType) { alert('❌ Заповніть всі поля!'); return; }

    const [name, stars] = bonusType.split('|');
    state.data.records.push({
        id: Date.now(),
        date: date + 'T12:00:00',
        description: name,
        stars: parseInt(stars),
        type: 'earn',
        category: 'bonus'
    });
    state.data.balance = Number(state.data.balance) + parseInt(stars);
    
    const newRecord = state.data.records[state.data.records.length - 1];
    
    // Запам'ятовуємо які досягнення були ДО додавання
    const levelsBefore = {...(state.data.achievements.levels || {})};
    
    // Перераховуємо ВСЕ (бо могли додати заднім числом)
    recalculateAchievements();
    
    // Даємо бонуси тільки за НОВІ досягнення
    giveRewardsForNewAchievements(levelsBefore);
    
    // Перевіряємо тижневі досягнення
    if (checkWeeklyAchievements()) {
        saveData(); // Зберігаємо якщо були зміни
    }
    
    saveData();

    document.getElementById('bonusType').value = '';
    alert(`✅ Додано ${stars}⭐!`);
}

export function addSpecialRecord() {
    const date = document.getElementById('specialDate').value;
    const desc = document.getElementById('specialDesc').value;
    const stars = parseInt(document.getElementById('specialStars').value);

    if (!date || !desc || !stars || stars < 1) { alert('❌ Заповніть всі поля!'); return; }

    state.data.records.push({
        id: Date.now(),
        date: date + 'T12:00:00',
        description: desc, stars,
        type: 'earn',
        category: 'special'
    });
    state.data.balance = Number(state.data.balance) + stars;
    
    const newRecord = state.data.records[state.data.records.length - 1];
    
    // Запам'ятовуємо які досягнення були ДО додавання
    const levelsBefore = {...(state.data.achievements.levels || {})};
    
    // Перераховуємо ВСЕ (бо могли додати заднім числом)
    recalculateAchievements();
    
    // Даємо бонуси тільки за НОВІ досягнення
    giveRewardsForNewAchievements(levelsBefore);
    
    // Перевіряємо тижневі досягнення
    if (checkWeeklyAchievements()) {
        saveData(); // Зберігаємо якщо були зміни
    }
    
    saveData();

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
    
    // Видаляємо бонуси за втрачені досягнення
    removeRewardsForLostAchievements(levelsBefore);
    
    // Перераховуємо weekly (може знизитись рівень після видалення)
    checkWeeklyAchievements();
    
    saveData();
}

// Відображення

// Мапа емоджі для предметів
