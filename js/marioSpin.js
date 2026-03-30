/**
 * Mario Spin — Self-Contained 5-Reel Slot Machine
 *
 * Ported from www-infinity4/Mario-spin.
 * Images served directly from that repo via GitHub raw CDN.
 * Falls back to emoji if images are unavailable.
 *
 * Hooks into BtcHarvester (if present) to emit a simulated transaction
 * on every winning spin.
 */

const MarioSpin = (() => {

  const RAW = 'https://raw.githubusercontent.com/www-infinity4/Mario-spin/main/';

  const SYMBOLS = [
    { id: 'mushroom', emoji: '🍄', label: 'MUSHROOM', value: 6,  pool: 4,
      img: RAW + '1200px-SMP_Dash_Mushroom.png' },
    { id: 'star',     emoji: '⭐', label: 'STAR',     value: 10, pool: 1,
      img: RAW + 'Cute-3D-Mario-Super-Star-PNG-Vector-Golden-Color-Cartoon-Nintendo.jpg' },
    { id: 'goomba',   emoji: '👾', label: 'GOOMBA',   value: 2,  pool: 5,
      img: RAW + 'Goomba_by_Shigehisa_Nakaue.png' },
    { id: 'mario',    emoji: '🎮', label: 'MARIO',    value: 8,  pool: 2,
      img: RAW + 'Recordando-Super-Mario-Bros-NES-10.jpg' },
    { id: 'luigi',    emoji: '🟢', label: 'LUIGI',    value: 5,  pool: 3,
      img: RAW + '3a083df05201781d56433d893565e39edca3e161_large.jpg' },
    { id: 'coin',     emoji: '🪙', label: 'COIN',     value: 3,  pool: 4,
      img: RAW + '3d2e69f35ad37e1d79141b16ab2f341c.jpg' },
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

  function _cell(sym) {
    return `<div class="ms-sym" data-id="${_esc(sym.id)}">
      <img class="ms-sym-img" src="${_esc(sym.img)}" alt="${_esc(sym.label)}"
           loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="ms-sym-emoji" style="display:none" aria-hidden="true">${sym.emoji}</span>
      <span class="ms-sym-label">${_esc(sym.label)}</span>
    </div>`;
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

        <div class="ms-ticker" aria-hidden="true">
          🍄 MUSHROOM KINGDOM ACTIVE — COLLECT POWER-UPS — ∞ ∞ ∞ — SPIN &amp; GO! —
        </div>

        <!-- Reels -->
        <div class="ms-reels-outer">
          <div class="ms-reels" id="msReels" aria-label="Slot reels">
            ${[0,1,2,3,4].map((i) =>
              `${i > 0 ? '<div class="ms-sep" aria-hidden="true"></div>' : ''}
               <div class="ms-reel" id="msReel${i}">${_cell(_rand())}</div>`
            ).join('')}
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
            <span class="ms-btn-icon" aria-hidden="true">🍄</span>
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

    // Determine final outcome
    const finals = [0,1,2,3,4].map(() => _rand());

    // Animate: rapid symbol cycling, staggered stop
    [0,1,2,3,4].forEach((i) => {
      const reelEl  = document.getElementById(`msReel${i}`);
      const cycler  = setInterval(() => {
        reelEl.innerHTML = _cell(_rand());
      }, 75);

      setTimeout(() => {
        clearInterval(cycler);
        reelEl.innerHTML = _cell(finals[i]);
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

    // Tally
    const counts = {};
    syms.forEach((s) => { counts[s.id] = (counts[s.id] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    const topId    = Object.keys(counts).find((k) => counts[k] === maxCount);
    const topSym   = SYMBOLS.find((s) => s.id === topId);

    let label, cls, coins = 0, winColor = null;

    if (maxCount === 5) {
      coins = topSym.value * 50;
      label = `🌟 JACKPOT! 5× ${topSym.emoji} ${topSym.label} — +${coins} COINS!`;
      cls   = 'ms-result--jackpot';
      winColor = '#ffd166';
      _flash('🌟 JACKPOT!', winColor);
    } else if (maxCount === 4) {
      coins = topSym.value * 20;
      label = `💥 BIG WIN! 4× ${topSym.emoji} ${topSym.label} — +${coins} COINS!`;
      cls   = 'ms-result--bigwin';
      winColor = '#7b5cfa';
      _flash('💥 BIG WIN!', winColor);
    } else if (maxCount === 3) {
      coins = topSym.value * 5;
      label = `✨ WIN! 3× ${topSym.emoji} ${topSym.label} — +${coins} COINS!`;
      cls   = 'ms-result--win';
      _flash('✨ WIN!', '#00d4ff');
    } else if (maxCount === 2) {
      coins = topSym.value;
      label = `⚡ Pair! 2× ${topSym.emoji} — +${coins} coin`;
      cls   = 'ms-result--pair';
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

    // Hook into BtcHarvester on a winning spin
    if (coins > 0 && typeof BtcHarvester !== 'undefined') {
      BtcHarvester.emit(`Mario Spin — ${topSym.emoji} ×${maxCount} (+${coins} coins)`);
      // Re-render harvest totals if the panel is visible
      if (typeof _refreshHarvest === 'function') _refreshHarvest();
    }

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
    ov.textContent   = text;
    ov.style.color   = color || '#ffd166';
    ov.hidden        = false;
    setTimeout(() => { ov.hidden = true; }, 1800);
  }

  return { render, SYMBOLS };
})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarioSpin;
}
