// ════════════════════════════════════════════════════
// UTILS  utils.js — 🔧 Утиліти
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260607.0746';

import { state } from './state.js';

// ════════════════════════════════════════════════════════════
export function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

export function setTodayDates() {
    const today = getTodayDate();
    document.getElementById('gradeDate').value = today;
    document.getElementById('bonusDate').value = today;
    document.getElementById('specialDate').value = today;
}

export function nowKyiv() {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Kyiv' }).replace(' ', 'T');
}

// ── Appearance: дефолт та міграція ──────────────────
export const DEFAULT_ACTIVE = { theme: 'default', palette: 'default', font: 'default', buttons: 'default', background: 'default', badge: 'default' };

export function migrateAppearance(raw) {
    if (!raw) return { child: { owned: ['default'], active: { ...DEFAULT_ACTIVE } }, parent: { active: { ...DEFAULT_ACTIVE } } };
    // Старий формат: { owned:[...], active:{...} }
    if (raw.owned || (raw.active && !raw.child)) {
        return {
            child:  { owned: raw.owned || ['default'], active: raw.active || { ...DEFAULT_ACTIVE } },
            parent: { active: { ...DEFAULT_ACTIVE } },
        };
    }
    // Новий формат — доповнюємо якщо чогось не вистачає
    if (!raw.child)  raw.child  = { owned: ['default'], active: { ...DEFAULT_ACTIVE } };
    if (!raw.parent) raw.parent = { active: { ...DEFAULT_ACTIVE } };
    if (!raw.child.owned) raw.child.owned = ['default'];
    return raw;
}

// ════════════════════════════════════════════════════════════
// ✨  pulseElement — універсальна анімація кліку
// ════════════════════════════════════════════════════════════
//   Викликати на будь-якому DOM-елементі для короткої візуальної
//   реакції на клік.
//     withGlow=false → тільки scale (1.0 → 1.04 → 1.0), 0.6с
//     withGlow=true  → glow + scale одночасно, 0.6с
//
//   Приклади:
//     pulseElement(card);              // звичайний клік
//     pulseElement(card, true);        // клік на картку з бейджем
//
//   CSS keyframes z-pulse-scale / z-pulse-glow визначено у style.css
// ════════════════════════════════════════════════════════════
export function pulseElement(el, withGlow = false) {
    if (!el) return;
    const cls = withGlow ? 'z-pulse-glow' : 'z-pulse-scale';
    // restart animation навіть якщо клас уже стоїть
    el.classList.remove('z-pulse-scale', 'z-pulse-glow');
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
}

// ════════════════════════════════════════════════════════════
// 🚻  g() — гендерна підстановка
//
//   Повертає boy або girl залежно від gender дитини.
//   Якщо gender не вказано — повертає boy як fallback.
//
//   Використання:
//     g(childId, 'отримав', 'отримала')
//     g(childId, { boy: 'Відмінник', girl: 'Відмінниця' })
//     g(childId, achObj.name)  // якщо name — об'єкт {boy,girl}
// ════════════════════════════════════════════════════════════
export function g(childId, boy, girl) {
    // Підтримка виклику g(childId, {boy, girl})
    if (typeof boy === 'object' && boy !== null && 'boy' in boy) {
        girl = boy.girl;
        boy  = boy.boy;
    }
    const meta   = state.parent?.children?.[childId];
    const gender = meta?.gender || 'girl';
    return gender === 'girl' ? (girl ?? boy) : boy;
}

// achText(ach, childId, field) — зручна обгортка для полів досягнень
// field: 'name' | 'desc'
export function achText(ach, childId, field = 'name') {
    const val = ach[field];
    if (!val) return '';
    if (typeof val === 'object') return g(childId, val);
    return val;
}
