// ════════════════════════════════════════════════════
// 📚  subjects.js — Єдине джерело правди для предметів
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260514.1530';

import { state } from './state.js';
import { saveSubjects } from './firebase.js';


// ── Дефолтний список (якщо Firebase порожній) ────────
const DEFAULT_SUBJECTS = [
    { name: 'Математика',      emoji: '📐', isDouble: true  },
    { name: 'Українська мова', emoji: '🇺🇦', isDouble: false },
    { name: 'Я пізнаю світ',   emoji: '🌍', isDouble: false },
    { name: 'Читання',         emoji: '📖', isDouble: false },
    { name: 'Англійська мова', emoji: '🇬🇧', isDouble: false },
    { name: 'Інформатика',     emoji: '💻', isDouble: false },
    { name: 'Мистецтво',       emoji: '🎨', isDouble: false },
    { name: 'Вірш',            emoji: '📝', isDouble: false },
    { name: 'Фізкультура',     emoji: '⚽', isDouble: false },
];

const DEFAULT_CLUBS = [
    // Додайте ваші гуртки тут або через інтерфейс налаштувань
];

// ── Геттери ─────────────────────────────────────────
export function getSubjects() {
    if (!state.data.subjects || state.data.subjects.length === 0) {
        state.data.subjects = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS));
    }
    return state.data.subjects;
}

export function getClubs() {
    if (!state.data.clubs) state.data.clubs = DEFAULT_CLUBS.map(c => ({...c}));
    // Міграція: якщо clubs — масив рядків (стара версія) → конвертуємо
    if (state.data.clubs.length > 0 && typeof state.data.clubs[0] === 'string') {
        state.data.clubs = state.data.clubs.map(c => ({ name: c, emoji: '🎭' }));
    }
    return state.data.clubs;
}

// ── Емодзі по назві предмету ─────────────────────────
export function getSubjectEmoji(subjectName) {
    if (!subjectName) return '';
    const subjects = getSubjects();
    const foundSubj = subjects.find(s => subjectName.includes(s.name));
    if (foundSubj) return `${foundSubj.emoji} ${subjectName}`;
    const clubs = getClubs();
    const foundClub = clubs.find(c => {
        const name = typeof c === 'string' ? c : c.name;
        return name && subjectName.includes(name);
    });
    if (foundClub) {
        const emoji = typeof foundClub === 'string' ? '🎭' : (foundClub.emoji || '🎭');
        return `${emoji} ${subjectName}`;
    }
    return subjectName;
}

// ── Перевірка чи предмет має подвійний бонус ─────────
export function isDoubleSubject(subjectName) {
    const subjects = getSubjects();
    return subjects.some(s => s.isDouble && subjectName === s.name);
}

// ── Побудова всіх select-ів предметів ────────────────
export function buildSubjectSelects() {
    const subjects = getSubjects();

    // 1. Форма оцінки (Додати+)
    _fillSelect('subject', subjects, true, false);

    // 2. Форма діагностувальної (Додати+)
    _fillSelect('diagnosticSubject', subjects, true, false);

    // 3. Фільтр в Історії
    _fillSelect('filterSubject', subjects, false, true);

    // 4. Редактор розкладу — оновлюємо якщо відкритий
    _refreshScheduleSelects(subjects);
}

function _fillSelect(id, subjects, withEmpty, withAll) {
    const el = document.getElementById(id);
    if (!el) return;

    // Зберігаємо поточне значення
    const current = el.value;

    let html = '';
    if (withEmpty) html += '<option value="">Оберіть предмет</option>';
    if (withAll)   html += '<option value="all">📚 Всі предмети</option>';

    subjects.forEach(s => {
        const label = withAll
            ? `${s.emoji} ${s.name}`
            : `${s.emoji} ${s.name}${s.isDouble ? ' (×2 зірки)' : ''}`;
        html += `<option value="${s.name}">${label}</option>`;
    });

    el.innerHTML = html;

    // Відновлюємо вибране якщо воно ще є в списку
    if (current && [...el.options].some(o => o.value === current)) {
        el.value = current;
    }
}

function _refreshScheduleSelects(subjects) {
    // Оновлюємо інпути в редакторі розкладу якщо вони є
    document.querySelectorAll('.sched-lesson-select').forEach(sel => {
        const current = sel.value;
        let html = '<option value="">— предмет —</option>';
        subjects.forEach(s => {
            html += `<option value="${s.name}">${s.emoji} ${s.name}</option>`;
        });
        sel.innerHTML = html;
        if (current) sel.value = current;
    });
}

// ════════════════════════════════════════════════════
// ✏️  РЕДАГУВАННЯ ПРЕДМЕТІВ (модалка, тільки батьки)
// ════════════════════════════════════════════════════

export function openSubjectsEditor() {
    const modal = document.getElementById('subjectsEditorModal');
    if (!modal) return;
    _renderSubjectsEditor();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeSubjectsEditor() {
    const modal = document.getElementById('subjectsEditorModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

function _renderSubjectsEditor() {
    const subjects = getSubjects();
    const clubs    = getClubs();

    // ── Предмети ──
    const subjContainer = document.getElementById('subjectsEditorList');
    if (subjContainer) {
        let html = '';
        subjects.forEach((s, i) => {
            html += `
            <div class="sched-editor-row subj-row" data-idx="${i}">
                <input class="sched-input sched-emoji-input" type="text" maxlength="4"
                    value="${s.emoji}" placeholder="📐"
                    onchange="subjUpdateField(${i},'emoji',this.value)">
                <input class="sched-input" type="text"
                    value="${s.name}" placeholder="Назва предмету"
                    onchange="subjUpdateField(${i},'name',this.value)">
                <label class="subj-double-label" title="Подвійні зірки">
                    <input type="checkbox" ${s.isDouble ? 'checked' : ''}
                        onchange="subjUpdateField(${i},'isDouble',this.checked)">×2
                </label>
                <button class="sched-del-btn" onclick="subjDelete(${i},'subject')">✕</button>
            </div>`;
        });
        subjContainer.innerHTML = html;
    }

    // ── Гуртки ──
    const clubContainer = document.getElementById('clubsEditorList');
    if (clubContainer) {
        let html = '';
        clubs.forEach((c, i) => {
            const name  = typeof c === 'string' ? c : (c.name  || '');
            const emoji = typeof c === 'string' ? '🎭' : (c.emoji || '🎭');
            html += `
            <div class="sched-editor-row" data-idx="${i}">
                <input class="sched-input sched-emoji-input" type="text" maxlength="4"
                    value="${emoji}" placeholder="🎭">
                <input class="sched-input" type="text"
                    value="${name}" placeholder="Назва гуртка">
                <button class="sched-del-btn" onclick="subjDelete(${i},'club')">✕</button>
            </div>`;
        });
        clubContainer.innerHTML = html;
    }
}

export function subjUpdateField(idx, field, value) {
    const subjects = getSubjects();
    if (!subjects[idx]) return;
    subjects[idx][field] = value;
}

export function subjUpdateClub(idx, field, value) {
    const clubs = getClubs();
    if (!clubs[idx]) return;
    clubs[idx][field] = value;
}

export function subjAddNew(type) {
    if (type === 'subject') {
        getSubjects().push({ name: '', emoji: '📝', isDouble: false });
    } else {
        getClubs().push({ name: '', emoji: '🎭' });
    }
    _renderSubjectsEditor();
}

export function subjDelete(idx, type) {
    if (type === 'subject') {
        getSubjects().splice(idx, 1);
    } else {
        getClubs().splice(idx, 1);
    }
    _renderSubjectsEditor();
}

export function saveSubjectsEditor() {
    // Зчитуємо всі поточні значення з DOM перед збереженням
    const subjects = getSubjects();
    document.querySelectorAll('#subjectsEditorList .subj-row').forEach(row => {
        const idx = Number(row.dataset.idx);
        if (!subjects[idx]) return;
        const inputs = row.querySelectorAll('input[type="text"]');
        if (inputs[0]) subjects[idx].emoji = inputs[0].value.trim();
        if (inputs[1]) subjects[idx].name  = inputs[1].value.trim();
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb) subjects[idx].isDouble = cb.checked;
    });

    const clubs = getClubs();
    document.querySelectorAll('#clubsEditorList .sched-editor-row').forEach(row => {
        const idx = Number(row.dataset.idx);
        if (!clubs[idx]) return;
        const inputs = row.querySelectorAll('input[type="text"]');
        // Перший input — emoji (sched-emoji-input), другий — назва
        if (inputs[0]) clubs[idx].emoji = inputs[0].value.trim() || '🎭';
        if (inputs[1]) clubs[idx].name  = inputs[1].value.trim();
    });

    // Фільтруємо порожні, гарантуємо об'єктний формат
    state.data.subjects = subjects.filter(s => s.name.trim() !== '');
    state.data.clubs    = clubs
        .map(c => typeof c === 'string' ? { name: c, emoji: '🎭' } : c)
        .filter(c => c.name.trim() !== '');

    saveSubjects();
    buildSubjectSelects();
    closeSubjectsEditor();
}
