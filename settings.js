// ════════════════════════════════════════════════════
// ⚙️   settings.js — Налаштування / Експорт / Імпорт
// ════════════════════════════════════════════════════

export const VERSION = 'v3.20260514.0850';

// ════════════════════════════════════════════════════════════

import { state } from './state.js';
import { recalculateAchievements, giveRewardsForNewAchievements } from './achievements.js';
import { saveData, saveAllFeedback } from './firebase.js';
import { getFeedbackItems } from './feedback.js';
import { THEMES } from './appearance.js';
import { dismissByAction } from './notifications.js';

// ════════════════════════════════════════════════════════════
// // ⚙️   БЛОК: Налаштування / Експорт / Імпорт
// ════════════════════════════════════════════════════════════

async function _loadVersionsTable() {
    const body = document.getElementById('versionsTableBody');
    if (!body) return;

    const htmlVer = (() => {
        const c = document.documentElement.outerHTML;
        return c.match(/version:\s*(v3\.\d+\.\d+)/)?.[1] || '—';
    })();

    let cssVer = '—';
    try {
        const cssText = Array.from(document.styleSheets).find(s => s.href?.includes('style.css'));
        if (cssText) {
            const resp = await fetch(cssText.href);
            const text = await resp.text();
            cssVer = text.match(/v3\.\d+\.\d+/)?.[0] || '—';
        }
    } catch(e) {}

    const jsFiles = [
        'achievements.js','appearance.js','auth.js',
        'changelog.js','config.js','feedback.js','firebase.js',
        'freeze.js','goals.js','help.js','history.js',
        'navigation.js','notifications.js','records.js',
        'rewards.js','schedule.js','settings.js',
        'state.js','stats.js','subjects.js',
        'ui.js','utils.js'
    ];

    const makeRow = (name, ver) => {
        const verClass = ver !== '—' && ver !== 'помилка'
            ? 'versions-row-ver versions-row-ver--ok'
            : 'versions-row-ver versions-row-ver--none';
        return `<div class="versions-row">
            <span class="versions-row-name">${name}</span>
            <span class="${verClass}">${ver}</span>
        </div>`;
    };

    let rows = [
        makeRow('🌐 index.html', htmlVer),
        makeRow('🎨 style.css', cssVer),
        `<div style="height:4px;"></div>`,
    ];

    const jsRows = await Promise.all(jsFiles.map(async fname => {
        try {
            const mod = await import('./' + fname + '?v=' + Date.now());
            return makeRow('📄 ' + fname, mod.VERSION || '—');
        } catch(e) {
            return makeRow('📄 ' + fname, '—');
        }
    }));

    body.innerHTML = rows.join('') + jsRows.join('');
}

export function closeDataInfoModal() {
    const modal = document.getElementById('dataInfoModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

export async function showDataInfoModal() {
    const container = document.getElementById('dataInfo');
    if (!container) return;
    
    const recordsCount      = state.data.records?.length || 0;
    const balance            = state.data.balance || 0;
    const achievementsCount  = Object.keys(state.data.achievements?.levels || {}).length;
    const freezePeriodsCount = state.data.achievements?.freezePeriods?.length || 0;

    // Feedback
    const feedbackItems    = getFeedbackItems();
    const feedbackCount    = feedbackItems.length;
    const feedbackNew      = feedbackItems.filter(i => i.status === '⏳').length;
    const feedbackDone     = feedbackItems.filter(i => i.status === '✅').length;

    // Теми
    const appearance     = state.data.appearance;
    const ownedThemes    = appearance?.child?.owned || ['default'];
    const activeThemeId  = appearance?.child?.active?.theme || 'default';
    const parentThemeId  = appearance?.parent?.active?.theme || 'default';
    const ownedNames     = ownedThemes
        .map(id => THEMES.find(t => t.id === id)?.name || id)
        .join(', ');
    const activeThemeName  = THEMES.find(t => t.id === activeThemeId)?.name  || activeThemeId;
    const parentThemeName  = THEMES.find(t => t.id === parentThemeId)?.name  || parentThemeId;

    // Активність дитини — два типи входу окремо
    const fmtLoginDate = iso => iso
        ? new Date(iso).toLocaleString('uk-UA', { timeZone:'Europe/Kyiv', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : null;
    const childNotif       = state.data.notifications?.child || {};
    const directLoginStr   = fmtLoginDate(childNotif.lastDirectLoginAt)  || 'ще не було';
    const pinFailLoginStr  = fmtLoginDate(childNotif.lastPinFailLoginAt) || 'ще не було';

    // Резервна копія
    const backupRaw  = state.data.backupLastDate || '';
    const backupDate = (() => {
        if (backupRaw) {
            return new Date(backupRaw).toLocaleDateString('uk-UA',
                { day: 'numeric', month: 'long', year: 'numeric' });
        }
        // fallback — з останнього backup_* сповіщення
        const notifItems = window.__notifItems ? Object.values(window.__notifItems()) : [];
        const lastBackup = notifItems
            .filter(i => i.type === 'backup')
            .sort((a, b) => b.id.localeCompare(a.id))[0];
        if (lastBackup) {
            const d = lastBackup.id.replace('backup_', '');
            return new Date(d).toLocaleDateString('uk-UA',
                { day: 'numeric', month: 'long', year: 'numeric' });
        }
        return null;
    })();
    const backupDaysAgo = backupRaw
        ? Math.floor((Date.now() - new Date(backupRaw)) / 86_400_000)
        : null;
    const backupStatus = !backupDate
        ? { label: 'невідомо', color: 'var(--text-hint)' }
        : backupDaysAgo >= 7
            ? { label: `${backupDaysAgo} дн. тому ⚠️`, color: 'var(--c-warning-text)' }
            : { label: `${backupDaysAgo} дн. тому`, color: 'var(--c-success-text)' };

    // Розмір даних
    const dataSize = new Blob([JSON.stringify(state.data)]).size;
    const sizeKB   = (dataSize / 1024).toFixed(2);

    const isParent = !!state.data.isParent;

    container.innerHTML = `
        <div style="display:grid;gap:8px;">
            <div>📝 Записів в історії: <strong>${recordsCount}</strong></div>
            <div>⭐ Поточний баланс: <strong>${balance}⭐</strong></div>
            <div>🏆 Досягнень отримано: <strong>${achievementsCount}</strong></div>
            <div>❄️ Канікул: <strong>${freezePeriodsCount} ${freezePeriodsCount === 1 ? 'період' : 'періодів'}</strong></div>
        </div>

        <div class="card-inner mt-sm" style="display:grid;gap:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">💬 Зворотній зв'язок</div>
            <div class="font-sm">Всього повідомлень: <strong>${feedbackCount}</strong></div>
            ${feedbackNew  > 0 ? `<div class="font-sm text-danger">⏳ Нових (непрочитаних): <strong>${feedbackNew}</strong></div>` : ''}
            <div class="font-sm">✅ Виконаних: <strong>${feedbackDone}</strong></div>
        </div>

        <div class="card-inner mt-sm" style="display:grid;gap:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">🎨 Теми оформлення</div>
            <div class="font-sm">Куплено: <strong>${ownedThemes.length}</strong> — ${ownedNames}</div>
            <div class="font-sm">Активна у дитини: <strong>${activeThemeName}</strong></div>
            <div class="font-sm">Активна у батьків: <strong>${parentThemeName}</strong></div>
        </div>

        ${isParent ? `
        <div class="card-inner mt-sm" style="display:grid;gap:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">👧 Активність дитини</div>
            <div class="font-sm">🔑 Прямий вхід: <strong>${directLoginStr}</strong></div>
            <div class="font-sm">❌ Вхід після невірного PIN: <strong>${pinFailLoginStr}</strong></div>
        </div>` : ''}

        <div class="card-inner mt-sm" style="display:grid;gap:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">💾 Резервна копія</div>
            ${backupDate
                ? `<div class="font-sm">Остання: <strong>${backupDate}</strong></div>
                   <div class="font-sm">Давність: <strong style="color:${backupStatus.color}">${backupStatus.label}</strong></div>`
                : `<div class="font-sm" style="color:var(--text-hint)">Дата невідома — зробіть резервну копію</div>`}
        </div>

        <div class="font-xs text-hint mt-sm">📦 Розмір даних: ${sizeKB} KB</div>
        <div class="versions-table-block mt-sm">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:6px;">📋 Версії файлів</div>
            <div id="versionsTableBody" class="font-xs text-hint text-center">Завантаження...</div>
        </div>
    `;

    // Завантажуємо версії файлів одразу
    _loadVersionsTable();
    
    // Відкриваємо модальне вікно
    const modal = document.getElementById('dataInfoModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
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
        
        // Записуємо дату резервного копіювання в хмару (синхронізується між пристроями)
        state.data.backupLastDate = new Date().toISOString().split('T')[0];
        saveData();
        // Знімаємо сповіщення про бекап (якщо було)
        dismissByAction('backup', 'checkmark');
        
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

export function applyManualRecordPreset() {
    const sel = document.getElementById('manualRecordPreset');
    const opt = sel.options[sel.selectedIndex];
    const isCustom = opt.value === 'custom';

    const descEl  = document.getElementById('manualRecordDesc');
    const starsEl = document.getElementById('manualRecordStars');
    const typeEl  = document.getElementById('manualRecordType');
    const readOnly = !isCustom;

    descEl.value  = opt.dataset.desc  || '';
    starsEl.value = opt.dataset.stars || '';
    typeEl.value  = opt.dataset.type  || 'earn';

    // Для власного — поля редагуються, для пресету — заблоковані
    [descEl, starsEl, typeEl].forEach(el => {
        el.readOnly = readOnly;
        el.style.opacity = readOnly ? '0.7' : '1';
        el.style.background = readOnly ? 'var(--bg-secondary)' : 'var(--bg-card)';
    });
}

export function addManualRecord() {
    const sel     = document.getElementById('manualRecordPreset');
    const opt     = sel.options[sel.selectedIndex];
    const desc    = document.getElementById('manualRecordDesc').value.trim();
    const stars   = parseInt(document.getElementById('manualRecordStars').value);
    const type    = document.getElementById('manualRecordType').value.trim() || 'earn';
    const cat     = opt.dataset.cat || 'achievement';
    const dateVal = document.getElementById('manualRecordDate').value;
    const adjustBal = document.getElementById('manualRecordAdjustBalance').checked;

    if (!sel.value) { alert('⚠️ Оберіть досягнення зі списку'); return; }
    if (!desc)      { alert('⚠️ Введіть опис запису'); return; }
    if (!stars || stars < 1) { alert('⚠️ Введіть кількість зірок'); return; }
    if (!dateVal)   { alert('⚠️ Оберіть дату'); return; }

    const isoDate = new Date(`${dateVal}T12:00:00+03:00`).toISOString();

    const record = {
        id: Date.now() + Math.random(),
        date: isoDate,
        description: desc,
        stars: stars,
        type: type,
        category: cat
    };

    state.data.records.push(record);

    if (adjustBal) {
        state.data.balance = Number(state.data.balance) + (type === 'earn' ? stars : -stars);
        if (state.data.balance < 0) state.data.balance = 0;
    }

    const levelsBefore = { ...(state.data.achievements?.levels || {}) };
    recalculateAchievements();
    giveRewardsForNewAchievements(levelsBefore);

    saveData();
    if (window.updateUI) window.updateUI();
    if (window.renderHistory) window.renderHistory();

    // Скидаємо форму
    sel.selectedIndex = 0;
    document.getElementById('manualRecordDesc').value = '';
    document.getElementById('manualRecordStars').value = '';
    document.getElementById('manualRecordType').value = '';
    document.getElementById('manualRecordDate').value = '';

    alert(`✅ Запис додано!\n\n"${desc}" — ${stars}⭐\nДата: ${dateVal}${adjustBal ? '\nБаланс оновлено' : ''}`);
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
    
    // Змінюємо баланс — додаємо запис корекції щоб maxBalance правильно відстежувався
    const diff = newBalance - oldBalance;
    if (diff !== 0) {
        state.data.records.push({
            id: Date.now(),
            date: new Date().toISOString(),
            description: `Корекція балансу (${diff > 0 ? '+' : ''}${diff}⭐)`,
            stars: Math.abs(diff),
            type: diff > 0 ? 'earn' : 'spend',
            category: 'correction'
        });
    }
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
