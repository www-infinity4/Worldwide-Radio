/**
 * Reward Vault — Token System for Mario Spin
 *
 * Token tiers earned by Mario Spin match results:
 *   Pair  (2×)   →  banked silently (no popup)
 *   3-oak (3×)   →  🎬  VIDEO token  — opens video player (archive.org / YouTube / MP4)
 *   4-oak (4×)   →  🎮  GAME  token  — unlocks one NES emulator round
 *   Jackpot (5×) →  🌟  BOTH         — video + game simultaneously
 *
 * Daily limits: 48 tokens from spins per day.
 * After 48, enter research terms in the Research panel to earn up to 150/day total.
 *
 * Free content pre-loaded from Archive.org public domain library.
 * Users can paste any video URL into the vault.
 */

const RewardVault = (() => {

  const LS_KEY      = 'www_infinity_vault_v1';
  const DAILY_BASE  = 48;   // tokens from spins before research gate kicks in
  const DAILY_MAX   = 150;  // absolute daily ceiling (API throttle)

  // ── Default free content libraries ───────────────────────────────────────

  // No music tokens — pair wins bank coins silently; rewards are video and game only.

  // Archive.org public domain embeds — fully free, no copyright
  const DEFAULT_VIDEOS = [
    {
      label: '🌌 Powers of Ten (1977)',
      author: 'Charles & Ray Eames / IBM',
      embed: 'https://archive.org/embed/powers_of_ten',
      type: 'archive',
      note: 'Public domain — scale of universe from quarks to galaxy clusters',
    },
    {
      label: '🚀 NASA Apollo 11 Moon Landing',
      author: 'NASA (public domain)',
      embed: 'https://archive.org/embed/Apollo11_16mmMagazineS_SupQueenCamera',
      type: 'archive',
      note: 'Public domain — NASA footage',
    },
    {
      label: '🌍 Cosmic Zoom (1968)',
      author: 'NFB Canada',
      embed: 'https://archive.org/embed/CosmicZoom',
      type: 'archive',
      note: 'Public domain — NFB animated film',
    },
    {
      label: '⚡ Tesla — The Genius Who Lit the World',
      author: 'Public Domain Documentary',
      embed: 'https://archive.org/embed/NikolaTesla-GeniusWhoLitTheWorld',
      type: 'archive',
      note: 'Public domain — Tesla biography',
    },
    {
      label: '🔬 Atoms for Peace (1953)',
      author: 'US Government (public domain)',
      embed: 'https://archive.org/embed/AtomsForP1953',
      type: 'archive',
      note: 'Public domain — US Government film',
    },
    // ── Zelda & Mario World Vault ──────────────────────────────────────────
    // Archive.org public domain / fan-restored episodes
    {
      label: '🗡️  Zelda — Slime Busters (Ep 5 RESTORED)',
      author: 'Super Mario Bros Super Show — Fan restore',
      embed: 'https://archive.org/embed/youtube-oxfgPWpaLJI',
      type: 'archive',
      clip: { start: 0, end: 180 },
      note: 'LOZ01 · First Zelda episode · 0–3 min clip',
    },
    {
      label: '🗡️  Zelda — Series Ep 1',
      author: 'Legend of Zelda 1989 Complete Series',
      embed: 'https://archive.org/embed/legend-of-zelda-1989-complete-series',
      type: 'archive',
      clip: { start: 0, end: 180 },
      note: 'Ep 1 · 0–3 min opening clip',
    },
    {
      label: '🗡️  Zelda — Series Ep 2',
      author: 'Legend of Zelda 1989 Complete Series',
      embed: 'https://archive.org/embed/legend-of-zelda-1989-complete-series/Zelda_E02.mp4',
      type: 'archive',
      clip: { start: 60, end: 240 },
      note: 'Ep 2 · 1–4 min action clip',
    },
    {
      label: '🗡️  Zelda — Series Ep 3',
      author: 'Legend of Zelda 1989 Complete Series',
      embed: 'https://archive.org/embed/legend-of-zelda-1989-complete-series/Zelda_E03.mp4',
      type: 'archive',
      clip: { start: 30, end: 210 },
      note: 'Ep 3 · 30s–3:30 min signal clip',
    },
    {
      label: '🍄 Mario — Title Theme Demo',
      author: 'Public Domain Chiptune Demo',
      embed: 'https://archive.org/embed/youtube-oxfgPWpaLJI',
      type: 'archive',
      clip: { start: 180, end: 360 },
      note: 'Mario theme reference · 3–6 min clip',
    },
    {
      label: '🎮 Add Your Own Video',
      author: 'YouTube · Archive.org · MP4 URL',
      embed: '',
      type: 'custom',
      note: 'Paste any video URL below',
      custom: true,
    },
  ];

  // Retrobrews free NES homebrew ROMs (MIT/free licence)
  const RAW = 'https://raw.githubusercontent.com/retrobrews/nes-games/d20061bf9917e8bb8b947d4dba8c59372f5762a0/';

  const DEFAULT_GAMES = [
    { label: '🐦 Flappy Bird NES',      file: 'flappybird.nes',         author: 'Retrobrews homebrew' },
    { label: '👾 Invaders',              file: 'invaders.nes',           author: 'Retrobrews homebrew' },
    { label: '⚔️  Driar',                file: 'driar.nes',              author: 'Retrobrews homebrew' },
    { label: '🧙 Mad Wizard',            file: 'madwizard.nes',          author: 'Retrobrews homebrew' },
    { label: '🥷 Robo Ninja Climb',      file: 'roboninjaclimb.nes',     author: 'Retrobrews homebrew' },
    { label: '🦉 Owlia',                 file: 'owlia.nes',              author: 'Retrobrews homebrew' },
    { label: '🎯 Obstacle Trek',         file: 'obstacletrek.nes',       author: 'Retrobrews homebrew' },
    { label: '💣 Bomb Array',            file: 'bombarray.nes',          author: 'Retrobrews homebrew' },
    { label: '🦸 Super Uwol',            file: 'superuwol.nes',          author: 'Retrobrews homebrew' },
    { label: '🐿️  Nova the Squirrel',    file: 'novathesquirrel.nes',    author: 'Retrobrews homebrew' },
    { label: '🛡️  Light Shields',        file: 'lightshields.nes',       author: 'Retrobrews homebrew' },
    { label: '🌙 Midnight Jogger',       file: 'midnightjogger.nes',     author: 'Retrobrews homebrew' },
    { label: '🗡️  Sir Ababol Remastered',file: 'sir-ababol-remastered.nes',author: 'Retrobrews homebrew' },
    { label: '🤺 Vigilante Ninja',       file: 'vigilanteninja.nes',     author: 'Retrobrews homebrew' },
    { label: '🦠 Virus Cleaner',         file: 'viruscleaner.nes',       author: 'Retrobrews homebrew' },
    { label: '🏔️  Mega Mountain',        file: 'megamountain.nes',       author: 'Retrobrews homebrew' },
    { label: '🏃 Falling',               file: 'falling.nes',            author: 'Retrobrews homebrew' },
    { label: '🌑 Thwaite',               file: 'thwaite.nes',            author: 'Retrobrews homebrew (MIT)' },
    { label: '🎲 Roulette',              file: 'roulette.nes',           author: 'Retrobrews homebrew' },
    { label: '🐭 Mouser 2',             file: 'mouser2.nes',            author: 'Retrobrews homebrew' },
    { label: '🐌 Snail Maze',            file: 'snailmaze.nes',          author: 'Retrobrews homebrew' },
    { label: '🤖 Robot Finds Kitten',    file: 'robotfindskitten.nes',   author: 'Retrobrews homebrew' },
    { label: '👊 Mashed Mashy',          file: 'mashymashy.nes',         author: 'Retrobrews homebrew' },
    { label: '🐈 Ninja Muncher',         file: 'ninjamuncher.nes',       author: 'Retrobrews homebrew' },
    { label: '📦 Your Own .nes ROM',     file: '',                       author: 'Paste GitHub raw URL', custom: true },
  ];

  // ── State ─────────────────────────────────────────────────────────────────

  function _today() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function _load() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY));
      if (!raw) return _empty();
      // Reset daily counters if it's a new day
      if (raw.dailyDate !== _today()) {
        raw.dailySpins = 0;
        raw.dailyDate  = _today();
      }
      return { ..._empty(), ...raw };
    } catch (_) { return _empty(); }
  }

  function _empty() {
    return { video: 0, game: 0, history: [], dailySpins: 0, dailyDate: _today() };
  }

  function _save(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (_) {}
  }

  function _log(type, label) {
    const s = _load();
    s.history.unshift({ type, label, ts: new Date().toISOString() });
    s.history = s.history.slice(0, 100);
    _save(s);
  }

  // ── Token management ──────────────────────────────────────────────────────

  /**
   * Award tokens based on match tier from Mario Spin.
   * Vault popup only shows for video (3-oak) or game (4-oak+) wins.
   * Pair (2×) banks a coin silently — no popup.
   * Daily limit: 48 tokens from spins; after that, research terms required.
   * @param {number} matchCount  – 2 (pair), 3, 4, or 5 (jackpot)
   * @param {string} symbolLabel – e.g. "MUSHROOM"
   */
  function award(matchCount, symbolLabel) {
    const s = _load();

    // Enforce daily cap
    const dailyCap = s.researchUnlocked ? DAILY_MAX : DAILY_BASE;
    if (s.dailySpins >= dailyCap) {
      _showDailyCapMessage(s.researchUnlocked);
      return;
    }
    s.dailySpins = (s.dailySpins || 0) + 1;

    let openTab = null;

    if (matchCount >= 5) {
      // JACKPOT — video + game (no music/chiptune)
      s.video += 2; s.game += 2;
      _log('game',  `Jackpot! ${symbolLabel} ×5`);
      _log('video', `Jackpot! ${symbolLabel} ×5`);
      openTab = 'video';
    } else if (matchCount === 4) {
      s.game += 2;
      _log('game', `4× ${symbolLabel}`);
      openTab = 'game';
    } else if (matchCount === 3) {
      s.video += 1;
      _log('video', `3× ${symbolLabel}`);
      openTab = 'video';
    } else if (matchCount === 2) {
      // Pair — bank silently, no popup
      _log('pair', `2× ${symbolLabel}`);
    }

    _save(s);
    _updateBadges();

    // Only open vault popup for video / game wins
    if (openTab) {
      _openVault(openTab);
    }

    // Notify ArcadeFlow that a token was earned (so it can flash the vault)
    document.dispatchEvent(new CustomEvent('arcadeTokenEarned', { detail: { matchCount, symbolLabel } }));
  }

  /**
   * Called by the Research Panel when the user submits research terms.
   * Unlocks the higher daily cap (up to DAILY_MAX).
   */
  function unlockResearchBonus() {
    const s = _load();
    s.researchUnlocked = true;
    _save(s);
    _hideDailyCapMessage();
  }

  function _showDailyCapMessage(alreadyUnlocked) {
    const el = document.getElementById('vaultDailyMsg');
    if (!el) return;
    if (alreadyUnlocked) {
      el.textContent = `Daily limit of ${DAILY_MAX} tokens reached. Come back tomorrow!`;
    } else {
      el.textContent = `Daily spin limit reached (${DAILY_BASE} tokens). Enter research terms below to keep earning today.`;
    }
    el.hidden = false;
  }

  function _hideDailyCapMessage() {
    const el = document.getElementById('vaultDailyMsg');
    if (el) el.hidden = true;
  }

  function _spend(type) {
    const s = _load();
    if ((s[type] || 0) < 1) return false;
    s[type]--;
    _save(s);
    _updateBadges();
    return true;
  }

  function _updateBadges() {
    const s = _load();
    _setBadge('vaultVideoCount', s.video);
    _setBadge('vaultGameCount',  s.game);
    // Enable/disable spend buttons
    ['video','game'].forEach((t) => {
      document.querySelectorAll(`.vault-spend-btn[data-token="${t}"]`).forEach((b) => {
        b.disabled = (s[t] || 0) < 1;
        b.textContent = b.dataset.label + ` (${s[t] || 0})`;
      });
    });
    // Update daily spins counter display
    const dailyEl = document.getElementById('vaultDailySpins');
    if (dailyEl) {
      const cap = s.researchUnlocked ? DAILY_MAX : DAILY_BASE;
      dailyEl.textContent = `${s.dailySpins || 0} / ${cap} today`;
    }
  }

  function _setBadge(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Vault panel open / tab switch ─────────────────────────────────────────

  function _openVault(tab) {
    const shell = document.getElementById('vaultShell');
    if (shell) shell.hidden = false;
    if (tab) _switchTab(tab);
  }

  function _switchTab(tab) {
    document.querySelectorAll('.vault-tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.vault-pane').forEach((p) => {
      p.hidden = p.dataset.pane !== tab;
    });
  }

  // ── VIDEO player ──────────────────────────────────────────────────────────

  function _playVideoToken(item) {
    if (!_spend('video')) return;

    const frame  = document.getElementById('vaultVideoFrame');
    const player = document.getElementById('vaultVideoPlayer');
    const status = document.getElementById('vaultVideoStatus');

    if (!frame || !player) return;

    let embedUrl = item.embed || item.url || '';

    // Auto-convert YouTube watch URLs to embed
    const ytMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;

    // Auto-convert archive.org URLs
    const archMatch = embedUrl.match(/archive\.org\/details\/([^/?]+)/);
    if (archMatch) embedUrl = `https://archive.org/embed/${archMatch[1]}`;

    if (embedUrl && (embedUrl.includes('youtube.com/embed') || embedUrl.includes('archive.org/embed'))) {
      // Iframe embed
      player.hidden = true;
      frame.src = embedUrl;
      frame.hidden = false;
      if (status) status.textContent = `▶ ${item.label}`;
    } else if (embedUrl.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
      // Direct video
      frame.hidden = true;
      player.src = embedUrl;
      player.hidden = false;
      player.play().catch((e) => { if (status) status.textContent = `⚠ ${e.message}`; });
      if (status) status.textContent = `▶ ${item.label}`;
    } else if (embedUrl) {
      // Try iframe fallback for any other URL
      player.hidden = true;
      frame.src = embedUrl;
      frame.hidden = false;
    }

    _switchTab('video');
  }

  // ── GAME emulator ─────────────────────────────────────────────────────────

  function _launchGame(item) {
    if (typeof GameEmulator === 'undefined') {
      alert('Game emulator not loaded. Check js/gameEmulator.js.');
      return;
    }
    if (!_spend('game')) return;

    // Give one credit to the emulator and launch the ROM
    GameEmulator.addCredits(1);
    const url = item.custom
      ? document.getElementById('vaultCustomRomUrl')?.value?.trim()
      : RAW + item.file;

    if (url) GameEmulator.launchROM(url);
    _openVault('game');
  }

  // ── Render vault panel ────────────────────────────────────────────────────

  function render(mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    mount.innerHTML = `
      <div class="vault-card glass-card">

        <!-- Header -->
        <div class="vault-header">
          <div>
            <h2 class="vault-title">
              <span aria-hidden="true">🏆</span>
              Rewards
            </h2>
            <p class="vault-sub">3-of-a-kind=🎬 Video · 4-of-a-kind=🎮 Game · Jackpot=🌟 Both</p>
          </div>
          <div class="vault-counts">
            <div class="vault-count-item" title="Video tokens">
              <span class="vault-count-icon">🎬</span>
              <span class="vault-count-val" id="vaultVideoCount">0</span>
            </div>
            <div class="vault-count-item" title="Game tokens">
              <span class="vault-count-icon">🎮</span>
              <span class="vault-count-val" id="vaultGameCount">0</span>
            </div>
            <div class="vault-count-item" title="Tokens earned today">
              <span class="vault-count-icon">🪙</span>
              <span class="vault-count-val" id="vaultDailySpins">0 / ${DAILY_BASE}</span>
            </div>
          </div>
        </div>

        <!-- Daily cap message (hidden until cap is reached) -->
        <div class="vault-daily-msg" id="vaultDailyMsg" hidden></div>

        <!-- Close button -->
        <button class="vault-close-btn btn-secondary" id="vaultCloseBtn" aria-label="Close rewards">✕ Close</button>

        <!-- Tabs -->
        <div class="vault-tabs" role="tablist">
          <button class="vault-tab-btn active" data-tab="video" role="tab">🎬 Video</button>
          <button class="vault-tab-btn"        data-tab="game"  role="tab">🎮 Games</button>
        </div>

        <!-- ── VIDEO PANE ── -->
        <div class="vault-pane" data-pane="video">
          <p class="vault-pane-hint">Spend a 🎬 token to watch. Earn by getting <strong>3-of-a-kind</strong> in Mario Spin.</p>
          <div class="vault-status" id="vaultVideoStatus">No video playing.</div>
          <div class="vault-player-wrap">
            <iframe id="vaultVideoFrame" class="vault-iframe" src="" hidden
                    allow="autoplay; fullscreen" frameborder="0"
                    title="Video player" loading="lazy"></iframe>
            <video id="vaultVideoPlayer" class="vault-video" controls hidden></video>
          </div>
          <div class="vault-grid">
            ${DEFAULT_VIDEOS.filter((v) => !v.custom).map((v, i) => `
              <div class="vault-item">
                <div class="vault-item-label">${v.label}</div>
                <div class="vault-item-author">${v.author}</div>
                <div class="vault-item-note">${v.note}</div>
                <button class="vault-spend-btn btn-primary"
                        data-token="video"
                        data-label="▶ Watch"
                        data-vidx="${i}"
                        disabled>▶ Watch (0)</button>
              </div>
            `).join('')}
          </div>
          <div class="vault-custom-row">
            <input type="url" id="vaultCustomVideoUrl" class="vault-url-input"
                   placeholder="YouTube, archive.org, or direct MP4 URL…" />
            <button class="vault-spend-btn btn-primary"
                    data-token="video" data-label="▶ Watch URL" data-custom="video" disabled>
              ▶ Watch URL (0)
            </button>
          </div>
        </div>

        <!-- ── GAME PANE ── -->
        <div class="vault-pane" data-pane="game" hidden>
          <p class="vault-pane-hint">Spend a 🎮 token to play one round. Earn by getting <strong>4-of-a-kind</strong> in Mario Spin.</p>
          <div id="gameEmulatorMount"></div>
          <div class="vault-grid vault-grid--games">
            ${DEFAULT_GAMES.filter((g) => !g.custom).map((g, i) => `
              <div class="vault-item vault-item--game">
                <div class="vault-item-label">${g.label}</div>
                <div class="vault-item-author">${g.author}</div>
                <button class="vault-spend-btn btn-primary"
                        data-token="game"
                        data-label="🎮 Play"
                        data-gidx="${i}"
                        disabled>🎮 Play (0)</button>
              </div>
            `).join('')}
          </div>
          <div class="vault-custom-row">
            <input type="url" id="vaultCustomRomUrl" class="vault-url-input"
                   placeholder="GitHub raw .nes ROM URL — your own game" />
            <button class="vault-spend-btn btn-primary"
                    data-token="game" data-label="🎮 Load ROM" data-custom="rom" disabled>
              🎮 Load ROM (0)
            </button>
          </div>
        </div>

      </div>
    `;

    // Init game emulator inside vault
    if (typeof GameEmulator !== 'undefined') {
      GameEmulator.render('gameEmulatorMount');
    }

    // Wire close button
    const closeBtn = document.getElementById('vaultCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const shell = document.getElementById('vaultShell');
        if (shell) shell.hidden = true;
      });
    }

    // Wire tabs
    mount.querySelectorAll('.vault-tab-btn').forEach((b) => {
      b.addEventListener('click', () => _switchTab(b.dataset.tab));
    });

    // Wire video buttons
    mount.querySelectorAll('.vault-spend-btn[data-token="video"]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.dataset.custom === 'video') {
          const url = document.getElementById('vaultCustomVideoUrl')?.value?.trim();
          if (url) _playVideoToken({ label: 'Custom Video', embed: url });
        } else {
          const idx = parseInt(b.dataset.vidx, 10);
          if (!isNaN(idx)) _playVideoToken(DEFAULT_VIDEOS[idx]);
        }
      });
    });

    // Wire game buttons
    mount.querySelectorAll('.vault-spend-btn[data-token="game"]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.dataset.custom === 'rom') {
          _launchGame({ custom: true });
        } else {
          const idx = parseInt(b.dataset.gidx, 10);
          if (!isNaN(idx)) _launchGame(DEFAULT_GAMES[idx]);
        }
      });
    });

    _updateBadges();
  }

  return {
    render,
    award,
    unlockResearchBonus,
    DEFAULT_GAMES,
    DEFAULT_VIDEOS,
    RAW,
  };
})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RewardVault;
}
