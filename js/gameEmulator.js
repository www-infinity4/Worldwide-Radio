/**
 * Game Emulator — NES Credit System
 *
 * Credits are earned by winning spins in Mario Spin.
 * Each credit unlocks one round in a NES emulator powered by JSNES (MIT).
 *
 * ROM Loading:
 *   - Predefined free homebrew ROMs (publicly & freely distributed)
 *   - User-supplied GitHub raw URL to any .nes ROM they own
 *
 * JSNES is loaded dynamically from CDN on first launch.
 * https://github.com/bfirsh/jsnes  (MIT License)
 */

const GameEmulator = (() => {

  const JSNES_CDN = 'https://cdn.jsdelivr.net/npm/jsnes@1.0.4/dist/jsnes.min.js';

  // Free homebrew NES ROMs — legally distributable
  const FREE_ROMS = [
    {
      label: '🍄 Alter Ego',
      author: 'Shiru (2010)',
      url: 'https://raw.githubusercontent.com/www-infinity4/Mario-spin/main/roms/alter_ego.nes',
      note: 'Free homebrew platformer',
    },
    {
      label: '🚀 Thwaite',
      author: 'Damian Yerrick (2012)',
      url: 'https://raw.githubusercontent.com/www-infinity4/Mario-spin/main/roms/thwaite.nes',
      note: 'Free open-source missile defense',
    },
    {
      label: '🎵 Custom ROM',
      author: 'Your GitHub',
      url: '',
      note: 'Paste a GitHub raw .nes URL below',
      custom: true,
    },
  ];

  // NES key map
  const KEY_MAP = {
    ArrowUp:    4,   // BUTTON_UP
    ArrowDown:  5,   // BUTTON_DOWN
    ArrowLeft:  6,   // BUTTON_LEFT
    ArrowRight: 7,   // BUTTON_RIGHT
    KeyZ:       0,   // BUTTON_A
    KeyX:       1,   // BUTTON_B
    Enter:      3,   // BUTTON_START
    ShiftLeft:  2,   // BUTTON_SELECT
  };

  let credits   = 0;
  let nes       = null;
  let rafId     = null;
  let imageData = null;
  let canvas    = null;
  let ctx2d     = null;
  let running   = false;
  let _demoTimer = null;   // setInterval handle for 90-second demo countdown
  let _demoGame  = null;   // game metadata passed in from GameSpinner

  // ── Credit management ─────────────────────────────────────────────────────

  function addCredits(n) {
    credits += n;
    _updateCreditsDisplay();
    // Show the emulator shell when first credit is earned
    const shell = document.getElementById('emuShell');
    if (shell) shell.hidden = false;
    _log(`🎮 +${n} game credit${n !== 1 ? 's' : ''} earned! Total: ${credits}`);
  }

  function _updateCreditsDisplay() {
    const el = document.getElementById('emuCredits');
    if (el) el.textContent = credits;
    const launchBtns = document.querySelectorAll('.emu-launch-btn');
    launchBtns.forEach((b) => { b.disabled = credits < 1; });
  }

  // ── ROM loading ───────────────────────────────────────────────────────────

  function _loadJSNES(callback) {
    if (window.jsnes) { callback(); return; }
    const s    = document.createElement('script');
    s.src      = JSNES_CDN;
    s.onload   = callback;
    s.onerror  = () => _log('⚠ Could not load JSNES from CDN. Check your connection.');
    document.head.appendChild(s);
  }

  async function _fetchROM(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ROM fetch failed: ${res.status} ${res.statusText}`);
    const buf   = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let str = '';
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return str;
  }

  async function launchROM(url) {
    if (credits < 1) {
      _log('⚠ No game credits. Earn credits by winning 3-of-a-kind in Mario Spin!');
      return;
    }
    if (!url || !url.trim()) {
      _log('⚠ No ROM URL provided.');
      return;
    }

    _log('⏳ Loading JSNES emulator…');
    _loadJSNES(async () => {
      try {
        _log(`⏳ Fetching ROM from ${url.split('/').pop()}…`);
        const romData = await _fetchROM(url.trim());

        // Spend one credit
        credits = Math.max(0, credits - 1);
        _updateCreditsDisplay();
        _log(`🎮 Credit spent. ${credits} remaining.`);

        _startEmulator(romData);
      } catch (err) {
        _log(`⚠ ROM Error: ${err.message}`);
      }
    });
  }

  function _startEmulator(romData) {
    canvas  = document.getElementById('emuCanvas');
    ctx2d   = canvas ? canvas.getContext('2d') : null;
    if (!canvas || !ctx2d) { _log('⚠ Emulator canvas not found.'); return; }

    imageData = ctx2d.createImageData(256, 240);

    // Stop any running emulator
    _stopEmulator();

    nes = new window.jsnes.NES({
      onFrame(frameBuffer) {
        for (let i = 0; i < frameBuffer.length; i++) {
          const pixel = frameBuffer[i];
          const pos   = i * 4;
          imageData.data[pos]     = (pixel >> 16) & 0xff; // R
          imageData.data[pos + 1] = (pixel >>  8) & 0xff; // G
          imageData.data[pos + 2] =  pixel        & 0xff; // B
          imageData.data[pos + 3] = 0xff;                 // A
        }
        ctx2d.putImageData(imageData, 0, 0);
      },
      onAudioSample() {},  // audio piped to Web Audio in a future enhancement
    });

    try {
      nes.loadROM(romData);
    } catch (err) {
      _log(`⚠ ROM load error: ${err.message}`);
      return;
    }

    // Show game display
    const display = document.getElementById('emuDisplay');
    if (display) display.hidden = false;

    canvas.focus();
    running = true;

    function loop() {
      if (!running) return;
      nes.frame();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    _log('▶ Emulator running. Arrow keys · Z=A · X=B · Enter=Start');
    _attachKeys();

    // Start 90-second demo timer if a game context was passed
    if (_demoGame) _startDemoTimer(_demoGame);
  }

  // ── 90-second Demo Timer ──────────────────────────────────────────────────

  const DEMO_SECONDS = 90;

  function startDemoSession(game) {
    _demoGame = game;
  }

  function _startDemoTimer(game) {
    // Clear any previous timer
    if (_demoTimer) clearInterval(_demoTimer);

    let remaining = DEMO_SECONDS;
    _updateDemoBar(remaining);

    const barWrap = document.getElementById('emuDemoWrap');
    if (barWrap) barWrap.hidden = false;

    _demoTimer = setInterval(() => {
      remaining--;
      _updateDemoBar(remaining);

      if (remaining <= 0) {
        clearInterval(_demoTimer);
        _demoTimer = null;
        _endDemo(game);
      }
    }, 1000);
  }

  function _updateDemoBar(remaining) {
    const pct    = Math.round((remaining / DEMO_SECONDS) * 100);
    const bar    = document.getElementById('emuDemoBar');
    const label  = document.getElementById('emuDemoLabel');
    if (bar)   bar.style.width = `${pct}%`;
    if (label) label.textContent = `Demo: ${remaining}s`;
  }

  function _endDemo(game) {
    // Pause the emulator
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

    _log(`⏱ Demo ended for ${game ? game.label : 'this game'}. Thanks for playing!`);

    // Show the "find full game" panel
    const findPanel = document.getElementById('emuFindPanel');
    if (findPanel && game) {
      const q = encodeURIComponent(game.label + ' NES');
      document.getElementById('emuFindTitle').textContent = game.label;
      document.getElementById('emuFindEbay').href    = `https://www.ebay.com/sch/i.html?_nkw=${q}+cartridge`;
      document.getElementById('emuFindAmazon').href  = `https://www.amazon.com/s?k=${q}`;
      document.getElementById('emuFindArchive').href = `https://archive.org/search?query=${q}`;
      document.getElementById('emuFindNSO').href     = 'https://www.nintendo.com/switch/online/';
      findPanel.hidden = false;
    }

    // Hide demo bar
    const barWrap = document.getElementById('emuDemoWrap');
    if (barWrap) barWrap.hidden = true;

    // Award signal value XP for completing a demo
    if (typeof LevelSystem !== 'undefined') LevelSystem.awardXP('playGame');
    if (typeof SignalValue !== 'undefined') SignalValue.add('demo', 12);

    // Notify ArcadeFlow so it can show the full game-over experience
    document.dispatchEvent(new CustomEvent('arcadeDemoEnd', { detail: { game } }));
  }

  function _stopEmulator() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (nes)   { nes = null; }
    const display = document.getElementById('emuDisplay');
    if (display) display.hidden = true;
    if (ctx2d && canvas) ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    _detachKeys();
  }

  function pauseEmulator() {
    if (!nes) return;
    if (running) {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      const btn = document.getElementById('emuPauseBtn');
      if (btn) btn.textContent = '▶ Resume';
      _log('⏸ Paused.');
    } else {
      running = true;
      function loop() { if (!running) return; nes.frame(); rafId = requestAnimationFrame(loop); }
      rafId = requestAnimationFrame(loop);
      const btn = document.getElementById('emuPauseBtn');
      if (btn) btn.textContent = '⏸ Pause';
      _log('▶ Resumed.');
    }
  }

  // ── Keyboard input ────────────────────────────────────────────────────────

  function _onKey(e, down) {
    if (!nes || !running) return;
    const btn = KEY_MAP[e.code];
    if (btn !== undefined) {
      e.preventDefault();
      down ? nes.buttonDown(1, btn) : nes.buttonUp(1, btn);
    }
  }

  const _keyDown = (e) => _onKey(e, true);
  const _keyUp   = (e) => _onKey(e, false);
  let   _keysAttached = false;

  function _attachKeys() {
    if (_keysAttached) return;
    document.addEventListener('keydown', _keyDown);
    document.addEventListener('keyup',   _keyUp);
    _keysAttached = true;
  }

  function _detachKeys() {
    document.removeEventListener('keydown', _keyDown);
    document.removeEventListener('keyup',   _keyUp);
    _keysAttached = false;
  }

  // ── Console log ───────────────────────────────────────────────────────────

  function _log(msg) {
    const el = document.getElementById('emuLog');
    if (!el) return;
    const line     = document.createElement('div');
    line.className = 'emu-log-line';
    line.textContent = `[${new Date().toLocaleTimeString('en-US',{hour12:false})}] ${msg}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
    if (el.children.length > 30) el.firstElementChild.remove();
  }

  // ── Render panel ──────────────────────────────────────────────────────────

  function render(mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    mount.innerHTML = `
      <div class="emu-card glass-card" id="emuCardInner">

        <div class="emu-header">
          <div>
            <h2 class="emu-title">
              <span class="emu-icon" aria-hidden="true">🎮</span>
              Game Emulator
            </h2>
            <p class="emu-sub">Earn credits by winning Mario Spin · 3-of-a-kind = 1 credit</p>
          </div>
          <div class="emu-credits-wrap">
            <span class="emu-credits-label">CREDITS</span>
            <span class="emu-credits-val" id="emuCredits">0</span>
          </div>
        </div>

        <!-- ROM selector -->
        <div class="emu-rom-grid">
          ${FREE_ROMS.filter((r) => !r.custom).map((r) => `
            <div class="emu-rom-card">
              <div class="emu-rom-name">${r.label}</div>
              <div class="emu-rom-author">${r.author}</div>
              <div class="emu-rom-note">${r.note}</div>
              <button class="emu-launch-btn btn-primary" data-url="${r.url}" disabled>
                ▶ Play (1 credit)
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Custom ROM URL input -->
        <div class="emu-custom-row">
          <input
            type="url"
            class="emu-url-input"
            id="emuRomUrl"
            placeholder="GitHub raw .nes ROM URL — e.g. https://raw.githubusercontent.com/your-user/your-repo/main/game.nes"
            aria-label="Custom ROM URL"
          />
          <button class="emu-launch-btn btn-primary" id="emuLoadUrl" disabled>
            🎮 Load &amp; Play
          </button>
        </div>

        <!-- Emulator display (hidden until game loads) -->
        <div class="emu-display" id="emuDisplay" hidden>

          <!-- 90-second demo countdown bar -->
          <div class="emu-demo-wrap" id="emuDemoWrap" hidden>
            <div class="emu-demo-track">
              <div class="emu-demo-bar" id="emuDemoBar" style="width:100%"></div>
            </div>
            <span class="emu-demo-label" id="emuDemoLabel">Demo: 90s</span>
          </div>

          <canvas
            id="emuCanvas"
            class="emu-canvas"
            width="256"
            height="240"
            tabindex="0"
            aria-label="NES game screen"
          ></canvas>
          <div class="emu-hint">
            Arrow keys · Z = A · X = B · Enter = Start · Shift = Select
          </div>
          <div class="emu-btns">
            <button class="btn-secondary" id="emuPauseBtn">⏸ Pause</button>
            <button class="btn-danger"    id="emuStopBtn">⏹ Stop</button>
          </div>
        </div>

        <!-- "Find the full game" panel — shown after demo ends -->
        <div class="emu-find-panel" id="emuFindPanel" hidden>
          <div class="emu-find-header">
            <span class="emu-find-title-label">⏱ Demo complete —</span>
            <strong class="emu-find-title" id="emuFindTitle">Game</strong>
          </div>
          <p class="emu-find-sub">Liked it? Find the full cartridge or a legal copy:</p>
          <div class="emu-find-links">
            <a class="emu-find-link" id="emuFindEbay"    href="#" target="_blank" rel="noopener">🛒 eBay cartridge</a>
            <a class="emu-find-link" id="emuFindAmazon"  href="#" target="_blank" rel="noopener">📦 Amazon</a>
            <a class="emu-find-link" id="emuFindArchive" href="#" target="_blank" rel="noopener">📼 Archive.org</a>
            <a class="emu-find-link" id="emuFindNSO"     href="#" target="_blank" rel="noopener">🎮 Nintendo Switch Online</a>
          </div>
          <button class="btn-secondary emu-find-replay" id="emuFindReplay">🔁 Spin again for another demo</button>
        </div>

        <!-- Console log -->
        <div class="emu-log" id="emuLog" aria-label="Emulator log" aria-live="polite"></div>
      </div>
    `;

    // Wire buttons
    mount.querySelectorAll('.emu-launch-btn[data-url]').forEach((btn) => {
      btn.addEventListener('click', () => launchROM(btn.dataset.url));
    });

    const loadUrlBtn = document.getElementById('emuLoadUrl');
    if (loadUrlBtn) loadUrlBtn.addEventListener('click', () => {
      const url = document.getElementById('emuRomUrl');
      if (url) launchROM(url.value);
    });

    const pauseBtn = document.getElementById('emuPauseBtn');
    if (pauseBtn) pauseBtn.addEventListener('click', pauseEmulator);

    const stopBtn = document.getElementById('emuStopBtn');
    if (stopBtn) stopBtn.addEventListener('click', () => {
      _stopEmulator();
      if (_demoTimer) { clearInterval(_demoTimer); _demoTimer = null; }
      const barWrap = document.getElementById('emuDemoWrap');
      if (barWrap) barWrap.hidden = true;
      _log('⏹ Game stopped.');
    });

    const replayBtn = document.getElementById('emuFindReplay');
    if (replayBtn) replayBtn.addEventListener('click', () => {
      const findPanel = document.getElementById('emuFindPanel');
      if (findPanel) findPanel.hidden = true;
      const spinShell = document.getElementById('gameSpinnerShell');
      if (spinShell) spinShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    _updateCreditsDisplay();
    _log('System ready. Win 3-of-a-kind in the Game Spinner to play!');
  }

  return { render, addCredits, launchROM, pauseEmulator, startDemoSession };
})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameEmulator;
}
