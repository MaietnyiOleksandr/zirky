// ════════════════════════════════════════════════════
// ⚙️   settings.js — Налаштування / Експорт / Імпорт
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20260629.0920';

// ════════════════════════════════════════════════════════════

import { state, defaultChildData, resetUIState } from './state.js';
import { recalculateAchievements, giveRewardsForNewAchievements } from './achievements.js';
import { db, saveAll, savePin, saveRecords, saveRates, saveBackupDate, saveAllFeedback, saveAllTasks, saveChildMeta, initNewChildData, unsubscribeAllListeners, deleteChild } from './firebase.js';
import { getFeedbackItems } from './feedback.js';
import { THEMES, stopAllPreviews, applyAppearance, BORDER_COLORS_FREE } from './appearance.js';
import { dismissByAction, dismissByType } from './notifications.js';
import { get, ref, set, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ════════════════════════════════════════════════════════════
// // ⚙️   БЛОК: Налаштування / Експорт / Імпорт
// ════════════════════════════════════════════════════════════

async function _loadVersionsTable(containerId = 'versionsTableBody') {
    const body = document.getElementById(containerId);
    if (!body) return;

    const htmlVer = (() => {
        const c = document.documentElement.outerHTML;
        return c.match(/version:\s*(v\d+\.\d+\.\d+)/)?.[1] || '—';
    })();

    let cssVer = '—';
    try {
        const cssText = Array.from(document.styleSheets).find(s => s.href?.includes('style.css'));
        if (cssText) {
            const resp = await fetch(cssText.href);
            const text = await resp.text();
            cssVer = text.match(/version:\s*(v\d+\.\d+\.\d+)/)?.[1] || '—';
        }
    } catch(e) {}

    const jsFiles = [
        'achievements.js','appearance.js','auth.js',
        'changelog.js','compare.js','config.js','feedback.js','firebase.js',
        'freeze.js','goals.js','help.js','history.js',
        'navigation.js','notifications.js','records.js',
        'rewards.js','schedule.js','settings.js',
        'state.js','stats.js','subjects.js',
        'tasks.js','ui.js','utils.js'
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

export async function renderDataInfoContent(containerId = 'aboutDataInfo') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isParent    = !!state.parent.isParent;
    const childrenMap = state.parent.children || {};
    const childIds    = Object.keys(childrenMap);

    // ── Спільний блок: резервна копія ────────────────────────
    const backupRaw  = state.parent.backupLastDate || '';
    const backupDate = (() => {
        if (backupRaw) {
            return new Date(backupRaw).toLocaleDateString('uk-UA',
                { day: 'numeric', month: 'long', year: 'numeric' });
        }
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
        ? { label: 'невідома', color: 'var(--text-hint)' }
        : backupDaysAgo >= 7
            ? { label: `${backupDaysAgo} дн. тому ⚠️`, color: 'var(--c-warning-text)' }
            : { label: `${backupDaysAgo} дн. тому`, color: 'var(--c-success-text)' };

    // ── Якщо дитина — показуємо лише свої дані ───────────────
    if (!isParent) {
        _renderChildDataPanel(container, state.activeChildId, state.data, getFeedbackItems());
        return;
    }

    // ── Батьківський вигляд: спільний блок + таби по дітях ───
    const totalSizeKB = (new Blob([JSON.stringify(state.parent)]).size / 1024).toFixed(1);

    container.innerHTML = `
        <div class="card-inner" style="display:grid;gap:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">💾 Резервна копія</div>
            ${backupDate
                ? `<div class="font-sm">Остання: <strong>${backupDate}</strong></div>
                   <div class="font-sm">Давність: <strong style="color:${backupStatus.color}">${backupStatus.label}</strong></div>`
                : `<div class="font-sm" style="color:var(--text-hint)">Дата невідома — зробіть резервну копію</div>`}
        </div>
        <div class="font-xs text-hint mt-sm" style="display:flex;justify-content:space-between;">
            <span>👶 Профілів: <strong>${childIds.length}</strong></span>
            <span>📦 Розмір: <strong>${totalSizeKB} KB</strong></span>
        </div>

        <div class="di-child-tabs mt-sm" id="diChildTabs"></div>
        <div id="diChildPanel" class="mt-sm"></div>
    `;

    // ── Таби дітей ────────────────────────────────────────────
    const tabsEl  = container.querySelector('#diChildTabs');
    const panelEl = container.querySelector('#diChildPanel');

    // Кеш живе поки відкрита модалка — при повторному відкритті скидається автоматично
    const _cache = {};

    function renderTabs(activeId) {
        tabsEl.innerHTML = childIds.map(cid => {
            const meta   = childrenMap[cid];
            const avatar = meta?.avatar?.value || '👤';
            const name   = meta?.name || cid;
            const active = cid === activeId;
            return `<button class="di-child-tab${active ? ' active' : ''}" data-cid="${cid}">
                ${avatar} ${name}
            </button>`;
        }).join('');
        tabsEl.querySelectorAll('.di-child-tab').forEach(btn => {
            btn.addEventListener('click', () => switchChildTab(btn.dataset.cid));
        });
    }

    async function switchChildTab(childId) {
        renderTabs(childId);

        // Вже є в кеші — відображаємо одразу
        if (_cache[childId]) {
            const { data, feedbackArr } = _cache[childId];
            _renderChildDataPanel(panelEl, childId, data, feedbackArr);
            return;
        }

        panelEl.innerHTML = `<div class="font-sm text-hint" style="padding:8px 0;">⏳ Завантаження…</div>`;
        try {
            let data, feedbackArr;
            if (childId === state.activeChildId) {
                // Активна дитина — дані вже в пам'яті
                data        = state.data;
                feedbackArr = getFeedbackItems();
            } else {
                // Інша дитина — точковий get()
                const snap = await get(ref(db, `zirky/children/${childId}`));
                data        = snap.val() || {};
                feedbackArr = data.feedback ? Object.values(data.feedback) : [];
            }
            _cache[childId] = { data, feedbackArr };
            _renderChildDataPanel(panelEl, childId, data, feedbackArr);
        } catch (err) {
            panelEl.innerHTML = `<div class="font-sm text-danger">❌ Помилка завантаження: ${err.message}</div>`;
        }
    }

    // Відкриваємо активну дитину за замовчуванням
    const defaultId = state.activeChildId || childIds[0];
    renderTabs(defaultId);
    await switchChildTab(defaultId);
}

// ── Рендер панелі одної дитини ────────────────────────────────
function _renderChildDataPanel(el, childId, data, feedbackItems) {
    const meta   = state.parent.children?.[childId] || {};
    const now    = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    // Загальна статистика
    const recordsCount      = data.records?.length || 0;
    const balance           = data.balance || 0;
    const achievementsCount = Object.keys(data.achievements?.levels || {}).length;
    const freezeCount       = data.achievements?.freezePeriods?.length || 0;

    // Завдання — всі, без обмеження часу
    const tasksArr      = Object.values(data.tasks || {});
    const parentTasks   = tasksArr.filter(t => t.origin === 'parent_task');
    const childRequests = tasksArr.filter(t => t.origin === 'child_request');
    const weekAgo       = now - weekMs;
    const ptWeek        = parentTasks.filter(t => new Date(t.createdAt || 0).getTime() >= weekAgo);
    const crWeek        = childRequests.filter(t => new Date(t.createdAt || 0).getTime() >= weekAgo);

    // Поточний стан завдань
    const ptPending = tasksArr.filter(t => t.origin === 'parent_task'   && t.status === 'pending').length;
    const ptDone    = tasksArr.filter(t => t.origin === 'parent_task'   && t.status === 'done').length;
    const crPending = tasksArr.filter(t => t.origin === 'child_request' && t.status === 'pending').length;

    // Фідбек
    const feedbackCount = feedbackItems.length;
    const feedbackNew   = feedbackItems.filter(i => i.status === '⏳').length;
    const feedbackDone  = feedbackItems.filter(i => i.status === '✅').length;

    // Теми
    const appearance      = data.appearance;
    const ownedThemes     = appearance?.child?.owned || ['default'];
    const activeThemeId   = appearance?.child?.active?.theme || 'default';
    const parentThemeId   = appearance?.parent?.active?.theme || 'default';
    const ownedNames      = ownedThemes.map(id => THEMES.find(t => t.id === id)?.name || id).join(', ');
    const activeThemeName = THEMES.find(t => t.id === activeThemeId)?.name  || activeThemeId;
    const parentThemeName = THEMES.find(t => t.id === parentThemeId)?.name  || parentThemeId;

    // Розмір даних дитини
    const sizeKB = (new Blob([JSON.stringify(data)]).size / 1024).toFixed(1);

    el.innerHTML = `
        <div style="display:grid;gap:8px;">
            <div>📝 Записів в історії: <strong>${recordsCount}</strong></div>
            <div>⭐ Поточний баланс: <strong>${balance}⭐</strong></div>
            <div>🏆 Досягнень отримано: <strong>${achievementsCount}</strong></div>
            <div>❄️ Канікул: <strong>${freezeCount} ${freezeCount === 1 ? 'період' : 'періодів'}</strong></div>
        </div>

        <div class="card-inner mt-sm" style="display:grid;gap:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">📋 Завдання батьків</div>
            <div class="font-sm">Всього: <strong>${parentTasks.length}</strong>
                <span class="text-hint"> · за тиждень: <strong>${ptWeek.length}</strong></span></div>
            ${ptPending > 0 ? `<div class="font-sm text-warning">⏳ Очікують виконання: <strong>${ptPending}</strong></div>` : ''}
            ${ptDone    > 0 ? `<div class="font-sm">📤 Виконано (на перевірці): <strong>${ptDone}</strong></div>` : ''}
        </div>

        <div class="card-inner mt-sm" style="display:grid;gap:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">🙋 Запити дитини</div>
            <div class="font-sm">Всього: <strong>${childRequests.length}</strong>
                <span class="text-hint"> · за тиждень: <strong>${crWeek.length}</strong></span></div>
            ${crPending > 0 ? `<div class="font-sm text-warning">⏳ Очікують відповіді: <strong>${crPending}</strong></div>` : ''}
        </div>

        <div class="card-inner mt-sm" style="display:grid;gap:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">💬 Зворотній зв'язок</div>
            <div class="font-sm">Всього: <strong>${feedbackCount}</strong></div>
            ${feedbackNew  > 0 ? `<div class="font-sm text-danger">⏳ Непрочитаних: <strong>${feedbackNew}</strong></div>` : ''}
            <div class="font-sm text-hint">✅ Виконаних: <strong>${feedbackDone}</strong></div>
        </div>

        <div class="card-inner mt-sm" style="display:grid;gap:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">🎨 Теми оформлення</div>
            <div class="font-sm">Куплено: <strong>${ownedThemes.length}</strong> — ${ownedNames}</div>
            <div class="font-sm">Активна у дитини: <strong>${activeThemeName}</strong></div>
            <div class="font-sm">Активна у батьків: <strong>${parentThemeName}</strong></div>
        </div>

        <div class="font-xs text-hint mt-sm">📦 Розмір даних: ${sizeKB} KB</div>
    `;
}

export async function exportData() {
    try {
        const children = {};
        for (const childId of Object.keys(state.parent.children || {})) {
            const snap = await get(ref(db, `zirky/children/${childId}`));
            children[childId] = snap.val() || {};
        }

        const { isParent, ...parentData } = state.parent;

        const snapshot = {
            version:    4,
            exportDate: new Date().toISOString(),
            appName:    'Зірки Успіху',
            parent:     parentData,
            children,
        };

        const json = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
        a.download = `zirky-backup-v4-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);

        state.parent.backupLastDate = new Date().toISOString().split('T')[0];
        saveBackupDate();
        dismissByAction('backup', 'checkmark');

        alert('✅ Дані успішно експортовано!\n\n⚠️ Файл містить PIN-коди профілів. Не передавайте стороннім особам.\n\nФайл: ' + a.download);
    } catch(e) {
        alert('❌ Помилка експорту: ' + e.message);
        console.error(e);
    }
}

export function importData(event) {
    // Якщо дитячий профіль — потрібен PIN батьків
    if (!state.data.isParent) {
        const pin = prompt('🔐 Введіть PIN батьків для імпорту даних:');
        if (pin !== String(state.parent.pin)) {
            alert('❌ Невірний PIN');
            event.target.value = '';
            return;
        }
    }
    const file = event.target.files[0];

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            // ── Базова валідація ──────────────────────────────
            if (!imported || typeof imported !== 'object') {
                alert('❌ Невірний формат файлу');
                event.target.value = '';
                return;
            }

            // Перевіряємо версію
            if (imported.version !== 4) {
                const ver = imported.version || 'невідома';
                alert(
                    `❌ Файл має версію ${ver}, а очікується версія 4.\n\n` +
                    `Щоб імпортувати старий бекап v3, спочатку виконайте міграцію через migrate.html.`
                );
                event.target.value = '';
                return;
            }

            if (!imported.parent || typeof imported.parent !== 'object') {
                alert('❌ Файл не містить батьківських даних (parent). Файл пошкоджений або неповний.');
                event.target.value = '';
                return;
            }

            if (!imported.children || typeof imported.children !== 'object') {
                alert('❌ Файл не містить даних дітей (children). Файл пошкоджений або неповний.');
                event.target.value = '';
                return;
            }

            // ── Збираємо summary для підтвердження ──────────────
            const exportDate    = imported.exportDate
                ? new Date(imported.exportDate).toLocaleDateString('uk-UA')
                : 'невідомо';
            const childIds      = Object.keys(imported.children);
            const childSummary  = childIds.map(id => {
                const child = imported.children[id];
                const meta  = imported.parent.children?.[id];
                const name  = meta?.name || id;
                const recs  = Array.isArray(child.records) ? child.records.length : 0;
                const bal   = child.balance || 0;
                return `  • ${name}: ${recs} записів, ${bal}⭐`;
            }).join('\n');

            const confirmMsg =
                `📁 Файл: ${file.name}\n` +
                `📅 Дата експорту: ${exportDate}\n\n` +
                `👥 Профілі (${childIds.length}):\n${childSummary}\n\n` +
                `⚠️ УВАГА: Це замінить ВСІ поточні дані (всі профілі)!\n\n` +
                `Продовжити?`;

            if (!confirm(confirmMsg)) {
                event.target.value = '';
                return;
            }

            // ── Відновлюємо state.parent ──────────────────────────
            // Зберігаємо поточний стан авторизації та блокування — вони не імпортуються
            const wasParent            = state.parent.isParent;
            const currentBlockingNotif = state.parent.blockingNotifiedAt;

            Object.assign(state.parent, imported.parent);

            // Завжди відновлюємо поточний стан сесії
            state.parent.isParent           = wasParent;
            state.parent.blockingNotifiedAt = currentBlockingNotif;

            // Гарантуємо обов'язкові поля
            if (!state.parent.children)        state.parent.children        = {};
            if (!state.parent.conversionRates) state.parent.conversionRates = { minutesPerStar: 2, moneyPerStar: 1 };
            if (!state.parent.loginHistory)    state.parent.loginHistory    = [];

            // ── Відновлюємо дані активної дитини ─────────────────
            const activeChildId = state.activeChildId || 'child_1';
            const childData     = imported.children[activeChildId] || {};

            // Нормалізація обов'язкових полів дитини
            const normalized = {
                records:            Array.isArray(childData.records) ? childData.records : [],
                balance:            Number(childData.balance)        || 0,
                goal:               childData.goal                   || null,
                achievements:       childData.achievements           || defaultChildData().achievements,
                appearance:         childData.appearance             || defaultChildData().appearance,
                schedule:           childData.schedule               || null,
                subjects:           childData.subjects               || null,
                clubs:              childData.clubs                  || null,
                tasks:              childData.tasks                  || {},
                feedback:           childData.feedback               || {},
                notifications_feed: childData.notifications_feed     || {},
            };

            Object.assign(state.data, normalized);

            // ── Зберігаємо в Firebase ─────────────────────────────
            // Дані активної дитини
            recalculateAchievements();
            saveAll();
            saveAllTasks(normalized.tasks);
            saveAllFeedback(
                Object.values(normalized.feedback).length
                    ? Object.values(normalized.feedback)
                    : []
            );

            // Батьківські дані (parent/)
            savePin();
            saveRates();
            saveBackupDate();

            // Мета кожної дитини + дані кожної дитини окрім активної
            // (активна вже збережена через saveAll вище)
            childIds.forEach(id => {
                // Мета-дані
                if (imported.parent.children?.[id]) {
                    state.parent.children[id] = imported.parent.children[id];
                    saveChildMeta(id);
                }
                // Дані дитини в Firebase (для неактивних — пряме set)
                if (id !== activeChildId) {
                    const cd = imported.children[id] || {};
                    const childPath = `zirky/children/${id}`;
                    const childPayload = {
                        records:            Array.isArray(cd.records) ? cd.records : [],
                        balance:            Number(cd.balance) || 0,
                        goal:               cd.goal || null,
                        achievements:       cd.achievements || defaultChildData().achievements,
                        appearance:         cd.appearance   || defaultChildData().appearance,
                        schedule:           cd.schedule     || null,
                        subjects:           cd.subjects     || null,
                        clubs:              cd.clubs        || null,
                        tasks:              cd.tasks        || {},
                        feedback:           cd.feedback     || {},
                        notifications_feed: cd.notifications_feed || {},
                    };
                    set(ref(db, childPath), childPayload);
                }
            });

            alert(`✅ Дані успішно імпортовано (${childIds.length} профіл${childIds.length === 1 ? 'ь' : 'і'})!\n\nСторінка перезавантажиться.`);
            setTimeout(() => location.reload(), 500);

        } catch (err) {
            alert('❌ Помилка імпорту: ' + err.message);
            console.error(err);
        }

        event.target.value = '';
    };

    reader.readAsText(file);
}

export function resetAllData() {
    // Якщо дитячий профіль — потрібен PIN батьків
    if (!state.data.isParent) {
        const pin = prompt('🔐 Введіть PIN батьків для скидання даних:');
        if (pin !== String(state.parent.pin)) {
            alert('❌ Невірний PIN');
            return;
        }
    }

    const childName = state.parent.children?.[state.activeChildId]?.name
        || state.activeChildId
        || 'поточного профілю';

    const confirm1 = confirm(
        `⚠️ ВИ ВПЕВНЕНІ?\n\n` +
        `Це видалить ВСІ дані профілю «${childName}»:\n` +
        `• Всі оцінки та записи\n` +
        `• Весь баланс зірок\n` +
        `• Всі досягнення\n` +
        `• Розклад та предмети\n` +
        `• Завдання та фідбек\n\n` +
        `PIN батьків, налаштування профілів та мета-дані (ім'я, аватар) НЕ скидаються.\n\n` +
        `Ця дія НЕЗВОРОТНА!\n\nПродовжити?`
    );
    if (!confirm1) return;

    const confirm2 = prompt('Щоб підтвердити, введіть: ВИДАЛИТИ');
    if (confirm2 !== 'ВИДАЛИТИ') {
        alert('Скасовано');
        return;
    }

    // Скидаємо дані активної дитини до дефолту.
    // PIN батька (state.parent.pin) і мета профілів (state.parent.children) — НЕ чіпаємо.
    const fresh = defaultChildData();
    Object.assign(state.data, fresh);

    saveAll();
    saveAllFeedback([]);
    saveAllTasks({});

    alert(`✅ Дані профілю «${childName}» скинуто.\n\nСторінка перезавантажиться.`);
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

    saveRecords();
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
    const directionEl = document.getElementById('correctionDirection');
    const starsEl     = document.getElementById('correctionStars');
    const reasonEl    = document.getElementById('correctionReason');

    const direction = directionEl?.value;
    const stars     = parseInt(starsEl?.value);
    const reason    = reasonEl?.value?.trim();

    if (!direction || isNaN(stars) || stars <= 0) {
        alert('❌ Введіть коректну кількість зірок (більше 0)');
        return;
    }
    if (!reason) {
        alert('❌ Вкажіть причину корекції');
        return;
    }

    const isEarn    = direction === '+';
    const oldBalance = state.data.balance || 0;
    const newBalance = isEarn ? oldBalance + stars : oldBalance - stars;

    const confirmMsg = `🔧 Корекція балансу?

Було: ${oldBalance}⭐
Стане: ${newBalance}⭐
Причина: ${reason}

Продовжити?`;
    if (!confirm(confirmMsg)) return;

    state.data.records.push({
        id: Date.now(),
        date: new Date().toISOString(),
        description: reason,
        stars,
        type: isEarn ? 'earn' : 'spend',
        category: 'correction'
    });

    // Баланс не встановлюємо напряму — він перерахується через recalculateAchievements
    const levelsBefore = { ...(state.data.achievements?.levels || {}) };
    recalculateAchievements();
    // Синхронізуємо balance з _runningBalance
    state.data.balance = state.data.achievements.counters._runningBalance || 0;
    giveRewardsForNewAchievements(levelsBefore);

    saveRecords();
    showDataInfo();

    starsEl.value  = '';
    reasonEl.value = '';

    alert(`✅ Корекцію додано!

Новий баланс: ${state.data.balance}⭐`);
}

export function saveConversionRates() {
    const minutesPerStar = parseInt(document.getElementById('minutesPerStar')?.value);
    const moneyPerStar = parseInt(document.getElementById('moneyPerStar')?.value);

    if (!minutesPerStar || minutesPerStar < 1) { alert('❌ Некоректне значення хвилин!'); return; }
    if (!moneyPerStar || moneyPerStar < 1) { alert('❌ Некоректне значення гривень!'); return; }

    state.parent.conversionRates = { minutesPerStar, moneyPerStar };
    saveRates();

    // Оновлюємо поля на вкладці Витрати
    if (window.renderRewards) window.renderRewards();

    alert(`✅ Курси збережено!\n🎮 1⭐ = ${minutesPerStar} хв\n💵 1⭐ = ${moneyPerStar} грн`);
}

export function showVersionsModal() {
    const modal = document.getElementById('versionsModal');
    if (!modal) return;
    const body = document.getElementById('versionsModalBody');
    if (body) body.innerHTML = '<div class="font-xs text-hint text-center" style="padding:12px;">Завантаження...</div>';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    _loadVersionsTable('versionsModalBody');
}

export function closeVersionsModal() {
    const modal = document.getElementById('versionsModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

// ════════════════════════════════════════════════════════════
// 🔄  ПЕРЕМИКАННЯ ПРОФІЛЮ (7в)
// ════════════════════════════════════════════════════════════

export function switchProfile() {
    stopAllPreviews();
    // Відписуємось від Firebase listeners поточного профілю
    // щоб не отримувати оновлення після виходу на екран вибору.
    unsubscribeAllListeners();
    Object.assign(state.data, defaultChildData());
    resetUIState(state);
    state.parent.isParent = false;
    state.activeChildId   = null;
    applyAppearance();
    // Закриваємо всі акордіони — їхній вміст буде оновлено при наступному відкритті
    if (window.closeAllAccordions) window.closeAllAccordions();
    // Ховаємо child-bar при виході
    const bar = document.getElementById('parentChildBar');
    if (bar) bar.style.display = 'none';
    // Скидаємо --profile-color та border атрибути
    document.documentElement.style.removeProperty('--profile-color');
    document.documentElement.removeAttribute('data-border-line');
    document.documentElement.removeAttribute('data-border-animation');
    document.getElementById('mainApp').style.display      = 'none';
    document.getElementById('loginOverlay').style.display = 'flex';
    if (window.renderLoginChildren) window.renderLoginChildren();
}

// ════════════════════════════════════════════════════════════
// 👁️  МОДАЛКА АКТИВНОСТІ (7а)
// ════════════════════════════════════════════════════════════

// Поточна активна вкладка: 'parent' або childId ('child_1' тощо).
// Зберігається в пам'яті під час сесії.
let _activeActivityTab = 'parent';

export function showActivityModal() {
    const modal = document.getElementById('activityModal');
    if (!modal) return;

    // Якщо збережена вкладка більше не існує — повертаємось на parent
    const children = state.parent.children || {};
    if (_activeActivityTab !== 'parent' && !children[_activeActivityTab]) {
        _activeActivityTab = 'parent';
    }

    _renderActivityContent();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Dismiss сповіщень про невдалий вхід при відкритті модалки
    dismissByType('login_failed');
    if (window.updateBadges) window.updateBadges();
}

export function closeActivityModal() {
    const modal = document.getElementById('activityModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

// Безпечний перерендер відкритої модалки.
// Викликається з firebase.js через window.refreshActivityModal
// після оновлення loginHistory у state — без прямого імпорту.
export function refreshActivityModal() {
    const modal = document.getElementById('activityModal');
    if (!modal || modal.style.display === 'none') return;
    _renderActivityContent();
}

// Перемикає активну вкладку і перерендерить контент.
// Реєструється як window.switchActivityTab з index.html.
export function switchActivityTab(tabId) {
    _activeActivityTab = tabId;
    _renderActivityContent();
}

function _renderActivityContent() {
    const body = document.getElementById('activityModalBody');
    if (!body) return;

    const fmt = iso => iso
        ? new Date(iso).toLocaleString('uk-UA', {
            timeZone: 'Europe/Kyiv',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : '—';

    const fmtAgent = agent => {
        if (!agent) return '—';
        let browser = 'Браузер';
        let os      = '';
        if (/Edg\//.test(agent))             browser = 'Edge';
        else if (/OPR\/|Opera/.test(agent))  browser = 'Opera';
        else if (/Chrome\//.test(agent))     browser = 'Chrome';
        else if (/Firefox\//.test(agent))    browser = 'Firefox';
        else if (/Safari\//.test(agent))     browser = 'Safari';
        if (/iPhone|iPad/.test(agent))        os = ' · iOS';
        else if (/Android/.test(agent))       os = ' · Android';
        else if (/Windows/.test(agent))       os = ' · Windows';
        else if (/Mac OS/.test(agent))        os = ' · Mac';
        else if (/Linux/.test(agent))         os = ' · Linux';
        return browser + os;
    };

    const fmtStatus = type => {
        if (type === 'parent' || type === 'child') return '✅ Вхід';
        if (type === 'failed') return '❌ Невірний ПІН';
        return type || '—';
    };

    const tableHeader = `<tr><th>Дата і час</th><th>Пристрій</th><th>Статус</th></tr>`;

    const buildTable = history => {
        const rows = (history || []).length
            ? (history || []).slice(0, 20).map(e => `
                <tr>
                    <td>${fmt(e.at)}</td>
                    <td>${fmtAgent(e.agent)}</td>
                    <td style="color:${e.type === 'failed' ? 'var(--c-warning-text)' : 'var(--success)'}">${fmtStatus(e.type)}</td>
                </tr>`).join('')
            : '<tr><td colspan="3" class="text-hint text-center">Немає записів</td></tr>';
        return `<table class="activity-table">${tableHeader}${rows}</table>`;
    };

    // ── Вкладки профілів ──────────────────────────────────────
    const children  = state.parent.children || {};
    const childList = Object.entries(children);

    // Захист: якщо збережена вкладка зникла — скидаємо
    if (_activeActivityTab !== 'parent' && !children[_activeActivityTab]) {
        _activeActivityTab = 'parent';
    }

    const tabs = [
        { id: 'parent', label: '👨\u200d👩\u200d👧 Батьки', blocked: false },
        ...childList.map(([id, meta]) => ({
            id,
            label:   `${meta.avatar?.value || '👤'} ${meta.name || id}`,
            blocked: !!(meta.blockedUntil && new Date(meta.blockedUntil) > new Date()),
        })),
    ];

    const tabsHtml = tabs.map(t => {
        const active      = t.id === _activeActivityTab ? ' activity-tab--active' : '';
        const lockedBadge = t.blocked ? ' <span style="color:var(--c-warning-text);font-size:11px;">🔒</span>' : '';
        return `<button class="activity-tab${active}" onclick="window.switchActivityTab('${t.id}')">${t.label}${lockedBadge}</button>`;
    }).join('');

    // ── Таблиця активної вкладки ──────────────────────────────
    const tableHtml = _activeActivityTab === 'parent'
        ? buildTable(state.parent.loginHistory)
        : buildTable(children[_activeActivityTab]?.loginHistory);

    body.innerHTML = `
        <div class="activity-tabs">${tabsHtml}</div>
        ${tableHtml}
    `;
}

// 👤  АКОРДІОН ПРОФІЛІВ (7б)
// ════════════════════════════════════════════════════════════

// Рендерить вміст акордіону "Мій профіль" (дитина) або "Дитячі профілі" (батьки)
export function renderProfilesAccordion() {
    const container = document.getElementById('profilesAccordionContent');
    if (!container) return;

    if (state.data.isParent) {
        _renderParentProfiles(container);
    } else {
        _renderChildProfile(container);
    }
}

// Зберігає мета-дані профілю дитини (name, pin, startTab, useOwnRates, conversionRates)
export function saveChildProfile(childId) {
    const nameEl          = document.getElementById(`profileName_${childId}`);
    const pinEl           = document.getElementById(`profilePin_${childId}`);
    const startTabEl      = document.getElementById(`profileStartTab_${childId}`);
    const useOwnRatesEl   = document.getElementById(`profileUseOwnRates_${childId}`);
    const minutesEl       = document.getElementById(`profileMinutesPerStar_${childId}`);
    const moneyEl         = document.getElementById(`profileMoneyPerStar_${childId}`);

    if (!nameEl) return;

    const name = nameEl.value.trim();
    if (!name) { alert('❌ Ім\'я не може бути порожнім'); return; }

    if (!state.parent.children[childId]) state.parent.children[childId] = {};
    const meta = state.parent.children[childId];

    meta.name = name;

    // Стать
    const genderEl = document.querySelector(`input[name="gender_${childId}"]:checked`);
    if (genderEl) meta.gender = genderEl.value;

    if (pinEl) {
        const pin = pinEl.value.trim();
        if (pin && !/^\d{4}$/.test(pin)) {
            alert('❌ PIN дитини має бути 4 цифри');
            return;
        }
        if (pin) meta.pin = pin;
    }

    if (startTabEl) {
        meta.startTab = startTabEl.value;
    }

    if (useOwnRatesEl) {
        const useOwn = useOwnRatesEl.checked;
        meta.useOwnRates = useOwn;

        if (useOwn && minutesEl && moneyEl) {
            const mps = parseInt(minutesEl.value);
            const mns = parseInt(moneyEl.value);
            if (!mps || mps < 1 || !mns || mns < 1) {
                alert('❌ Ставки мають бути більшими за 0');
                return;
            }
            meta.conversionRates = { minutesPerStar: mps, moneyPerStar: mns };
        } else if (!useOwn) {
            // Якщо власні ставки вимкнено — очищаємо щоб не плутало getRates()
            delete meta.conversionRates;
        }
    }

    saveChildMeta(childId);
    // Оновлюємо child bar якщо змінився активний профіль
    if (window.updateParentChildBar) window.updateParentChildBar();
    alert(`✅ Профіль "${name}" збережено`);
}

// Показує/ховає блок власних ставок при перемиканні чекбоксу (без збереження)
export function toggleOwnRatesUI(childId) {
    const el = document.getElementById(`ownRatesBlock_${childId}`);
    const cb = document.getElementById(`profileUseOwnRates_${childId}`);
    if (el && cb) el.style.display = cb.checked ? '' : 'none';
}


function _renderChildProfile(container) {
    const childId = state.activeChildId || 'child_1';
    const meta    = state.parent.children?.[childId] || {};

    // Превью картки та пікер аватара через appearance.js
    const previewHTML = window._renderAvatarPreviewPublic
        ? window._renderAvatarPreviewPublic(childId)
        : '';
    const pickerHTML  = window._renderAvatarPickerPublic
        ? window._renderAvatarPickerPublic(childId)
        : '';

    container.innerHTML = `
        <div class="card-bg" style="display:grid;gap:12px;">

            <label class="card-label">👁 Попередній перегляд</label>
            <div class="avatar-preview-wrap-outer">${previewHTML}</div>

            <label class="card-label">😊 Аватар</label>
            ${pickerHTML}

            <div class="form-group">
                <label class="card-label">Ім'я</label>
                <input type="text" id="profileName_${childId}"
                    value="${meta.name || ''}" maxlength="35"
                    placeholder="Твоє ім'я">
            </div>
            <div class="form-group">
                <label class="card-label">PIN (4 цифри)</label>
                <input type="password" id="profilePin_${childId}"
                    placeholder="Новий PIN (залиш порожнім щоб не змінювати)"
                    maxlength="4" pattern="[0-9]{4}">
            </div>
            <button class="btn btn-primary" onclick="saveChildProfile('${childId}')">
                💾 Зберегти
            </button>

        </div>
    `;

    // Активуємо першу вкладку пікера
    const firstCat = document.querySelector(`#avatarPicker_${childId} .avatar-tab-btn`);
    if (firstCat) firstCat.click();
}

function _renderParentProfiles(container) {
    const children = state.parent.children || {};
    const childIds = Object.keys(children);

    const sections = childIds.map(childId => {
        const meta      = children[childId];
        const isBlocked = meta.blockedUntil && new Date(meta.blockedUntil) > new Date();
        // Видалення заборонено якщо: це єдиний профіль,
        // або це профіль під яким зараз відкрита дитина (не батько).
        const isOnlyChild  = childIds.length <= 1;
        const isChildActive = !state.parent.isParent && childId === state.activeChildId;
        const canDelete    = !isOnlyChild && !isChildActive;

        // Параметри стартової вкладки
        const startTabVal = meta.startTab || 'schedule';
        const tabOptions = [
            { value: 'schedule',     label: '📅 Розклад'     },
            { value: 'tasks',        label: '✅ Завдання'     },
            { value: 'rewards',      label: '🎁 Нагороди'     },
            { value: 'achievements', label: '🏆 Успіхи'       },
            { value: 'history',      label: '📜 Історія'      },
            { value: 'stats',        label: '📊 Графіки'      },
            { value: 'feedback',     label: '💬 Зворотній зв\'язок' },
            { value: 'guide',        label: '📘 Довідник'     },
            { value: 'add',          label: '⭐ Додати запис' },
        ].map(o => `<option value="${o.value}"${startTabVal === o.value ? ' selected' : ''}>${o.label}</option>`).join('');

        // Параметри власних ставок
        const useOwn  = !!meta.useOwnRates;
        const ownRates = meta.conversionRates || state.parent.conversionRates || { minutesPerStar: 2, moneyPerStar: 1 };

        return `
            <div class="profile-card card-bg">
                <div class="profile-card-header">
                    <strong class="profile-card-name">${meta.name || childId}</strong>
                    ${isBlocked ? '<span class="badge-warning">🔒 Заблоковано</span>' : ''}
                </div>
                <div class="avatar-preview-wrap-outer parent-preview">
                    ${window._renderAvatarPreviewPublic ? window._renderAvatarPreviewPublic(childId) : (meta.avatar?.value || '👤')}
                </div>

                <div class="form-group">
                    <label class="card-label">Ім'я</label>
                    <input type="text" id="profileName_${childId}"
                        value="${meta.name || ''}" maxlength="35">
                </div>

                <div class="form-group">
                    <label class="card-label">Стать</label>
                    <div class="gender-radio-group">
                        <label class="gender-radio-label">
                            <input type="radio" name="gender_${childId}" value="boy"
                                ${meta.gender === 'boy' ? 'checked' : ''}>
                            👦 Хлопчик
                        </label>
                        <label class="gender-radio-label">
                            <input type="radio" name="gender_${childId}" value="girl"
                                ${(meta.gender === 'girl' || !meta.gender) ? 'checked' : ''}>
                            👧 Дівчинка
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label class="card-label">PIN дитини</label>
                    <input type="password" id="profilePin_${childId}"
                        placeholder="Новий PIN (залиш порожнім щоб не змінювати)"
                        maxlength="4" pattern="[0-9]{4}">
                </div>

                <div class="form-group">
                    <label class="card-label">🚀 Стартова вкладка</label>
                    <select id="profileStartTab_${childId}">
                        ${tabOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label class="card-label" style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                        <input type="checkbox" id="profileUseOwnRates_${childId}"
                            ${useOwn ? 'checked' : ''}
                            onchange="toggleOwnRatesUI('${childId}')">
                        💱 Власні ставки конвертації
                    </label>
                </div>

                <div id="ownRatesBlock_${childId}" style="${useOwn ? '' : 'display:none;'}">
                    <div class="form-group">
                        <label class="card-label">⏱ Хвилин за 1⭐</label>
                        <input type="number" id="profileMinutesPerStar_${childId}"
                            value="${ownRates.minutesPerStar}" min="1" max="120" step="1">
                    </div>
                    <div class="form-group">
                        <label class="card-label">💵 Гривень за 1⭐</label>
                        <input type="number" id="profileMoneyPerStar_${childId}"
                            value="${ownRates.moneyPerStar}" min="1" max="1000" step="1">
                    </div>
                </div>

                <div class="profile-card-actions">
                    <button class="btn btn-primary btn-compact" onclick="saveChildProfile('${childId}')">
                        💾 Зберегти
                    </button>
                    ${isBlocked ? `<button class="btn btn-compact" onclick="unblockChild('${childId}')">🔓 Розблокувати</button>` : ''}
                    ${canDelete
                        ? `<button class="btn btn-danger btn-compact" onclick="deleteChildProfile('${childId}')">🗑️ Видалити</button>`
                        : `<button class="btn btn-compact" disabled title="${isOnlyChild ? 'Єдиний профіль' : 'Профіль активний'}">🗑️ Видалити</button>`
                    }
                </div>

            </div>
        `;
    }).join('');

    const canAdd = childIds.length < 5;
    container.innerHTML = `
        ${sections || '<div class="text-hint font-sm text-center">Профілів немає</div>'}
        ${canAdd ? `<button class="btn-add-profile" onclick="addChildProfile()">
            ➕ Додати дитину
        </button>` : '<div class="text-hint font-sm text-center">Максимум 5 профілів</div>'}
    `;
}

// Встановлює колір профілю дитини
export function setChildColor(childId, color) {
    if (!state.parent.children[childId]) return;
    state.parent.children[childId].color = color;
    saveChildMeta(childId);
    renderProfilesAccordion();
}

// Розблоковує дитину
export function unblockChild(childId) {
    if (!state.parent.children[childId]) return;
    state.parent.children[childId].blockedUntil   = null;
    state.parent.children[childId].failedAttempts = 0;
    saveChildMeta(childId);
    renderProfilesAccordion();
    alert('✅ Профіль розблоковано');
}

// Видаляє дитячий профіль після підтвердження
export async function deleteChildProfile(childId) {
    const children = state.parent.children || {};
    const childIds = Object.keys(children);
    const meta     = children[childId];

    // Додаткові перевірки (дублюємо логіку кнопки на випадок прямого виклику)
    if (childIds.length <= 1) {
        alert('❌ Не можна видалити єдиний профіль');
        return;
    }
    if (!state.parent.isParent && childId === state.activeChildId) {
        alert('❌ Не можна видалити профіль, під яким зараз відкрита дитина');
        return;
    }

    const name = meta?.name || childId;
    if (!confirm(`🗑️ Видалити профіль "${name}"?\n\nУсі дані (зірки, записи, завдання, досягнення) будуть видалені назавжди. Цю дію не можна скасувати.`)) return;

    try {
        // Якщо батько зараз переглядає цю дитину — перемикаємо на першу іншу
        if (state.activeChildId === childId) {
            const nextId = childIds.find(id => id !== childId);
            if (nextId && window.switchChildFromBar) {
                window.switchChildFromBar(nextId);
            }
        }

        await deleteChild(childId);

        renderProfilesAccordion();
        if (window.renderLoginChildren)    window.renderLoginChildren();
        if (window.updateParentChildBar)   window.updateParentChildBar();

        alert(`✅ Профіль "${name}" видалено`);
    } catch (err) {
        console.error('deleteChildProfile error:', err);
        alert('❌ Помилка при видаленні. Спробуйте ще раз.');
    }
}

// ════════════════════════════════════════════════════════════
// ➕  ДОДАВАННЯ НОВОГО ДИТЯЧОГО ПРОФІЛЮ
// ════════════════════════════════════════════════════════════

export async function addChildProfile() {
    const children = state.parent.children || {};
    const childIds = Object.keys(children);

    // ── Обов'язковий вибір статі ────────────────────────────
    const gender = await _promptGender();
    if (!gender) return;

    // Генеруємо наступний ID: child_1, child_2 ...
    let n = 1;
    while (children[`child_${n}`]) n++;
    const childId = `child_${n}`;

    // Рандомний вільний колір якого ще немає в профілях
    const usedColors = childIds.map(id => children[id]?.color).filter(Boolean);
    const freeColor  = BORDER_COLORS_FREE.find(c => !usedColors.includes(c.hex))?.hex
                    || BORDER_COLORS_FREE[n % BORDER_COLORS_FREE.length].hex;

    const defaultAvatar = gender === 'girl' ? '👧' : '👦';

    // Мета-дані нового профілю
    const newMeta = {
        name:           `Дитина ${n}`,
        gender,
        pin:            '0000',
        color:          freeColor,
        avatar:         { type: 'emoji', value: defaultAvatar, id: 'default' },
        border:         { ...DEFAULT_BORDER },
        fontKey:        'default',
        startTab:       'schedule',
        useOwnRates:    false,
        failedAttempts: 0,
    };

    // Записуємо в state
    if (!state.parent.children) state.parent.children = {};
    state.parent.children[childId] = newMeta;

    // Firebase: мета-дані батька + структура дитини
    try {
        await initNewChildData(childId);
        saveChildMeta(childId);

        // Оновлюємо activeChildrenCount
        state.parent.activeChildrenCount = Object.keys(state.parent.children).length;
        update(ref(db, 'zirky/parent'), {
            activeChildrenCount: state.parent.activeChildrenCount,
        });

        renderProfilesAccordion();
        if (window.renderLoginChildren) window.renderLoginChildren();
        alert(`✅ Профіль «Дитина ${n}» створено. Змініть ім'я та PIN.`);
    } catch (err) {
        console.error('addChildProfile error:', err);
        alert('❌ Помилка при створенні профілю. Спробуйте ще раз.');
        delete state.parent.children[childId];
    }
}

// Діалог вибору статі — повертає 'boy' | 'girl' | null
function _promptGender() {
    return new Promise(resolve => {
        document.getElementById('genderDialog')?.remove();
        const el = document.createElement('div');
        el.id = 'genderDialog';
        el.className = 'gender-dialog-overlay';
        el.innerHTML = `
            <div class="gender-dialog">
                <div class="gender-dialog-title">👶 Хто буде у профілі?</div>
                <div class="gender-dialog-buttons">
                    <button class="gender-btn" data-gender="boy">👦 Хлопчик</button>
                    <button class="gender-btn" data-gender="girl">👧 Дівчинка</button>
                </div>
                <button class="gender-cancel">Скасувати</button>
            </div>
        `;
        document.body.appendChild(el);
        el.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', () => { el.remove(); resolve(btn.dataset.gender); });
        });
        el.querySelector('.gender-cancel').addEventListener('click', () => { el.remove(); resolve(null); });
    });
}

