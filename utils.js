// ════════════════════════════════════════════════════
// UTILS  utils.js — 🔧 Утиліти
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260522.0631';

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
export const DEFAULT_ACTIVE = { theme: 'default', palette: 'default', font: 'default', buttons: 'default', background: 'default' };

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
