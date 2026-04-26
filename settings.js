// ════════════════════════════════════════════════════
// ⚙️   settings.js — Налаштування / Експорт / Імпорт
//     Зірки Успіху | v3.20260426.0912
// ════════════════════════════════════════════════════

import { state } from './state.js';
import { recalculateAchievements } from './achievements.js';
import { saveData } from './firebase.js';

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
    const dataSize = new Blob([JSON.stringify(data)]).size;
    const sizeKB = (dataSize / 1024).toFixed(2);
    
    container.innerHTML = `
        <div style="display: grid; gap: 8px;">
            <div style="padding: 8px 0; border-bottom: 2px solid #4CAF50;">
                <span style="font-size: 15px; color: #2E7D32; font-weight: 700;">📌 Версія застосунку:</span>
                <strong style="font-size: 16px; color: #1B5E20; margin-left: 8px;">v3.20260426.0910</strong>
            </div>
            <div>📝 Записів в історії: <strong>${recordsCount}</strong></div>
            <div>⭐ Поточний баланс: <strong>${balance} зірок</strong></div>
            <div>🏆 Досягнень отримано: <strong>${achievementsCount}</strong></div>
            <div>❄️ Періодів канікул: <strong>${freezePeriodsCount}</strong></div>
            <div>💾 Розмір даних: <strong>${sizeKB} KB</strong></div>
        </div>
    `;
    
    // Показуємо/ховаємо блоки для батьків
    const pinBlock = document.getElementById('pinSettingsBlock');
    if (pinBlock) {
        pinBlock.style.display = state.data.isParent ? 'block' : 'none';
    }
    
    const balanceBlock = document.getElementById('balanceCorrectionBlock');
    if (balanceBlock) {
        balanceBlock.style.display = state.data.isParent ? 'block' : 'none';
        // Оновлюємо поточний баланс
        const balanceDisplay = document.getElementById('currentBalanceDisplay');
        if (balanceDisplay) {
            balanceDisplay.textContent = `${state.data.balance || 0}⭐`;
        }
    }
}

export function exportData() {
    try {
        // Додаємо метадані
        const dataToExport = {
            ...data,
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
        const dateTime = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
        a.download = `zirky-backup-${dateTime}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        alert("✅ Дані успішно експортовано!\n\nФайл: " + a.download);
    } catch (e) {
        alert("❌ Помилка експорту: " + e.message);
        console.error(e);
    }
}
window.exportData = exportData;

export function importData(event) {
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
            
            const confirmMsg = `📁 Файл: ${file.name}\n\n` +
                `📊 Що буде імпортовано:\n` +
                `• Записів: ${recordsCount}\n` +
                `• Баланс: ${balance}⭐\n` +
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
            
            // Очищаємо метадані експорту
            delete imported.version;
            delete imported.exportDate;
            delete imported.appName;
            
            // Замінюємо data
            data = imported;
            
            // Перераховуємо досягнення
            recalculateAchievements();
            
            // Зберігаємо в Firebase
            saveData();
            
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
window.importData = importData;

export function resetAllData() {
    const confirm1 = confirm("⚠️ ВИ ВПЕВНЕНІ?\n\nЦе видалить ВСІ дані:\n• Всі оцінки та записи\n• Весь баланс зірок\n• Всі досягнення\n• Всі налаштування\n\nЦя дія НЕЗВОРОТНА!\n\nПродовжити?");
    if (!confirm1) return;
    
    const confirm2 = prompt("Щоб підтвердити, введіть: ВИДАЛИТИ");
    if (confirm2 !== "ВИДАЛИТИ") {
        alert("Скасовано");
        return;
    }
    
    // Скидаємо дані
    data = {
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
    };
    
    saveData();
    alert("✅ Всі дані скинуто\n\nСторінка перезавантажиться.");
    setTimeout(() => location.reload(), 500);
}
window.resetAllData = resetAllData;

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
    
    // Зберігаємо
    saveData();
    
    // Оновлюємо відображення
    showDataInfo();
    
    // Очищаємо поле
    input.value = '';
    
    alert(`✅ Баланс змінено!\n\nНовий баланс: ${newBalance}⭐`);
}
