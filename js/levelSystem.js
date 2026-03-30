/**
 * Level System — ♣️♦️♥️♠️ XP Progression Engine
 *
 * Tracks experience points (XP) earned from all actions across the app.
 * Levels unlock new site stages, powers, and content.
 *
 * XP SOURCES:
 *   Spin Mario slot          →  +1 XP
 *   Pair  (2×)               →  +5 XP   + Watch & Earn (video token preview)
 *   3-of-a-kind              →  +15 XP  + Play & Collect (game token)
 *   4-of-a-kind              →  +30 XP  + Unlock new game ROM free
 *   Jackpot (5×)             →  +100 XP + ALL powers
 *   BTC Crush                →  +10 XP
 *   Research log entry       →  +3 XP   (×2 if Mushroom active)
 *   Tune to station          →  +2 XP
 *   Watch video token        →  +8 XP
 *   Play game token          →  +12 XP
 *   Warp created             →  +5 XP
 *
 * LEVELS  (♣️ → ♦️ → ♥️ → ♠️ → ∞):
 *   ♣️  Club    0–49    Newcomer        Unlocks: Basic Radio + Mario Spin
 *   ♦️  Diamond 50–149  Signal Seeker   Unlocks: Research Panel + Signal Coin
 *   ♥️  Heart   150–349 Researcher      Unlocks: Token Vault + Harvest Feed
 *   ♠️  Spade   350–699 Architect       Unlocks: Full Emulator + Zelda Vault
 *   ∞   Infinity 700+   Infinity Crown  Unlocks: All + Hidden bonus ROM
 *
 * SYMBOL POWERS (activated on winning spin):
 *   ⭐ Star    → Trending Boost: load top-voted stations
 *   🍄 Mushroom → Research Doubler: next 3 research entries = ×2 XP
 *   👾 Goomba  → Bug Scanner: show open GitHub issues count
 *   🪙 Coin    → Warp: save a session clone snapshot to localStorage
 *   🎮 Mario   → Free ROM: unlock a random game without spending a token
 *   🟢 Luigi   → Watch & Earn: award a bonus video token immediately
 */

const LevelSystem = (() => {

  const LS_KEY = 'www_infinity_levels_v1';

  const LEVELS = [
    { min: 0,   max: 49,   suit: '♣', name: 'Club',      label: 'Boot Layer',      color: '#00d4ff', layer: 1 },
    { min: 50,  max: 149,  suit: '♦', name: 'Diamond',   label: 'Signal Layer',    color: '#ffd166', layer: 2 },
    { min: 150, max: 349,  suit: '♥', name: 'Heart',     label: 'Frequency Layer', color: '#ef233c', layer: 3 },
    { min: 350, max: 699,  suit: '♠', name: 'Spade',     label: 'Architecture',    color: '#7b5cfa', layer: 4 },
    { min: 700, max: Infinity, suit: '∞', name: 'Infinity', label: 'Crown',        color: '#ffd166', layer: 5 },
  ];

  const XP_TABLE = {
    spin:       1,
    pair:       5,
    threeOak:   15,
    fourOak:    30,
    jackpot:    100,
    crush:      10,
    research:   3,
    tune:       2,
    watchVideo: 8,
    playGame:   12,
    warp:       5,
  };

  // ── State ─────────────────────────────────────────────────────────────────

  function _load() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || _empty();
    } catch (_) { return _empty(); }
  }

  function _empty() {
    return {
      xp:              0,
      totalXp:         0,
      warps:           [],
      researchMult:    1,
      researchMultLeft: 0,
      trendingActive:  false,
      bugScanResult:   null,
      freeRomPending:  false,
      actions:         [],
    };
  }

  function _save(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (_) {}
  }

  // ── Level calculation ─────────────────────────────────────────────────────

  function getLevel(xp) {
    return LEVELS.find((l) => xp >= l.min && xp <= l.max) || LEVELS[LEVELS.length - 1];
  }

  function getProgress(xp) {
    const lvl  = getLevel(xp);
    const next = LEVELS.find((l) => l.min > xp);
    if (!next) return 100;
    const range = next.min - lvl.min;
    return Math.round(((xp - lvl.min) / range) * 100);
  }

  function getState() { return _load(); }

  // ── XP award ──────────────────────────────────────────────────────────────

  function awardXP(type, count = 1) {
    const s      = _load();
    const base   = (XP_TABLE[type] || 1) * count;
    const mult   = (type === 'research' && s.researchMultLeft > 0) ? s.researchMult : 1;
    const gained = base * mult;

    const prevLevel = getLevel(s.xp);
    s.xp      += gained;
    s.totalXp += gained;

    // Decrease research multiplier counter
    if (type === 'research' && s.researchMultLeft > 0) {
      s.researchMultLeft--;
      if (s.researchMultLeft === 0) s.researchMult = 1;
    }

    // Log action
    s.actions.unshift({
      type, gained, xp: s.xp,
      ts: new Date().toISOString(),
    });
    s.actions = s.actions.slice(0, 50);

    _save(s);

    const newLevel = getLevel(s.xp);
    const levelled = newLevel.name !== prevLevel.name;

    _updateUI(s, levelled ? newLevel : null);
    return { gained, xp: s.xp, level: newLevel, levelled };
  }

  // ── Symbol powers ─────────────────────────────────────────────────────────

  /**
   * Activate the power for a winning symbol.
   * @param {string} symbolId  — 'star'|'mushroom'|'goomba'|'mario'|'luigi'|'coin'
   * @param {number} matchCount — 2–5
   */
  function activatePower(symbolId, matchCount) {
    const s = _load();

    switch (symbolId) {

      case 'star':
        // Trending Boost — hook triggers loadTopStations in app.js
        s.trendingActive = true;
        _save(s);
        _showPowerToast('⭐ Trending Boost!', 'Loading hottest stations…', '#ffd166');
        if (typeof window._onTrendingBoost === 'function') window._onTrendingBoost();
        break;

      case 'mushroom':
        // Research Doubler — next 3 entries earn ×2 XP
        s.researchMult     = 2;
        s.researchMultLeft = 3;
        _save(s);
        _showPowerToast('🍄 Research Doubled!', 'Next 3 research entries earn ×2 XP', '#06d6a0');
        _updateMultiplierBadge(2);
        break;

      case 'goomba':
        // Bug Scanner — fetch open issues from www-infinity4 repos
        _showPowerToast('👾 Bug Scanner!', 'Scanning repos for open issues…', '#ef233c');
        _runBugScan();
        break;

      case 'coin':
        // Warp — save session snapshot
        _createWarp();
        break;

      case 'mario':
        // Free ROM unlock — award game token without spending
        if (typeof RewardVault !== 'undefined') {
          RewardVault.award(matchCount >= 4 ? 4 : 3, 'MARIO FREE');
        }
        _showPowerToast('🎮 Free ROM Unlocked!', 'Game token awarded — no cost!', '#7b5cfa');
        if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('credit');
        break;

      case 'luigi':
        // Watch & Earn — immediate video token
        if (typeof RewardVault !== 'undefined') {
          RewardVault.award(3, 'LUIGI BONUS');
        }
        _showPowerToast('🟢 Watch & Earn!', 'Video token awarded!', '#00d4ff');
        break;
    }

    awardXP('spin');
  }

  // ── Warp (session snapshot) ───────────────────────────────────────────────

  function _createWarp() {
    const s = _load();

    const snapshot = {
      id:        Date.now().toString(36),
      ts:        new Date().toISOString(),
      xp:        s.xp,
      level:     getLevel(s.xp).name,
      research:  _snapshotResearch(),
      harvest:   _snapshotHarvest(),
    };

    s.warps.unshift(snapshot);
    s.warps = s.warps.slice(0, 10);
    _save(s);

    awardXP('warp');
    _showPowerToast('⚪ Warp Created!', `Clone #${snapshot.id} saved — your path is preserved`, '#aaa');
    _renderWarps();
    if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('coin');
  }

  function _snapshotResearch() {
    try {
      const raw = localStorage.getItem('www_infinity_research_v1');
      const data = raw ? JSON.parse(raw) : { entries: [] };
      return (data.entries || []).length;
    } catch (_) { return 0; }
  }

  function _snapshotHarvest() {
    try {
      if (typeof BtcHarvester !== 'undefined') {
        return BtcHarvester.getState().total || 0;
      }
    } catch (_) {}
    return 0;
  }

  // ── Bug Scanner ───────────────────────────────────────────────────────────

  async function _runBugScan() {
    try {
      const res  = await fetch('https://api.github.com/orgs/www-infinity4/repos?per_page=10');
      const repos = await res.json();
      if (!Array.isArray(repos)) throw new Error('No repos');

      let total = 0;
      repos.forEach((r) => { total += (r.open_issues_count || 0); });

      const s          = _load();
      s.bugScanResult  = { total, repos: repos.length, ts: new Date().toISOString() };
      _save(s);

      _renderBugScan(s.bugScanResult);
      _showPowerToast('👾 Scan Complete!', `${total} open issue${total !== 1 ? 's' : ''} across ${repos.length} repos`, '#ef233c');
    } catch (err) {
      _showPowerToast('👾 Bug Scan', 'Could not reach GitHub API', '#ef233c');
    }
  }

  function _renderBugScan(result) {
    const el = document.getElementById('bugScanResult');
    if (!el || !result) return;
    el.hidden = false;
    el.textContent = `👾 Bug Scan: ${result.total} open issues across ${result.repos} repos · ${new Date(result.ts).toLocaleTimeString()}`;
  }

  // ── UI updates ────────────────────────────────────────────────────────────

  function _updateUI(s, levelledUp) {
    const lvl      = getLevel(s.xp);
    const progress = getProgress(s.xp);
    const next     = LEVELS.find((l) => l.min > s.xp);

    // Quiet system status line — just XP + layer name, no suit symbol in your face
    const badge = document.getElementById('levelBadge');
    if (badge) {
      badge.textContent    = `sys:${lvl.label}`;
      badge.style.color    = lvl.color;
      badge.style.borderColor = `${lvl.color}44`;
      badge.title          = `Layer ${lvl.layer}/5 · ${s.xp} XP · ${lvl.name}`;
    }

    // Thin XP progress bar — ambient, not dominant
    const bar = document.getElementById('levelXpBar');
    if (bar) {
      bar.style.width      = `${progress}%`;
      bar.style.background = lvl.color;
    }

    const xpText = document.getElementById('levelXpText');
    if (xpText) {
      xpText.textContent = next
        ? `${s.xp} xp · ${next.min - s.xp} to layer ${next.layer}`
        : `${s.xp} xp · crown reached`;
    }

    // Layer-up — quiet system log, not a fanfare badge
    if (levelledUp) {
      _showPowerToast(
        `sys: ${levelledUp.label} online`,
        `Layer ${levelledUp.layer} unlocked — new signals available`,
        levelledUp.color
      );
      if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('credit');
      _applyLevelUnlocks(levelledUp);
    }

    // Research multiplier badge
    if (s.researchMultLeft > 0) _updateMultiplierBadge(s.researchMult, s.researchMultLeft);
  }

  function _updateMultiplierBadge(mult, left) {
    const el = document.getElementById('researchMultBadge');
    if (!el) return;
    el.hidden      = !left;
    el.textContent = left ? `🍄 ×${mult} (${left} left)` : '';
  }

  function _applyLevelUnlocks(level) {
    // Unhide sections based on level reached
    const map = {
      'Diamond':  ['coinCard'],
      'Heart':    ['harvestCard', 'vaultShell'],
      'Spade':    [],
      'Infinity': [],
    };
    (map[level.name] || []).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = false;
    });
  }

  function _renderWarps() {
    const el = document.getElementById('warpList');
    if (!el) return;
    const s = _load();
    el.innerHTML = s.warps.map((w) => `
      <div class="warp-item">
        <span class="warp-icon">⚪</span>
        <span class="warp-info">Clone ${w.id} · ${w.level} · ${w.xp} XP · ${w.research} notes · ${(w.harvest || 0).toFixed(6)} ₿</span>
        <span class="warp-time">${new Date(w.ts).toLocaleTimeString()}</span>
      </div>
    `).join('') || '<p class="warp-empty">No warps yet. Land a 🪙 Coin to create one.</p>';
  }

  function _showPowerToast(title, sub, color) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast toast-power';
    t.style.borderColor = color;
    t.innerHTML = `<strong style="color:${color}">${title}</strong><br><span>${sub}</span>`;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-show'));
    setTimeout(() => {
      t.classList.remove('toast-show');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, 4500);
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    const s   = _load();
    const lvl = getLevel(s.xp);
    _updateUI(s, null);
    _renderWarps();

    // Restore bug scan result if it exists
    if (s.bugScanResult) _renderBugScan(s.bugScanResult);

    // Restore research multiplier badge
    if (s.researchMultLeft > 0) _updateMultiplierBadge(s.researchMult, s.researchMultLeft);

    console.log(`[LevelSystem] ${lvl.suit} ${lvl.label} · ${s.xp} XP`);
  }

  return {
    init,
    awardXP,
    activatePower,
    getLevel,
    getProgress,
    getState,
    LEVELS,
    XP_TABLE,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = LevelSystem;
