// ════════════════════════════════════════════════════
// 📋  schedule.js — Розклад уроків
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260510.2135';

import { state } from './state.js';
import { saveData } from './firebase.js';
import { getSubjects, getClubs } from './subjects.js';

// ── Константи ────────────────────────────────────────
const DAY_NAMES   = ['', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця"];
const DAY_SHORT   = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
const MONTH_NAMES = ['січня','лютого','березня','квітня','травня','червня',
                     'липня','серпня','вересня','жовтня','листопада','грудня'];

// Поточний день навігації (1=Пн..5=Пт), тиждень
let _viewDow  = null; // null = ще не ініціалізовано
let _viewWeek = null; // null = поточний тиждень

// ── Утиліти ─────────────────────────────────────────

// Отримуємо розклад (ініціалізуємо якщо немає)
function _sched() {
    if (!state.data.schedule) state.data.schedule = {};
    const s = state.data.schedule;
    // Гарантуємо всі поля навіть якщо schedule прийшов з Firebase частково
    if (!s.days) s.days = { 1:{},2:{},3:{},4:{},5:{},11:{},12:{},13:{},14:{},15:{} };
    if (!s.bells) s.bells = [];
    if (!s.teachers) s.teachers = {};
    if (s.twoWeeks === undefined) s.twoWeeks = false;
    return s;
}

// Ключ дня: для однотижневого - 1..5, для двотижневого - 11..15 (тиждень А) / 21..25 (тиждень Б)
// Але зберігаємо спрощено: для 1 тижня - ключі 1..5
// Для 2 тижні: ключі 1..5 = тиждень А, 11..15 = тиждень Б
function _dayKey(dow, weekNum) {
    const s = _sched();
    if (!s.twoWeeks) return dow;
    return weekNum === 2 ? dow + 10 : dow;
}

// Визначаємо номер тижня навчального року (1 або 2, для двотижневого)
function _schoolWeekNum(date) {
    // Відраховуємо від початку навчального року (перший понеділок вересня)
    const d = new Date(date);
    const year = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
    let septFirst = new Date(year, 8, 1);
    // Знаходимо перший понеділок вересня
    while (septFirst.getDay() !== 1) septFirst.setDate(septFirst.getDate() + 1);
    const diff = Math.floor((d - septFirst) / (7 * 24 * 3600 * 1000));
    return (diff % 2) + 1; // 1 або 2
}

// Поточний день тижня (1=Пн..5=Пт), пропускаємо вихідні
function _todayDow() {
    const dow = new Date().getDay(); // 0=Нд,1=Пн..6=Сб
    if (dow === 0 || dow === 6) return 1; // у вихідний → Пн
    return dow;
}

function _todayWeekNum() { return _schoolWeekNum(new Date()); }

// Форматуємо дату для заголовку
function _formatDate(dow, weekOffset) {
    const today = new Date();
    const todayDow = today.getDay() === 0 ? 7 : today.getDay();
    const diff = (dow - todayDow) + weekOffset * 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

// ── Ініціалізація ────────────────────────────────────
export function initSchedule() {
    _sched(); // Гарантуємо структуру
    if (_viewDow === null) {
        _viewDow  = _todayDow();
        _viewWeek = 0; // 0 = поточний тиждень
    }
    renderSchedule();
}

// ── Навігація по днях ────────────────────────────────
export function scheduleNavDay(dir) {
    _viewDow += dir;
    if (_viewDow > 5) { _viewDow = 1; _viewWeek++; }
    if (_viewDow < 1) { _viewDow = 5; _viewWeek--; }
    renderSchedule();
}

// ── Рендер основного розкладу ────────────────────────
export function renderSchedule() {
    // Якщо initSchedule ще не викликався — ініціалізуємо
    if (_viewDow === null) { _viewDow = _todayDow(); _viewWeek = 0; }
    const s = _sched();
    const dow  = _viewDow;
    const weekNum = _schoolWeekNum(
        (() => { const d = new Date(); d.setDate(d.getDate() + (_viewWeek || 0) * 7); return d; })()
    );
    const dayKey = _dayKey(dow, weekNum);
    const dayData = s.days[dayKey] || {};
    const lessons = dayData.lessons || [];
    const date = _formatDate(dow, _viewWeek);

    // Заголовок
    const titleEl = document.getElementById('scheduleDayTitle');
    if (titleEl) {
        let title = `${DAY_NAMES[dow]}, ${date}`;
        if (s.twoWeeks) title += ` · Тиждень ${weekNum === 1 ? 'А' : 'Б'}`;
        titleEl.textContent = title;
    }

    // Кнопки стрілок
    const prevBtn = document.getElementById('schedulePrevBtn');
    const nextBtn = document.getElementById('scheduleNextBtn');
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;

    // Таблиця уроків
    const tbody = document.getElementById('scheduleTbody');
    if (!tbody) return;

    if (lessons.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="schedule-empty">Розклад не заповнено</td></tr>`;
        return;
    }

    let html = '';
    let clubSeparatorAdded = false;

    lessons.forEach((lesson, idx) => {
        if (lesson.isClub && !clubSeparatorAdded) {
            clubSeparatorAdded = true;
            html += `<tr class="schedule-separator"><td colspan="2">🎭 Гуртки</td></tr>`;
        }

        const lessonNum = lesson.isClub ? '🎭' : (idx + 1);
        const teacherHint = !lesson.isClub && s.teachers[lesson.name]
            ? `data-teacher="${s.teachers[lesson.name]}"` : '';

        let nameCell = `<span class="schedule-lesson-name ${teacherHint ? 'has-teacher' : ''}" ${teacherHint} onclick="scheduleShowTeacher(this)">${lesson.name}</span>`;

        let timeCell = '';
        if (lesson.isClub && (lesson.timeStart || lesson.timeEnd)) {
            timeCell = `<span class="schedule-time">${lesson.timeStart || ''}–${lesson.timeEnd || ''}</span>`;
        } else if (!lesson.isClub && s.bells[idx]) {
            const bell = s.bells[idx];
            timeCell = `<span class="schedule-time">${bell.start}–${bell.end}</span>`;
        }

        html += `
            <tr class="schedule-row${lesson.isClub ? ' schedule-club' : ''}">
                <td class="schedule-num">${lessonNum}</td>
                <td class="schedule-name">${nameCell}${timeCell ? '<br>' + timeCell : ''}</td>
            </tr>`;
    });

    tbody.innerHTML = html;
}

// ── Підказка вчителя при кліку на урок ──────────────
export function scheduleShowTeacher(el) {
    const teacher = el.dataset.teacher;
    if (!teacher) return;
    const subject = el.textContent.trim();

    // Видаляємо попередню підказку
    document.querySelectorAll('.schedule-teacher-hint').forEach(h => h.remove());

    const hint = document.createElement('div');
    hint.className = 'schedule-teacher-hint achievement-popup';
    hint.innerHTML = `<strong>${subject}</strong><br>👩‍🏫 ${teacher}`;
    el.closest('tr').appendChild(hint);

    setTimeout(() => hint.classList.add('visible'), 10);
    setTimeout(() => { hint.classList.remove('visible'); setTimeout(() => hint.remove(), 300); }, 3000);
}

// ════════════════════════════════════════════════════
// ✏️  РЕДАГУВАННЯ РОЗКЛАДУ (модалка, тільки батьки)
// ════════════════════════════════════════════════════

export function openScheduleEditor() {
    const s = _sched();
    const modal = document.getElementById('scheduleEditorModal');
    if (!modal) return;

    // Чекбокс двотижневий
    document.getElementById('schedTwoWeeks').checked = !!s.twoWeeks;
    toggleWeekBtns();

    // Рендеримо редактор поточного тижня
    _renderEditorWeek(1);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeScheduleEditor() {
    const modal = document.getElementById('scheduleEditorModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

export function toggleWeekBtns() {
    const two = document.getElementById('schedTwoWeeks').checked;
    document.getElementById('schedWeekBBtn').style.display = two ? 'inline-flex' : 'none';
}

let _editorWeek = 1; // 1 або 2
export function schedEditorWeek(w) {
    _editorWeek = w;
    document.querySelectorAll('.sched-week-btn').forEach(b => {
        b.classList.toggle('active', Number(b.dataset.w) === w);
    });
    _renderEditorWeek(w);
}

function _renderEditorWeek(week) {
    _editorWeek = week;
    const s = _sched();
    const container = document.getElementById('schedEditorDays');
    if (!container) return;

    let html = '';
    for (let dow = 1; dow <= 5; dow++) {
        const key = _dayKey(dow, week);
        const dayData = s.days[key] || { lessons: [] };
        const lessons = dayData.lessons || [];

        html += `<div class="sched-editor-day">
            <div class="sched-editor-day-title">${DAY_NAMES[dow]}</div>`;

        lessons.forEach((lesson, idx) => {
            html += _editorRow(key, idx, lesson);
        });

        html += `<button class="btn btn-sm btn-ghost" onclick="schedAddLesson(${key})">+ Урок</button>`;
        html += `</div>`;
    }
    container.innerHTML = html;
}


// ── Хелпер: select предметів ─────────────────────────
function _subjectSelect(dayKey, idx, currentName) {
    const subjects = getSubjects();
    const opts = subjects.map(s =>
        `<option value="${s.name}" ${s.name === currentName ? 'selected' : ''}>${s.emoji} ${s.name}</option>`
    ).join('');
    return `<select class="sched-input sched-lesson-select"
        onchange="schedUpdateLesson(${dayKey},${idx},'name',this.value)">
        <option value="">— предмет —</option>${opts}
    </select>`;
}

function _clubSelect(dayKey, idx, currentName) {
    const clubs = getClubs();
    if (clubs.length === 0) {
        return `<input class="sched-input" type="text" value="${currentName||''}"
            placeholder="Назва гуртка"
            onchange="schedUpdateLesson(${dayKey},${idx},'name',this.value)">`;
    }
    const opts = clubs.map(c => {
        const name  = typeof c === 'string' ? c : (c.name  || '');
        const emoji = typeof c === 'string' ? '🎭' : (c.emoji || '🎭');
        return `<option value="${name}" ${name === currentName ? 'selected' : ''}>${emoji} ${name}</option>`;
    }).join('');
    return `<select class="sched-input sched-lesson-select"
        onchange="schedUpdateLesson(${dayKey},${idx},'name',this.value)">
        <option value="">— гурток —</option>${opts}
    </select>`;
}

function _editorRow(dayKey, idx, lesson) {
    const nameInput = lesson.isClub
        ? _clubSelect(dayKey, idx, lesson.name)
        : _subjectSelect(dayKey, idx, lesson.name);
    return `
    <div class="sched-editor-row" id="schedRow_${dayKey}_${idx}">
        ${nameInput}
        ${lesson.isClub ? `
        <input class="sched-input sched-time" type="time" value="${lesson.timeStart||''}"
            onchange="schedUpdateLesson(${dayKey},${idx},'timeStart',this.value)">
        <input class="sched-input sched-time" type="time" value="${lesson.timeEnd||''}"
            onchange="schedUpdateLesson(${dayKey},${idx},'timeEnd',this.value)">` : ''}
        <button class="sched-del-btn" onclick="schedDelLesson(${dayKey},${idx})">✕</button>
    </div>`;
}

export function schedAddLesson(dayKey) {
    const s = _sched();
    if (!s.days[dayKey]) s.days[dayKey] = {};
    if (!s.days[dayKey].lessons) s.days[dayKey].lessons = [];
    s.days[dayKey].lessons.push({ name: '', isClub: false });
    _renderEditorWeek(_editorWeek);
}

export function schedUpdateLesson(dayKey, idx, field, value) {
    const s = _sched();
    if (!s.days[dayKey]?.lessons[idx]) return;
    s.days[dayKey].lessons[idx][field] = value;
}

export function schedDelLesson(dayKey, idx) {
    const s = _sched();
    if (!s.days[dayKey]?.lessons) return;
    s.days[dayKey].lessons.splice(idx, 1);
    _renderEditorWeek(_editorWeek);
}

export function saveScheduleEditor() {
    const s = _sched();
    s.twoWeeks = document.getElementById('schedTwoWeeks').checked;
    // Зберігаємо всі поточні значення з інпутів
    document.querySelectorAll('.sched-editor-row[id]').forEach(row => {
        const parts = row.id.split('_');
        if (parts.length < 3) return;
        const dayKey = Number(parts[1]);
        const idx    = Number(parts[2]);
        if (!s.days[dayKey]?.lessons[idx]) return;
        // Зчитуємо з select або input (якщо гурток без списку)
        const sel = row.querySelector('select.sched-lesson-select');
        const inp = row.querySelector('input[type="text"]');
        const val = sel ? sel.value : (inp ? inp.value.trim() : '');
        if (val) s.days[dayKey].lessons[idx].name = val;
    });
    saveData();
    closeScheduleEditor();
    renderSchedule();
}

// ════════════════════════════════════════════════════
// 🎭  ГУРТКИ (окрема модалка)
// ════════════════════════════════════════════════════

export function openClubEditor() {
    const s = _sched();
    const modal = document.getElementById('clubEditorModal');
    if (!modal) return;
    _renderClubEditor();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeClubEditor() {
    const modal = document.getElementById('clubEditorModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

function _renderClubEditor() {
    const s = _sched();
    const container = document.getElementById('clubEditorDays');
    if (!container) return;

    let html = '';
    const weeks = s.twoWeeks ? [1, 2] : [1];
    weeks.forEach(week => {
        if (s.twoWeeks) html += `<div class="sched-editor-day-title">Тиждень ${week === 1 ? 'А' : 'Б'}</div>`;
        for (let dow = 1; dow <= 5; dow++) {
            const key = _dayKey(dow, week);
            const lessons = (s.days[key]?.lessons || []).filter(l => l.isClub);
            html += `<div class="sched-editor-day">
                <div class="sched-editor-day-title">${DAY_SHORT[dow]}</div>`;
            lessons.forEach((club, idx) => {
                const realIdx = (s.days[key]?.lessons || []).indexOf(club);
                html += `<div class="sched-editor-row">
                    ${_clubSelect(key, realIdx, club.name)}
                    <input class="sched-input sched-time" type="time" value="${club.timeStart||''}"
                        onchange="schedUpdateLesson(${key},${realIdx},'timeStart',this.value)">
                    <input class="sched-input sched-time" type="time" value="${club.timeEnd||''}"
                        onchange="schedUpdateLesson(${key},${realIdx},'timeEnd',this.value)">
                    <button class="sched-del-btn" onclick="schedDelLesson(${key},${realIdx})">✕</button>
                </div>`;
            });
            html += `<button class="btn btn-sm btn-ghost" onclick="clubAddDay(${key})">+ Гурток</button>
            </div>`;
        }
    });
    container.innerHTML = html;
}

export function clubAddDay(dayKey) {
    const s = _sched();
    if (!s.days[dayKey]) s.days[dayKey] = {};
    if (!s.days[dayKey].lessons) s.days[dayKey].lessons = [];
    s.days[dayKey].lessons.push({ name: '', isClub: true, timeStart: '', timeEnd: '' });
    _renderClubEditor();
}

export function saveClubEditor() {
    saveData();
    closeClubEditor();
    renderSchedule();
}

// ════════════════════════════════════════════════════
// 👩‍🏫  ВЧИТЕЛІ (модалка)
// ════════════════════════════════════════════════════

export function openTeachersModal() {
    const s = _sched();
    const modal = document.getElementById('teachersModal');
    if (!modal) return;
    _renderTeachersEditor();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeTeachersModal() {
    const modal = document.getElementById('teachersModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

function _allSubjects() {
    const s = _sched();
    const subjects = new Set();
    Object.values(s.days).forEach(day => {
        (day.lessons || []).forEach(l => { if (l.name && !l.isClub) subjects.add(l.name); });
    });
    return [...subjects].sort();
}

function _renderTeachersEditor() {
    const s = _sched();
    const container = document.getElementById('teachersList');
    if (!container) return;

    const subjects = _allSubjects();
    const isParent = !!state.data.isParent;
    const rdonly = isParent ? '' : 'readonly';
    const opacity = isParent ? '' : 'style="opacity:0.7"';

    let html = `
    <div class="sched-editor-row">
        <span class="sched-teacher-label">🏫 Класний керівник</span>
        <input class="sched-input" type="text" ${rdonly} ${opacity}
            value="${s.teachers['__classTeacher__'] || ''}"
            placeholder="ПІБ"
            onchange="schedUpdateTeacher('__classTeacher__', this.value)">
    </div>`;

    subjects.forEach(subj => {
        html += `
    <div class="sched-editor-row">
        <span class="sched-teacher-label">${subj}</span>
        <input class="sched-input" type="text" ${rdonly} ${opacity}
            value="${s.teachers[subj] || ''}"
            placeholder="ПІБ"
            onchange="schedUpdateTeacher('${subj}', this.value)">
    </div>`;
    });

    if (subjects.length === 0 && !s.teachers['__classTeacher__']) {
        html += `<p class="text-hint font-sm">Спочатку заповніть розклад</p>`;
    }

    container.innerHTML = html;
}

export function schedUpdateTeacher(subject, value) {
    const s = _sched();
    s.teachers[subject] = value.trim();
}

export function saveTeachersModal() {
    saveData();
    closeTeachersModal();
    renderSchedule(); // Оновлюємо підказки
}

// ════════════════════════════════════════════════════
// 🕐  ДЗВІНКИ (модалка)
// ════════════════════════════════════════════════════

export function openBellsModal() {
    const s = _sched();
    const modal = document.getElementById('bellsModal');
    if (!modal) return;
    _renderBellsEditor();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeBellsModal() {
    const modal = document.getElementById('bellsModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

function _maxLessons() {
    const s = _sched();
    let max = 0;
    Object.values(s.days).forEach(day => {
        const count = (day.lessons || []).filter(l => !l.isClub).length;
        if (count > max) max = count;
    });
    return Math.max(max, 8); // Мінімум 8 рядків
}

function _renderBellsEditor() {
    const s = _sched();
    const container = document.getElementById('bellsList');
    if (!container) return;
    const count = _maxLessons();

    let html = '';
    for (let i = 0; i < count; i++) {
        const bell = s.bells[i] || {};
        html += `
        <tr>
            <td class="schedule-num">${i + 1}</td>
            <td><input class="sched-input sched-time" type="time" value="${bell.start||''}"
                onchange="schedUpdateBell(${i},'start',this.value)"></td>
            <td><input class="sched-input sched-time" type="time" value="${bell.end||''}"
                onchange="schedUpdateBell(${i},'end',this.value)"></td>
        </tr>`;
    }
    container.innerHTML = html;
}

export function schedUpdateBell(idx, field, value) {
    const s = _sched();
    if (!s.bells[idx]) s.bells[idx] = {};
    s.bells[idx][field] = value;
}

export function saveBellsModal() {
    saveData();
    closeBellsModal();
}
