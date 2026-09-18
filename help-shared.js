// Спільні елементи дитячої та батьківської довідок

export const VERSION = 'v4.20260918.0946';

import { state } from './state.js';
import { ACHIEVEMENTS } from './config.js';
import { g, achText } from './utils.js';

export const HR = '<hr style="border:none;border-top:1px solid #eee;margin:12px 0">';

// ── Таблиця досягнень — генерується динамічно з ACHIEVEMENTS ──
export function _renderAchTable(childId) {
    const gender = state.parent?.children?.[childId]?.gender || 'girl';

    const GROUPS = [
        { label: '📊 За оцінки',  ids: ['відмінник', 'зіркова', 'тверда_десятка'] },
        { label: '📚 Навчання',   ids: ['старанна', 'мегамозок', 'книголюб', 'читачка'] },
        { label: '🏠 Вдома',      ids: ['помічниця', 'господиня'] },
        { label: '🐈‍⬛ Тваринки',  ids: ['котячий_бог'] },
        { label: '🏸 Активність', ids: ['активна', 'спортсмен'] },
        { label: '🧼 Гігієна',    ids: gender === 'girl' ? ['чистюля', 'красуня'] : ['чистюля'] },
        { label: '🌟 Особливі',   ids: ['fire_streak', 'ощадливий', 'транжира', 'швидкий_старт', 'цілеспрямована'] },
    ];

    const thStyle = 'padding:5px 4px;border-bottom:2px solid var(--border-light);';
    let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;">
<thead><tr style="background:var(--bg);color:var(--secondary);font-weight:700;">
  <th style="${thStyle}text-align:left;">Досягнення</th>
  <th style="${thStyle}text-align:center;">🥉</th>
  <th style="${thStyle}text-align:center;">🥈</th>
  <th style="${thStyle}text-align:center;">🥇</th>
  <th style="${thStyle}text-align:right;">Зірки</th>
</tr></thead><tbody>`;

    for (const group of GROUPS) {
        if (!group.ids.length) continue;
        html += `<tr><td colspan="5" style="padding:4px 4px;font-weight:700;color:var(--secondary);font-size:11px;padding-top:8px;">${group.label}</td></tr>`;
        let alt = false;
        for (const id of group.ids) {
            const ach = ACHIEVEMENTS[id];
            if (!ach) continue;
            const icon    = typeof ach.icon === 'object' ? g(childId, ach.icon) : ach.icon;
            const name    = achText(ach, childId);
            const isRep   = ach.type === 'repeatable_streak';
            const rewards = ach.levels.map(l => `+${l.reward}`).join('/');
            const lvls    = ach.levels;
            const b    = lvls[0]?.target ?? '';
            const s    = lvls[1]?.target ?? '';
            const gold = lvls[2]?.target ?? '';
            const bg = alt ? ' style="background:var(--bg);"' : '';
            html += `<tr${bg}><td style="padding:3px 4px;">${icon} ${name}${isRep ? ' ❗' : ''}</td>
              <td style="text-align:center;">${b}</td>
              <td style="text-align:center;">${s}</td>
              <td style="text-align:center;">${gold}</td>
              <td style="text-align:right;">${rewards}⭐</td></tr>`;
            alt = !alt;
        }
    }
    html += '</tbody></table>';
    return html;
}

