// ════════════════════════════════════════════════════
// 🎨  appearance.js — Система тем і компонентів
//
//     Архітектура: кожна тема = набір компонентів
//     (палітра + шрифт + кнопки + фон).
//     Дитина купує тему цілком, але може міксувати
//     компоненти куплених тем між собою.
//
//     Для додавання нової теми:
//       1. Додай запис у THEMES
//       2. Додай відповідний запис у COMPONENTS
//       3. Додай CSS vars у style.css (опційно)
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260504.1400';

import { state } from './state.js';
import { saveData } from './firebase.js';

// ════════════════════════════════════════════════════
// 📦  КАТАЛОГ КОМПОНЕНТІВ
//     Додаючи новий компонент — просто додай запис сюди.
//     vars: CSS змінні що будуть встановлені на <html>.
// ════════════════════════════════════════════════════
export const COMPONENTS = {

    palettes: {
        default: {
            name: '⭐ Класика',
            vars: {}  // Дефолтні значення з :root в style.css
        },
        space: {
            name: '🌌 Космос',
            vars: {
                '--primary':           '#7B2FBE',
                '--secondary':         '#00d4ff',
                '--accent':            '#FF6B6B',
                '--bg':                '#1a0a2e',
                '--card':              '#2d1b4e',
                '--text':              '#e0d4f7',
                '--bg-gradient':       'linear-gradient(135deg,#0d0221 0%,#1a0a2e 50%,#2d0057 100%)',
                '--btn-primary-from':  '#7B2FBE',
                '--btn-primary-to':    '#9c44d4',
                '--btn-primary-color': '#ffffff',
                '--btn-primary-shadow':'rgba(123,47,190,0.5)',
                '--tab-active-from':   '#7B2FBE',
                '--tab-active-to':     '#9c44d4',
                '--tab-active-color':  '#ffffff',
                '--tab-active-shadow': 'rgba(123,47,190,0.5)',
                '--goal-from':         '#7B2FBE',
                '--goal-to':           '#2d0057',
                '--goal-text':         '#ffffff',
                '--goal-shadow':       'rgba(123,47,190,0.4)',
                '--progress-from':     '#00d4ff',
                '--progress-to':       '#7B2FBE',
                '--border-input':      '#4a2575',
                '--border-light':      '#3d2060',
                '--text-muted':        '#b090d4',
                '--text-hint':         '#8060a8',
                '--shadow':            '0 8px 24px rgba(123,47,190,0.3)',
            }
        },
        forest: {
            name: '🌿 Ліс',
            vars: {
                '--primary':           '#4CAF50',
                '--secondary':         '#1B5E20',
                '--accent':            '#FF9800',
                '--bg':                '#F1F8E9',
                '--card':              '#FFFFFF',
                '--text':              '#1B2E1B',
                '--bg-gradient':       'linear-gradient(135deg,#1B5E20 0%,#2E7D32 50%,#8BC34A 100%)',
                '--btn-primary-from':  '#4CAF50',
                '--btn-primary-to':    '#2E7D32',
                '--btn-primary-color': '#ffffff',
                '--btn-primary-shadow':'rgba(76,175,80,0.4)',
                '--tab-active-from':   '#4CAF50',
                '--tab-active-to':     '#2E7D32',
                '--tab-active-color':  '#ffffff',
                '--tab-active-shadow': 'rgba(76,175,80,0.4)',
                '--goal-from':         '#4CAF50',
                '--goal-to':           '#1B5E20',
                '--goal-text':         '#ffffff',
                '--goal-shadow':       'rgba(76,175,80,0.3)',
                '--progress-from':     '#1B5E20',
                '--progress-to':       '#8BC34A',
                '--text-muted':        '#4E6B4E',
                '--text-hint':         '#7A9A7A',
                '--shadow':            '0 8px 24px rgba(76,175,80,0.2)',
            }
        },
        sakura: {
            name: '🌸 Сакура',
            vars: {
                '--primary':           '#F48FB1',
                '--secondary':         '#880E4F',
                '--accent':            '#FF80AB',
                '--bg':                '#FFF0F5',
                '--card':              '#FFFFFF',
                '--text':              '#3B1B2B',
                '--bg-gradient':       'linear-gradient(135deg,#880E4F 0%,#E91E63 50%,#FCE4EC 100%)',
                '--btn-primary-from':  '#E91E63',
                '--btn-primary-to':    '#880E4F',
                '--btn-primary-color': '#ffffff',
                '--btn-primary-shadow':'rgba(233,30,99,0.4)',
                '--tab-active-from':   '#E91E63',
                '--tab-active-to':     '#880E4F',
                '--tab-active-color':  '#ffffff',
                '--tab-active-shadow': 'rgba(233,30,99,0.4)',
                '--goal-from':         '#F48FB1',
                '--goal-to':           '#E91E63',
                '--goal-text':         '#ffffff',
                '--goal-shadow':       'rgba(233,30,99,0.3)',
                '--progress-from':     '#880E4F',
                '--progress-to':       '#F48FB1',
                '--text-muted':        '#7B4060',
                '--text-hint':         '#A06080',
                '--shadow':            '0 8px 24px rgba(233,30,99,0.2)',
            }
        },
        winter: {
            name: '❄️ Зима',
            vars: {
                '--primary':           '#29B6F6',
                '--secondary':         '#0D47A1',
                '--accent':            '#FF6B6B',
                '--bg':                '#E3F2FD',
                '--card':              '#FFFFFF',
                '--text':              '#0D2A5E',
                '--bg-gradient':       'linear-gradient(135deg,#0D47A1 0%,#1565C0 50%,#29B6F6 100%)',
                '--btn-primary-from':  '#29B6F6',
                '--btn-primary-to':    '#0D47A1',
                '--btn-primary-color': '#ffffff',
                '--btn-primary-shadow':'rgba(41,182,246,0.4)',
                '--tab-active-from':   '#29B6F6',
                '--tab-active-to':     '#0D47A1',
                '--tab-active-color':  '#ffffff',
                '--tab-active-shadow': 'rgba(41,182,246,0.4)',
                '--goal-from':         '#29B6F6',
                '--goal-to':           '#0D47A1',
                '--goal-text':         '#ffffff',
                '--goal-shadow':       'rgba(41,182,246,0.3)',
                '--progress-from':     '#0D47A1',
                '--progress-to':       '#29B6F6',
                '--text-muted':        '#4A6A9E',
                '--text-hint':         '#7090B8',
                '--shadow':            '0 8px 24px rgba(41,182,246,0.2)',
            }
        },
    },

    fonts: {
        default:   { name: '✏️ Nunito',    value: "'Nunito', sans-serif"       },
        comfortaa: { name: '✏️ Comfortaa', value: "'Comfortaa', cursive"       },
        fredoka:   { name: '✏️ Fredoka',   value: "'Fredoka One', cursive"     },
    },

    buttons: {
        default: { name: '🔲 Стандартні', vars: { '--radius-btn': '18px' } },
        pill:    { name: '💊 Пігулки',    vars: { '--radius-btn': '50px' } },
        sharp:   { name: '📐 Гострі',     vars: { '--radius-btn': '6px'  } },
    },

    backgrounds: {
        default: { name: '🌈 Класика',  emoji: '🌈' },
        stars:   { name: '⭐ Зірки',    emoji: '⭐' },
        forest:  { name: '🌿 Ліс',      emoji: '🌿' },
        sakura:  { name: '🌸 Сакура',   emoji: '🌸' },
        snow:    { name: '❄️ Сніг',     emoji: '❄️' },
    },
};

// ════════════════════════════════════════════════════
// 🎭  КАТАЛОГ ТЕМ (пресети компонентів)
//     Щоб додати нову тему — додай об'єкт сюди.
//     preview.colors — масив кольорів для міні-картки
// ════════════════════════════════════════════════════
export const THEMES = [
    {
        id:         'default',
        name:       '🌟 Класика',
        desc:       'Оригінальний вигляд застосунку',
        price:      0,
        components: { palette: 'default',  font: 'default',    buttons: 'default', background: 'default' },
        preview:    { colors: ['#FFD700', '#0057B7', '#FF6B6B', '#FFF9E6'] },
    },
    {
        id:         'space',
        name:       '🌌 Космос',
        desc:       'Темний таємничий стиль з фіолетовим сяйвом',
        price:      100,
        components: { palette: 'space',    font: 'fredoka',    buttons: 'pill',    background: 'stars'  },
        preview:    { colors: ['#1a0a2e', '#7B2FBE', '#00d4ff', '#2d1b4e'] },
    },
    {
        id:         'forest',
        name:       '🌿 Ліс',
        desc:       'Свіжий зелений стиль природи',
        price:      100,
        components: { palette: 'forest',   font: 'comfortaa',  buttons: 'default', background: 'forest' },
        preview:    { colors: ['#1B5E20', '#4CAF50', '#8BC34A', '#F1F8E9'] },
    },
    {
        id:         'sakura',
        name:       '🌸 Сакура',
        desc:       'Ніжний рожевий стиль',
        price:      100,
        components: { palette: 'sakura',   font: 'comfortaa',  buttons: 'pill',    background: 'sakura' },
        preview:    { colors: ['#880E4F', '#E91E63', '#F48FB1', '#FFF0F5'] },
    },
    {
        id:         'winter',
        name:       '❄️ Зима',
        desc:       'Холодний кристально-синій стиль',
        price:      100,
        components: { palette: 'winter',   font: 'default',    buttons: 'sharp',   background: 'snow'   },
        preview:    { colors: ['#0D47A1', '#1565C0', '#29B6F6', '#E3F2FD'] },
    },
];

// Дефолтний стан appearance (для нових користувачів)
export const DEFAULT_APPEARANCE = {
    owned: ['default'],
    active: { theme: 'default', palette: 'default', font: 'default', buttons: 'default', background: 'default' },
};

// ════════════════════════════════════════════════════
// 🔧  ЗАСТОСУВАННЯ КОМПОНЕНТІВ
// ════════════════════════════════════════════════════
function _resetAppearanceVars() {
    const html = document.documentElement;
    // Скидаємо всі CSS змінні що могли бути встановлені попередньою темою
    const allVarNames = Object.values(COMPONENTS.palettes)
        .flatMap(p => Object.keys(p.vars || {}));
    [...new Set(allVarNames)].forEach(v => html.style.removeProperty(v));
    html.style.removeProperty('--font-main');
    html.style.removeProperty('--radius-btn');
    html.removeAttribute('data-bg');
}

function _applyComponents(active) {
    const html = document.documentElement;
    const palette = COMPONENTS.palettes[active.palette] || COMPONENTS.palettes.default;
    const font    = COMPONENTS.fonts[active.font]       || COMPONENTS.fonts.default;
    const buttons = COMPONENTS.buttons[active.buttons]  || COMPONENTS.buttons.default;

    // Палітра
    Object.entries(palette.vars || {}).forEach(([k, v]) => html.style.setProperty(k, v));

    // Шрифт
    html.style.setProperty('--font-main', font.value);

    // Кнопки
    Object.entries(buttons.vars || {}).forEach(([k, v]) => html.style.setProperty(k, v));

    // Фон (CSS data-атрибут — стилі в style.css)
    html.dataset.bg = active.background || 'default';
}

// Публічна функція — викликається при завантаженні
export function applyAppearance() {
    const active = state.data.appearance?.active || DEFAULT_APPEARANCE.active;
    _resetAppearanceVars();
    _applyComponents(active);
}

// ════════════════════════════════════════════════════
// ⭐  КУПІВЛЯ ТЕМИ
// ════════════════════════════════════════════════════
export function buyTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    if (!state.data.appearance) state.data.appearance = { ...DEFAULT_APPEARANCE, owned: [...DEFAULT_APPEARANCE.owned] };
    const owned = state.data.appearance.owned || ['default'];

    // Вже куплена — просто активуємо
    if (owned.includes(themeId)) {
        activateTheme(themeId);
        renderThemeShop();
        return;
    }

    // Перевірка балансу
    if ((state.data.balance || 0) < theme.price) {
        alert(`Недостатньо зірок!\n\nПотрібно: ${theme.price}⭐\nЄ: ${state.data.balance}⭐`);
        return;
    }

    if (!confirm(`Купити тему "${theme.name}" за ${theme.price}⭐?`)) return;

    // Списуємо зірки
    state.data.balance = (state.data.balance || 0) - theme.price;

    // Запис в owned і в історію
    state.data.appearance.owned.push(themeId);

    if (!state.data.records) state.data.records = [];
    state.data.records.push({
        id:       Date.now(),
        date:     new Date().toISOString().split('T')[0],
        type:     'spend',
        category: 'theme',
        desc:     `🎨 Тема "${theme.name}"`,
        stars:    theme.price,
    });

    saveData();
    activateTheme(themeId);
    renderThemeShop();

    // Оновлюємо баланс у header
    import('./ui.js').then(m => m.updateUI());

    alert(`✅ Тема "${theme.name}" куплена і активована!`);
}

// ════════════════════════════════════════════════════
// 🎨  АКТИВАЦІЯ ТЕМИ / КОМПОНЕНТА
// ════════════════════════════════════════════════════
export function activateTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    if (!state.data.appearance) state.data.appearance = { ...DEFAULT_APPEARANCE, owned: [...DEFAULT_APPEARANCE.owned] };

    state.data.appearance.active = { theme: themeId, ...theme.components };
    _resetAppearanceVars();
    _applyComponents(state.data.appearance.active);
    saveData();
}

export function setComponent(type, id) {
    if (!state.data.appearance) state.data.appearance = { ...DEFAULT_APPEARANCE, owned: [...DEFAULT_APPEARANCE.owned] };
    if (!state.data.appearance.active) state.data.appearance.active = { ...DEFAULT_APPEARANCE.active };

    state.data.appearance.active[type] = id;
    state.data.appearance.active.theme = 'custom';

    _resetAppearanceVars();
    _applyComponents(state.data.appearance.active);
    saveData();
    renderThemeShop();
}

// ════════════════════════════════════════════════════
// 👀  ПРОБНИЙ РЕЖИМ (60 секунд)
// ════════════════════════════════════════════════════
let _previewTimer    = null;
let _previewOriginal = null;

export function startPreview(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    // Зупиняємо попередній preview якщо є
    if (_previewTimer) stopPreview(false);

    // Зберігаємо поточний стан
    _previewOriginal = { ...(state.data.appearance?.active || DEFAULT_APPEARANCE.active) };

    // Застосовуємо тему
    _resetAppearanceVars();
    _applyComponents(theme.components);

    // Банер
    _showBanner(theme, 60);

    // Таймер
    let s = 60;
    _previewTimer = setInterval(() => {
        s--;
        const el = document.getElementById('previewTimerVal');
        if (el) el.textContent = s + 'с';
        if (s <= 0) stopPreview(false);
    }, 1000);
}

export function stopPreview(keep = false) {
    if (_previewTimer) { clearInterval(_previewTimer); _previewTimer = null; }
    const banner = document.getElementById('previewBanner');
    if (banner) banner.remove();

    if (!keep && _previewOriginal) {
        _resetAppearanceVars();
        _applyComponents(_previewOriginal);
    }
    _previewOriginal = null;
    renderThemeShop();
}

function _showBanner(theme, seconds) {
    document.getElementById('previewBanner')?.remove();
    const div = document.createElement('div');
    div.id = 'previewBanner';
    div.className = 'preview-banner';
    div.innerHTML = `
        <span class="preview-banner-label">👀 Пробний режим: <strong>${theme.name}</strong></span>
        <span class="preview-banner-timer" id="previewTimerVal">${seconds}с</span>
        <button class="preview-banner-btn preview-banner-buy"  onclick="window.__zBuyFromPreview('${theme.id}')">⭐ Купити ${theme.price > 0 ? theme.price + '⭐' : ''}</button>
        <button class="preview-banner-btn preview-banner-stop" onclick="window.__zStopPreview()">✕ Вийти</button>
    `;
    document.body.prepend(div);

    window.__zBuyFromPreview = (id) => { stopPreview(true); buyTheme(id); };
    window.__zStopPreview    = ()   => stopPreview(false);
}

// ════════════════════════════════════════════════════
// 🛍️  РЕНДЕР МАГАЗИНУ ТЕМ
// ════════════════════════════════════════════════════
export function renderThemeShop() {
    const container = document.getElementById('themeShopContainer');
    if (!container) return;

    const appearance = state.data.appearance || DEFAULT_APPEARANCE;
    const owned      = appearance.owned  || ['default'];
    const active     = appearance.active || DEFAULT_APPEARANCE.active;
    const balance    = state.data.balance || 0;
    const inPreview  = !!_previewTimer;

    // ── Магазин тем ──────────────────────────────
    container.innerHTML = THEMES.map(theme => {
        const isOwned  = owned.includes(theme.id);
        const isActive = active.theme === theme.id;
        const canAfford = balance >= theme.price;

        // Міні-превʼю (4 кольори)
        const swatchHTML = theme.preview.colors.map(c =>
            `<span style="background:${c}"></span>`
        ).join('');

        // Кнопки
        const isParent = !!state.data.isParent;
        let actionsHTML = '';
        if (isOwned) {
            const activateBtn = isActive
                ? `<button class="btn btn-primary btn-compact" disabled>✓ Активна</button>`
                : `<button class="btn btn-primary btn-compact" onclick="window.__zActivateTheme('${theme.id}')">🎨 Активувати</button>
                   <button class="btn btn-secondary btn-compact" onclick="window.__zStartPreview('${theme.id}')">👀 Спробувати</button>`;
            const refundBtn = (isParent && theme.price > 0 && !isActive)
                ? `<button class="btn btn-refund btn-compact" onclick="window.__zRefundTheme('${theme.id}')" title="Повернути ${theme.price}⭐">↩ ${theme.price}⭐</button>`
                : '';
            actionsHTML = activateBtn + refundBtn;
        } else {
            actionsHTML = `
                <button class="btn btn-primary btn-compact ${!canAfford ? 'btn-cant-afford' : ''}"
                    onclick="window.__zBuyTheme('${theme.id}')" ${!canAfford ? 'disabled' : ''}>
                    ${theme.price === 0 ? 'Безкоштовно' : `⭐ ${theme.price}`}
                </button>
                <button class="btn btn-secondary btn-compact" onclick="window.__zStartPreview('${theme.id}')">👀 Спробувати</button>
            `;
        }

        return `
        <div class="theme-card ${isActive ? 'theme-card--active' : ''} ${isOwned ? 'theme-card--owned' : ''}">
            <div class="theme-swatch">${swatchHTML}</div>
            <div class="theme-card-info">
                <div class="theme-card-name">${theme.name}${isActive ? ' <span class="theme-badge-active">активна</span>' : ''}</div>
                <div class="theme-card-desc">${theme.desc}</div>
                <div class="theme-card-comps">
                    <span>${(COMPONENTS.fonts[theme.components.font] || COMPONENTS.fonts.default).name}</span>
                    <span>${(COMPONENTS.buttons[theme.components.buttons] || COMPONENTS.buttons.default).name}</span>
                    <span>${(COMPONENTS.backgrounds[theme.components.background] || COMPONENTS.backgrounds.default).name}</span>
                </div>
            </div>
            <div class="theme-card-actions">${actionsHTML}</div>
        </div>`;
    }).join('');

    // ── Кастомізація (якщо є куплені теми крім дефолту) ─
    const hasBoughtThemes = owned.some(id => id !== 'default');
    const customContainer = document.getElementById('themeCustomizeContainer');
    if (customContainer) {
        if (hasBoughtThemes) {
            customContainer.style.display = 'block';
            _renderCustomize(customContainer, owned, active);
        } else {
            customContainer.style.display = 'none';
        }
    }

    // Глобальні функції для onclick
    window.__zActivateTheme  = activateTheme;
    window.__zBuyTheme       = buyTheme;
    window.__zStartPreview   = startPreview;
    window.__zRefundTheme    = refundTheme;
}

function _renderCustomize(container, owned, active) {
    // Збираємо доступні компоненти з куплених тем
    const available = { palettes: new Set(['default']), fonts: new Set(['default']), buttons: new Set(['default']), backgrounds: new Set(['default']) };
    owned.forEach(themeId => {
        const theme = THEMES.find(t => t.id === themeId);
        if (!theme) return;
        available.palettes.backgrounds?.add(theme.components.background);
        Object.entries(theme.components).forEach(([type, id]) => {
            const key = type + 's';
            if (available[key]) available[key].add(id);
        });
    });

    const makeRow = (type, label, compMap, availSet) => {
        const items = Object.entries(compMap)
            .filter(([id]) => availSet.has(id))
            .map(([id, comp]) => {
                const isCurrent = active[type] === id;
                return `<button class="comp-btn ${isCurrent ? 'comp-btn--active' : ''}"
                    onclick="window.__zSetComponent('${type}','${id}')">${comp.name}</button>`;
            }).join('');
        return `<div class="customize-row"><span class="customize-label">${label}</span><div class="customize-options">${items}</div></div>`;
    };

    container.innerHTML = `
        <div class="card-bg mt-md">
            <h3 class="card-title">🎛️ Кастомізація</h3>
            <p class="text-muted font-sm mb-md">Міксуй компоненти куплених тем на свій смак</p>
            ${makeRow('palette',    '🎨 Кольори', COMPONENTS.palettes,    available.palettes)}
            ${makeRow('font',       '🔤 Шрифт',   COMPONENTS.fonts,       available.fonts)}
            ${makeRow('buttons',    '🖱️ Кнопки',  COMPONENTS.buttons,     available.buttons)}
            ${makeRow('background', '🌄 Фон',      COMPONENTS.backgrounds, available.backgrounds)}
        </div>
    `;

    window.__zSetComponent = setComponent;
}

// ════════════════════════════════════════════════════
// ↩  ПОВЕРНЕННЯ ТЕМИ — тільки батьки через PIN
// ════════════════════════════════════════════════════
export function refundTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme || theme.price === 0) return;

    if (!state.data.isParent) {
        alert('❌ Повернення теми доступне тільки батькам');
        return;
    }

    const appearance = state.data.appearance || DEFAULT_APPEARANCE;
    const owned = appearance.owned || ['default'];

    if (!owned.includes(themeId)) {
        alert('❌ Ця тема не куплена');
        return;
    }

    // Не можна повернути активну тему
    if (appearance.active?.theme === themeId) {
        alert('❌ Не можна повернути активну тему.\nСпочатку активуйте іншу тему.');
        return;
    }

    // PIN підтвердження
    const pin = prompt(`🔐 Введіть PIN для повернення теми "${theme.name}" (+${theme.price}⭐):`);
    if (pin === null) return; // скасовано
    if (String(pin) !== String(state.data.pin)) {
        alert('❌ Невірний PIN');
        return;
    }

    if (!confirm(`Повернути тему "${theme.name}"?\n\nНа рахунок буде повернуто: +${theme.price}⭐\nТема зникне зі списку куплених.`)) return;

    // Видаляємо з owned
    state.data.appearance.owned = owned.filter(id => id !== themeId);

    // Повертаємо зірки
    state.data.balance = (state.data.balance || 0) + theme.price;

    // Запис в історію
    if (!state.data.records) state.data.records = [];
    state.data.records.push({
        id:       Date.now(),
        date:     new Date().toISOString().split('T')[0],
        type:     'earn',
        category: 'special',
        desc:     `↩ Повернення теми "${theme.name}"`,
        stars:    theme.price,
    });

    saveData();
    renderThemeShop();
    import('./ui.js').then(m => m.updateUI());

    alert(`✅ Тему "${theme.name}" повернуто.\n+${theme.price}⭐ повернуто на рахунок.`);
}
