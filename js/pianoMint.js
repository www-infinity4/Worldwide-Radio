/**
 * Piano Mint — Interactive 2-octave keyboard with AI melody recognition
 *
 * The player presses keys (mouse / touch / computer keyboard).
 * Each press plays a real note via ChiptuneEngine.playNote().
 * After every keypress the AI checks whether the last N notes form a
 * recognisable melody. When a tune is matched a token is awarded.
 *
 * ── Tune detection ─────────────────────────────────────────────────────────
 * Every tune is stored as semitone offsets from its first note, making
 * matching completely transpose-invariant — the player can start a tune
 * on any key and it still resolves.  A sliding window of the last 12
 * pressed notes is searched; consecutive matches of the full tune pattern
 * trigger an award.
 *
 * ── Keyboard shortcuts (two octaves) ──────────────────────────────────────
 *  Octave 3 white: Z  X  C  V  B  N  M
 *  Octave 3 black:  S  D     G  H  J
 *  Octave 4 white: Q  W  E  R  T  Y  U  I(=C5)
 *  Octave 4 black:  2  3     5  6  7
 *
 * ── Token rewards ─────────────────────────────────────────────────────────
 *  Simple tunes (Twinkle, Mary, Scale)    → 1 music token
 *  Intermediate (Ode to Joy, Jingle)      → 1 video token
 *  Power-Up (C-major arpeggio, chromatic) → 1 game token
 *  Bonus: Jackpot Arpeggio (6 notes)      → 2 game tokens
 */

const PianoMint = (() => {

  // ── Key layout — ordered C3 → C5 ──────────────────────────────────────────
  const KEYS = [
    { note:'C3',  type:'white', kbd:'z' },
    { note:'C#3', type:'black', kbd:'s' },
    { note:'D3',  type:'white', kbd:'x' },
    { note:'D#3', type:'black', kbd:'d' },
    { note:'E3',  type:'white', kbd:'c' },
    { note:'F3',  type:'white', kbd:'v' },
    { note:'F#3', type:'black', kbd:'g' },
    { note:'G3',  type:'white', kbd:'b' },
    { note:'G#3', type:'black', kbd:'h' },
    { note:'A3',  type:'white', kbd:'n' },
    { note:'A#3', type:'black', kbd:'j' },
    { note:'B3',  type:'white', kbd:'m' },
    { note:'C4',  type:'white', kbd:'q' },
    { note:'C#4', type:'black', kbd:'2' },
    { note:'D4',  type:'white', kbd:'w' },
    { note:'D#4', type:'black', kbd:'3' },
    { note:'E4',  type:'white', kbd:'e' },
    { note:'F4',  type:'white', kbd:'r' },
    { note:'F#4', type:'black', kbd:'5' },
    { note:'G4',  type:'white', kbd:'t' },
    { note:'G#4', type:'black', kbd:'6' },
    { note:'A4',  type:'white', kbd:'y' },
    { note:'A#4', type:'black', kbd:'7' },
    { note:'B4',  type:'white', kbd:'u' },
    { note:'C5',  type:'white', kbd:'i' },
  ];

  // Map note-name → semitone index (C3=0 … C5=24)
  const NOTE_SEMI = {};
  KEYS.forEach((k, i) => {
    // count only the white keys to make semitone calculation independent of
    // array index; use chromatic distance from C3
    const noteMap = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 };
    const m = k.note.match(/^([A-G]#?)(\d)$/);
    if (m) NOTE_SEMI[k.note] = (parseInt(m[2]) - 3) * 12 + noteMap[m[1]];
  });

  // kbd char → note name
  const KBD_MAP = {};
  KEYS.forEach((k) => { KBD_MAP[k.kbd] = k.note; });

  // Black-key left-offset as multiples of one white-key width
  // (index of the preceding white key + fractional overhang)
  const BLACK_WH_POS = {
    'C#3': 0.65, 'D#3': 1.65, 'F#3': 3.65, 'G#3': 4.65, 'A#3': 5.65,
    'C#4': 7.65, 'D#4': 8.65, 'F#4':10.65, 'G#4':11.65, 'A#4':12.65,
  };

  // ── Tune library ───────────────────────────────────────────────────────────
  // notes[] = absolute note names; offsets are computed at init time.
  // All melodies are public-domain or original.
  const TUNE_DEFS = [
    {
      id:'twinkle', emoji:'⭐',
      name:'Twinkle Twinkle Little Star',
      hint:'C C G G A A G…',
      notes:['C4','C4','G4','G4','A4','A4','G4'],
      reward:{ type:'music', count:1 },
    },
    {
      id:'mary', emoji:'🐑',
      name:"Mary Had a Little Lamb",
      hint:'E D C D E E E…',
      notes:['E4','D4','C4','D4','E4','E4','E4'],
      reward:{ type:'music', count:1 },
    },
    {
      id:'ode', emoji:'🎻',
      name:'Ode to Joy',
      hint:'E E F G G F E D…',
      notes:['E4','E4','F4','G4','G4','F4','E4','D4'],
      reward:{ type:'video', count:1 },
    },
    {
      id:'scale_up', emoji:'⚡',
      name:'Power-Up Scale',
      hint:'C D E F G A B C…',
      notes:['C4','D4','E4','F4','G4','A4','B4','C5'],
      reward:{ type:'game', count:1 },
    },
    {
      id:'arpeggio', emoji:'🍄',
      name:'Mario Arpeggio',
      hint:'C E G C5 E5 G5…',
      notes:['C4','E4','G4','C5'],
      reward:{ type:'game', count:2 },
    },
    {
      id:'jingle', emoji:'🔔',
      name:'Jingle Bells',
      hint:'E E E  E E E  E G C D…',
      notes:['E4','E4','E4','E4','E4','E4','G4','C4','D4','E4'],
      reward:{ type:'music', count:1 },
    },
    {
      id:'chromatic', emoji:'🌈',
      name:'Chromatic Run',
      hint:'C C# D D# E F…',
      notes:['C4','C#4','D4','D#4','E4','F4'],
      reward:{ type:'video', count:2 },
    },
  ];

  // Pre-compute offset fingerprints (semitone distance from first note)
  const TUNES = TUNE_DEFS.map((t) => {
    const semis  = t.notes.map((n) => NOTE_SEMI[n]);
    const base   = semis[0];
    return { ...t, offsets: semis.map((s) => s - base), semis };
  });

  // ── State ──────────────────────────────────────────────────────────────────
  const MAX_HISTORY  = 14;   // rolling window of note semitones
  const DEBOUNCE_MS  = 80;   // ignore repeat key-presses within this time
  const COOLDOWN_MS  = 8000; // re-award same tune after this delay

  let _history    = [];         // semitone values, newest at end
  let _lastPressMs= 0;
  let _lastNote   = null;
  let _cooldowns  = {};         // tuneId → timestamp last awarded
  let _mountId    = null;
  let _keyListener= null;

  // ── Semitone helpers ───────────────────────────────────────────────────────

  function _semiOf(noteName) {
    return NOTE_SEMI[noteName] ?? null;
  }

  // ── AI Tune Matcher ────────────────────────────────────────────────────────

  /**
   * Check whether the last offsets.length notes in _history match `offsets`,
   * when normalised to the same starting note.
   * Returns true on a full match.
   */
  function _fullMatch(offsets) {
    const n = offsets.length;
    if (_history.length < n) return false;
    const window = _history.slice(-n);
    const base   = window[0];
    return offsets.every((o, i) => window[i] - base === o);
  }

  /**
   * Returns how many notes from the START of `offsets` are consecutively
   * matched in any recent sub-window of _history.
   * Used to show real-time "x/y notes matched" feedback.
   */
  function _partialMatchCount(offsets) {
    let best = 0;
    const n  = offsets.length;
    // Search from most recent back to max window start
    for (let start = Math.max(0, _history.length - n); start < _history.length; start++) {
      const base = _history[start];
      let count  = 0;
      for (let i = 0; i < n && (start + i) < _history.length; i++) {
        if (_history[start + i] - base === offsets[i]) { count++; }
        else { break; }
      }
      if (count > best) best = count;
    }
    return best;
  }

  // ── Key press handler ──────────────────────────────────────────────────────

  function _pressKey(noteName) {
    const now  = Date.now();
    // Debounce rapid repeats (keyboard auto-repeat)
    if (noteName === _lastNote && (now - _lastPressMs) < DEBOUNCE_MS) return;
    _lastPressMs = now;
    _lastNote    = noteName;

    // Play the note
    if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.playNote(noteName);

    // Record semitone
    const semi = _semiOf(noteName);
    if (semi === null) return;
    _history.push(semi);
    if (_history.length > MAX_HISTORY) _history.shift();

    // Visual: flash the pressed key
    _flashKey(noteName);

    // Update note trail display
    _updateTrail(noteName);

    // Run AI matcher
    _runMatcher();
  }

  // ── AI matcher runner ──────────────────────────────────────────────────────

  function _runMatcher() {
    const statusEl = document.getElementById('pmTuneStatus');
    let   bestPartial = { tune: null, count: 0 };

    for (const tune of TUNES) {
      // Check full match
      if (_fullMatch(tune.offsets)) {
        const now   = Date.now();
        const lastAt = _cooldowns[tune.id] || 0;
        if (now - lastAt < COOLDOWN_MS) continue; // on cooldown
        _cooldowns[tune.id] = now;
        _onTuneMatched(tune);
        return; // one award per keypress
      }

      // Track best partial for feedback
      const partial = _partialMatchCount(tune.offsets);
      if (partial > bestPartial.count) {
        bestPartial = { tune, count: partial };
      }
    }

    // Update status display
    if (!statusEl) return;
    if (bestPartial.count >= 2 && bestPartial.tune) {
      const t   = bestPartial.tune;
      const tot = t.offsets.length;
      const pct = Math.round((bestPartial.count / tot) * 100);
      statusEl.textContent = `${t.emoji} ${t.name}… ${bestPartial.count}/${tot} notes`;
      statusEl.style.color = pct >= 80 ? '#06d6a0' : pct >= 50 ? '#ffd100' : 'var(--text-muted)';
    } else if (_history.length > 0) {
      statusEl.textContent = 'Keep playing…';
      statusEl.style.color = 'var(--text-muted)';
    }
  }

  // ── On tune matched ────────────────────────────────────────────────────────

  function _onTuneMatched(tune) {
    // Status display
    const statusEl = document.getElementById('pmTuneStatus');
    if (statusEl) {
      statusEl.textContent = `✓ ${tune.emoji} ${tune.name}!`;
      statusEl.style.color = '#ffd100';
    }

    // Award token via RewardVault
    const matchCount = tune.reward.type === 'game'  ? 4
                     : tune.reward.type === 'video' ? 3
                     : 2; // music
    const awarded = tune.reward.count || 1;
    for (let i = 0; i < awarded; i++) {
      if (typeof RewardVault !== 'undefined') RewardVault.award(matchCount, tune.name);
    }

    // Win fanfare
    const tier = tune.reward.type === 'game'  ? 3
               : tune.reward.type === 'video' ? 2
               : 1;
    if (typeof ChiptuneEngine !== 'undefined') ChiptuneEngine.play('win', tier);

    // Level / Signal XP
    if (typeof LevelSystem  !== 'undefined') LevelSystem.awardXP('pair');
    if (typeof SignalValue  !== 'undefined') SignalValue.add('pianoTune', awarded * 5);

    // Mark tune as discovered in the tune book
    _markDiscovered(tune.id);

    // Flash the keyboard
    _flashAllKeys();

    // Toast
    _toast(`${tune.emoji} ${tune.name} — ${awarded} ${tune.reward.type} token${awarded > 1 ? 's' : ''} earned!`, '#ffd100');

    // Clear history so the same tune doesn't fire again immediately
    _history = [];
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  function _flashKey(noteName) {
    const btn = document.querySelector(`.pm-key[data-note="${noteName}"]`);
    if (!btn) return;
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 180);
  }

  function _flashAllKeys() {
    document.querySelectorAll('.pm-key').forEach((k) => {
      k.classList.add('jackpot');
      setTimeout(() => k.classList.remove('jackpot'), 600);
    });
  }

  function _updateTrail(noteName) {
    const el = document.getElementById('pmNotesPlayed');
    if (!el) return;
    // Show the last 10 note names as bubbles
    const trail = _history.slice(-10);
    const noteNames = KEYS.filter((k) => {
      const s = NOTE_SEMI[k.note];
      return trail.includes(s);
    });
    // Rebuild from history (keeping order)
    el.innerHTML = _history.slice(-10).map((semi) => {
      const key = KEYS.find((k) => NOTE_SEMI[k.note] === semi);
      const name = key ? key.note.replace('#', '♯') : '?';
      const isBlack = key?.type === 'black';
      return `<span class="pm-note-bubble ${isBlack ? 'pm-note-bubble--black' : ''}">${name}</span>`;
    }).join('');
  }

  function _markDiscovered(tuneId) {
    const card = document.querySelector(`.pm-tune-card[data-id="${tuneId}"]`);
    if (card) card.classList.add('discovered');
  }

  function _toast(msg, color) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast toast-power';
    t.style.borderColor = color || '#ffd100';
    t.innerHTML = `<strong style="color:${color || '#ffd100'}">${msg}</strong>`;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-show'));
    setTimeout(() => {
      t.classList.remove('toast-show');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, 4000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function render(mountId) {
    _mountId = mountId;
    const mount = document.getElementById(mountId);
    if (!mount) return;

    mount.innerHTML = `
      <div class="pm-card glass-card">
        <div class="pm-header">
          <div>
            <h2 class="pm-title">🎹 Piano Mint</h2>
            <p class="pm-sub">Play a real melody — AI detects it — earn a token</p>
          </div>
          <button class="btn-secondary pm-clear-btn" id="pmClearBtn" title="Clear note history">⌫ Clear</button>
        </div>

        <!-- Live status -->
        <div class="pm-status-row">
          <div class="pm-notes-played" id="pmNotesPlayed" aria-label="Notes played"></div>
          <div class="pm-tune-status" id="pmTuneStatus">Press a key to start…</div>
        </div>

        <!-- Tune book -->
        <div class="pm-tune-book" id="pmTuneBook">
          ${TUNES.map((t) => `
            <div class="pm-tune-card" data-id="${t.id}" title="${t.hint}">
              <span class="pm-tune-emoji">${t.emoji}</span>
              <span class="pm-tune-name">${t.name}</span>
              <span class="pm-tune-hint">${t.hint}</span>
              <span class="pm-tune-reward">${t.reward.count} ${t.reward.type}</span>
            </div>`).join('')}
        </div>

        <!-- Keyboard shortcut legend -->
        <div class="pm-kbd-legend">
          <span class="pm-kbd-item"><kbd>Z–M</kbd> white keys oct.3</span>
          <span class="pm-kbd-item"><kbd>S D G H J</kbd> black</span>
          <span class="pm-kbd-item"><kbd>Q–I</kbd> white keys oct.4</span>
          <span class="pm-kbd-item"><kbd>2 3 5 6 7</kbd> black</span>
        </div>

        <!-- The keyboard itself -->
        <div class="pm-keys-scroll" role="group" aria-label="Piano keyboard">
          <div class="pm-keyboard" id="pmKeyboard">
            <div class="pm-white-layer" id="pmWhiteLayer"></div>
            <div class="pm-black-layer" id="pmBlackLayer"></div>
          </div>
        </div>
      </div>`;

    _buildKeys();
    _attachKeyboard();

    document.getElementById('pmClearBtn').addEventListener('click', () => {
      _history = [];
      const trail = document.getElementById('pmNotesPlayed');
      if (trail) trail.innerHTML = '';
      const status = document.getElementById('pmTuneStatus');
      if (status) { status.textContent = 'Press a key to start…'; status.style.color = ''; }
    });
  }

  function _buildKeys() {
    const whiteLayer = document.getElementById('pmWhiteLayer');
    const blackLayer = document.getElementById('pmBlackLayer');
    if (!whiteLayer || !blackLayer) return;

    const whiteKeys = KEYS.filter((k) => k.type === 'white');
    const blackKeys = KEYS.filter((k) => k.type === 'black');

    whiteKeys.forEach((k) => {
      const btn = document.createElement('button');
      btn.className    = 'pm-key pm-white';
      btn.dataset.note = k.note;
      btn.dataset.kbd  = k.kbd;
      btn.setAttribute('aria-label', k.note);
      btn.innerHTML = `<span class="pk-name">${k.note.replace('#','♯')}</span><span class="pk-kbd">${k.kbd.toUpperCase()}</span>`;
      btn.addEventListener('mousedown',  (e) => { e.preventDefault(); _pressKey(k.note); });
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); _pressKey(k.note); }, { passive: false });
      whiteLayer.appendChild(btn);
    });

    blackKeys.forEach((k) => {
      const btn = document.createElement('button');
      btn.className    = 'pm-key pm-black';
      btn.dataset.note = k.note;
      btn.dataset.kbd  = k.kbd;
      btn.setAttribute('aria-label', k.note);
      btn.innerHTML = `<span class="pk-kbd">${k.kbd.toUpperCase()}</span>`;
      btn.addEventListener('mousedown',  (e) => { e.preventDefault(); _pressKey(k.note); });
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); _pressKey(k.note); }, { passive: false });
      blackLayer.appendChild(btn);
    });

    // Position black keys after layout is known
    requestAnimationFrame(() => _positionBlackKeys());
  }

  function _positionBlackKeys() {
    const whiteLayer = document.getElementById('pmWhiteLayer');
    const blackLayer = document.getElementById('pmBlackLayer');
    if (!whiteLayer || !blackLayer) return;

    const firstWhite = whiteLayer.querySelector('.pm-white');
    if (!firstWhite) return;
    const ww = firstWhite.offsetWidth + 2; // +2 for gap

    // Set keyboard container width to match white layer
    const kb = document.getElementById('pmKeyboard');
    if (kb) kb.style.width = `${ww * 15}px`;
    blackLayer.style.width = `${ww * 15}px`;

    const bw = Math.round(ww * 0.62); // black key width ~62% of white
    blackLayer.querySelectorAll('.pm-black').forEach((btn) => {
      const pos = BLACK_WH_POS[btn.dataset.note];
      if (pos !== undefined) {
        btn.style.left  = `${Math.round(pos * ww - bw / 2)}px`;
        btn.style.width = `${bw}px`;
      }
    });
  }

  // ── Computer keyboard listener ─────────────────────────────────────────────

  function _attachKeyboard() {
    if (_keyListener) document.removeEventListener('keydown', _keyListener);
    _keyListener = (e) => {
      // Don't fire when user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.repeat) return; // suppress auto-repeat
      const note = KBD_MAP[e.key.toLowerCase()];
      if (note) {
        e.preventDefault();
        _pressKey(note);
      }
    };
    document.addEventListener('keydown', _keyListener);
  }

  function destroy() {
    if (_keyListener) {
      document.removeEventListener('keydown', _keyListener);
      _keyListener = null;
    }
  }

  // Reposition black keys on window resize
  window.addEventListener('resize', () => {
    if (document.getElementById('pmWhiteLayer')) _positionBlackKeys();
  });

  return { render, destroy, TUNES };

})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PianoMint;
}
