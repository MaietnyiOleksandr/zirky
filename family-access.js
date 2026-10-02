// ════════════════════════════════════════════════════
// 🔐  family-access.js — Google-вхід і доступ для сім’ї
// ════════════════════════════════════════════════════

export const VERSION = 'v4.20261002.0721';

import { app, db, unsubscribeAllListeners } from './firebase.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const auth = getAuth(app);
auth.languageCode = 'uk';

function errorMessage(error) {
    const messages = {
        'auth/popup-blocked': 'Браузер заблокував вікно входу. Дозвольте спливні вікна для цього сайту й повторіть вхід.',
        'auth/popup-closed-by-user': 'Вікно входу закрито. Спробуйте ще раз.',
        'auth/cancelled-popup-request': 'Спробуйте увійти ще раз.',
        'auth/unauthorized-domain': 'Цю адресу сайту ще не додано до дозволених доменів Firebase Authentication.',
        'auth/operation-not-allowed': 'Google-вхід ще не ввімкнено в налаштуваннях Firebase Authentication.',
        'auth/network-request-failed': 'Не вдалося з’єднатися. Перевірте інтернет і спробуйте ще раз.'
    };
    return messages[error.code] || 'Не вдалося перевірити доступ. Перевірте інтернет та налаштування доступу у Firebase.';
}

export function startFamilyAccess(openProfiles) {
    const gate = document.getElementById('familyGate');
    const status = document.getElementById('familyStatus');
    const account = document.getElementById('familyAccount');
    const uid = document.getElementById('familyUid');
    const login = document.getElementById('familySignIn');
    const logout = document.getElementById('familySignOut');
    const retry = document.getElementById('familyRetry');
    let stopAccess;
    let generation = 0;
    let opened = false;

    function lock() {
        gate.style.display = 'flex';
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'none';
        unsubscribeAllListeners();
    }

    async function leave() {
        lock();
        stopAccess?.();
        generation++;
        try {
            await signOut(auth);
            location.reload(); // Clear all in-memory profiles and remaining UI listeners.
        } catch (error) {
            status.textContent = errorMessage(error);
        }
    }
    window.familySignOut = leave;
    logout.onclick = leave;
    retry.onclick = () => location.reload();
    login.onclick = async () => {
        login.disabled = true;
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            status.textContent = errorMessage(error);
        } finally {
            login.disabled = false;
        }
    };

    onAuthStateChanged(auth, (user) => {
        const current = ++generation;
        stopAccess?.();
        lock();
        if (opened) {
            location.reload();
            return;
        }
        account.textContent = user?.email || '';
        uid.hidden = !user;
        uid.textContent = user ? `Ідентифікатор акаунта (UID): ${user.uid}` : '';
        login.hidden = !!user;
        login.disabled = false;
        logout.hidden = !user;
        retry.hidden = !user;
        status.textContent = user ? 'Перевіряємо доступ сім’ї…' : 'Увійдіть через Google-акаунт члена сім’ї.';
        if (!user) return;
        stopAccess = onValue(ref(db, `familyAccess/${user.uid}`), async (snapshot) => {
            if (current !== generation) return;
            if (snapshot.val() !== true) {
                generation++;
                lock();
                if (opened) { location.reload(); return; }
                status.textContent = 'Цей акаунт ще не має доступу. Передайте батькам ідентифікатор нижче. Після додавання натисніть «Перевірити доступ знову».';
                return;
            }
            try {
                status.textContent = 'Завантажуємо сімейні профілі…';
                await openProfiles();
                if (current !== generation) { lock(); return; }
                opened = true;
                gate.style.display = 'none';
            } catch (error) {
                lock();
                status.textContent = errorMessage(error);
            }
        }, (error) => {
            if (current !== generation) return;
            generation++;
            lock();
            if (opened) { location.reload(); return; }
            status.textContent = errorMessage(error);
        });
    }, (error) => {
        lock();
        status.textContent = errorMessage(error);
        retry.hidden = false;
    });
}
