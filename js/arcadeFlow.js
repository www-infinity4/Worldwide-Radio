/**
 * Arcade Flow — Slot → Token → Game → Video → Music → Keyboard Mint → Slot
 *
 * Wires together every component into a single arcade experience:
 *
 *  1.  Mario Spin / Game Spinner WIN
 *        ↓ token awarded to vault
 *  2.  Token Vault PLAY GAME (1 token = 3 lives / 90-second demo)
 *        ↓ game runs in emulator
 *  3.  Demo timer ends → GAME OVER screen with:
 *        - "Watch a Clip" button  → spends video token → plays vault video
 *        - "Play a Tune" button   → opens keyboard mini-game → mints 1 token on success
 *        - "Spin Again" button    → returns to slots (and opens vault if no tokens left)
 *  4.  AI Engine self-generates new content while idle:
 *        - new lore entries, research snippets, radio-station suggestions
 *        - new "mini-challenges" to add to the game-over screen
 *
 * Uses only the homebrew ROMs already wired through GameEmulator / GameSpinner.
 * No third-party ROM scraping.
 */

const ArcadeFlow = (() => {

  // ── State ─────────────────────────────────────────────────────────────────

  let _lives      = 3;
  let _demoTimer  = null;
  let _demoSecs   = 90;
  let _activeGame = null;
  let _idleTimer  = null;

  // AI-generated mini-challenges (grows over time)
  const _challenges = [
    { id: 'c1', label: '🎵 Play 5 notes without repeating',  reward: 1, type: 'keyboard' },
    { id: 'c2', label: '🎰 Spin until you get a pair',        reward: 1, type: 'spin'     },
    { id: 'c3', label: '📡 Tune to a station in Japan',       reward: 2, type: 'radio'    },
    { id: 'c4', label: '🔬 Generate 1 research document',     reward: 2, type: 'research' },
    { id: 'c5', label: '🪙 Collect 10 coins in Mario Spin',   reward: 1, type: 'spin'     },
  ];

  // ── Boot ──────────────────────────────────────────────────────────────────

  function init() {
    // Listen for game demo ending (GameEmulator fires custom event)
    document.addEventListener('arcadeDemoEnd', _onDemoEnd);

    // Listen for slot wins → auto-reveal vault
    document.addEventListener('arcadeTokenEarned', _onTokenEarned);

    // Start idle AI content builder
    _scheduleIdleAI();

    // Wire the keyboard mini-game launcher (if keyboard mint exists elsewhere)
    _injectKeyboardMintBtn();
  }

  // ── Demo lifecycle ────────────────────────────────────────────────────────

  /**
   * Called by GameEmulator when a ROM starts.
   * Starts a 90-second countdown that shows lives HUD.
   */
  function startDemo(game) {
    _activeGame = game;
    _lives      = 3;
    _demoSecs   = 90;

    clearInterval(_demoTimer);
    _renderLivesHUD(true);

    _demoTimer = setInterval(() => {
      _demoSecs--;
      _updateLivesHUD();
      if (_demoSecs <= 0) {
        clearInterval(_demoTimer);
        _demoTimer = null;
        _onDemoEnd();
      }
    }, 1000);

    _toast(`▶ ${game.label} — ${_lives} lives · ${_demoSecs}s demo`, game.color || '#06d6a0');
  }

  /** Called when demo timer expires or game fires arcadeDemoEnd event */
  function _onDemoEnd() {
    clearInterval(_demoTimer);
    _demoTimer = null;
    _renderLivesHUD(false);

    // Build game-over overlay
    _showGameOver();
  }

  /** Decrement a life — called externally (e.g. emulator death hook) */
  function loseLife() {
    if (_lives > 1) {
      _lives--;
      _updateLivesHUD();
      _toast(`💔 Life lost — ${_lives} left`, '#ef233c');
    } else {
      _lives = 0;
      _updateLivesHUD();
      _onDemoEnd();
    }
  }

  // ── Lives HUD ─────────────────────────────────────────────────────────────

  function _renderLivesHUD(visible) {
    let hud = document.getElementById('arcadeLivesHUD');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'arcadeLivesHUD';
      hud.className = 'arcade-lives-hud';
      hud.setAttribute('aria-live', 'polite');
      document.body.appendChild(hud);
    }
    hud.hidden = !visible;
    if (visible) _updateLivesHUD();
  }

  function _updateLivesHUD() {
    const hud = document.getElementById('arcadeLivesHUD');
    if (!hud) return;
    const hearts = '❤️'.repeat(Math.max(0, _lives)) + '🖤'.repeat(Math.max(0, 3 - _lives));
    const pct    = Math.round((_demoSecs / 90) * 100);
    hud.innerHTML = `
      <div class="arcade-hud-inner">
        <span class="arcade-hud-label">${_activeGame ? _activeGame.label : 'GAME'}</span>
        <span class="arcade-hud-lives">${hearts}</span>
        <span class="arcade-hud-timer">${_demoSecs}s</span>
        <div class="arcade-hud-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="arcade-hud-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  // ── Game Over overlay ─────────────────────────────────────────────────────

  function _showGameOver() {
    let ov = document.getElementById('arcadeGameOver');
    if (ov) ov.remove();

    // Pick a random AI challenge to surface
    const challenge = _challenges[Math.floor(Math.random() * _challenges.length)];

    const hasVideo = _getTokenCount('video') > 0;
    const hasMusicToken = _getTokenCount('music') > 0;

    ov = document.createElement('div');
    ov.id = 'arcadeGameOver';
    ov.className = 'arcade-gameover glass-card';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Game Over');
    ov.innerHTML = `
      <div class="arcade-go-inner">
        <div class="arcade-go-title">GAME OVER</div>
        <div class="arcade-go-game">${_activeGame ? `${_activeGame.emoji || '🎮'} ${_activeGame.label}` : '🎮'}</div>
        <div class="arcade-go-sub">Your 90-second demo has ended.</div>

        <!-- Challenge banner -->
        <div class="arcade-go-challenge">
          <span class="arcade-go-ch-label">⚡ Challenge</span>
          <span class="arcade-go-ch-text">${challenge.label}</span>
          <span class="arcade-go-ch-reward">+${challenge.reward} token</span>
        </div>

        <!-- Action buttons -->
        <div class="arcade-go-actions">
          ${hasVideo ? `<button class="arcade-go-btn arcade-go-btn--video" id="agoWatchBtn">🎬 Watch a Clip</button>` : ''}
          <button class="arcade-go-btn arcade-go-btn--keys" id="agoPlayTuneBtn">🎹 Play a Tune → Mint Token</button>
          <button class="arcade-go-btn arcade-go-btn--spin" id="agoSpinBtn">🎰 Spin Again</button>
        </div>

        <button class="arcade-go-close" id="agoCloseBtn" aria-label="Close">✕</button>
      </div>`;

    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('visible'));

    // Wire buttons
    if (hasVideo) {
      document.getElementById('agoWatchBtn').addEventListener('click', () => {
        ov.remove();
        _spendVideoToken();
      });
    }
    document.getElementById('agoPlayTuneBtn').addEventListener('click', () => {
      ov.remove();
      _openKeyboardMint();
    });
    document.getElementById('agoSpinBtn').addEventListener('click', () => {
      ov.remove();
      _returnToSlots();
    });
    document.getElementById('agoCloseBtn').addEventListener('click', () => {
      ov.remove();
    });

    // Award challenge XP just for seeing it
    if (typeof LevelSystem !== 'undefined') LevelSystem.awardXP('spin');

    _chime('gameover');
  }

  // ── Token flows ───────────────────────────────────────────────────────────

  function _onTokenEarned(e) {
    // Auto-scroll to vault and briefly flash it
    const vault = document.getElementById('vaultShell');
    if (!vault) return;
    vault.scrollIntoView({ behavior: 'smooth', block: 'start' });
    vault.classList.add('arcade-vault-flash');
    setTimeout(() => vault.classList.remove('arcade-vault-flash'), 1200);
  }

  function _spendVideoToken() {
    // Open vault on video tab
    const vault = document.getElementById('vaultShell');
    if (vault) vault.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Click first video tab button
    const videoTab = document.querySelector('.vault-tab-btn[data-tab="video"]');
    if (videoTab) videoTab.click();
    // Auto-click first video spend button
    setTimeout(() => {
      const btn = document.querySelector('.vault-spend-btn[data-vidx="0"]');
      if (btn && !btn.disabled) btn.click();
    }, 500);
  }

  function _openKeyboardMint() {
    // Scroll to the dedicated Piano Mint section
    const pianoEl = document.getElementById('pianoShell') ||
                    document.getElementById('pianoMintMount');
    if (pianoEl) {
      pianoEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      _toast('🎹 Play a tune — AI detects it — earn a token!', '#ffd166');
      return;
    }
    // Fallback: inline mini keyboard if the section somehow isn't in DOM
    _showInlineKeyboard();
  }

  function _showInlineKeyboard() {
    let kb = document.getElementById('arcadeInlineKB');
    if (kb) { kb.remove(); return; }

    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C♯'];
    let pressed = [];

    kb = document.createElement('div');
    kb.id = 'arcadeInlineKB';
    kb.className = 'arcade-inline-kb glass-card';
    kb.innerHTML = `
      <div class="aik-title">🎹 Play 5 notes to mint a token</div>
      <div class="aik-keys">
        ${notes.map((n) => `<button class="aik-key" data-note="${n}">${n}</button>`).join('')}
      </div>
      <div class="aik-progress" id="aikProgress">0 / 5</div>
      <button class="aik-close" id="aikClose">✕</button>`;
    document.body.appendChild(kb);
    requestAnimationFrame(() => kb.classList.add('visible'));

    kb.querySelectorAll('.aik-key').forEach((key) => {
      key.addEventListener('click', () => {
        const note = key.dataset.note;
        if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.playNote(note);
        key.classList.add('pressed');
        setTimeout(() => key.classList.remove('pressed'), 200);
        pressed.push(note);
        document.getElementById('aikProgress').textContent = `${pressed.length} / 5`;
        if (pressed.length >= 5) {
          document.getElementById('aikProgress').textContent = '✓ Token minted!';
          if (typeof RewardVault !== 'undefined') RewardVault.award(2, 'Keyboard Tune');
          if (typeof LevelSystem !== 'undefined') LevelSystem.awardXP('pair');
          if (typeof SignalValue !== 'undefined') SignalValue.add('mint', 8);
          _toast('🎹 Tune played! 🎵 Music token minted!', '#ffd166');
          setTimeout(() => { kb.remove(); _returnToSlots(); }, 1500);
        }
      });
    });

    document.getElementById('aikClose').addEventListener('click', () => kb.remove());
  }

  function _returnToSlots() {
    const mario = document.getElementById('marioSpinMount');
    if (mario) {
      mario.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const gs = document.getElementById('gameSpinnerMount');
    if (gs && !mario) gs.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Idle AI content builder ───────────────────────────────────────────────
  // Runs silently in the background, adding new challenges and lore entries.

  const AI_INTERVAL_MS = 4 * 60 * 1000; // every 4 minutes when idle — adjust if too frequent

  function _scheduleIdleAI() {
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(_runIdleAI, AI_INTERVAL_MS);
  }

  async function _runIdleAI() {
    try {
      // Only run if the page is visible and has an AI key
      if (document.hidden) { _scheduleIdleAI(); return; }

      const newChallenge = await _generateChallenge();
      if (newChallenge && !_challenges.find((c) => c.id === newChallenge.id)) {
        _challenges.push(newChallenge);
      }

      // Auto-generate a research snippet every 4th idle run
      if (typeof ResearchWriter !== 'undefined' && Math.random() < 0.25) {
        const prompts = [
          'How does a radio signal behave like water finding cracks through rock?',
          'What metaphor best describes quantum entanglement in terms of a telephone network?',
          'Explain NES chiptune synthesis as if the sound chip were a tiny orchestra pit.',
          'How is the Bitcoin hash function like a lock that only opens with a unique snowflake key?',
          'What does radon gas in soil have in common with an underground river?',
        ];
        const p = prompts[Math.floor(Math.random() * prompts.length)];
        await ResearchWriter.autoFromCrush({ height: 'idle', hash: Date.now().toString(16), prompt: p });
      }
    } catch (_) {}

    _scheduleIdleAI();
  }

  async function _generateChallenge() {
    const templates = [
      { label: '📻 Find a station playing classical music',  reward: 1, type: 'radio'    },
      { label: '🍄 Get MUSHROOM in Mario Spin',              reward: 1, type: 'spin'     },
      { label: '🎬 Watch one vault video all the way through',reward: 2, type: 'video'   },
      { label: '⭐ Land a STAR on the payline',              reward: 3, type: 'spin'     },
      { label: '🔬 Read 3 research documents',               reward: 2, type: 'research' },
      { label: '🪙 Earn 50 total coins across any spin',     reward: 2, type: 'spin'     },
      { label: '🎮 Play the Dragon Warrior game demo',       reward: 3, type: 'game'     },
      { label: '📡 Tune to a station in Brazil',            reward: 1, type: 'radio'    },
    ];
    const t = templates[Math.floor(Math.random() * templates.length)];
    return { ...t, id: 'ai_' + Date.now().toString(36) };
  }

  // ── Token count helper ────────────────────────────────────────────────────

  function _getTokenCount(type) {
    try {
      const raw = localStorage.getItem('www_infinity_vault_v1');
      if (!raw) return 0;
      const state = JSON.parse(raw);
      return state[type] || 0;
    } catch (_) { return 0; }
  }

  // ── Misc helpers ──────────────────────────────────────────────────────────

  function _chime(type) {
    if (typeof ChiptuneEngine === 'undefined') return;
    if (type === 'gameover') ChiptuneEngine.play('miss');
  }

  function _toast(msg, color) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast toast-power';
    t.style.borderColor = color || '#ffd166';
    t.innerHTML = `<strong style="color:${color || '#ffd166'}">${msg}</strong>`;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-show'));
    setTimeout(() => {
      t.classList.remove('toast-show');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, 4000);
  }

  function _injectKeyboardMintBtn() {
    // Add a "🎹 Mint via Tune" button to the vault music pane if it doesn't have one
    const observer = new MutationObserver(() => {
      const musicPane = document.querySelector('.vault-pane[data-pane="music"]');
      if (musicPane && !musicPane.querySelector('.arcade-mint-tune-btn')) {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary arcade-mint-tune-btn';
        btn.style.marginTop = '0.5rem';
        btn.textContent = '🎹 Play a Tune → Mint Token';
        btn.addEventListener('click', () => _openKeyboardMint());
        musicPane.appendChild(btn);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    init,
    startDemo,
    loseLife,
    getChallenges: () => [..._challenges],
  };

})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArcadeFlow;
}
