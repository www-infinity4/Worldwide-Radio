/**
 * Mario Spin — Self-Contained 5-Reel Slot Machine
 *
 * Ported from www-infinity4/Mario-spin.
 * Images served from that repo's assets/images/ folder via GitHub raw CDN.
 * Falls back to emoji if images are unavailable.
 *
 * Reel design: 3-visible-row window (top ghost / payline / bottom ghost).
 * The CSS positions the gold payline stripe over the middle row.
 */

const MarioSpin = (() => {

  // Pinned to a stable commit so images never 404 as branch moves
  const RAW = 'https://raw.githubusercontent.com/www-infinity4/Mario-spin/a82cc26280ebfd35f667cce0011fa3e1985a81ab/assets/images/';

  // Question-block variants & Luigi — uploaded as GitHub attachment assets
  const GH_ASSETS = {
    blockWings: 'https://github.com/user-attachments/assets/52552d07-d706-400b-93ab-2640f7caf09c',
    block3d:    'https://github.com/user-attachments/assets/3aca842a-9c9c-4a7d-ba4b-734e0ebaaa62',
    blockFlat:  'https://github.com/user-attachments/assets/cd627b62-85d1-411e-987d-2fda8a90358a',
    luigi:      'https://github.com/user-attachments/assets/7d7a87fa-da4a-4364-9557-a5965f71cb5f',
  };

  // Symbol definitions — each maps to a radio genre tag
  const SYMBOLS = [
    { id: 'mushroom', emoji: '🍄', label: 'MUSHROOM',      value: 6,  pool: 4,
      radioTag: 'police',    radioEmoji: '🚔', radioLabel: 'Police Scanner',
      img: RAW + '1200px-SMP_Dash_Mushroom.png' },
    { id: 'star',     emoji: '⭐', label: 'STAR',           value: 10, pool: 1,
      radioTag: 'jazz',      radioEmoji: '🎷', radioLabel: 'Jazz',
      img: RAW + 'Cute-3D-Mario-Super-Star-PNG-Vector-Golden-Color-Cartoon-Nintendo.jpg' },
    { id: 'goomba',   emoji: '👾', label: 'GOOMBA',         value: 2,  pool: 5,
      radioTag: 'military',  radioEmoji: '🧱', radioLabel: 'Military Comms',
      img: RAW + 'Goomba_by_Shigehisa_Nakaue.png' },
    { id: 'mario',    emoji: '🎮', label: 'MARIO',           value: 8,  pool: 2,
      radioTag: 'pop',       radioEmoji: '🎵', radioLabel: 'Pop',
      img: RAW + 'Recordando-Super-Mario-Bros-NES-10.jpg' },
    { id: 'coin',     emoji: '🪙', label: 'COIN',            value: 3,  pool: 4,
      radioTag: 'news',      radioEmoji: '📰', radioLabel: 'News',
      img: RAW + '3d2e69f35ad37e1d79141b16ab2f341c.jpg' },
    { id: 'luigi',    emoji: '🟢', label: 'LUIGI',           value: 5,  pool: 3,
      radioTag: 'ambient',   radioEmoji: '🌊', radioLabel: 'Ambient',
      img: GH_ASSETS.luigi },
    { id: 'question', emoji: '❓', label: 'BLOCK',           value: 4,  pool: 3,
      radioTag: 'electronic', radioEmoji: '⚡', radioLabel: 'Electronic',
      img: GH_ASSETS.blockWings },
    // ── NES Cartridge Covers ──────────────────────────────────────────────────
    { id: 'topgun',        emoji: '🛩',  label: 'TOP GUN',       value: 4, pool: 3,
      radioTag: 'military', radioEmoji: '📡', radioLabel: 'Military / Radar',
      img: 'https://github.com/user-attachments/assets/4641a66d-9881-487b-89d6-3c5ae8c63ba2' },
    { id: 'ducktales',     emoji: '🦆',  label: 'DUCKTALES',     value: 5, pool: 3,
      radioTag: 'folk',     radioEmoji: '🪕', radioLabel: 'Folk',
      img: 'https://github.com/user-attachments/assets/dda800be-0001-43a5-a841-a6db89c7c7f8' },
    { id: 'terminator',    emoji: '🤖',  label: 'TERMINATOR',    value: 7, pool: 2,
      radioTag: 'metal',    radioEmoji: '🔩', radioLabel: 'Metal',
      img: 'https://github.com/user-attachments/assets/a616af94-e8f5-4f9f-a29f-2e219074d3c5' },
    { id: 'dragonwarrior', emoji: '🐉',  label: 'DRAGON WARRIOR',value: 9, pool: 2,
      radioTag: 'world',    radioEmoji: '🌍', radioLabel: 'World',
      img: 'https://github.com/user-attachments/assets/51b10bb8-b5b2-4607-b2ff-5f2c638153d8' },
  ];

  // Weighted pool
  const POOL = [];
  SYMBOLS.forEach((s) => { for (let i = 0; i < s.pool; i++) POOL.push(s); });

  let spinCount  = 0;
  let totalCoins = 0;
  let spinning   = false;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _rand() {
    return POOL[Math.floor(Math.random() * POOL.length)];
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Render a single symbol cell with a row modifier class
  function _symHTML(sym, rowClass) {
    return `<div class="ms-sym ${rowClass}" data-id="${_esc(sym.id)}">
      <img class="ms-sym-img" src="${_esc(sym.img)}" alt="${_esc(sym.label)}"
           loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="ms-sym-emoji" style="display:none" aria-hidden="true">${sym.emoji}</span>
      <span class="ms-sym-label">${_esc(sym.label)}</span>
    </div>`;
  }

  // Render THREE rows: top ghost · payline (winner) · bottom ghost
  function _triple(top, mid, bot) {
    return _symHTML(top, 'ms-sym--top') +
           _symHTML(mid, 'ms-sym--mid') +
           _symHTML(bot, 'ms-sym--bot');
  }

  // ── Render the machine into a mount element ───────────────────────────────

  function render(mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    mount.innerHTML = `
      <div class="ms-machine glass-card">

        <div class="ms-header">
          <div>
            <h2 class="ms-title">
              <span class="ms-icon" aria-hidden="true">🍄</span>
              Mario Spin
            </h2>
            <p class="ms-sub">5-reel power-up slot ·
              <a href="https://github.com/www-infinity4/Mario-spin"
                 target="_blank" rel="noopener" class="ms-repo-link">Repo ↗</a>
            </p>
          </div>
          <div class="ms-counters">
            <div class="ms-counter-item">
              <span class="ms-counter-label">SPINS</span>
              <span class="ms-counter-val" id="msSpins">0</span>
            </div>
            <div class="ms-counter-item">
              <span class="ms-counter-label">COINS</span>
              <span class="ms-counter-val" id="msCoins">0</span>
            </div>
          </div>
        </div>

        <div class="ms-ticker" aria-hidden="true" id="msTicker">
          🍄 MUSHROOM KINGDOM ACTIVE — COLLECT POWER-UPS — ∞ ∞ ∞ — SPIN &amp; GO! —
        </div>

        <!-- 5-reel window — each reel shows top/payline/bottom rows -->
        <div class="ms-reels-outer">
          <div class="ms-reels" id="msReels" aria-label="Slot reels">
            ${[0,1,2,3,4].map((i) => {
              const t = _rand(), m = _rand(), b = _rand();
              return `${i > 0 ? '<div class="ms-sep" aria-hidden="true"></div>' : ''}
                      <div class="ms-reel" id="msReel${i}">${_triple(t, m, b)}</div>`;
            }).join('')}
          </div>
          <div class="ms-shine" aria-hidden="true"></div>
        </div>

        <!-- Result bar -->
        <div class="ms-result" id="msResult" aria-live="polite">
          <span class="ms-result-text" id="msResultText">Pull the lever to spin!</span>
        </div>

        <!-- Controls -->
        <div class="ms-controls">
          <button class="ms-spin-btn" id="msSpinBtn" aria-label="Spin the slot machine">
            <img class="ms-btn-block" src="${GH_ASSETS.blockWings}"
                 alt="" aria-hidden="true" width="36" height="36"
                 onerror="this.style.display='none';this.nextElementSibling.hidden=false">
            <span class="ms-btn-icon" aria-hidden="true" hidden>🍄</span>
            <span>SPIN &amp; GO!</span>
          </button>
        </div>

        <!-- Win flash -->
        <div class="ms-win-overlay" id="msWinOverlay" hidden aria-hidden="true"></div>
      </div>
    `;

    document.getElementById('msSpinBtn').addEventListener('click', spin);
  }

  // ── Spin logic ────────────────────────────────────────────────────────────

  function spin() {
    if (spinning) return;
    spinning = true;

    const btn        = document.getElementById('msSpinBtn');
    const resultEl   = document.getElementById('msResult');
    const resultText = document.getElementById('msResultText');
    const winOv      = document.getElementById('msWinOverlay');

    btn.disabled = true;
    btn.querySelector('span:last-child').textContent = 'Spinning…';
    resultText.textContent = '🎰 Spinning the reels…';
    resultEl.className = 'ms-result';
    if (winOv) winOv.hidden = true;

    // Clear any previous win highlights
    [0,1,2,3,4].forEach((i) => {
      const r = document.getElementById(`msReel${i}`);
      if (r) r.classList.remove('ms-reel--win');
    });

    if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('spin');

    // Determine final payline symbols (one per reel)
    const finals = [0,1,2,3,4].map(() => _rand());

    // Each reel cycles visually, then locks on its final symbol
    [0,1,2,3,4].forEach((i) => {
      const reelEl = document.getElementById(`msReel${i}`);
      const cycler = setInterval(() => {
        // During spin: show three random rows rapidly
        reelEl.innerHTML = _triple(_rand(), _rand(), _rand());
      }, 75);

      setTimeout(() => {
        clearInterval(cycler);
        // Lock: payline = finals[i], shoulder rows = random neighbours
        const top = _rand();
        const bot = _rand();
        reelEl.innerHTML = _triple(top, finals[i], bot);
        reelEl.classList.add('ms-land');
        setTimeout(() => reelEl.classList.remove('ms-land'), 350);

        if (i === 4) setTimeout(() => _resolve(finals), 120);
      }, 500 + i * 280);
    });
  }

  function _resolve(syms) {
    spinCount++;
    const spinsEl = document.getElementById('msSpins');
    if (spinsEl) spinsEl.textContent = spinCount;

    const counts = {};
    syms.forEach((s) => { counts[s.id] = (counts[s.id] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    const topId    = Object.keys(counts).find((k) => counts[k] === maxCount);
    const topSym   = SYMBOLS.find((s) => s.id === topId);

    // Highlight winning reels
    [0,1,2,3,4].forEach((i) => {
      if (syms[i].id === topId && maxCount >= 2) {
        const r = document.getElementById(`msReel${i}`);
        if (r) r.classList.add('ms-reel--win');
      }
    });

    let label, cls, coins = 0, winColor = null;

    if (maxCount === 5) {
      coins = topSym.value * 50;
      label = `🌟 JACKPOT! 5× ${topSym.emoji} ${topSym.label} — +${coins} COINS! 🎵🎬🎮`;
      cls   = 'ms-result--jackpot';
      winColor = '#ffd166';
      _flash('🌟 JACKPOT!', winColor);
      if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('win', 4);
      if (typeof RewardVault    !== 'undefined') RewardVault.award(5, topSym.label);
    } else if (maxCount === 4) {
      coins = topSym.value * 20;
      label = `💥 4× ${topSym.emoji} ${topSym.label} — +${coins} COINS! 🎮 Game token!`;
      cls   = 'ms-result--bigwin';
      winColor = '#7b5cfa';
      _flash('💥 GAME TOKEN!', winColor);
      if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('win', 3);
      if (typeof RewardVault    !== 'undefined') RewardVault.award(4, topSym.label);
    } else if (maxCount === 3) {
      coins = topSym.value * 5;
      label = `✨ 3× ${topSym.emoji} ${topSym.label} — +${coins} COINS! 🎬 Video token!`;
      cls   = 'ms-result--win';
      _flash('🎬 VIDEO TOKEN!', '#00d4ff');
      if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('win', 2);
      if (typeof RewardVault    !== 'undefined') RewardVault.award(3, topSym.label);
    } else if (maxCount === 2) {
      coins = topSym.value;
      label = `⚡ Pair! 2× ${topSym.emoji} — +${coins} coin 🎵 Music token!`;
      cls   = 'ms-result--pair';
      if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('win', 1);
      if (typeof RewardVault    !== 'undefined') RewardVault.award(2, topSym.label);
    } else {
      label = `No match — try again! 🍄`;
      cls   = 'ms-result--miss';
    }

    totalCoins += coins;
    const coinsEl = document.getElementById('msCoins');
    if (coinsEl) coinsEl.textContent = totalCoins;

    const resultEl   = document.getElementById('msResult');
    const resultText = document.getElementById('msResultText');
    if (resultText) resultText.textContent = label;
    if (resultEl)   resultEl.className = `ms-result ${cls}`;

    // Update ticker with last result
    const ticker = document.getElementById('msTicker');
    if (ticker && coins > 0) {
      ticker.textContent = `${topSym.emoji} ${topSym.label} ×${maxCount} · +${coins} COINS · SPIN AGAIN!`;
    }

    if (coins > 0 && topSym.radioTag && typeof window._onMarioSlotWin === 'function') {
      window._onMarioSlotWin(topSym, maxCount);
    }
    if (coins > 0 && typeof BtcHarvester !== 'undefined') {
      BtcHarvester.emit(`Mario Spin — ${topSym.emoji} ×${maxCount} (+${coins} coins)`);
    }
    if (typeof LevelSystem !== 'undefined') {
      const xpMap = { 5: 'jackpot', 4: 'fourOak', 3: 'threeOak', 2: 'pair' };
      LevelSystem.awardXP(xpMap[maxCount] || 'spin');
      if (coins > 0) LevelSystem.activatePower(topSym.id, maxCount);
    }
    if (typeof Synapse !== 'undefined' && coins > 0) {
      Synapse.remember('user',
        `Mario Spin: ${topSym.emoji} ×${maxCount} → ${topSym.radioLabel} · +${coins} coins`,
        'signal');
    }
    if (typeof SignalValue !== 'undefined') {
      SignalValue.add('marioSpin', Math.max(1, Math.floor(coins / 5)));
    }

    // Flag for Game Spinner combo detection
    if (coins > 0) window._lastMarioSpinWin = true;

    const btn = document.getElementById('msSpinBtn');
    if (btn) {
      btn.disabled = false;
      btn.querySelector('span:last-child').textContent = 'SPIN & GO!';
    }
    spinning = false;
  }

  function _flash(text, color) {
    const ov = document.getElementById('msWinOverlay');
    if (!ov) return;
    ov.textContent = text;
    ov.style.color = color || '#ffd166';
    ov.hidden      = false;
    setTimeout(() => { ov.hidden = true; }, 1800);
  }

  return { render, SYMBOLS };
})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarioSpin;
}
