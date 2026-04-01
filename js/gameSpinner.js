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
      cover:  'TopGun2.jpg',
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
      cover:  'DuckTales2b.jpg',
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
      cover:  'Terminator2.jpg',
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
      cover:  'DragonWarrior3.jpg',
      rom:    RAW + 'driar.nes',
      romLabel: 'Driar (free homebrew · dungeon RPG)',
      theme:  'epic quest',
      color:  '#7b5cfa',
      radioTag: 'world',
    },
    {
      id:     'karatekid',
      label:  'KARATE KID',
      emoji:  '🥋',
      cover:  'KarateKid.jpg',
      rom:    RAW + 'vigilanteninja.nes',
      romLabel: 'Vigilante Ninja (free homebrew · action)',
      theme:  'martial arts discipline',
      color:  '#06d6a0',
      radioTag: 'electronic',
    },
    {
      id:     'knightrider',
      label:  'KNIGHT RIDER',
      emoji:  '🚗',
      cover:  'KnightRider.jpg',
      rom:    RAW + 'obstacletrek.nes',
      romLabel: 'Obstacle Trek (free homebrew · racing)',
      theme:  'turbo machine intelligence',
      color:  '#00d4ff',
      radioTag: 'electronic',
    },
    {
      id:     'rogerrabbit',
      label:  'ROGER RABBIT',
      emoji:  '🐰',
      cover:  'RogerRabbit.jpg',
      rom:    RAW + 'novathesquirrel.nes',
      romLabel: 'Nova the Squirrel (free homebrew · platformer)',
      theme:  'cartoon chaos signal',
      color:  '#ffd166',
      radioTag: 'pop',
    },
    {
      id:     'starwars',
      label:  'STAR WARS',
      emoji:  '⚡',
      cover:  'StarWars.jpg',
      rom:    RAW + 'thwaite.nes',
      romLabel: 'Thwaite (free homebrew · missile defense)',
      theme:  'galactic force signal',
      color:  '#ffd166',
      radioTag: 'classical',
    },
    {
      id:     'flappy',
      label:  'FLAPPY BIRD',
      emoji:  '🐦',
      cover:  null,
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

  // ── Game Lore — auto-logged to Research Panel on match ───────────────────

  const LORE = {
    topgun:       'Top Gun: The Second Mission (Konami, 1990) — vertical scrolling jet fighter sequel. Radar sweeps, missile locks, carrier landings. Signal: precise control under pressure.',
    ducktales:    'DuckTales (Capcom, 1989) — Scrooge McDuck treasure hunts across 5 worlds. Designed by Tokuro Fujiwara. Signal: adventure pays when you stay curious.',
    terminator:   'Terminator 2: Judgment Day (LJN, 1991) — fight through the machine war. Sparse signal, high stakes. Dark frequency at its finest.',
    dragonwarrior:'Dragon Warrior III (Enix, 1988) — the RPG that shaped a genre. Day/night cycle, class system, party building. Signal: deep study multiplies your power.',
    karatekid:    'The Karate Kid (LJN, 1987) — wax on, wax off, sweep the leg. Discipline as signal: every repetition tunes the frequency of the body. Signal: mastery through repetition.',
    knightrider:  'Knight Rider (Ocean, 1988) — KITT, the AI car. Machine intelligence meets open highway. Signal: the road is a frequency band; every mile is a wavelength.',
    rogerrabbit:  'Who Framed Roger Rabbit (LJN, 1989) — toon chaos in a real world. Signal: when two frequencies collide, the interference pattern is more interesting than either wave alone.',
    starwars:     'Star Wars (Namco, 1987) — the Force as signal. Use the Force, Luke — trust the resonance of the universe when the targeting computer goes dark.',
    flappy:       'Flappy Bird NES Homebrew — the impossible arcade reflex test, ported to NES by fans. Signal: small margins, infinite runs.',
    invaders:     'Invaders NES Homebrew — classic space defense reimagined. Wave after wave. Signal: pattern recognition is everything.',
    nova:         'Nova the Squirrel (2019, homebrew) — full NES platformer by Raftronaut. Signal: free creative work carries its own frequency.',
    madwizard:    'Mad Wizard NES Homebrew — dungeon spell-caster. Signal: knowledge applied becomes power.',
  };

  // ── Daily Featured Game — derived from BTC block hash ────────────────────
  // Changes each time a new block is crushed. Highlighted in the reel.

  let _featuredId = null;

  function setFeaturedFromHash(hash) {
    if (!hash) return;
    const idx     = parseInt(hash.slice(0, 8), 16) % GAMES.length;
    _featuredId   = GAMES[idx].id;
    _renderFeaturedBadge();
  }

  function _renderFeaturedBadge() {
    const badge = document.getElementById('gsFeaturedBadge');
    const game  = GAMES.find((g) => g.id === _featuredId);
    if (badge && game) {
      badge.textContent = `⭐ Today's featured: ${game.emoji} ${game.label}`;
      badge.style.color = game.color;
      badge.hidden      = false;
    }
  }

  // ── Combo Chain — fired if Mario Spin was won this session ───────────────
  // app.js sets window._lastMarioSpinWin = true on any Mario Spin match

  function _checkCombo(game) {
    if (!window._lastMarioSpinWin) return;
    window._lastMarioSpinWin = false;
    _showToast(`🔗 COMBO CHAIN! Mario + Game Spin → ×2 signal value`, '#ffd166');
    if (typeof SignalValue  !== 'undefined') SignalValue.add('combo', 20);
    if (typeof LevelSystem  !== 'undefined') LevelSystem.awardXP('jackpot');
  }

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
            <p class="gs-sub">3-reel · Line up 3 to play instantly · 90-second demo · 1 token per round</p>
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

        <!-- Daily featured game badge (set from BTC hash) -->
        <div class="gs-featured-badge" id="gsFeaturedBadge" hidden aria-live="polite"></div>

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

        <!-- Game Lore card — appears on any match, shows history + research link -->
        <div class="gs-lore-card" id="gsLoreCard" hidden>
          <span class="gs-lore-icon" id="gsLoreIcon">📖</span>
          <p class="gs-lore-text" id="gsLoreText"></p>
          <button class="gs-lore-log-btn" id="gsLoreLogBtn">+ Log to Research</button>
        </div>

        <!-- Launch panel — appears on 3-of-a-kind -->
        <div class="gs-launch-panel" id="gsLaunchPanel" hidden>
          <div class="gs-launch-inner">
            <img class="gs-launch-cover" id="gsLaunchCover" src="" alt="" aria-hidden="true">
            <div class="gs-launch-info">
              <div class="gs-launch-title" id="gsLaunchTitle">Game Title</div>
              <div class="gs-launch-rom"   id="gsLaunchRom">ROM: —</div>
              <div class="gs-launch-note">90-second demo · 1 token · loads in emulator below</div>
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
    document.getElementById('gsLoreLogBtn').addEventListener('click', _logLoreToResearch);

    // Restore featured badge if hash was already set
    if (_featuredId) _renderFeaturedBadge();
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

    // Always show lore on any game appearing (even no match — knowledge is free)
    _showLore(topGame);

    // Featured game bonus — extra XP if today's featured lands
    const isFeatured = topId === _featuredId;

    if (maxCount >= 3) {
      // ── JACKPOT — unlock game ────────────────────────────────────────────
      _pendingGame = topGame;

      resultText.textContent = `🎮 3× ${topGame.emoji} ${topGame.label} — GAME UNLOCKED!${isFeatured ? ' ⭐ FEATURED BONUS!' : ''}`;
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
          coverEl.src    = topGame.cover || '';
          coverEl.hidden = !topGame.cover;
        }
        launchPnl.hidden = false;
      }

      // Highlight matching reels
      [0, 1, 2].forEach((i) => {
        const reel = document.getElementById(`gsReel${i}`);
        if (reel && ids[i] === topId) reel.classList.add('gs-reel--match');
      });

      // Tune radio to match the game's genre
      if (topGame.radioTag && typeof window._onMarioSlotWin === 'function') {
        window._onMarioSlotWin(
          { radioTag: topGame.radioTag, emoji: topGame.emoji,
            label: topGame.label, radioEmoji: '🎮', radioLabel: topGame.label },
          3
        );
      }

      // XP + harvest + memory
      if (typeof LevelSystem  !== 'undefined') LevelSystem.awardXP(isFeatured ? 'jackpot' : 'fourOak');
      if (typeof BtcHarvester !== 'undefined') BtcHarvester.emit(`Game Spin 🎮 3× ${topGame.label}`);
      if (typeof Synapse      !== 'undefined') Synapse.remember('user', `Game Spinner: 3× ${topGame.label} — game unlocked`, 'signal');
      if (typeof SignalValue  !== 'undefined') SignalValue.add('gameSpin', isFeatured ? 25 : 15);

      // Combo chain check
      _checkCombo(topGame);

      // Flag for Mario Spin combo detection
      window._lastGameSpinWin = true;

    } else if (maxCount === 2) {
      // ── PAIR — game token ────────────────────────────────────────────────
      resultText.textContent = `⚡ 2× ${topGame.emoji} ${topGame.label} — game token earned!`;
      resultEl.className     = 'gs-result gs-result--pair';

      _addToken();

      if (typeof LevelSystem    !== 'undefined') LevelSystem.awardXP('pair');
      if (typeof SignalValue    !== 'undefined') SignalValue.add('gameSpin', 5);
      window._lastGameSpinWin = true;

    } else {
      // ── NO MATCH ─────────────────────────────────────────────────────────
      resultText.textContent = `No match — spin again!`;
      resultEl.className     = 'gs-result gs-result--miss';

      if (typeof LevelSystem !== 'undefined') LevelSystem.awardXP('spin');
      if (typeof SignalValue !== 'undefined') SignalValue.add('spin', 1);
    }

    btn.disabled = false;
    btn.querySelector('span:last-child').textContent = 'SPIN TO PLAY';
    spinning = false;

    // ── Research Writer — fires on EVERY spin, no API key needed ──────────
    if (typeof ResearchWriter !== 'undefined') {
      ResearchWriter.autoFromSpin({
        source:      'Game Spinner',
        symbolId:    topGame.id,
        symbolLabel: topGame.label,
        gameId:      topGame.id,
        gameLabel:   topGame.label,
        radioTag:    topGame.radioTag,
        radioLabel:  topGame.label,
        matchCount:  maxCount,
        coins:       0,
        spinCount,
        topic:       'radio',
        title:       `Game Spin #${spinCount} — ${topGame.label}${maxCount >= 2 ? ' ×' + maxCount : ''}`,
      });
    }
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

    // Pass game metadata to emulator so demo timer shows "Find: X" panel
    GameEmulator.startDemoSession(game);

    // Give 1 free credit for this spin win, then launch
    GameEmulator.addCredits(1);
    GameEmulator.launchROM(game.rom);

    _showToast(`▶ Loading ${game.label} — 90-second demo starts now!`, game.color);

    // Synapse memory
    if (typeof Synapse !== 'undefined') {
      Synapse.remember('user', `Launched game demo: ${game.label} (${game.romLabel})`, 'system');
    }

    // Award XP for playing
    if (typeof LevelSystem !== 'undefined') LevelSystem.awardXP('playGame');
    if (typeof SignalValue  !== 'undefined') SignalValue.add('playGame', 12);

    // Hide launch panel
    const launchPnl = document.getElementById('gsLaunchPanel');
    if (launchPnl) launchPnl.hidden = true;

    _pendingGame = null;
  }

  // ── Game Lore card ────────────────────────────────────────────────────────

  let _currentLoreGame = null;

  function _showLore(game) {
    _currentLoreGame = game;
    const card  = document.getElementById('gsLoreCard');
    const icon  = document.getElementById('gsLoreIcon');
    const text  = document.getElementById('gsLoreText');
    const lore  = LORE[game.id] || `${game.label} — ${game.theme}. Signal frequency: ${game.radioTag}.`;
    if (!card) return;
    if (icon) icon.textContent = game.emoji;
    if (text) text.textContent = lore;
    card.hidden = false;
    card.style.borderColor = game.color;

    // Auto-award signal value just for reading the lore
    if (typeof SignalValue !== 'undefined') SignalValue.add('lore', 2);
  }

  function _logLoreToResearch() {
    if (!_currentLoreGame) return;
    const lore = LORE[_currentLoreGame.id] || _currentLoreGame.label;

    if (typeof ResearchLogger !== 'undefined') {
      ResearchLogger.add({
        title:   `Game Signal: ${_currentLoreGame.label}`,
        content: lore,
        tags:    ['game', _currentLoreGame.radioTag, _currentLoreGame.theme],
        source:  'Game Spinner',
      });
    }

    if (typeof LevelSystem !== 'undefined') LevelSystem.awardXP('research');
    if (typeof SignalValue !== 'undefined') SignalValue.add('research', 3);

    _showToast(`📖 ${_currentLoreGame.label} logged to research!`, _currentLoreGame.color);
    const btn = document.getElementById('gsLoreLogBtn');
    if (btn) { btn.textContent = '✓ Logged!'; btn.disabled = true; }
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
    if (typeof SignalValue !== 'undefined') SignalValue.add('token', 5);
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

  return { render, GAMES, setFeaturedFromHash };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = GameSpinner;
