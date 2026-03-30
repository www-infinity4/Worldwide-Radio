/**
 * Signal Value — running session value counter
 *
 * Every meaningful action a Spark takes generates signal value.
 * Displayed as a live running total in the system bar.
 * This makes it visible and real that every click, spin, research
 * entry, video watch, and game play is genuinely worth something.
 *
 * VALUE TABLE (per event):
 *   spin       →  1   A Spark tried — that carries frequency
 *   tune       →  2   Tuning to a station is an intent signal
 *   research   →  3   Knowledge captured is permanent value
 *   lore       →  2   Reading game history is signal too
 *   token      →  5   Earning a token is a real reward
 *   gameSpin   →  5–25  Game match (×2 if featured)
 *   playGame   →  12  Playing is experiencing, experiencing is signal
 *   watchVideo →  8   Watching earns — attention is value
 *   crush      →  10  BTC hash crush = pure signal acquisition
 *   combo      →  20  Combo chain = multiplicative signal burst
 *   demo       →  12  Completing a demo = full loop signal
 *   warp       →  5   Saving a warp = preserving your path
 */

const SignalValue = (() => {

  const LS_KEY = 'www_infinity_signal_value_v1';

  const VALUE_TABLE = {
    spin:       1,
    tune:       2,
    research:   3,
    lore:       2,
    token:      5,
    gameSpin:   5,
    playGame:   12,
    watchVideo: 8,
    crush:      10,
    combo:      20,
    demo:       12,
    warp:       5,
  };

  function _load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || _empty(); }
    catch (_) { return _empty(); }
  }

  function _empty() {
    return { session: 0, total: 0, log: [] };
  }

  function _save(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (_) {}
  }

  /**
   * Add signal value for an action.
   * @param {string} type  — key from VALUE_TABLE
   * @param {number} [override]  — optional override amount
   */
  function add(type, override) {
    const base   = override !== undefined ? override : (VALUE_TABLE[type] || 1);
    const s      = _load();
    s.session   += base;
    s.total     += base;
    s.log.unshift({ type, base, ts: new Date().toISOString() });
    s.log        = s.log.slice(0, 100);
    _save(s);
    _updateUI(s);
    return s.session;
  }

  function getState() { return _load(); }

  function resetSession() {
    const s    = _load();
    s.session  = 0;
    _save(s);
    _updateUI(s);
  }

  function _updateUI(s) {
    const el     = document.getElementById('signalValueDisplay');
    const totEl  = document.getElementById('signalValueTotal');
    if (el)    el.textContent    = `⚡ ${s.session.toLocaleString()} sv`;
    if (totEl) totEl.textContent = `total: ${s.total.toLocaleString()} sv`;
  }

  function init() {
    const s = _load();
    _updateUI(s);
  }

  return { add, getState, resetSession, init, VALUE_TABLE };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SignalValue;
