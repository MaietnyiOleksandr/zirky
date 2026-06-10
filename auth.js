// ════════════════════════════════════════════════════
// 🔐  auth.js — Авторизація та PIN-код
// ════════════════════════════════════════════════════

// Скорочений userAgent для loginHistory
function _shortAgent() {
    return navigator?.userAgent?.slice(0, 200) || '';
}

export const VERSION = 'v4.20260610.2218';

import { state, resetUIState, defaultChildData } from './state.js';
import { savePin, saveParentLoginData, saveChildLoginHistory, saveChildBlockData, initChildListener,
         initTasksListener, initFeedbackListener, setNotifUnsub, db } from './firebase.js';
import { nowKyiv } from './utils.js';
import { updateUI } from './ui.js';
import { switchTab } from './navigation.js';
import { applyAppearance, applyActiveBorder } from './appearance.js';
import { initNotificationsListener } from './notifications.js';
import { initCompare } from './compare.js';

// ════════════════════════════════════════════════════════════
// 🔐  ЕКРАН ВИБОРУ ПРОФІЛЮ
// ════════════════════════════════════════════════════════════

// Показує екран вибору (loginOverlay) — після logout або при старті
export function showProfileSelect() {
    state.parent.isParent = false;
    state.activeChildId   = null;
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('pinOverlay').style.display   = 'none';
    document.getElementById('mainApp').style.display      = 'none';
}

// Батько натиснув «Увійти як батько» → показуємо PIN
export function showPinInput() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('pinOverlay').style.display   = 'flex';
}

// ════════════════════════════════════════════════════════════
// 🔐  ВХІД ЯК ДИТИНА
// ════════════════════════════════════════════════════════════

export function enterAsChild(childId = 'child_1') {
    const meta = state.parent.children?.[childId];
    const pin  = meta?.pin;

    // Якщо PIN не встановлено або '0000 — дозволяємо без перевірки
    if (!pin || pin === '0000') {
        _doEnterAsChild(childId);
        return;
    }

    // Показуємо PIN-оверлей з підказкою чиє ім'я
    state.activeChildId   = childId;   // тимчасово — для checkChildPin
    state._pendingChildId = childId;   // зберігаємо для підтвердження
    const name = meta?.name || 'Дитина';

    const overlay  = document.getElementById('pinOverlay');
    const titleEl  = document.getElementById('pinOverlayTitle');
    if (titleEl) titleEl.textContent = `🔐 PIN для ${name}`;

    // Перемикаємо режим overlay на child
    overlay.dataset.mode = 'child';
    state.pinValue = '';
    document.getElementById('pinInput').value = '';
    document.getElementById('loginOverlay').style.display = 'none';
    overlay.style.display = 'flex';
}

// Внутрішній вхід як дитина (після перевірки PIN або без PIN)
export function _doEnterAsChild(childId) {
    state.parent.isParent = false;
    state.activeChildId   = childId;
    state._pendingChildId = null;

    _subscribeToChild(childId);
    saveChildLoginHistory(childId, 'child', _shortAgent());

    document.getElementById('pinOverlay').style.display    = 'none';
    document.getElementById('loginOverlay').style.display  = 'none';
    document.getElementById('mainApp').style.display       = 'block';

    resetUIState(state);
    closeAllAccordions();
    applyAppearance();
    updateParentChildBar();
    if (window.updateBadges) window.updateBadges();
    updateUI();

    const meta     = state.parent.children?.[childId];
    const startTab = meta?.startTab || 'schedule';
    switchTab(startTab);
}

// ════════════════════════════════════════════════════════════
// 🔐  ВХІД ЯК БАТЬКО (PIN)
// ════════════════════════════════════════════════════════════

export function addPin(digit) {
    if (state.pinValue.length < 4) {
        state.pinValue += digit;
        document.getElementById('pinInput').value = '•'.repeat(state.pinValue.length);
        if (state.pinValue.length === 4) setTimeout(checkPin, 300);
    }
}

export function clearPin() {
    state.pinValue = state.pinValue.slice(0, -1);
    document.getElementById('pinInput').value = '•'.repeat(state.pinValue.length);
}

export function cancelPin() {
    const overlay = document.getElementById('pinOverlay');
    state.pinValue = '';
    state._pendingChildId = null;
    document.getElementById('pinInput').value = '';
    if (overlay) { overlay.style.display = 'none'; overlay.dataset.mode = ''; }
    document.getElementById('loginOverlay').style.display = 'flex';
    // Відновлюємо заголовок
    const titleEl = document.getElementById('pinOverlayTitle');
    if (titleEl) titleEl.textContent = '🔐 Введіть PIN';
}

export function checkPin() {
    // Режим child — перевіряємо PIN дитини
    const overlay = document.getElementById('pinOverlay');
    if (overlay?.dataset.mode === 'child') {
        _checkChildPin();
        return;
    }

    // Перевіряємо блокування
    if (state.parent.blockedUntil) {
        const now       = new Date();
        const blockedTo = new Date(state.parent.blockedUntil);
        if (now < blockedTo) {
            const mins = Math.ceil((blockedTo - now) / 60000);
            state.pinValue = '';
            document.getElementById('pinInput').value = '';
            alert(`🔒 Занадто багато спроб. Спробуйте через ${mins} хв.`);
            return;
        } else {
            // Блокування минуло — скидаємо
            state.parent.blockedUntil   = null;
            state.parent.failedAttempts = 0;
            saveParentLoginData();
        }
    }

    if (state.pinValue === state.parent.pin) {
        // Успішний вхід
        state.parent.isParent   = true;
        state.parent.failedAttempts = 0;
        state.parent.blockedUntil   = null;

        // Зберігаємо в loginHistory (останні 20)
        if (!state.parent.loginHistory) state.parent.loginHistory = [];
        state.parent.loginHistory.unshift({ at: nowKyiv(), type: 'parent', agent: _shortAgent() });
        if (state.parent.loginHistory.length > 20) state.parent.loginHistory.length = 20;
        saveParentLoginData();

        // Завантажуємо дані активної дитини для батьківського перегляду
        const childId = state.activeChildId || Object.keys(state.parent.children || {})[0] || 'child_1';
        state.activeChildId = childId;

        // Скидаємо кеш фідбеку всіх дітей — щоб при вході батька
        // завжди завантажувались свіжі дані, а не залишки попередньої сесії.
        if (window.resetAllFeedbackCache) window.resetAllFeedbackCache();

        // Скидаємо state.data до дефолту щоб стара дитина не просвічувала
        // до приходу першого onValue від initChildListener.
        Object.assign(state.data, defaultChildData());

        _subscribeToChild(childId);

        document.getElementById('pinOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display    = 'block';

        resetUIState(state);
        applyAppearance();
        updateParentChildBar();
        if (window.updateBadges) window.updateBadges();
        updateUI();
        switchTab('add');
    } else {
        // Невірний PIN
        state.parent.failedAttempts = (state.parent.failedAttempts || 0) + 1;
        // Записуємо невдалу спробу в loginHistory
        if (!state.parent.loginHistory) state.parent.loginHistory = [];
        state.parent.loginHistory.unshift({ at: nowKyiv(), type: 'failed', agent: _shortAgent() });
        if (state.parent.loginHistory.length > 20) state.parent.loginHistory.length = 20;
        state.pinValue = '';
        document.getElementById('pinInput').value = '';

        if (state.parent.failedAttempts >= 5) {
            // Блокуємо на 10 хвилин
            const until = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            state.parent.blockedUntil = until;
            saveParentLoginData();
            document.getElementById('pinOverlay').style.display   = 'none';
            document.getElementById('loginOverlay').style.display = 'flex';
            alert('🔒 Забагато невірних спроб. Вхід заблоковано на 10 хвилин.');
        } else {
            const left = 5 - state.parent.failedAttempts;
            saveParentLoginData();
            alert(`❌ Невірний PIN! Залишилось спроб: ${left}`);
        }
    }
}

export function changePin() {
    const newPin = document.getElementById('newPin').value;
    if (newPin.length === 4 && /^\d+$/.test(newPin)) {
        state.parent.pin = newPin;
        savePin();
        document.getElementById('currentPin').textContent = newPin;
        document.getElementById('newPin').value = '';
        alert('✅ PIN змінено!');
    } else {
        alert('❌ PIN має містити 4 цифри!');
    }
}

// ════════════════════════════════════════════════════════════
// 🔐  REWARD PIN
// ════════════════════════════════════════════════════════════

export function showRewardPin() {
    state.rewardPinValue = '';
    document.getElementById('rewardPinInput').value = '';
    document.getElementById('rewardPinOverlay').style.display = 'flex';
}

export function addRewardPin(digit) {
    if (state.rewardPinValue.length < 4) {
        state.rewardPinValue += digit;
        document.getElementById('rewardPinInput').value = '•'.repeat(state.rewardPinValue.length);
        if (state.rewardPinValue.length === 4) setTimeout(checkRewardPin, 300);
    }
}

export function clearRewardPin() {
    state.rewardPinValue = state.rewardPinValue.slice(0, -1);
    document.getElementById('rewardPinInput').value = '•'.repeat(state.rewardPinValue.length);
}

export function cancelRewardPin() {
    document.getElementById('rewardPinOverlay').style.display = 'none';
    state.pendingRewardIndex  = null;
    state.pendingCustomReward = null;
}

// ════════════════════════════════════════════════════════════
// 🔐  ІНШЕ
// ════════════════════════════════════════════════════════════

export function togglePeriod(period) {
    state.showPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updateUI();
}

// ── Внутрішня: підписка на дані дитини при вході ──────────────
function _subscribeToChild(childId) {
    // Ініціалізуємо notif listener ПЕРШИМ — щоб _db був встановлений
    // до того як initFeedbackListener/initChildListener можуть викликати
    // generateNotifications → _saveItem → ref(_db, ...)
    const notifUnsub = initNotificationsListener(childId, db);
    setNotifUnsub(notifUnsub);

    initChildListener(childId);
    initTasksListener();
    initFeedbackListener((rawData) => {
        if (window.initFeedbackData) window.initFeedbackData(rawData);
    });
}

// ── Перевірка PIN дитини ─────────────────────────────────────
function _checkChildPin() {
    const childId = state._pendingChildId;
    const meta    = state.parent.children?.[childId];
    const correct = meta?.pin;

    // ── Перевірка блокування ──────────────────────────────────
    if (meta?.blockedUntil) {
        const now       = new Date();
        const blockedTo = new Date(meta.blockedUntil);
        if (now < blockedTo) {
            const secs = Math.ceil((blockedTo - now) / 1000);
            const msg  = secs < 60
                ? `${secs} сек.`
                : `${Math.ceil(secs / 60)} хв.`;
            state.pinValue = '';
            document.getElementById('pinInput').value = '';
            alert(`🔒 Забагато невірних спроб. Спробуйте через ${msg}`);
            return;
        } else {
            // Блокування минуло — мовче скидаємо
            meta.blockedUntil   = null;
            meta.failedAttempts = 0;
            saveChildBlockData(childId);
        }
    }

    if (state.pinValue === correct) {
        // ── Успішний вхід — скидаємо лічильник ──────────────
        if (meta.failedAttempts > 0) {
            meta.failedAttempts = 0;
            meta.blockedUntil   = null;
            saveChildBlockData(childId);
        }
        const overlay = document.getElementById('pinOverlay');
        if (overlay) overlay.dataset.mode = '';
        const titleEl = document.getElementById('pinOverlayTitle');
        if (titleEl) titleEl.textContent = '🔐 Введіть PIN';
        _doEnterAsChild(childId);
    } else {
        // ── Невірний PIN ──────────────────────────────────────
        meta.failedAttempts = (meta.failedAttempts || 0) + 1;
        saveChildLoginHistory(childId, 'failed', _shortAgent());

        // Логіка блокування: 3 спроби → 30 с; 5 → 5 хв; 6+ → +5 хв кожна
        let blockMs = 0;
        const fa = meta.failedAttempts;
        if      (fa === 3)  blockMs = 30 * 1000;
        else if (fa === 5)  blockMs = 5 * 60 * 1000;
        else if (fa > 5)    blockMs = (fa - 4) * 5 * 60 * 1000;

        if (blockMs > 0) {
            meta.blockedUntil = new Date(Date.now() + blockMs).toISOString();
        }
        saveChildBlockData(childId);

        state.pinValue = '';
        const input = document.getElementById('pinInput');
        input.value = '';
        input.classList.add('pin-shake');
        setTimeout(() => input.classList.remove('pin-shake'), 400);

        if (blockMs > 0) {
            const msg = blockMs < 60000
                ? `${blockMs / 1000} сек.`
                : `${blockMs / 60000} хв.`;
            alert(`🔒 Забагато невірних спроб. Вхід заблоковано на ${msg}.`);
        }
    }
}

// ── Закриває всі акордіони налаштувань ───────────────────────
export function closeAllAccordions() {
    document.querySelectorAll('.settings-accordion-body.open').forEach(body => {
        body.classList.remove('open');
        const id    = body.id?.replace('settingsBlock_', '');
        const arrow = id ? document.getElementById('settingsArrow_' + id) : null;
        if (arrow) arrow.classList.remove('open');
        const wrap = body.closest('.settings-accordion-wrap');
        if (wrap) wrap.classList.remove('is-open');
    });
}

// ── Слухаємо запит на показ RewardPin від rewards.js ──────────
document.addEventListener('zirky:showRewardPin', () => showRewardPin());

// ── Клавіатурний ввід PIN (PC) ────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (document.getElementById('pinOverlay')?.style.display === 'flex') {
        if (e.key >= '0' && e.key <= '9') { addPin(e.key);  return; }
        if (e.key === 'Backspace')          { clearPin();     return; }
        if (e.key === 'Escape')             { cancelPin();    return; }
    }
    if (document.getElementById('rewardPinOverlay')?.style.display === 'flex') {
        if (e.key >= '0' && e.key <= '9') { addRewardPin(e.key);  return; }
        if (e.key === 'Backspace')          { clearRewardPin();     return; }
        if (e.key === 'Escape')             { cancelRewardPin();    return; }
    }
});

// ════════════════════════════════════════════════════════════
// 4б  БАТЬКІВСЬКИЙ CHILD-BAR (sticky рядок під табами)
// ════════════════════════════════════════════════════════════

// Оновлює #parentChildBar: ім'я, аватар, колір, видимість
export function updateParentChildBar() {
    const bar = document.getElementById('parentChildBar');
    if (!bar) return;

    const isParent = state.parent.isParent;
    const childId  = state.activeChildId;
    const children = state.parent.children || {};
    const count    = Object.keys(children).length;

    // Показуємо бар тільки батькам коли є хоча б одна дитина
    if (!isParent || !childId || count === 0) {
        bar.style.display = 'none';
        return;
    }

    bar.style.display = 'flex';

    const meta   = children[childId] || {};
    const name   = meta.name   || childId;
    const avatar = meta.avatar?.value || '👤';
    const color  = meta.color  || 'var(--accent)';

    // --profile-color на <html> для використання у CSS
    document.documentElement.style.setProperty('--profile-color', color);

    // Заповнюємо вміст бару
    const nameEl   = document.getElementById('parentChildName');
    const avatarEl = document.getElementById('parentChildAvatar');
    const dotEl    = document.getElementById('parentChildDot');
    const switchBtn = document.querySelector('.parent-child-switch');

    if (nameEl)   nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = avatar;
    // Крапка і рамка бару беруть колір з --profile-color (встановлюється applyActiveBorder)

    // Кнопка перемикання потрібна тільки коли дітей більше однієї
    if (switchBtn) switchBtn.style.display = count > 1 ? '' : 'none';

    // 6в — застосовуємо рамку активного профілю
    if (window.applyActiveBorder) window.applyActiveBorder(childId);
}

// Відкриває/закриває дропдаун вибору дитини у баρі
export function toggleChildDropdown() {
    const dropdown = document.getElementById('childDropdown');
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
        _closeChildDropdown();
        return;
    }

    // Будуємо список дітей
    const children = state.parent.children || {};
    const childIds = Object.keys(children);

    if (childIds.length <= 1) {
        // Одна дитина — дропдаун не потрібен, одразу switchProfile
        window.switchProfile?.();
        return;
    }

    dropdown.innerHTML = childIds.map(id => {
        const meta    = children[id] || {};
        const name    = meta.name   || id;
        const avatar  = meta.avatar?.value || '👤';
        const color   = meta.color  || 'var(--accent)';
        const isActive = id === state.activeChildId;
        return `
            <button class="child-dropdown-item${isActive ? ' active' : ''}"
                    onclick="switchChildFromBar('${id}')"
                    style="--item-color:${color}">
                <span class="child-dropdown-dot"></span>
                <span class="child-dropdown-avatar">${avatar}</span>
                <span class="child-dropdown-name">${name}</span>
                ${isActive ? '<span class="child-dropdown-check">✓</span>' : ''}
            </button>
        `;
    }).join('');

    dropdown.classList.add('open');

    // Закриваємо при кліку поза дропдауном
    setTimeout(() => {
        document.addEventListener('click', _outsideClickHandler, { once: true });
    }, 0);
}

function _outsideClickHandler(e) {
    const dropdown = document.getElementById('childDropdown');
    const bar      = document.getElementById('parentChildBar');
    if (dropdown && bar && !bar.contains(e.target)) {
        _closeChildDropdown();
    }
}

function _closeChildDropdown() {
    const dropdown = document.getElementById('childDropdown');
    if (dropdown) dropdown.classList.remove('open');
}

// Батько обрав дитину з дропдауну в баρі
export function switchChildFromBar(childId) {
    _closeChildDropdown();
    if (childId === state.activeChildId) return;

    // Спочатку скидаємо state.data синхронно — до підписки на нову дитину.
    // resetUIState скидає UI-прапори; Object.assign скидає дані дитини до дефолту
    // щоб стара дитина не просвічувала між перемиканням і приходом onValue.
    resetUIState(state);
    Object.assign(state.data, defaultChildData());

    state.activeChildId = childId;

    // Скидаємо кеші tasks/feedback/compare
    if (window.resetAllTasksCache)    window.resetAllTasksCache();
    if (window.resetAllFeedbackCache) window.resetAllFeedbackCache();
    if (window.resetCompareCache)     window.resetCompareCache();

    // Одразу оновлюємо UI — гендерні назви бонусів і порожній список предметів
    // з'являються без затримки, не чекаємо onValue від Firebase
    updateUI();

    // Закриваємо акордіони
    closeAllAccordions();

    // Підписуємось на нову дитину — onValue прийде і оновить state.data + updateUI
    _subscribeToChild(childId);

    updateParentChildBar();
    if (window.applyAppearance) window.applyAppearance();
    if (window.updateBadges)    window.updateBadges();
    switchTab('add');
}

// ════════════════════════════════════════════════════════════
// 4б  ЛОГІН-ОВЕРЛЕЙ — динамічні картки дітей
// ════════════════════════════════════════════════════════════

// Будує вміст #loginChildrenCards залежно від кількості дітей.
// Викликається з index.html при відкритті loginOverlay.
export function renderLoginChildren() {
    const container = document.getElementById('loginChildrenCards');
    if (!container) return;

    const children = state.parent.children || {};
    const childIds = Object.keys(children);

    if (childIds.length <= 1) {
        // Одна дитина — проста кнопка (залишаємо стару поведінку)
        container.innerHTML = `
            <button class="login-btn child" onclick="enterAsChild('${childIds[0] || 'child_1'}')">
                👧 Дитина
            </button>`;
        return;
    }

    // Кілька дітей — картки з рамкою, анімацією та шрифтом профілю
    container.innerHTML = `
        <div class="login-children-label">Оберіть профіль:</div>
        <div class="login-children-grid">
            ${childIds.map(id => {
                const meta      = children[id] || {};
                const name      = meta.name         || id;
                const avatar    = meta.avatar?.value || '👤';
                const color     = meta.color         || '#4dabf7';
                const border    = meta.border        || {};
                const line      = border.line        || 'solid';
                const animation = border.animation   || 'none';
                const fontKey   = meta.fontKey       || 'default';
                return `
                    <button class="login-child-card" onclick="enterAsChild('${id}')"
                            style="--profile-color:${color}"
                            data-border-line="${line}"
                            data-border-animation="${animation}"
                            data-font="${fontKey}">
                        <span class="login-child-avatar">${avatar}</span>
                        <span class="login-child-name">${name}</span>
                    </button>`;
            }).join('')}
        </div>`;
}
