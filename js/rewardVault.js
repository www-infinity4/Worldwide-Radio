/**
 * Reward Vault — Token System for Mario Spin
 *
 * Token tiers earned by Mario Spin match results:
 *   Pair  (2×)   →  🎵  MUSIC token  — plays chiptune or user audio URL
 *   3-oak (3×)   →  🎬  VIDEO token  — opens video player (archive.org / YouTube / MP4)
 *   4-oak (4×)   →  🎮  GAME  token  — unlocks one NES emulator round
 *   Jackpot (5×) →  🌟  ALL THREE    — music + video + game simultaneously
 *
 * Free content pre-loaded from Archive.org public domain library.
 * Users can paste any audio/video URL into the vault.
 */

const RewardVault = (() => {

  const LS_KEY = 'www_infinity_vault_v1';

  // ── Default free content libraries ───────────────────────────────────────

  const DEFAULT_MUSIC = [
    { label: '🎵 Chiptune — Spin Theme',    type: 'chiptune', tag: 'spin',   author: 'Original — Web Audio' },
    { label: '🎷 Chiptune — Jazz Win',      type: 'chiptune', tag: 'win2',   author: 'Original — Web Audio' },
    { label: '🌊 Chiptune — Ambient Loop',  type: 'chiptune', tag: 'loop',   author: 'Original — Web Audio' },
    { label: '🚀 Chiptune — Launch Fanfare',type: 'chiptune', tag: 'launch', author: 'Original — Web Audio' },
  ];

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

  function _load() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || _empty();
    } catch (_) { return _empty(); }
  }

  function _empty() {
    return { music: 0, video: 0, game: 0, history: [] };
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
   * @param {number} matchCount  – 2 (pair), 3, 4, or 5 (jackpot)
   * @param {string} symbolLabel – e.g. "MUSHROOM"
   */
  function award(matchCount, symbolLabel) {
    const s = _load();

    if (matchCount >= 5) {
      // JACKPOT — all three
      s.music += 2; s.video += 2; s.game += 2;
      _log('all', `Jackpot! ${symbolLabel} ×5`);
    } else if (matchCount === 4) {
      s.game += 2;
      _log('game', `4× ${symbolLabel}`);
    } else if (matchCount === 3) {
      s.video += 1;
      _log('video', `3× ${symbolLabel}`);
    } else if (matchCount === 2) {
      s.music += 1;
      _log('music', `2× ${symbolLabel}`);
    }

    _save(s);
    _updateBadges();
    _openVault();
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
    _setBadge('vaultMusicCount', s.music);
    _setBadge('vaultVideoCount', s.video);
    _setBadge('vaultGameCount',  s.game);
    // Enable/disable spend buttons
    ['music','video','game'].forEach((t) => {
      document.querySelectorAll(`.vault-spend-btn[data-token="${t}"]`).forEach((b) => {
        b.disabled = (s[t] || 0) < 1;
        b.textContent = b.dataset.label + ` (${s[t] || 0})`;
      });
    });
  }

  function _setBadge(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Vault panel open / tab switch ─────────────────────────────────────────

  function _openVault() {
    const shell = document.getElementById('vaultShell');
    if (shell) shell.hidden = false;
  }

  function _switchTab(tab) {
    document.querySelectorAll('.vault-tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.vault-pane').forEach((p) => {
      p.hidden = p.dataset.pane !== tab;
    });
  }

  // ── MUSIC player ──────────────────────────────────────────────────────────

  let _musicAudio = null;

  function _playMusicToken(item) {
    if (!_spend('music')) return;

    if (item.type === 'chiptune') {
      if (typeof ChiptuneEngine !== 'undefined') {
        if (item.tag === 'loop') {
          ChiptuneEngine.startLoop();
        } else if (item.tag === 'win2') {
          ChiptuneEngine.play('win', 2);
        } else if (item.tag === 'launch') {
          ChiptuneEngine.play('launch');
        } else {
          ChiptuneEngine.play('spin');
        }
      }
      _showMusicStatus(`▶ ${item.label} — playing`);
      return;
    }

    // URL-based audio
    if (_musicAudio) { _musicAudio.pause(); _musicAudio = null; }
    _musicAudio = new Audio(item.url);
    _musicAudio.volume = 0.5;
    _musicAudio.play().catch((e) => _showMusicStatus(`⚠ ${e.message}`));
    _showMusicStatus(`▶ ${item.label}`);
  }

  function _showMusicStatus(msg) {
    const el = document.getElementById('vaultMusicStatus');
    if (el) el.textContent = msg;
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
    _openVault();
    _switchTab('game');
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
              Token Vault
            </h2>
            <p class="vault-sub">Pair=🎵 · 3-oak=🎬 · 4-oak=🎮 · Jackpot=🌟 All</p>
          </div>
          <div class="vault-counts">
            <div class="vault-count-item" title="Music tokens">
              <span class="vault-count-icon">🎵</span>
              <span class="vault-count-val" id="vaultMusicCount">0</span>
            </div>
            <div class="vault-count-item" title="Video tokens">
              <span class="vault-count-icon">🎬</span>
              <span class="vault-count-val" id="vaultVideoCount">0</span>
            </div>
            <div class="vault-count-item" title="Game tokens">
              <span class="vault-count-icon">🎮</span>
              <span class="vault-count-val" id="vaultGameCount">0</span>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="vault-tabs" role="tablist">
          <button class="vault-tab-btn active" data-tab="music"  role="tab">🎵 Music</button>
          <button class="vault-tab-btn"        data-tab="video"  role="tab">🎬 Video</button>
          <button class="vault-tab-btn"        data-tab="game"   role="tab">🎮 Games</button>
        </div>

        <!-- ── MUSIC PANE ── -->
        <div class="vault-pane" data-pane="music">
          <p class="vault-pane-hint">Spend a 🎵 token to play. Earn by getting a <strong>Pair</strong> in Mario Spin.</p>
          <div class="vault-status" id="vaultMusicStatus">No music playing.</div>
          <div class="vault-grid">
            ${DEFAULT_MUSIC.map((m, i) => `
              <div class="vault-item">
                <div class="vault-item-label">${m.label}</div>
                <div class="vault-item-author">${m.author}</div>
                <button class="vault-spend-btn btn-primary"
                        data-token="music"
                        data-label="▶ Play"
                        data-idx="${i}"
                        disabled>▶ Play (0)</button>
              </div>
            `).join('')}
          </div>
          <div class="vault-custom-row">
            <input type="url" id="vaultCustomAudioUrl" class="vault-url-input"
                   placeholder="Or paste any audio URL (.mp3, .ogg, SoundCloud…)" />
            <button class="vault-spend-btn btn-primary"
                    data-token="music" data-label="▶ Play URL" data-custom="audio" disabled>
              ▶ Play URL (0)
            </button>
          </div>
        </div>

        <!-- ── VIDEO PANE ── -->
        <div class="vault-pane" data-pane="video" hidden>
          <p class="vault-pane-hint">Spend a 🎬 token to watch. Earn by getting <strong>3-of-a-kind</strong>.</p>
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
          <p class="vault-pane-hint">Spend a 🎮 token to play one round. Earn by getting <strong>4-of-a-kind</strong>.</p>
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

    // Wire tabs
    mount.querySelectorAll('.vault-tab-btn').forEach((b) => {
      b.addEventListener('click', () => _switchTab(b.dataset.tab));
    });

    // Wire music buttons
    mount.querySelectorAll('.vault-spend-btn[data-token="music"]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.dataset.custom === 'audio') {
          const url = document.getElementById('vaultCustomAudioUrl')?.value?.trim();
          if (url) _playMusicToken({ label: 'Custom Audio', type: 'url', url });
        } else {
          const idx = parseInt(b.dataset.idx, 10);
          if (!isNaN(idx)) _playMusicToken(DEFAULT_MUSIC[idx]);
        }
      });
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
    DEFAULT_GAMES,
    DEFAULT_VIDEOS,
    DEFAULT_MUSIC,
    RAW,
  };
})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RewardVault;
}
