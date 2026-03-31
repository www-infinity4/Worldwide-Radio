/**
 * Chiptune Engine — Original NES-Style Music Synthesizer
 *
 * Generates original compositions using the Web Audio API, modelled on
 * the NES APU (Audio Processing Unit):
 *   • Pulse 1 & 2  →  OscillatorNode { type: 'square' }
 *   • Triangle     →  OscillatorNode { type: 'triangle' }
 *   • Noise        →  AudioBufferSourceNode (white noise buffer)
 *
 * All melodies are original compositions — no Nintendo IP used.
 *
 * API:
 *   ChiptuneEngine.play('spin')          — while slot reels cycle
 *   ChiptuneEngine.play('win', 1–4)      — win fanfare (level = match tier)
 *   ChiptuneEngine.play('radio', tag)    — channel-select sting
 *   ChiptuneEngine.play('credit')        — credit earned sound
 *   ChiptuneEngine.play('launch')        — game emulator launch fanfare
 *   ChiptuneEngine.play('coin')          — single coin collect
 *   ChiptuneEngine.startLoop()           — ambient idle loop
 *   ChiptuneEngine.stopLoop()            — stop ambient loop
 *   ChiptuneEngine.setVolume(0–1)
 *   ChiptuneEngine.mute() / unmute()
 */

const ChiptuneEngine = (() => {

  // ── Shared audio context ───────────────────────────────────────────────────
  let ac         = null;
  let masterGain = null;
  let _volume    = 0.25;
  let _muted     = false;
  let _loopTimer = null;
  let _loopRunning = false;

  function _ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac         = new AC();
      masterGain = ac.createGain();
      masterGain.gain.value = _volume;
      masterGain.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  // ── Note frequency helpers ─────────────────────────────────────────────────
  // Standard equal temperament: A4 = 440 Hz
  const NOTE = (() => {
    const n = {};
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    for (let oct = 2; oct <= 7; oct++) {
      names.forEach((name, i) => {
        // MIDI number: C4 = 60
        const midi = (oct + 1) * 12 + i;
        n[`${name}${oct}`] = 440 * Math.pow(2, (midi - 69) / 12);
      });
    }
    return n;
  })();

  // ── Low-level synthesis primitives ────────────────────────────────────────

  /**
   * Play a square-wave pulse (NES Pulse channel).
   * @param {number} freq    – Hz
   * @param {number} start   – AudioContext time
   * @param {number} dur     – seconds
   * @param {number} [vol]   – 0–1 (default 0.2)
   * @param {string} [type]  – oscillator type (default 'square')
   */
  function _pulse(freq, start, dur, vol = 0.18, type = 'square') {
    const ctx = _ctx();
    if (!ctx || _muted) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type           = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.005);
    gain.gain.setValueAtTime(vol, start + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, start + dur);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(start);
    osc.stop(start + dur + 0.01);
  }

  /**
   * Play a triangle-wave bass note (NES Triangle channel).
   */
  function _tri(freq, start, dur, vol = 0.14) {
    _pulse(freq, start, dur, vol, 'triangle');
  }

  /**
   * Play a noise burst (NES Noise channel — white noise shaped by envelope).
   */
  function _noise(start, dur, vol = 0.08) {
    const ctx = _ctx();
    if (!ctx || _muted) return;

    const bufSize   = ctx.sampleRate * 0.5;
    const buf       = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data      = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();

    filt.type            = 'bandpass';
    filt.frequency.value = 800;
    filt.Q.value         = 0.5;

    src.buffer = buf;
    gain.gain.setValueAtTime(vol, start);
    gain.gain.linearRampToValueAtTime(0, start + dur);

    src.connect(filt);
    filt.connect(gain);
    gain.connect(masterGain);

    src.start(start);
    src.stop(start + dur + 0.01);
  }

  // ── Musical sequences ──────────────────────────────────────────────────────

  /**
   * Play an array of [freq|null, duration] steps starting at `t0`.
   * Returns the time after the last note.
   */
  function _seq(notes, t0, vol, type) {
    let t = t0;
    notes.forEach(([freq, dur]) => {
      if (freq) _pulse(freq, t, dur * 0.85, vol, type);
      t += dur;
    });
    return t;
  }

  function _bassSeq(notes, t0, vol) {
    let t = t0;
    notes.forEach(([freq, dur]) => {
      if (freq) _tri(freq, t, dur * 0.9, vol);
      t += dur;
    });
    return t;
  }

  // ── Compositions ──────────────────────────────────────────────────────────

  const TEMPO_FAST   = 0.065;  // ~184 BPM eighth note
  const TEMPO_MED    = 0.10;   // ~120 BPM eighth note
  const TEMPO_SLOW   = 0.135;  // ~88  BPM eighth note

  /**
   * SPIN JINGLE — quick ascending run while reels are cycling.
   * Original ascending C-major arpeggio with a chromatic flourish.
   */
  function _playSpin() {
    const ctx = _ctx();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    const s = TEMPO_FAST;

    // Melody: ascending run with bounce
    _seq([
      [NOTE['C4'], s], [NOTE['E4'], s], [NOTE['G4'], s], [NOTE['C5'], s],
      [NOTE['E5'], s], [NOTE['G5'], s], [NOTE['F5'], s], [NOTE['G5'], s * 2],
    ], t, 0.18);

    // Bass pulse on beat
    _bassSeq([
      [NOTE['C3'], s * 2], [NOTE['G3'], s * 2], [NOTE['C3'], s * 2], [NOTE['G3'], s * 2],
    ], t, 0.12);

    // Noise on beat
    _noise(t, s * 0.5, 0.06);
    _noise(t + s * 2, s * 0.5, 0.06);
    _noise(t + s * 4, s * 0.5, 0.06);
    _noise(t + s * 6, s * 0.5, 0.06);
  }

  /**
   * WIN FANFARES — level 1–4 increasing elaborateness.
   * All original melodies.
   */
  function _playWin(level = 1) {
    const ctx = _ctx();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    const s = TEMPO_MED;

    if (level === 1) {
      // Pair — short 2-note phrase
      _seq([[NOTE['E5'], s], [NOTE['G5'], s * 1.5]], t, 0.2);
      _noise(t + s, s * 0.4, 0.07);

    } else if (level === 2) {
      // 3-of-a-kind — 4 note rising phrase with harmony
      _seq([
        [NOTE['C5'], s], [NOTE['E5'], s], [NOTE['G5'], s], [NOTE['C6'], s * 2],
      ], t, 0.2);
      _seq([
        [NOTE['E4'], s], [NOTE['G4'], s], [NOTE['B4'], s], [NOTE['E5'], s * 2],
      ], t, 0.12);  // harmony a third below
      _bassSeq([[NOTE['C3'], s * 2], [NOTE['G3'], s * 3]], t, 0.15);
      _noise(t, s * 0.4, 0.08);
      _noise(t + s * 3, s * 0.6, 0.10);

    } else if (level === 3) {
      // 4-of-a-kind — big 6-note fanfare
      _seq([
        [NOTE['C5'], s * 0.5], [NOTE['E5'], s * 0.5], [NOTE['G5'], s * 0.5],
        [NOTE['C6'], s * 0.5], [NOTE['E6'], s * 0.5], [NOTE['G6'], s * 2],
      ], t, 0.22);
      _seq([
        [NOTE['G4'], s * 0.5], [NOTE['B4'], s * 0.5], [NOTE['D5'], s * 0.5],
        [NOTE['G5'], s * 0.5], [NOTE['B5'], s * 0.5], [NOTE['D6'], s * 2],
      ], t, 0.12);
      _bassSeq([
        [NOTE['C3'], s], [NOTE['G3'], s], [NOTE['C3'], s], [NOTE['G3'], s * 2],
      ], t, 0.18);
      [0, 1, 2, 3, 4].forEach((i) => _noise(t + i * s * 0.5, s * 0.3, 0.09));

    } else {
      // Jackpot! — full ascending run + triumph chord
      const fast = TEMPO_FAST;
      _seq([
        [NOTE['C4'], fast], [NOTE['D4'], fast], [NOTE['E4'], fast], [NOTE['F4'], fast],
        [NOTE['G4'], fast], [NOTE['A4'], fast], [NOTE['B4'], fast], [NOTE['C5'], fast],
        [NOTE['D5'], fast], [NOTE['E5'], fast], [NOTE['F5'], fast], [NOTE['G5'], fast],
        [NOTE['A5'], fast], [NOTE['B5'], fast], [NOTE['C6'], fast * 4],
      ], t, 0.24);
      _seq([
        [NOTE['E3'], fast * 4], [NOTE['G3'], fast * 4], [NOTE['B3'], fast * 4],
        [NOTE['E4'], fast * 3],
      ], t + fast * 8, 0.14);
      _bassSeq([
        [NOTE['C3'], fast * 4], [NOTE['F3'], fast * 4], [NOTE['G3'], fast * 4],
        [NOTE['C3'], fast * 3],
      ], t, 0.18);
      for (let i = 0; i < 15; i++) _noise(t + i * fast, fast * 0.6, 0.07);
    }
  }

  /**
   * COIN COLLECT — classic single-note coin sound (original).
   */
  function _playCoin() {
    const ctx = _ctx();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    _seq([[NOTE['B5'], 0.05], [NOTE['E6'], 0.12]], t, 0.22, 'square');
  }

  /**
   * CREDIT EARNED — rising 3-note phrase.
   */
  function _playCredit() {
    const ctx = _ctx();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    const s = 0.08;
    _seq([[NOTE['G5'], s], [NOTE['C6'], s], [NOTE['E6'], s * 2]], t, 0.2);
    _noise(t + s * 2, s * 0.5, 0.08);
  }

  /**
   * GAME LAUNCH FANFARE — triumphant 8-bar original opening.
   */
  function _playLaunch() {
    const ctx = _ctx();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    const s = TEMPO_MED;

    _seq([
      [NOTE['C5'], s],  [NOTE['C5'], s],  [NOTE['C5'], s * 1.5], [NOTE['D5'], s * 0.5],
      [NOTE['E5'], s],  [NOTE['C5'], s],  [NOTE['E5'], s],        [NOTE['G5'], s * 2],
      [NOTE['A4'], s],  [NOTE['A4'], s],  [NOTE['A4'], s * 1.5],  [NOTE['A4'], s * 0.5],
      [NOTE['C5'], s],  [NOTE['E5'], s],  [NOTE['D5'], s],        [NOTE['C5'], s * 2],
    ], t, 0.22);

    _bassSeq([
      [NOTE['C3'], s * 2], [NOTE['G3'], s * 2], [NOTE['A3'], s * 2], [NOTE['E3'], s * 2],
      [NOTE['F3'], s * 2], [NOTE['C3'], s * 2], [NOTE['F3'], s * 2], [NOTE['G3'], s * 2],
    ], t, 0.16);

    // Rhythm noise on every beat
    for (let i = 0; i < 8; i++) {
      _noise(t + i * s * 2, s * 0.4, 0.08);
      _noise(t + i * s * 2 + s, s * 0.3, 0.05);
    }
  }

  /**
   * RADIO CHANNEL STING — quick 3-note identifier played when a slot win
   * tunes the radio to a new genre.
   */
  function _playRadio(tag) {
    const ctx = _ctx();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;

    // Each radio genre gets its own tonal colour
    const stings = {
      police:   [[NOTE['G5'], 0.07], [NOTE['C6'], 0.07], [NOTE['G5'], 0.14]],
      jazz:     [[NOTE['Bb5'], 0.09], [NOTE['D6'], 0.09], [NOTE['F6'], 0.18]],
      military: [[NOTE['C5'], 0.06], [NOTE['G5'], 0.06], [NOTE['C5'], 0.06], [NOTE['G5'], 0.12]],
      pop:      [[NOTE['E5'], 0.07], [NOTE['G5'], 0.07], [NOTE['B5'], 0.14]],
      ambient:  [[NOTE['D5'], 0.12], [NOTE['A5'], 0.12], [NOTE['D6'], 0.24]],
      news:     [[NOTE['C6'], 0.06], [NOTE['G5'], 0.06], [NOTE['C6'], 0.12]],
    };

    const notes = stings[tag] || stings['pop'];
    _seq(notes, t, 0.2);
    _noise(t + notes.reduce((s, [, d]) => s + d, 0) - 0.1, 0.08, 0.06);
  }

  /**
   * AMBIENT LOOP — original 16-bar looping background melody.
   * Plays quietly while the slot machine is idle.
   */
  function _playLoop() {
    const ctx = _ctx();
    if (!ctx || !_loopRunning) return;
    const t = ctx.currentTime + 0.01;
    const s = TEMPO_SLOW;

    // Melody line (pulse 1)
    const mel = [
      [NOTE['E5'], s], [NOTE['D5'], s], [NOTE['C5'], s * 2],
      [NOTE['D5'], s], [NOTE['E5'], s], [NOTE['E5'], s], [NOTE['E5'], s * 2],
      [NOTE['D5'], s], [NOTE['D5'], s], [NOTE['E5'], s], [NOTE['D5'], s * 2],
      [NOTE['E5'], s], [NOTE['D5'], s], [NOTE['C5'], s], [NOTE['C5'], s * 3],
    ];

    // Counter-melody (pulse 2, quieter)
    const cmelo = [
      [NOTE['C5'], s * 2], [NOTE['G4'], s * 2],
      [NOTE['A4'], s * 2], [NOTE['G4'], s * 2],
      [NOTE['G4'], s * 2], [NOTE['A4'], s * 2],
      [NOTE['E4'], s * 2], [NOTE['G4'], s * 2],
    ];

    // Bass line (triangle)
    const bass = [
      [NOTE['C3'], s * 4], [NOTE['G3'], s * 4],
      [NOTE['A3'], s * 4], [NOTE['C3'], s * 4],
    ];

    const totalDur = mel.reduce((sum, [, d]) => sum + d, 0);

    _seq(mel,   t, 0.15);
    _seq(cmelo, t, 0.09);
    _bassSeq(bass, t, 0.10);

    // Soft noise on beat
    for (let i = 0; i < 4; i++) _noise(t + i * s * 4, s * 0.5, 0.04);

    // Schedule next loop
    _loopTimer = setTimeout(_playLoop, (totalDur - 0.1) * 1000);
  }

  // ── Volume control ─────────────────────────────────────────────────────────

  function setVolume(v) {
    _volume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
  }

  function mute() {
    _muted = true;
    if (masterGain) masterGain.gain.value = 0;
  }

  function unmute() {
    _muted = false;
    if (masterGain) masterGain.gain.value = _volume;
  }

  // ── Loop control ───────────────────────────────────────────────────────────

  function startLoop() {
    if (_loopRunning) return;
    _loopRunning = true;
    _playLoop();
  }

  function stopLoop() {
    _loopRunning = false;
    if (_loopTimer) { clearTimeout(_loopTimer); _loopTimer = null; }
  }

  // ── Piano note (single key press) ─────────────────────────────────────────

  /**
   * Play a single piano note immediately — used by the Piano Mint keyboard.
   * @param {string} name   – e.g. 'C4', 'F#3', 'A#4'
   * @param {number} [dur]  – sustain in seconds (default 0.45)
   */
  function playNote(name, dur = 0.45) {
    const ctx = _ctx();
    if (!ctx) return;
    const freq = NOTE[name];
    if (!freq) return;
    const t = ctx.currentTime + 0.005;
    // Square wave with piano-like decay: sharp attack → exponential release
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type            = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0,     t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.10, t + 0.12);
    gain.gain.linearRampToValueAtTime(0,    t + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  // ── Public dispatcher ──────────────────────────────────────────────────────

  /**
   * @param {string} name  – 'spin' | 'win' | 'coin' | 'credit' | 'launch' | 'radio'
   * @param {*}      arg   – win level (1–4) or radio tag string
   */
  function play(name, arg) {
    try {
      switch (name) {
        case 'spin':    _playSpin();          break;
        case 'win':     _playWin(arg || 1);   break;
        case 'coin':    _playCoin();          break;
        case 'credit':  _playCredit();        break;
        case 'launch':  _playLaunch();        break;
        case 'radio':   _playRadio(arg);      break;
        default: break;
      }
    } catch (_) {
      // Audio errors are non-fatal
    }
  }

  return { play, startLoop, stopLoop, setVolume, mute, unmute, NOTE, playNote };
})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChiptuneEngine;
}
