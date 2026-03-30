/**
 * Game Spinner — 3-reel NES Cartridge Slot
 *
 * A dedicated slot machine for the NES game library.
 * Reels show cartridge cover art. Outcomes:
 *
 *   3-of-a-kind → Immediately load that game in the emulator (1 token play)
 *   2-of-a-kind → Award 1 game token to the vault (save for later)
 *   No match    → +1 XP for trying, keep spinning
 *
 * Games are free/open-source homebrew ROMs (Retrobrews, MIT/free licence).
 * Cartridge cover art is used purely for identification inside this app.
 *
 * Retrobrews RAW base:
 *   https://raw.githubusercontent.com/retrobrews/nes-games/d20061bf9917e8bb8b947d4dba8c59372f5762a0/
 */

const GameSpinner = (() => {

  const RAW = 'https://raw.githubusercontent.com/retrobrews/nes-games/d20061bf9917e8bb8b947d4dba8c59372f5762a0/';

  // ── Game library ─────────────────────────────────────────────────────────
  // cover: the cartridge art shown in the reel
  // rom:   the free homebrew .nes file that loads when 3-of-a-kind hits
  // theme: the thematic vibe for radio + toast copy

  const GAMES = [
    {
      id:     'topgun',
      label:  'TOP GUN',
      emoji:  '🛩',
      cover:  'https://github.com/user-attachments/assets/4641a66d-9881-487b-89d6-3c5ae8c63ba2',
      rom:    RAW + 'obstacletrek.nes',
      romLabel: 'Obstacle Trek (free homebrew · action)',
      theme:  'aerial combat',
      color:  '#00aaff',
      radioTag: 'military',
    },
    {
      id:     'ducktales',
      label:  'DUCKTALES',
      emoji:  '🦆',
      cover:  'https://github.com/user-attachments/assets/dda800be-0001-43a5-a841-a6db89c7c7f8',
      rom:    RAW + 'owlia.nes',
      romLabel: 'Owlia (free homebrew · adventure)',
      theme:  'treasure adventure',
      color:  '#ffd166',
      radioTag: 'folk',
    },
    {
      id:     'terminator',
      label:  'TERMINATOR',
      emoji:  '🤖',
      cover:  'https://github.com/user-attachments/assets/a616af94-e8f5-4f9f-a29f-2e219074d3c5',
      rom:    RAW + 'viruscleaner.nes',
      romLabel: 'Virus Cleaner (free homebrew · action)',
      theme:  'dark machine signal',
      color:  '#ef233c',
      radioTag: 'metal',
    },
    {
      id:     'dragonwarrior',
      label:  'DRAGON WARRIOR',
      emoji:  '🐉',
      cover:  'https://github.com/user-attachments/assets/51b10bb8-b5b2-4607-b2ff-5f2c638153d8',
      rom:    RAW + 'driar.nes',
      romLabel: 'Driar (free homebrew · dungeon RPG)',
      theme:  'epic quest',
      color:  '#7b5cfa',
      radioTag: 'world',
    },
    {
      id:     'flappy',
      label:  'FLAPPY BIRD',
      emoji:  '🐦',
      cover:  null,  // uses emoji fallback
      rom:    RAW + 'flappybird.nes',
      romLabel: 'Flappy Bird NES (homebrew)',
      theme:  'arcade challenge',
      color:  '#06d6a0',
      radioTag: 'pop',
    },
    {
      id:     'invaders',
      label:  'INVADERS',
      emoji:  '👾',
      cover:  null,
      rom:    RAW + 'invaders.nes',
      romLabel: 'Invaders (homebrew)',
      theme:  'space defense',
      color:  '#00d4ff',
      radioTag: 'electronic',
    },
    {
      id:     'nova',
      label:  'NOVA',
      emoji:  '🐿',
      cover:  null,
      rom:    RAW + 'novathesquirrel.nes',
      romLabel: 'Nova the Squirrel (homebrew)',
      theme:  'forest adventure',
      color:  '#a8dadc',
      radioTag: 'ambient',
    },
    {
      id:     'madwizard',
      label:  'MAD WIZARD',
      emoji:  '🧙',
      cover:  null,
      rom:    RAW + 'madwizard.nes',
      romLabel: 'Mad Wizard (homebrew)',
      theme:  'mystical signal',
      color:  '#9d4edd',
      radioTag: 'classical',
    },
  ];

  // Weighted pool — games with cover art appear more often (feel more special)
  const POOL = [];
  GAMES.forEach((g) => {
    const weight = g.cover ? 3 : 2;
    for (let i = 0; i < weight; i++) POOL.push(g);
  });

  let spinning = false;
  let spinCount = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _rand() {
    return POOL[Math.floor(Math.random() * POOL.length)];
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _cell(game) {
    if (game.cover) {
      return `<div class="gs-sym" data-id="${_esc(game.id)}">
        <img class="gs-sym-img" src="${_esc(game.cover)}" alt="${_esc(game.label)}"
             loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <span class="gs-sym-emoji" style="display:none" aria-hidden="true">${game.emoji}</span>
        <span class="gs-sym-label">${_esc(game.label)}</span>
      </div>`;
    }
    return `<div class="gs-sym" data-id="${_esc(game.id)}">
      <span class="gs-sym-emoji" aria-hidden="true">${game.emoji}</span>
      <span class="gs-sym-label">${_esc(game.label)}</span>
    </div>`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function render(mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    mount.innerHTML = `
      <div class="gs-machine glass-card">

        <div class="gs-header">
          <div>
            <h2 class="gs-title">
              <span class="gs-icon" aria-hidden="true">🎮</span>
              Game Spinner
            </h2>
            <p class="gs-sub">3-reel · Line up 3 to play instantly · 1 token per round</p>
          </div>
          <div class="gs-stats">
            <span class="gs-stat-item">
              <span class="gs-stat-label">SPINS</span>
              <span class="gs-stat-val" id="gsSpins">0</span>
            </span>
            <span class="gs-stat-item">
              <span class="gs-stat-label">TOKENS</span>
              <span class="gs-stat-val" id="gsTokens">0</span>
            </span>
          </div>
        </div>

        <!-- 3 reels -->
        <div class="gs-reels-wrap">
          <div class="gs-reels" id="gsReels" aria-label="Game reels">
            <div class="gs-reel" id="gsReel0">${_cell(_rand())}</div>
            <div class="gs-divider" aria-hidden="true">·</div>
            <div class="gs-reel" id="gsReel1">${_cell(_rand())}</div>
            <div class="gs-divider" aria-hidden="true">·</div>
            <div class="gs-reel" id="gsReel2">${_cell(_rand())}</div>
          </div>
          <div class="gs-payline" aria-hidden="true"></div>
        </div>

        <!-- Result -->
        <div class="gs-result" id="gsResult" aria-live="polite">
          <span id="gsResultText">Spin to play a game!</span>
        </div>

        <!-- Controls -->
        <div class="gs-controls">
          <button class="gs-spin-btn" id="gsSpinBtn" aria-label="Spin the game reels">
            <span aria-hidden="true">🎮</span>
            <span>SPIN TO PLAY</span>
          </button>
        </div>

        <!-- Launch panel — appears on 3-of-a-kind -->
        <div class="gs-launch-panel" id="gsLaunchPanel" hidden>
          <div class="gs-launch-inner">
            <img class="gs-launch-cover" id="gsLaunchCover" src="" alt="" aria-hidden="true">
            <div class="gs-launch-info">
              <div class="gs-launch-title" id="gsLaunchTitle">Game Title</div>
              <div class="gs-launch-rom"   id="gsLaunchRom">ROM: —</div>
              <div class="gs-launch-note">1 token · loads in emulator below</div>
            </div>
            <button class="gs-launch-btn" id="gsLaunchBtn">
              ▶ PLAY NOW
            </button>
          </div>
        </div>

        <!-- Win flash -->
        <div class="gs-win-overlay" id="gsWinOverlay" hidden aria-hidden="true"></div>
      </div>
    `;

    document.getElementById('gsSpinBtn').addEventListener('click', spin);
    document.getElementById('gsLaunchBtn').addEventListener('click', _launchGame);
  }

  // ── Spin logic ────────────────────────────────────────────────────────────

  let _pendingGame = null;

  function spin() {
    if (spinning) return;
    spinning = true;

    const btn        = document.getElementById('gsSpinBtn');
    const resultEl   = document.getElementById('gsResult');
    const resultText = document.getElementById('gsResultText');
    const winOv      = document.getElementById('gsWinOverlay');
    const launchPnl  = document.getElementById('gsLaunchPanel');

    btn.disabled = true;
    btn.querySelector('span:last-child').textContent = 'Spinning…';
    if (launchPnl) launchPnl.hidden = true;
    if (winOv)    winOv.hidden = true;
    resultEl.className = 'gs-result';
    resultText.textContent = '…';

    spinCount++;
    const spinEl = document.getElementById('gsSpins');
    if (spinEl) spinEl.textContent = spinCount;

    // Animate each reel independently
    const finals = [_rand(), _rand(), _rand()];
    const delays = [0, 220, 440];

    delays.forEach((delay, i) => {
      const reel = document.getElementById(`gsReel${i}`);
      if (!reel) return;

      reel.classList.add('gs-spinning');

      // Flicker random symbols during spin
      let ticks = 0;
      const maxTicks = 6 + i * 3;
      const interval = setInterval(() => {
        reel.innerHTML = _cell(_rand());
        if (++ticks >= maxTicks) {
          clearInterval(interval);
          reel.innerHTML = _cell(finals[i]);
          reel.classList.remove('gs-spinning');
          // Last reel — evaluate result
          if (i === 2) {
            setTimeout(() => _evaluate(finals), 120);
          }
        }
      }, 80 + delay);
    });
  }

  function _evaluate(finals) {
    const ids     = finals.map((g) => g.id);
    const counts  = {};
    ids.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    const topId    = Object.keys(counts).find((k) => counts[k] === maxCount);
    const topGame  = GAMES.find((g) => g.id === topId);

    const btn        = document.getElementById('gsSpinBtn');
    const resultText = document.getElementById('gsResultText');
    const resultEl   = document.getElementById('gsResult');
    const winOv      = document.getElementById('gsWinOverlay');
    const launchPnl  = document.getElementById('gsLaunchPanel');

    if (maxCount >= 3) {
      // ── JACKPOT — load game ──────────────────────────────────────────────
      _pendingGame = topGame;

      resultText.textContent = `🎮 3× ${topGame.emoji} ${topGame.label} — GAME UNLOCKED!`;
      resultEl.className     = 'gs-result gs-result--jackpot';

      if (winOv) {
        winOv.textContent = `🎮 PLAY ${topGame.label}!`;
        winOv.style.color = topGame.color;
        winOv.hidden      = false;
        setTimeout(() => { winOv.hidden = true; }, 2200);
      }

      // Show launch panel
      if (launchPnl) {
        document.getElementById('gsLaunchTitle').textContent = topGame.label;
        document.getElementById('gsLaunchRom').textContent   = topGame.romLabel;
        const coverEl = document.getElementById('gsLaunchCover');
        if (coverEl) {
          coverEl.src = topGame.cover || '';
          coverEl.hidden = !topGame.cover;
        }
        launchPnl.hidden = false;
      }

      // Highlight matching reels
      [0, 1, 2].forEach((i) => {
        const reel = document.getElementById(`gsReel${i}`);
        if (reel && ids[i] === topId) reel.classList.add('gs-reel--match');
      });

      // Award XP + play chiptune fanfare
      if (typeof LevelSystem    !== 'undefined') LevelSystem.awardXP('fourOak');
      if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('win', 3);
      if (typeof BtcHarvester   !== 'undefined') BtcHarvester.emit(`Game Spin 🎮 3× ${topGame.label}`);
      if (typeof Synapse        !== 'undefined') Synapse.remember('user', `Game Spinner: 3× ${topGame.label} — game unlocked`, 'signal');

    } else if (maxCount === 2) {
      // ── PAIR — game token ────────────────────────────────────────────────
      resultText.textContent = `⚡ 2× ${topGame.emoji} ${topGame.label} — game token earned!`;
      resultEl.className     = 'gs-result gs-result--pair';

      _addToken();

      if (typeof LevelSystem    !== 'undefined') LevelSystem.awardXP('pair');
      if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('win', 1);

    } else {
      // ── NO MATCH ─────────────────────────────────────────────────────────
      resultText.textContent = `No match — spin again!`;
      resultEl.className     = 'gs-result gs-result--miss';

      if (typeof LevelSystem !== 'undefined') LevelSystem.awardXP('spin');
    }

    btn.disabled = false;
    btn.querySelector('span:last-child').textContent = 'SPIN TO PLAY';
    spinning = false;
  }

  // ── Launch the pending game ───────────────────────────────────────────────

  function _launchGame() {
    if (!_pendingGame) return;

    const game = _pendingGame;

    // Ensure the emulator shell is visible
    const emuShell = document.getElementById('emuShell');
    if (emuShell) {
      emuShell.hidden = false;
      emuShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (typeof GameEmulator === 'undefined') {
      _showToast('⚠ Emulator not loaded yet — try again in a moment.', '#ef233c');
      return;
    }

    // Give 1 free credit for this spin win, then launch
    GameEmulator.addCredits(1);
    GameEmulator.launchROM(game.rom);

    _showToast(`▶ Loading ${game.label} — ${game.romLabel}`, game.color);

    // Synapse memory
    if (typeof Synapse !== 'undefined') {
      Synapse.remember('user', `Launched game: ${game.label} (${game.romLabel})`, 'system');
    }

    // Award XP for playing
    if (typeof LevelSystem !== 'undefined') LevelSystem.awardXP('playGame');

    // Hide launch panel
    const launchPnl = document.getElementById('gsLaunchPanel');
    if (launchPnl) launchPnl.hidden = true;

    _pendingGame = null;
  }

  // ── Token counter (local, visual only — vault holds real tokens) ──────────

  let _tokens = 0;

  function _addToken() {
    _tokens++;
    const el = document.getElementById('gsTokens');
    if (el) el.textContent = _tokens;

    // Also add to vault
    if (typeof GameEmulator !== 'undefined') GameEmulator.addCredits(1);
    _showToast('🎮 Game token earned — play later from the vault!', '#ffd166');
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function _showToast(msg, color) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast toast-power';
    t.style.borderColor = color || '#ffd166';
    t.innerHTML = `<strong style="color:${color || '#ffd166'}">${msg}</strong>`;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-show'));
    setTimeout(() => {
      t.classList.remove('toast-show');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, 4000);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return { render, GAMES };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = GameSpinner;
