// Довідка: заголовки, вибір ролі та керування модальним вікном

export const VERSION = 'v4.20260918.0946';

import { state } from './state.js';
import { CHANGELOG } from './changelog.js';
import { helpChild } from './help-child.js';
import { helpParent } from './help-parent.js';

// Зберігаємо публічні імпорти для auth.js, navigation.js та index.html.
export { renderStarsGuide, getStreakModalContent } from './help-child.js';

const TITLES = {
    addSection:          '➕ Додати',
    scheduleSection:     '📋 Розклад уроків',
    tasksSection:        '✅ Завдання',
    rewardsSection:      '🎁 Витрати',
    achievementsSection: '🏆 Досягнення',
    historySection:      '📜 Історія',
    statsSection:        '📊 Статистика',
    feedbackSection:     '💬 Зворотній зв`язок',
    settingsSection:     '⚙️ Налаштування',
    about:               'ℹ️ Про програму',
    changelog:           '📝 Історія змін',
};


function renderChangelogHTML() {
    return CHANGELOG.map((entry, i) => `
        ${i > 0 ? '<hr style="border:none;border-top:1px solid #eee;margin:0 0 14px;">' : ''}
        <div style="margin-bottom:14px;">
            <div style="font-weight:700; color:var(--secondary); margin-bottom:5px;">
                ${entry.version}
                <span style="font-size:12px; color:var(--text-hint); font-weight:400; margin-left:6px;">${entry.date}</span>
            </div>
            <ul style="margin:0; padding-left:18px; line-height:1.75; font-size:13px;">
                ${entry.changes.map(c => `<li>${c}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

export function showHelp(sectionId) {
    const modal   = document.getElementById('helpModal');
    const title   = document.getElementById('helpModalTitle');
    const content = document.getElementById('helpModalContent');

    title.textContent = TITLES[sectionId] || '❓ Довідка';

    // data-section дозволяє CSS таргетити модалку конкретного розділу
    // (зокрема для декоративних зображень у темах з decorated: true)
    modal.dataset.section = sectionId;

    if (sectionId === 'changelog') {
        content.innerHTML = renderChangelogHTML();
        // Позначаємо changelog прочитаним через notifications.js
        if (window.markChangelogRead) window.markChangelogRead();
    } else {
        const childId = state.activeChildId;
        const texts   = state.data.isParent ? helpParent(childId) : helpChild(childId);
        content.innerHTML = texts[sectionId] || '<p>Інформація відсутня</p>';
        // Застосовуємо гендерні мітки і opt-girl/opt-boy після рендеру
        if (window.updateUI) window.updateUI();
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeHelp() {
    document.getElementById('helpModal').style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('helpModal');
    if (e.target === modal) closeHelp();
});
