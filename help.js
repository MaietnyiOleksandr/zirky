// ════════════════════════════════════════════════════
// ❓  help.js — Інструкції по розділах
//     Зірки Успіху | v3.20260427.2304
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260427.2304';

import { state } from './state.js';

// Заголовки розділів
const TITLES = {
    addSection:          '➕ Додати',
    historySection:      '📜 Історія',
    rewardsSection:      '🎁 Витрати',
    achievementsSection: '🏆 Досягнення',
    statsSection:        '📊 Статистика',
    settingsSection:     '⚙️ Налаштування',
    instructionsSection: '❓ Довідка',
    about:               'ℹ️ Про програму',
};

// Тексти інструкцій — ЗАГЛУШКИ (будуть замінені після затвердження)
const HELP_CHILD = {
    addSection:          '<p>🚧 Текст для дитини — розділ "Додати" (буде додано)</p>',
    historySection:      '<p>🚧 Текст для дитини — розділ "Історія" (буде додано)</p>',
    rewardsSection:      '<p>🚧 Текст для дитини — розділ "Витрати" (буде додано)</p>',
    achievementsSection: '<p>🚧 Текст для дитини — розділ "Досягнення" (буде додано)</p>',
    statsSection:        '<p>🚧 Текст для дитини — розділ "Статистика" (буде додано)</p>',
    settingsSection:     '<p>🚧 Текст для дитини — розділ "Налаштування" (буде додано)</p>',
    about:               '<p>🚧 "Про програму" для дитини (буде додано)</p>',
};

const HELP_PARENT = {
    addSection:          '<p>🚧 Текст для батьків — розділ "Додати" (буде додано)</p>',
    historySection:      '<p>🚧 Текст для батьків — розділ "Історія" (буде додано)</p>',
    rewardsSection:      '<p>🚧 Текст для батьків — розділ "Витрати" (буде додано)</p>',
    achievementsSection: '<p>🚧 Текст для батьків — розділ "Досягнення" (буде додано)</p>',
    statsSection:        '<p>🚧 Текст для батьків — розділ "Статистика" (буде додано)</p>',
    settingsSection:     '<p>🚧 Текст для батьків — розділ "Налаштування" (буде додано)</p>',
    about:               '<p>🚧 "Про програму" для батьків (буде додано)</p>',
};

export function showHelp(sectionId) {
    const modal = document.getElementById('helpModal');
    const title = document.getElementById('helpModalTitle');
    const content = document.getElementById('helpModalContent');

    const isParent = state.data.isParent;
    const texts = isParent ? HELP_PARENT : HELP_CHILD;

    title.textContent = TITLES[sectionId] || '❓ Довідка';
    content.innerHTML = texts[sectionId] || '<p>Інформація відсутня</p>';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeHelp() {
    document.getElementById('helpModal').style.display = 'none';
    document.body.style.overflow = '';
}

// Закриття по кліку на фон
document.addEventListener('click', (e) => {
    const modal = document.getElementById('helpModal');
    if (e.target === modal) closeHelp();
});
