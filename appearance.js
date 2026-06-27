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

export const VERSION = 'v4.20260627.2233';

import { state } from './state.js';
import { saveAppearance, saveParentAppearance, saveRecords, saveBorder, saveChildMeta } from './firebase.js';
import { spendStars } from './rewards.js';
import { DEFAULT_ACTIVE, migrateAppearance } from './utils.js';

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
        retro: {
            name: '📷 Ретро',
            vars: {
                '--primary':           '#C8A96E',
                '--secondary':         '#4A3728',
                '--accent':            '#8B4513',
                '--bg':                '#F5EDD6',
                '--card':              '#FAF3E0',
                '--text':              '#2C1F0F',
                '--bg-gradient':       'linear-gradient(135deg, #3D2B1F 0%, #6B4C35 50%, #C8A96E 100%)',
                '--btn-primary-from':  '#C8A96E',
                '--btn-primary-to':    '#A0825A',
                '--btn-primary-color': '#2C1F0F',
                '--btn-primary-shadow':'rgba(200,169,110,0.4)',
                '--tab-active-from':   '#C8A96E',
                '--tab-active-to':     '#A0825A',
                '--tab-active-color':  '#2C1F0F',
                '--tab-active-shadow': 'rgba(200,169,110,0.4)',
                '--goal-from':         '#C8A96E',
                '--goal-to':           '#8B6347',
                '--goal-text':         '#FAF3E0',
                '--goal-shadow':       'rgba(200,169,110,0.3)',
                '--progress-from':     '#4A3728',
                '--progress-to':       '#C8A96E',
                '--border-light':      '#D4B896',
                '--border-input':      '#C4A882',
                '--text-muted':        '#7A5C3E',
                '--text-hint':         '#9E7A5A',
                '--shadow':            '0 8px 24px rgba(74,55,40,0.2)',
            }
        },
        goose: {
            name: '🪿 Гуси',
            // Прапорець decorated: палітра приносить декоративні зображення.
            // Активує селектори :root[data-decorated="true"] у style.css.
            // Зображення задаються через CSS-змінні --decor-* нижче.
            decorated: true,
            vars: {
                // ── Кольори ────────────────────────────────────
                '--primary':           '#FF9843',
                '--secondary':         '#5A4A3A',
                '--accent':            '#7DB874',
                '--bg':                '#FDFBF8',
                '--card':              '#FFFCF9',
                '--text':              '#3C3530',
                '--bg-gradient':       'linear-gradient(to bottom, #DCEEF7 0%, #F0F5EC 55%, #DDEED5 100%)',
                '--btn-primary-from':  '#FF9843',
                '--btn-primary-to':    '#FF7A1F',
                '--btn-primary-color': '#ffffff',
                '--btn-primary-shadow':'rgba(255,152,67,0.4)',
                '--tab-active-from':   '#FF9843',
                '--tab-active-to':     '#FF7A1F',
                '--tab-active-color':  '#ffffff',
                '--tab-active-shadow': 'rgba(255,152,67,0.4)',
                '--goal-from':         '#7DB874',
                '--goal-to':           '#5A9050',
                '--goal-text':         '#ffffff',
                '--goal-shadow':       'rgba(125,184,116,0.3)',
                '--progress-from':     '#FF9843',
                '--progress-to':       '#7DB874',
                '--border-light':      '#E8E4DF',
                '--border-input':      '#D8D2CB',
                '--text-muted':        '#6F6358',
                '--text-hint':         '#9A8A7A',
                '--shadow':            '0 8px 24px rgba(184,149,106,0.18)',

                // ── Декоративні зображення (CSS-змінні URL) ─────
                // Універсальні правила в style.css використовують ці змінні
                // через var(--decor-XXX). Якщо змінна не задана — буде none.
                '--decor-add':                 'url("geese/goose-head-1.webp")',
                '--decor-schedule':            'url("geese/goose-diary.webp")',
                '--decor-tasks':               'url("geese/goose-worried.webp")',
                '--decor-rewards':             'url("geese/goose-rich.webp")',
                '--decor-stats':               'url("geese/goose-fly-2.webp")',
                '--decor-guide':               'url("geese/goose-help.webp")',
                '--decor-settings':            'url("geese/goose-options.webp")',
                '--decor-themes':              'url("geese/goose-dress.webp")',
                '--decor-empty-tasks':         'url("geese/goose-standing.webp")',
                '--decor-empty-history':       'url("geese/goose-sleep.webp")',
                '--decor-empty-feedback':      'url("geese/goose-sleep-2.webp")',
                '--decor-help-achievements':   'url("geese/goose-achievement.webp")',
                '--decor-notif-bottom':        'url("geese/goose-heads-bottom-bell.webp")',
                '--decor-notif-top':           'url("geese/goose-head-up.webp")',
            }
        },
    },

    fonts: {
        default:   { name: '✏️ Nunito',    value: "'Nunito', sans-serif"       },
        comfortaa: { name: '✏️ Comfortaa', value: "'Comfortaa', cursive"       },
        fredoka:   { name: '✏️ Balsamiq',  value: "'Balsamiq Sans', cursive"   },
        ubuntu:    { name: '✏️ Ubuntu',    value: "'Ubuntu', sans-serif"       },
        playfair:  { name: '✏️ Playfair',  value: "'Playfair Display', serif"  },
        rubik:     { name: '✏️ Rubik',     value: "'Rubik', sans-serif"        },
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
        retro:   { name: '📷 Ретро',    emoji: '📷' },
        goose:   { name: '🪿 Гуси',     emoji: '🪿' },
    },

    // ── Бейджі — вигляд крапки-індикатора ──────────────
    // vars: тільки --badge-bg і --badge-border.
    // Позиція (-5px/-5px), розмір (10px), анімація (notifPulse)
    // та прапорець задані жорстко в style.css через html[data-badge="..."].
    badges: {
        // Тільки --badge-bg і --badge-border — решта (розмір, позиція,
        // анімація, прапорець) задана жорстко в style.css через data-badge атрибут.
        default: {
            name: '🔴 Класика',
            vars: {
                '--badge-bg':     '#f44336',
                '--badge-border': '2px solid #ffffff',
            },
        },
        dark: {
            name: '🔴 Темний контур',
            vars: {
                '--badge-bg':     '#f44336',
                '--badge-border': '2px solid #2d1b4e',
            },
        },
        flag: {
            name: '🚩 Прапорець',
            vars: {
                '--badge-bg':     'transparent',
                '--badge-border': 'none',
            },
        },
        goose: {
            name: '🟢 Гусячий',
            vars: {
                '--badge-bg':     '#7DB874',
                '--badge-border': '2px solid #F4F0EB',
            },
        },
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
        components: { palette: 'default',  font: 'default',    buttons: 'default', background: 'default', badge: 'default' },
        preview:    { colors: ['#FFD700', '#0057B7', '#FF6B6B', '#FFF9E6'] },
    },
    {
        id:         'space',
        name:       '🌌 Космос',
        desc:       'Темний таємничий стиль з фіолетовим сяйвом',
        price:      100,
        components: { palette: 'space',    font: 'fredoka',    buttons: 'pill',    background: 'stars',  badge: 'dark'    },
        preview:    { colors: ['#1a0a2e', '#7B2FBE', '#00d4ff', '#2d1b4e'] },
    },
    {
        id:         'forest',
        name:       '🌿 Ліс',
        desc:       'Свіжий зелений стиль природи',
        price:      100,
        components: { palette: 'forest',   font: 'comfortaa',  buttons: 'default', background: 'forest', badge: 'default' },
        preview:    { colors: ['#1B5E20', '#4CAF50', '#8BC34A', '#F1F8E9'] },
    },
    {
        id:         'sakura',
        name:       '🌸 Сакура',
        desc:       'Ніжний рожевий стиль',
        price:      100,
        components: { palette: 'sakura',   font: 'comfortaa',  buttons: 'pill',    background: 'sakura', badge: 'default' },
        preview:    { colors: ['#880E4F', '#E91E63', '#F48FB1', '#FFF0F5'] },
    },
    {
        id:         'winter',
        name:       '❄️ Зима',
        desc:       'Холодний кристально-синій стиль',
        price:      100,
        components: { palette: 'winter',   font: 'ubuntu',     buttons: 'sharp',   background: 'snow',   badge: 'default' },
        preview:    { colors: ['#0D47A1', '#1565C0', '#29B6F6', '#E3F2FD'] },
    },
    {
        id:         'retro',
        name:       '📷 Ретро',
        desc:       'Вінтажний стиль у теплих коричневих та сепія тонах',
        price:      25,
        components: { palette: 'retro',    font: 'playfair',   buttons: 'sharp',   background: 'retro',  badge: 'flag'    },
        preview:    { colors: ['#4A3728', '#8B6347', '#C8A96E', '#F5EDD6'] },
    },
    {
        id:         'goose',
        name:       '🪿 Гуси',
        desc:       'Оригінальний вигляд для фанатів гусей',
        price:      120,
        components: { palette: 'goose',    font: 'rubik',      buttons: 'pill',    background: 'goose',  badge: 'goose'   },
        preview:    { colors: ['#FF9843', '#7DB874', '#B8956A', '#FDFBF8'] },
    },
];

// Дефолтний стан для кожного профілю
// ════════════════════════════════════════════════════
// 🎨  РАМКА ПРОФІЛЮ — каталоги (6в)
// ════════════════════════════════════════════════════

export const BORDER_COLORS_FREE = [
    { id: 'red',    hex: '#ff6b6b' },
    { id: 'orange', hex: '#ff9500' },
    { id: 'yellow', hex: '#ffd60a' },
    { id: 'green',  hex: '#34c759' },
    { id: 'teal',   hex: '#5ac8fa' },
    { id: 'blue',   hex: '#007aff' },
    { id: 'purple', hex: '#af52de' },
    { id: 'pink',   hex: '#ff2d55' },
    { id: 'brown',  hex: '#a2845e' },
    { id: 'white',  hex: '#f2f2f7' },
];

// Стиль лінії рамки (всі безкоштовні)
export const BORDER_LINES = [
    { id: 'solid',  name: '▬ Суцільна' },
    { id: 'dashed', name: '╌ Пунктир'  },
    { id: 'dotted', name: '· · Крапки' },
    { id: 'double', name: '═ Подвійна' },
];

// Анімація рамки (через ::before псевдоелемент)
export const BORDER_ANIMATIONS = [
    { id: 'none',    name: '— Без анімації', free: true },
    { id: 'pulse',   name: '💫 Пульсація',   stars: 80  },
    { id: 'glow',    name: '✨ Сяйво',       stars: 80  },
    { id: 'bounce',  name: '🏀 Пульс',       stars: 80  },
    { id: 'shimmer', name: '🐍 Змійка',      stars: 80, free: true  },
    { id: 'rainbow', name: '🌈 Веселка',     stars: 80, free: true  },
];

// Залишаємо BORDER_STYLES як alias для зворотної сумісності
export const BORDER_STYLES = BORDER_ANIMATIONS;

// ─── Дефолтна рамка для нового профілю ───────────────
export const DEFAULT_BORDER = {
    line:            'solid',  // стиль лінії
    animation:       'none',   // анімація
    ownedAnimations: [],       // куплені анімації
};

// ─── Гарантує наявність border у мета-даних дитини ───
function _ensureBorder(childId) {
    const cid = childId || state.activeChildId;
    if (!state.parent.children?.[cid]) return;
    const meta = state.parent.children[cid];
    if (!meta.border) meta.border = { ...DEFAULT_BORDER };
    // Міграція старої структури { style, ownedStyles } → нова { line, animation, ownedAnimations }
    if (meta.border.style && !meta.border.line) {
        // Старий style був або line або animation — перевіряємо
        const wasLine = BORDER_LINES.some(l => l.id === meta.border.style);
        meta.border.line      = wasLine ? meta.border.style : DEFAULT_BORDER.line;
        meta.border.animation = DEFAULT_BORDER.animation;
        delete meta.border.style;
    }
    if (!meta.border.line)            meta.border.line            = DEFAULT_BORDER.line;
    if (!meta.border.animation)       meta.border.animation       = DEFAULT_BORDER.animation;
    if (!meta.border.ownedAnimations) meta.border.ownedAnimations = [];
    // Чистимо застарілі поля
    delete meta.border.ownedStyles;
}

export const DEFAULT_APPEARANCE = {
    child:  { owned: ['default'], active: { ...DEFAULT_ACTIVE } },
    parent: { active: { ...DEFAULT_ACTIVE } },
};

// ════════════════════════════════════════════════════
// 🔧  ЗАСТОСУВАННЯ КОМПОНЕНТІВ
// ════════════════════════════════════════════════════
// Повертає appearance-профіль поточного користувача (child або parent)
function _getProfile() {
    if (state.data.isParent) {
        // Батьківський appearance живе в state.parent.appearance
        return state.parent.appearance || DEFAULT_APPEARANCE.parent;
    }
    const app = state.data.appearance || DEFAULT_APPEARANCE;
    return app.child || DEFAULT_APPEARANCE.child;
}

// Зберігає appearance залежно від ролі: батько → state.parent, дитина → state.data
function _saveCurrentAppearance() {
    if (state.data.isParent) {
        saveParentAppearance();
    } else {
        saveAppearance();
        // Синхронізуємо fontKey у meta дитини — для login-child-card
        // (appearance завантажується після входу, meta — при старті)
        const cid = state.activeChildId;
        if (cid && state.parent.children?.[cid]) {
            const fontKey = state.data.appearance?.child?.active?.font || 'default';
            state.parent.children[cid].fontKey = fontKey;
            saveChildMeta(cid);
        }
    }
}

// Забезпечує що appearance ініціалізований у новому форматі
function _ensureAppearance() {
    if (!state.data.appearance || state.data.appearance.owned || (state.data.appearance.active && !state.data.appearance.child)) {
        state.data.appearance = migrateAppearance(state.data.appearance);
    }
    if (!state.data.appearance.child)  state.data.appearance.child  = { owned: ['default'], active: { ...DEFAULT_ACTIVE } };
    if (!state.data.appearance.parent) state.data.appearance.parent = { active: { ...DEFAULT_ACTIVE } };
}

function _resetAppearanceVars() {
    const html = document.documentElement;
    // Скидаємо CSS змінні палітр
    const allVarNames = Object.values(COMPONENTS.palettes)
        .flatMap(p => Object.keys(p.vars || {}));
    [...new Set(allVarNames)].forEach(v => html.style.removeProperty(v));
    html.style.removeProperty('--font-main');
    html.style.removeProperty('--radius-btn');
    // Скидаємо badge CSS-змінні
    const badgeVarNames = Object.values(COMPONENTS.badges)
        .flatMap(b => Object.keys(b.vars || {}));
    [...new Set(badgeVarNames)].forEach(v => html.style.removeProperty(v));
    // Скидаємо data-атрибути
    html.removeAttribute('data-bg');
    html.removeAttribute('data-palette');
    html.removeAttribute('data-font');
    html.removeAttribute('data-buttons');
    html.removeAttribute('data-badge');
    html.removeAttribute('data-decorated');
}

function _applyComponents(active) {
    const html = document.documentElement;
    const palette = COMPONENTS.palettes[active.palette] || COMPONENTS.palettes.default;
    const font    = COMPONENTS.fonts[active.font]       || COMPONENTS.fonts.default;
    const buttons = COMPONENTS.buttons[active.buttons]  || COMPONENTS.buttons.default;
    const badge   = COMPONENTS.badges[active.badge]     || COMPONENTS.badges.default;

    // Палітра — CSS змінні + data-palette для CSS :root[data-palette="X"] селекторів
    Object.entries(palette.vars || {}).forEach(([k, v]) => html.style.setProperty(k, v));
    html.dataset.palette = active.palette || 'default';

    // Прапорець decorated — палітра приносить декоративні зображення.
    // CSS-правила під :root[data-decorated="true"] активуються автоматично.
    // Для додавання декору в нову тему — просто додай decorated: true та потрібні
    // --decor-* CSS-змінні в палітру. Жодних змін в цьому файлі не потрібно.
    if (palette.decorated) {
        html.dataset.decorated = 'true';
    }

    // Шрифт — data-font для можливих CSS селекторів
    html.style.setProperty('--font-main', font.value);
    html.dataset.font = active.font || 'default';

    // Кнопки — data-buttons для можливих CSS селекторів
    Object.entries(buttons.vars || {}).forEach(([k, v]) => html.style.setProperty(k, v));
    html.dataset.buttons = active.buttons || 'default';

    // Бейдж — CSS змінні для .z-badge скрізь у програмі
    Object.entries(badge.vars || {}).forEach(([k, v]) => html.style.setProperty(k, v));
    html.dataset.badge = active.badge || 'default';

    // Фон
    html.dataset.bg = active.background || 'default';
}

// Публічна функція — викликається при завантаженні та при зміні профілю
export function applyAppearance() {
    _ensureAppearance();
    const profile = _getProfile();
    const active  = profile.active || DEFAULT_ACTIVE;
    _resetAppearanceVars();
    _applyComponents(active);
    // 6в — застосовуємо рамку профілю (тільки якщо дитина активна)
    if (!state.parent.isParent && state.activeChildId) {
        applyActiveBorder(state.activeChildId);
    }
}

// ════════════════════════════════════════════════════
// ⭐  КУПІВЛЯ ТЕМИ
// ════════════════════════════════════════════════════
export function buyTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    // У режимі розробника — активуємо без купівлі і без збереження
    if (_devMode) {
        activateTheme(themeId, true);
        return;
    }

    _ensureAppearance();
    const owned = state.data.appearance.child.owned || ['default'];

    // Вже куплена — просто активуємо
    if (owned.includes(themeId)) {
        activateTheme(themeId);
        return;
    }

    // Перевірка балансу
    if ((state.data.balance || 0) < theme.price) {
        alert(`Недостатньо зірок!\n\nПотрібно: ${theme.price}⭐\nЄ: ${state.data.balance}⭐`);
        return;
    }

    if (!confirm(`Купити тему "${theme.name}" за ${theme.price}⭐?`)) return;

    // Додаємо тему в owned дитячого профілю
    state.data.appearance.child.owned.push(themeId);

    // spendStars: списує зірки, додає запис, recalculate + giveRewards, saveData, updateUI
    spendStars(theme.price, {
        category:    'theme',
        description: `🎨 Тема "${theme.name}"`,
        desc:        `🎨 Тема "${theme.name}"`,
    });

    // activateTheme робить перерендер магазину + кастомізації
    activateTheme(themeId);

    // Оновлюємо баланс у header
    import('./ui.js').then(m => m.updateUI());

    alert(`✅ Тема "${theme.name}" куплена і активована!`);
}

// ════════════════════════════════════════════════════
// 🎨  АКТИВАЦІЯ ТЕМИ / КОМПОНЕНТА
// ════════════════════════════════════════════════════
export function activateTheme(themeId, devOnly = false) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    _ensureAppearance();

    // У devMode — зберігаємо в _devActive для поточного профілю
    if (devOnly || _devMode) {
        const role = state.data.isParent ? 'parent' : 'child';
        _devActive[role] = { theme: themeId, ...theme.components };
        _resetAppearanceVars();
        _applyComponents(_devActive[role]);
        renderThemeShop();  // ⬅ перерендер магазину/кастомізації
        return;
    }

    const profile = _getProfile();
    profile.active = { theme: themeId, ...theme.components };
    _resetAppearanceVars();
    _applyComponents(profile.active);
    _saveCurrentAppearance();
    renderThemeShop();  // ⬅ перерендер магазину/кастомізації
}

export function setComponent(type, id) {
    if (!state.data.appearance) state.data.appearance = { ...DEFAULT_APPEARANCE, owned: [...DEFAULT_APPEARANCE.owned] };
    if (!state.data.appearance.active) state.data.appearance.active = { ...DEFAULT_APPEARANCE.active };

    _ensureAppearance();

    // У devMode — зберігаємо в _devActive для поточного профілю
    if (_devMode) {
        const role = state.data.isParent ? 'parent' : 'child';
        const base = _devActive[role] || _getProfile().active || DEFAULT_ACTIVE;
        _devActive[role] = { ...base, [type]: id, theme: 'custom' };
        _resetAppearanceVars();
        _applyComponents(_devActive[role]);
        renderThemeShop();
        return;
    }

    const profile = _getProfile();
    if (!profile.active) profile.active = { ...DEFAULT_ACTIVE };
    profile.active[type] = id;
    profile.active.theme = 'custom';

    _resetAppearanceVars();
    _applyComponents(profile.active);
    _saveCurrentAppearance();
    renderThemeShop();
}

// ════════════════════════════════════════════════════
// 👀  ПРОБНИЙ РЕЖИМ (60 секунд)
// ════════════════════════════════════════════════════
let _previewTimer    = null;
let _previewOriginal = null;
let _devActive       = { child: null, parent: null };  // devMode стан для кожного профілю

// ── Режим розробника — тільки в пам'яті, ніколи не зберігається ──
let _devMode = false;

export function isDevMode() { return _devMode; }

export function toggleDevMode() {
    // DevMode — тільки для батьків
    if (!state.parent.isParent) return;

    _devMode = !_devMode;
    if (!_devMode) {
        // Скидаємо devActive для поточного профілю і відновлюємо реальну тему
        const role = state.data.isParent ? 'parent' : 'child';
        _devActive[role] = null;
        _ensureAppearance();
        _resetAppearanceVars();
        _applyComponents(_getProfile().active || DEFAULT_ACTIVE);
        // Скидаємо вибрану дитину в dev-тесті рамок
        renderBorderSection._devChildId = null;
    }
    renderThemeShop();

    const banner = document.getElementById('devModeBanner');
    if (_devMode && !banner) {
        const div = document.createElement('div');
        div.id = 'devModeBanner';
        div.className = 'dev-mode-banner';
        div.innerHTML = '🛠️ Режим розробника — всі теми доступні без покупки. Не зберігається у Firebase.';
        document.body.prepend(div);
    } else if (!_devMode && banner) {
        banner.remove();
    }
}

export function stopAllPreviews() {
    stopPreview(false);
    resetBorderPreview();
}

// ════════════════════════════════════════════════════
// 🖼️  РАМКА ПРОФІЛЮ — застосування і preview (6в)
// ════════════════════════════════════════════════════

// Застосовує активну рамку дитини до DOM
// — встановлює --profile-color і data-border-style на <html>
export function applyActiveBorder(childId) {
    const cid  = childId || state.activeChildId;
    const meta = state.parent.children?.[cid];
    if (!meta) return;
    _ensureBorder(cid);

    const color     = meta.color                || '#4dabf7';
    const line      = meta.border?.line         || 'solid';
    const animation = meta.border?.animation    || 'none';

    document.documentElement.style.setProperty('--profile-color', color);
    document.documentElement.setAttribute('data-border-line', line);
    document.documentElement.setAttribute('data-border-animation', animation);
    if (animation === 'rainbow') { _wrapHeaderForRainbow(); _removeSnakeBorders(); }
    else if (animation === 'shimmer') { _unwrapHeader(); _addSnakeBorders(); }
    else { _unwrapHeader(); _removeSnakeBorders(); }
}

// Скидає рамку до нейтрального стану (logout / дитина входить)
export function resetBorderToNone() {
    document.documentElement.style.removeProperty('--profile-color');
    document.documentElement.removeAttribute('data-border-line');
    document.documentElement.removeAttribute('data-border-animation');
    _unwrapHeader();
    _removeSnakeBorders();
}

// ─── Rainbow обгортка ────────────────────────────────
function _wrapHeaderForRainbow() {
    const header = document.querySelector('.header');
    if (!header || header.parentElement?.classList.contains('rainbow-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'rainbow-wrap';
    header.parentNode.insertBefore(wrap, header);
    wrap.appendChild(header);
}

function _unwrapHeader() {
    const wrap = document.querySelector('.rainbow-wrap');
    if (!wrap) return;
    wrap.parentNode.insertBefore(wrap.firstElementChild, wrap);
    wrap.remove();
}

function _addSnakeBorders() {
    const header = document.querySelector('.header');
    if (!header || header.querySelector('.snake-border')) return;
    for (let i = 0; i < 4; i++) {
        const span = document.createElement('span');
        span.className = 'snake-border';
        header.prepend(span);
    }
}

function _removeSnakeBorders() {
    document.querySelectorAll('.snake-border').forEach(el => el.remove());
}

// ─── Preview рамки ────────────────────────────────────
// ─── Pending border — проміжний стан між вибором і збереженням ───
// { color: '#hex', style: 'solid' } або null
let _pendingBorder       = null;
let _pendingBorderChildId = null;
// Оригінал до preview (для скидання)
let _originalBorder      = null;

// Починає редагування рамки для childId — зберігає оригінал
function _initPendingBorder(childId) {
    const meta = state.parent.children?.[childId];
    if (!meta) return;
    _ensureBorder(childId);
    if (_pendingBorderChildId !== childId) {
        resetPendingBorder();
        _pendingBorderChildId = childId;
        _originalBorder = {
            color:     meta.color                     || '#4dabf7',
            line:      meta.border?.line              || 'solid',
            animation: meta.border?.animation         || 'none',
        };
        _pendingBorder = { ..._originalBorder };
    }
}

// Встановлює pending color — тільки DOM, не пише в state/Firebase
export function previewBorderColor(hex, childId) {
    const cid = childId || state.activeChildId;
    _initPendingBorder(cid);
    if (!_pendingBorder) return;
    _pendingBorder.color = hex;
    document.documentElement.style.setProperty('--profile-color', hex);
}

// Встановлює pending line (стиль лінії) — тільки DOM
export function previewBorderLine(line, childId) {
    const cid = childId || state.activeChildId;
    _initPendingBorder(cid);
    if (!_pendingBorder) return;
    _pendingBorder.line = line;
    document.documentElement.setAttribute('data-border-line', line);
}

// Встановлює pending animation — тільки DOM
export function previewBorder(animation, childId) {
    const cid = childId || state.activeChildId;
    _initPendingBorder(cid);
    if (!_pendingBorder) return;
    _pendingBorder.animation = animation;
    document.documentElement.setAttribute('data-border-animation', animation);
    if (animation === 'rainbow') { _wrapHeaderForRainbow(); _removeSnakeBorders(); }
    else if (animation === 'shimmer') { _unwrapHeader(); _addSnakeBorders(); }
    else { _unwrapHeader(); _removeSnakeBorders(); }
}

// Скидає pending до оригіналу і повертає DOM
export function resetPendingBorder() {
    if (_originalBorder) {
        document.documentElement.style.setProperty('--profile-color', _originalBorder.color);
        document.documentElement.setAttribute('data-border-line', _originalBorder.line || 'solid');
        document.documentElement.setAttribute('data-border-animation', _originalBorder.animation || 'none');
        if (_originalBorder.animation === 'rainbow') { _wrapHeaderForRainbow(); _removeSnakeBorders(); }
        else if (_originalBorder.animation === 'shimmer') { _unwrapHeader(); _addSnakeBorders(); }
        else { _unwrapHeader(); _removeSnakeBorders(); }
    } else {
        // Немає pending — не чіпаємо активну анімацію
        const curAnim = document.documentElement.getAttribute('data-border-animation');
        if (curAnim !== 'rainbow') _unwrapHeader();
        if (curAnim !== 'shimmer') _removeSnakeBorders();
    }
    _pendingBorder        = null;
    _pendingBorderChildId = null;
    _originalBorder       = null;
}

// Alias для зворотної сумісності
export function resetBorderPreview() { resetPendingBorder(); }

// Повертає поточний pending або null
export function getPendingBorder() { return _pendingBorder ? { ..._pendingBorder } : null; }

// Зберігає pending border в state + Firebase + запис в історію (для платних стилів)
export function commitPendingBorder(childId) {
    const cid = childId || _pendingBorderChildId || state.activeChildId;
    if (!_pendingBorder || !cid) return false;
    const meta = state.parent.children?.[cid];
    if (!meta) return false;
    _ensureBorder(cid);

    const newAnimation = _pendingBorder.animation;
    const newLine      = _pendingBorder.line;
    const newColor     = _pendingBorder.color;

    // Купівля платної анімації якщо ще не куплено
    const animDef = BORDER_ANIMATIONS.find(a => a.id === newAnimation);
    const needBuy = animDef && !animDef.free
                 && !meta.border.ownedAnimations.includes(newAnimation)
                 && !_devMode;

    if (needBuy) {
        if (cid !== state.activeChildId) {
            alert('Платні анімації може придбати лише сама дитина у своєму профілі.');
            return false;
        }
        const balance = Number(state.data.achievements?.counters?._runningBalance ?? state.data.balance);
        if (balance < animDef.stars) {
            const missing = animDef.stars - balance;
            alert(`⭐ Ще ${missing} зірок — і мрія твоя!`);
            return false;
        }
        const spent = spendStars(animDef.stars, {
            category:    'appearance',
            description: `Анімація рамки «${animDef.name}»`,
        });
        if (!spent) return false;
        meta.border.ownedAnimations.push(newAnimation);
    }

    // Записуємо в state
    meta.color             = newColor;
    meta.border.line       = newLine;
    meta.border.animation  = newAnimation;

    // Firebase (статичні імпорти вже є у файлі)
    saveBorder(cid);
    saveChildMeta(cid);

    // Оновлюємо DOM
    applyActiveBorder(cid);
    if (window.updateParentChildBar) window.updateParentChildBar();

    // Скидаємо pending
    _pendingBorder        = null;
    _pendingBorderChildId = null;
    _originalBorder       = { color: newColor, line: newLine, animation: newAnimation };

    return true;
}

// ─── Активація кольору профілю (без pending) ───────────
// Використовується тільки коли треба одразу зберегти колір
// без проміжного pending стану (наприклад saveChildProfile).
export function setProfileColor(hex, childId) {
    const cid  = childId || state.activeChildId;
    const meta = state.parent.children?.[cid];
    if (!meta) return;
    meta.color = hex;
    document.documentElement.style.setProperty('--profile-color', hex);
    if (window.updateParentChildBar) window.updateParentChildBar();
}

export function startPreview(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    // Зупиняємо попередній preview якщо є
    if (_previewTimer) stopPreview(false);

    // Зберігаємо поточний стан
    _previewOriginal = { ...(_getProfile().active || DEFAULT_APPEARANCE.active) };

    // Застосовуємо тему
    _resetAppearanceVars();
    _applyComponents(theme.components);

    // Банер
    _showBanner(theme, 30);

    // Таймер
    let s = 30;
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

    _ensureAppearance();
    const childProfile  = state.data.appearance.child;
    const role = state.data.isParent ? 'parent' : 'child';
    // owned завжди з дитячого профілю (теми купуються дитиною)
    const owned = _devMode ? THEMES.map(t => t.id) : (childProfile.owned || ['default']);
    // active з поточного профілю або з devActive
    const devA  = _devActive[role];
    const active = (devA) ? devA : (_getProfile().active || DEFAULT_ACTIVE);
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
            if (isActive) {
                // Активна тема — лише мітка
                actionsHTML = `<button class="btn btn-primary btn-compact" disabled>✓ Активна</button>`;
            } else {
                // Куплена, але не активна — активувати + (батькам) повернути
                const refundBtn = (isParent && theme.price > 0)
                    ? `<button class="btn btn-refund btn-compact" onclick="window.__zRefundTheme('${theme.id}')" title="Повернути ${theme.price}⭐">↩ ${theme.price}⭐</button>`
                    : '';
                actionsHTML = `<button class="btn btn-primary btn-compact" onclick="window.__zActivateTheme('${theme.id}')">🎨 Активувати</button>${refundBtn}`;
            }
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
    window.__zToggleDevMode  = toggleDevMode;

    // Активний стан кнопки devMode (видимість керується централізовано в ui.js)
    const devBtn = document.getElementById('devModeBtn');
    if (devBtn) devBtn.classList.toggle('active', _devMode);

    // Секція рамки — показується лише для дитини
    renderBorderSection();
}

function _renderCustomize(container, owned, active) {
    // owned — завжди список дитячих куплених тем
    // Збираємо доступні компоненти з куплених тем
    const available = { palettes: new Set(['default']), fonts: new Set(['default']), buttons: new Set(['default']), backgrounds: new Set(['default']), badges: new Set(['default']) };
    // type → ключ у available
    const typeToKey = { palette: 'palettes', font: 'fonts', buttons: 'buttons', background: 'backgrounds', badge: 'badges' };
    owned.forEach(themeId => {
        const theme = THEMES.find(t => t.id === themeId);
        if (!theme) return;
        Object.entries(theme.components).forEach(([type, id]) => {
            const key = typeToKey[type];
            if (key && available[key]) available[key].add(id);
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
            ${makeRow('palette',    '🎨 Кольори',  COMPONENTS.palettes,    available.palettes)}
            ${makeRow('font',       '🔤 Шрифт',    COMPONENTS.fonts,       available.fonts)}
            ${makeRow('buttons',    '🖱️ Кнопки',   COMPONENTS.buttons,     available.buttons)}
            ${makeRow('background', '🌄 Фон',       COMPONENTS.backgrounds, available.backgrounds)}
            ${makeRow('badge',      '🔴 Бейдж',     COMPONENTS.badges,      available.badges)}
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
    const owned = appearance.child?.owned || ['default'];

    if (!owned.includes(themeId)) {
        alert('❌ Ця тема не куплена');
        return;
    }

    // Не можна повернути активну тему
    if (state.data.appearance?.child?.active?.theme === themeId || state.data.appearance?.parent?.active?.theme === themeId) {
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
    state.data.appearance.child.owned = owned.filter(id => id !== themeId);

    // Повертаємо зірки
    state.data.balance = (state.data.balance || 0) + theme.price;

    // Запис в історію
    if (!state.data.records) state.data.records = [];
    state.data.records.push({
        id:       Date.now(),
        date:     new Date().toISOString().split('T')[0],
        type:     'earn',
        category: 'special',
        description: `↩ Повернення теми "${theme.name}"`,
        desc:        `↩ Повернення теми "${theme.name}"`,
        stars:    theme.price,
    });

    // recalculate + giveRewards (Ощадлива може спрацювати після повернення зірок)
    import('./achievements.js').then(({ recalculateAchievements, giveRewardsForNewAchievements }) => {
        const levelsBefore = { ...(state.data.achievements?.levels || {}) };
        recalculateAchievements();
        giveRewardsForNewAchievements(levelsBefore);
        saveRecords();
        renderThemeShop();
        import('./ui.js').then(m => m.updateUI());
        alert(`✅ Тему "${theme.name}" повернуто.\n+${theme.price}⭐ повернуто на рахунок.`);
    });
}

// ════════════════════════════════════════════════════
// 🖼️  РАМКА ПРОФІЛЮ — рендер блоку налаштувань
// ════════════════════════════════════════════════════

// Повертає HTML блоку налаштування рамки для дитини childId
function _renderBorderBlock(childId) {
    const meta        = state.parent.children?.[childId] || {};
    const border      = meta.border || {};
    const ownedAnims  = border.ownedAnimations || [];

    // Використовуємо pending-стан якщо є (для коректного active-маркування)
    const pending     = (_pendingBorderChildId === childId && _pendingBorder) ? _pendingBorder : null;
    const activeColor = pending?.color     ?? meta.color          ?? '#4dabf7';
    const activeLine  = pending?.line      ?? border.line         ?? 'solid';
    const activeAnim  = pending?.animation ?? border.animation    ?? 'none';

    const colorOpts = BORDER_COLORS_FREE.map(({ hex }) => `
        <button class="profile-color-btn${activeColor === hex ? ' active' : ''}"
            style="--btn-color:${hex}"
            onclick="previewBorderColor('${hex}','${childId}');renderBorderBlock('${childId}')">
        </button>`).join('');

    const lineOpts = BORDER_LINES.map(l => `
        <button class="border-style-btn${activeLine === l.id ? ' active' : ''}"
            onclick="previewBorderLine('${l.id}','${childId}');renderBorderBlock('${childId}')">
            ${l.name}
        </button>`).join('');

    const animOpts = BORDER_ANIMATIONS.map(a => {
        const isActive = activeAnim === a.id;
        const isOwned  = a.free || ownedAnims.includes(a.id);
        const badge    = a.free
            ? ''
            : isOwned
                ? '<span class="border-style-badge owned">✅</span>'
                : `<span class="border-style-badge buy">⭐${a.stars}</span>`;
        return `
            <button class="border-style-btn${isActive ? ' active' : ''}${!isOwned ? ' locked' : ''}"
                onclick="previewBorder('${a.id}','${childId}');renderBorderBlock('${childId}')">
                ${a.name}${badge}
            </button>`;
    }).join('');

    return `
        <div class="form-group border-block" id="borderBlock_${childId}" style="--profile-color:${activeColor}">
            <label class="card-label">🎨 Колір профілю</label>
            <div class="profile-color-grid">${colorOpts}</div>

            <label class="card-label" style="margin-top:10px;">▬ Стиль лінії</label>
            <div class="border-style-grid">${lineOpts}</div>

            <label class="card-label" style="margin-top:10px;">✨ Анімація</label>
            <div class="border-style-grid">${animOpts}</div>

            <div class="border-actions">
                <button class="btn btn-primary btn-compact"
                    onclick="commitAndSaveBorder('${childId}')">
                    💾 Зберегти рамку
                </button>
                <button class="btn btn-compact"
                    onclick="cancelBorder('${childId}')">
                    ✖ Скасувати
                </button>
            </div>
        </div>`;
}

// Додає snake-border spans на active кнопки в блоці якщо shimmer
function _addSnakesToActiveBtns(childId) {
    const block = document.getElementById(`borderBlock_${childId}`);
    if (!block) return;
    const anim = document.documentElement.getAttribute('data-border-animation');
    if (anim !== 'shimmer') return;
    block.querySelectorAll('.border-style-btn.active').forEach(btn => {
        if (!btn.querySelector('.snake-border')) {
            for (let i = 0; i < 4; i++) {
                const span = document.createElement('span');
                span.className = 'snake-border';
                btn.prepend(span);
            }
        }
    });
}

// Перемальовує тільки borderBlock у DOM (без повного ре-рендеру)
export function renderBorderBlock(childId) {
    const el = document.getElementById(`borderBlock_${childId}`);
    if (!el) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = _renderBorderBlock(childId);
    el.replaceWith(tmp.firstElementChild);
    _addSnakesToActiveBtns(childId);
}

// Зберігає pending border
export function commitAndSaveBorder(childId) {
    const ok = commitPendingBorder(childId);
    if (ok) renderBorderBlock(childId);
}

// Скасовує pending border
export function cancelBorder(childId) {
    resetPendingBorder();
    renderBorderBlock(childId);
}

// Рендерить секцію рамки в #borderSectionContainer (розділ Теми).
// Для дитини — повні налаштування рамки.
// Для батька в devMode — тест рамок без збереження.
export function renderBorderSection() {
    const container = document.getElementById('borderSectionContainer');
    if (!container) return;

    if (state.data.isParent) {
        // Батько бачить блок тільки у devMode
        if (!_devMode) { container.innerHTML = ''; return; }

        const children = state.parent.children || {};
        const childIds = Object.keys(children);
        if (!childIds.length) { container.innerHTML = ''; return; }

        // Зберігаємо вибрану дитину між перерендерами
        if (!renderBorderSection._devChildId || !children[renderBorderSection._devChildId]) {
            renderBorderSection._devChildId = childIds[0];
        }
        const selectedId = renderBorderSection._devChildId;

        const tabs = childIds.map(id => {
            const name = children[id]?.name || id;
            const isActive = id === selectedId;
            return `<button class="border-dev-tab${isActive ? ' active' : ''}"
                onclick="window.__zBorderDevSelect('${id}')">${name}</button>`;
        }).join('');

        container.innerHTML = `
            <div class="settings-block-content" style="margin-top:16px;">
                <p class="text-muted font-sm mb-md">🛠️ Тест рамок — зміни зберігаються у профілях дітей.</p>
                <div class="border-dev-tabs">${tabs}</div>
                ${_renderBorderBlock(selectedId)}
            </div>`;

        window.__zBorderDevSelect = (childId) => {
            renderBorderSection._devChildId = childId;
            renderBorderSection();
        };
        return;
    }

    // Дитина — звичайні налаштування рамки
    const childId = state.activeChildId || 'child_1';
    container.innerHTML = `
        <div class="settings-block-content" style="margin-top:16px;">
            <p class="text-muted font-sm mb-md">Налаштуй рамку свого профілю — колір, стиль лінії та анімацію.</p>
            ${_renderBorderBlock(childId)}
        </div>`;
    _addSnakesToActiveBtns(childId);
}
