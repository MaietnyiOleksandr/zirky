// ════════════════════════════════════════════════════
// ⚙️   settings.js — Налаштування / Експорт / Імпорт
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260504.2323';

// ════════════════════════════════════════════════════════════

import { state } from './state.js';
import { recalculateAchievements, giveRewardsForNewAchievements } from './achievements.js';
import { saveData, saveAllFeedback } from './firebase.js';
import { getFeedbackItems } from './feedback.js';

// ════════════════════════════════════════════════════════════
// // ⚙️   БЛОК: Налаштування / Експорт / Імпорт
// ════════════════════════════════════════════════════════════
export function showDataInfo() {
    const container = document.getElementById('dataInfo');
    if (!container) return;
    
    const recordsCount = state.data.records?.length || 0;
    const balance = state.data.balance || 0;
    const achievementsCount = Object.keys(state.data.achievements?.levels || {}).length;
    const freezePeriodsCount = state.data.achievements?.freezePeriods?.length || 0;
    
    // Розмір даних
    const dataSize = new Blob([JSON.stringify(state.data)]).size;
    const sizeKB = (dataSize / 1024).toFixed(2);
    
    container.innerHTML = `
        <div style="display:grid;gap:8px;">
            <div>📝 Записів в історії: <strong>${recordsCount}</strong></div>
            <div>⭐ Поточний баланс: <strong>${balance} зірок</strong></div>
            <div>🏆 Досягнень отримано: <strong>${achievementsCount}</strong></div>
            <div>❄️ Періодів канікул: <strong>${freezePeriodsCount}</strong></div>
            <div>💾 Розмір даних: <strong>${sizeKB} KB</strong></div>
        </div>
        <div class="versions-accordion">
            <button id="versionsBtn" class="versions-accordion-btn">
                <span>📋 Інформація про версії</span>
                <span id="versionsArrow" class="versions-accordion-arrow">▶</span>
            </button>
            <div id="versionsBody" class="versions-accordion-body">
                <div class="text-hint font-xs text-center">Завантаження...</div>
            </div>
        </div>
    `;

    // Accordion — зчитує VERSION динамічно з вже завантажених модулів
    document.getElementById('versionsBtn').addEventListener('click', async function() {
        const body = document.getElementById('versionsBody');
        const arrow = document.getElementById('versionsArrow');
        const isOpen = body.style.display !== 'none';

        if (isOpen) {
            body.style.display = 'none';
            arrow.textContent = '▶';
            return;
        }

        body.style.display = 'block';
        arrow.textContent = '▼';

        // HTML та CSS — читаємо з DOM
        const htmlVer = document.querySelector('meta[charset]')?.nextElementSibling
            ?.previousSibling?.textContent?.match(/v3\.\d+\.\d+/)?.[0]
            || (() => {
                const c = document.documentElement.outerHTML;
                return c.match(/version:\s*(v3\.\d+\.\d+)/)?.[1] || '—';
            })();

        // Читаємо версію CSS з завантаженого stylesheet
        let cssVer = '—';
        try {
            const cssText = Array.from(document.styleSheets)
                .find(s => s.href?.includes('style.css'));
            if (cssText) {
                const resp = await fetch(cssText.href);
                const text = await resp.text();
                cssVer = text.match(/v3\.\d+\.\d+/)?.[0] || '—';
            }
        } catch(e) {}

        // JS файли — відсортовані за алфавітом
        const jsFiles = [
            'achievements.js','appearance.js','auth.js','changelog.js','config.js','feedback.js','firebase.js',
            'freeze.js','goals.js','help.js','history.js','navigation.js',
            'records.js','rewards.js','settings.js','state.js',
            'stats.js','ui.js','utils.js'
        ];

        const makeRow = (name, ver, isHeader = false) => {
            const rowClass = isHeader ? 'versions-row versions-row--header' : 'versions-row';
            const verClass = ver !== '—' ? 'versions-row-ver versions-row-ver--ok' : 'versions-row-ver versions-row-ver--none';
            return `<div class="${rowClass}">
                <span class="versions-row-name">${name}</span>
                <span class="${verClass}">${ver}</span>
            </div>`;
        };

        // Збираємо рядки HTML+CSS
        let rows = [
            makeRow('🌐 index.html', htmlVer),
            makeRow('🎨 style.css', cssVer),
            `<div style="height:6px;"></div>`,
        ];

        // Додаємо JS файли
        const jsRows = await Promise.all(jsFiles.map(async fname => {
            try {
                const mod = await import('./' + fname);
                return makeRow('📄 ' + fname, mod.VERSION || '—');
            } catch(e) {
                return makeRow(fname, 'помилка');
            }
        }));

        body.innerHTML = rows.join('') + jsRows.join('');
    });
    
    // Батьківські блоки — показуємо тільки для батьків
    const pinBlock     = document.getElementById('pinSettingsBlock');
    const balanceBlock = document.getElementById('balanceCorrectionBlock');
    const ratesBlock   = document.getElementById('conversionRatesBlock');

    if (pinBlock) pinBlock.style.display = state.data.isParent ? 'block' : 'none';

    if (balanceBlock) {
        balanceBlock.style.display = state.data.isParent ? 'block' : 'none';
        if (state.data.isParent) {
            const balDisplay = document.getElementById('currentBalanceDisplay');
            if (balDisplay) balDisplay.textContent = (state.data.balance || 0) + '⭐';
        }
    }

    if (ratesBlock) {
        ratesBlock.style.display = state.data.isParent ? 'block' : 'none';
        if (state.data.isParent) {
            const rates = state.data.conversionRates || { minutesPerStar: 2, moneyPerStar: 1 };
            const mEl = document.getElementById('minutesPerStar');
            const gEl = document.getElementById('moneyPerStar');
            if (mEl) mEl.value = rates.minutesPerStar;
            if (gEl) gEl.value = rates.moneyPerStar;
            const mSpan = document.getElementById('currentMinutesRate');
            const gSpan = document.getElementById('currentMoneyRate');
            if (mSpan) mSpan.textContent = rates.minutesPerStar;
            if (gSpan) gSpan.textContent = rates.moneyPerStar;
            const pinEl = document.getElementById('currentPin');
            if (pinEl) pinEl.textContent = state.data.pin;
        }
    }
}

export function exportData() {
    try {
        // Додаємо метадані
        const dataToExport = {
            ...state.data,
            feedback: getFeedbackItems(),
            version: 1,
            exportDate: new Date().toISOString(),
            appName: "Зірки Успіху"
        };
        
        const json = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        const now = new Date();
        const dateTime = `${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
        a.download = `${dateTime}-zirky-backup.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        alert("✅ Дані успішно експортовано!\n\nФайл: " + a.download);
    } catch (e) {
        alert("❌ Помилка експорту: " + e.message);
        console.error(e);
    }
}

export function importData(event) {
    // Якщо дитячий профіль — потрібен PIN батьків
    if (!state.data.isParent) {
        const pin = prompt('🔐 Введіть PIN батьків для імпорту даних:');
        if (pin !== String(state.data.pin)) {
            alert('❌ Невірний PIN');
            event.target.value = '';
            return;
        }
    }
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            
            // Базова валідація
            if (!imported || typeof imported !== 'object') {
                alert("❌ Невірний формат файлу");
                return;
            }
            
            if (!Array.isArray(imported.records)) {
                alert("❌ Файл не містить записів або має невірний формат");
                return;
            }
            
            if (imported.balance === undefined) {
                alert("❌ Файл не містить балансу");
                return;
            }
            
            // Показуємо інфо про файл ПЕРЕД імпортом
            const recordsCount = imported.records?.length || 0;
            const balance = imported.balance || 0;
            const exportDate = imported.exportDate ? new Date(imported.exportDate).toLocaleDateString('uk-UA') : 'невідомо';
            const feedbackCount = imported.feedback?.length || 0;
            
            const confirmMsg = `📁 Файл: ${file.name}\n\n` +
                `📊 Що буде імпортовано:\n` +
                `• Записів: ${recordsCount}\n` +
                `• Баланс: ${balance}⭐\n` +
                `• Повідомлень зворотнього зв'язку: ${feedbackCount}\n` +
                `• Дата експорту: ${exportDate}\n\n` +
                `⚠️ УВАГА: Це замінить всі поточні дані!\n\n` +
                `Продовжити?`;
            
            if (!confirm(confirmMsg)) {
                // Очищаємо input щоб можна було вибрати той же файл знову
                event.target.value = '';
                return;
            }
            
            // Нормалізація даних
            imported.balance = Number(imported.balance) || 0;
            imported.records = Array.isArray(imported.records) ? imported.records : [];
            imported.pin = imported.pin || '1234';
            imported.goal = imported.goal || null;
            imported.achievements = imported.achievements || {
                counters: {},
                streaks: {},
                levels: {},
                weekly: {},
                repeatableHistory: {},
                freezePeriods: []
            };
            
            // Витягуємо feedback перед тим як мутувати state.data
            const feedbackToRestore = Array.isArray(imported.feedback) ? imported.feedback : [];

            // Очищаємо метадані експорту
            delete imported.version;
            delete imported.exportDate;
            delete imported.appName;
            delete imported.feedback;
            
            // Замінюємо data
            // Мутуємо існуючий об'єкт щоб зберегти посилання
            Object.assign(state.data, imported);
            
            // Перераховуємо досягнення
            recalculateAchievements();
            
            // Зберігаємо основні дані в Firebase
            saveData();

            // Відновлюємо feedback в Firebase
            saveAllFeedback(feedbackToRestore);
            
            // Перезавантажуємо сторінку
            alert("✅ Дані успішно імпортовано!\n\nСторінка перезавантажиться.");
            setTimeout(() => location.reload(), 500);
            
        } catch (err) {
            alert("❌ Помилка імпорту: " + err.message);
            console.error(err);
        }
        
        // Очищаємо input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

export function resetAllData() {
    // Якщо дитячий профіль — потрібен PIN батьків
    if (!state.data.isParent) {
        const pin = prompt('🔐 Введіть PIN батьків для скидання даних:');
        if (pin !== String(state.data.pin)) {
            alert('❌ Невірний PIN');
            return;
        }
    }
    const confirm1 = confirm("⚠️ ВИ ВПЕВНЕНІ?\n\nЦе видалить ВСІ дані:\n• Всі оцінки та записи\n• Весь баланс зірок\n• Всі досягнення\n• Всі налаштування\n\nЦя дія НЕЗВОРОТНА!\n\nПродовжити?");
    if (!confirm1) return;
    
    const confirm2 = prompt("Щоб підтвердити, введіть: ВИДАЛИТИ");
    if (confirm2 !== "ВИДАЛИТИ") {
        alert("Скасовано");
        return;
    }
    
    // Скидаємо дані
    // Мутуємо існуючий об'єкт
    Object.assign(state.data, {
        records: [],
        balance: 0,
        pin: '1234',
        goal: null,
        achievements: {
            counters: {},
            streaks: {},
            levels: {},
            weekly: {},
            repeatableHistory: {},
            freezePeriods: []
        }
    });
    
    saveData();
    alert("✅ Всі дані скинуто\n\nСторінка перезавантажиться.");
    setTimeout(() => location.reload(), 500);
}

export function adjustBalance() {
    const input = document.getElementById('newBalanceInput');
    const newBalance = parseInt(input.value);
    
    if (isNaN(newBalance) || newBalance < 0) {
        alert('❌ Введіть коректне число (0 або більше)');
        return;
    }
    
    const oldBalance = state.data.balance || 0;
    
    const confirmMsg = `💰 Змінити баланс?\n\nБуло: ${oldBalance}⭐\nСтане: ${newBalance}⭐\n\nПродовжити?`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    // Змінюємо баланс
    state.data.balance = newBalance;

    // Перевіряємо досягнення (Ощадлива змінюється при зміні балансу)
    const levelsBefore = { ...(state.data.achievements?.levels || {}) };
    recalculateAchievements();
    giveRewardsForNewAchievements(levelsBefore);

    // Зберігаємо
    saveData();
    
    // Оновлюємо відображення
    showDataInfo();
    
    // Очищаємо поле
    input.value = '';
    
    alert(`✅ Баланс змінено!\n\nНовий баланс: ${newBalance}⭐`);
}

export function saveConversionRates() {
    const minutesPerStar = parseInt(document.getElementById('minutesPerStar')?.value);
    const moneyPerStar = parseInt(document.getElementById('moneyPerStar')?.value);

    if (!minutesPerStar || minutesPerStar < 1) { alert('❌ Некоректне значення хвилин!'); return; }
    if (!moneyPerStar || moneyPerStar < 1) { alert('❌ Некоректне значення гривень!'); return; }

    state.data.conversionRates = { minutesPerStar, moneyPerStar };
    saveData();

    // Оновлюємо поля на вкладці Витрати
    if (window.renderRewards) window.renderRewards();

    alert(`✅ Курси збережено!\n🎮 1⭐ = ${minutesPerStar} хв\n💵 1⭐ = ${moneyPerStar} грн`);
}
