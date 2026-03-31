/**
 * Login Gate — first-visit register / returning-player sign-in
 *
 * Security model (browser-only, no server):
 *   • Passwords are hashed with SHA-256 (SubtleCrypto) before storage.
 *   • A random 32-byte salt is generated per account and stored alongside
 *     the hash so rainbow tables cannot be used.
 *   • A session token (random UUID) is written to sessionStorage so the
 *     gate stays open for the browser tab lifetime.
 *   • localStorage stores: { users: {[username]: {hash, salt, colour}}, lastUser }
 *
 * Nothing is sent to any server. This is a local identity layer that
 * also feeds the UserProfile display name so the rest of the app knows
 * who is playing.
 */

const LoginGate = (() => {

  const LS_KEY  = 'www_inf_auth_v1';
  const SS_KEY  = 'www_inf_session_v1';

  // ── Persistence ────────────────────────────────────────────────────────────

  function _loadStore() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{"users":{}}'); }
    catch (_) { return { users: {} }; }
  }

  function _saveStore(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (_) {}
  }

  function _hasSession() {
    return !!sessionStorage.getItem(SS_KEY);
  }

  function _writeSession(username) {
    const token = crypto.getRandomValues(new Uint8Array(16))
      .reduce((a, b) => a + b.toString(16).padStart(2, '0'), '');
    sessionStorage.setItem(SS_KEY, JSON.stringify({ username, token, ts: Date.now() }));
  }

  function _getSession() {
    try { return JSON.parse(sessionStorage.getItem(SS_KEY) || 'null'); }
    catch (_) { return null; }
  }

  // ── Crypto helpers ─────────────────────────────────────────────────────────

  async function _hash(password, saltHex) {
    const salt = saltHex
      ? new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)))
      : crypto.getRandomValues(new Uint8Array(16));
    const enc  = new TextEncoder();
    const data = new Uint8Array([...salt, ...enc.encode(password)]);
    const buf  = await crypto.subtle.digest('SHA-256', data);
    const hex  = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    const saltOut = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
    return { hash: hex, salt: saltOut };
  }

  async function _verify(password, storedHash, storedSalt) {
    const { hash } = await _hash(password, storedSalt);
    return hash === storedHash;
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  function _el(id) { return document.getElementById(id); }

  function _showError(msg) {
    const el = _el('loginError');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
  }

  function _clearError() {
    const el = _el('loginError');
    if (el) { el.hidden = true; el.textContent = ''; }
  }

  function _setLoading(on) {
    const btn = _el('loginSubmit');
    if (!btn) return;
    btn.disabled = on;
    btn.textContent = on ? '⟳ Please wait…' : (_isRegister ? '▶ START GAME' : '▶ PLAY');
  }

  // ── State ──────────────────────────────────────────────────────────────────

  let _isRegister = true; // true = new account, false = sign-in

  function _setMode(register) {
    _isRegister = register;
    _clearError();

    const sub       = _el('loginSub');
    const confirmF  = _el('loginConfirmField');
    const toggleTxt = _el('loginToggleText');
    const toggleBtn = _el('loginToggle');
    const submitBtn = _el('loginSubmit');
    const passLabel = _el('loginPassField')?.querySelector('.login-label');

    if (sub)        sub.textContent      = register ? 'Create your player profile' : 'Welcome back, Player!';
    if (confirmF)   confirmF.hidden      = !register;
    if (toggleTxt)  toggleTxt.textContent= register ? 'Already have a profile?' : 'New player?';
    if (toggleBtn)  toggleBtn.textContent= register ? 'Sign in' : 'Create account';
    if (submitBtn)  submitBtn.textContent= register ? '▶ START GAME' : '▶ PLAY';
    if (passLabel)  passLabel.textContent= register ? 'Choose a Password' : 'Password';
  }

  // ── Register / Login logic ─────────────────────────────────────────────────

  async function _register(username, password, confirm) {
    if (!username) { _showError('Enter a player name.'); return; }
    if (username.length < 2) { _showError('Name must be at least 2 characters.'); return; }
    if (!password) { _showError('Enter a password.'); return; }
    if (password.length < 4) { _showError('Password must be at least 4 characters.'); return; }
    if (password !== confirm) { _showError('Passwords do not match.'); return; }

    const store = _loadStore();
    if (store.users[username.toLowerCase()]) {
      _showError('That player name is taken — try another or sign in.');
      return;
    }

    _setLoading(true);
    try {
      const { hash, salt } = await _hash(password);
      store.users[username.toLowerCase()] = {
        display: username,
        hash,
        salt,
        createdAt: Date.now(),
      };
      store.lastUser = username.toLowerCase();
      _saveStore(store);
      _writeSession(username.toLowerCase());
      _onLogin(username);
    } catch (e) {
      _showError('Could not create account. Try again.');
    } finally {
      _setLoading(false);
    }
  }

  async function _login(username, password) {
    if (!username) { _showError('Enter your player name.'); return; }
    if (!password) { _showError('Enter your password.'); return; }

    const store = _loadStore();
    const user  = store.users[username.toLowerCase()];
    if (!user) {
      _showError('Player not found. Check your name or create an account.');
      return;
    }

    _setLoading(true);
    try {
      const ok = await _verify(password, user.hash, user.salt);
      if (!ok) { _showError('Wrong password. Try again.'); return; }
      store.lastUser = username.toLowerCase();
      _saveStore(store);
      _writeSession(username.toLowerCase());
      _onLogin(user.display || username);
    } catch (e) {
      _showError('Sign-in failed. Try again.');
    } finally {
      _setLoading(false);
    }
  }

  // ── Post-login ─────────────────────────────────────────────────────────────

  function _onLogin(displayName) {
    // Dismiss gate
    const gate = _el('loginGate');
    if (gate) {
      gate.classList.add('login-gate--out');
      setTimeout(() => { gate.hidden = true; gate.classList.remove('login-gate--out'); }, 400);
    }

    // Feed display name to UserProfile
    if (typeof UserProfile !== 'undefined') {
      const p = UserProfile.load();
      if (!p.name) {
        p.name = displayName;
        UserProfile.save(p);
        UserProfile.refresh();
      }
    }

    // Update nav avatar label
    const profileBtn = _el('profileBtn');
    if (profileBtn) profileBtn.title = `Profile: ${displayName}`;
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  /**
   * Call once at page load (before app init).
   * Shows gate if no session; otherwise resolves immediately.
   */
  function init() {
    const gate = _el('loginGate');
    if (!gate) return;

    // Pre-fill last used username
    const store = _loadStore();
    if (store.lastUser) {
      const input = _el('loginUsername');
      if (input) input.value = store.users[store.lastUser]?.display || store.lastUser;
      _setMode(false); // show sign-in
    } else {
      _setMode(true); // show register
    }

    // Check for existing valid session
    if (_hasSession()) {
      const sess = _getSession();
      if (sess) _onLogin(store.users[sess.username]?.display || sess.username);
      return;
    }

    // Show gate
    gate.hidden = false;
    requestAnimationFrame(() => gate.classList.add('login-gate--in'));
    setTimeout(() => _el('loginUsername')?.focus(), 100);

    // Wire submit
    _el('loginSubmit')?.addEventListener('click', _handleSubmit);
    [_el('loginUsername'), _el('loginPassword'), _el('loginConfirm')].forEach((inp) => {
      inp?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') _handleSubmit();
        _clearError();
      });
    });

    // Toggle register ↔ login
    _el('loginToggle')?.addEventListener('click', () => _setMode(!_isRegister));
  }

  async function _handleSubmit() {
    const username = (_el('loginUsername')?.value || '').trim();
    const password = _el('loginPassword')?.value || '';
    const confirm  = _el('loginConfirm')?.value  || '';

    if (_isRegister) {
      await _register(username, password, confirm);
    } else {
      await _login(username, password);
    }
  }

  /** Change password for logged-in user. Returns true on success. */
  async function changePassword(newPassword, confirmPassword) {
    const sess = _getSession();
    if (!sess) return false;
    if (newPassword !== confirmPassword) return false;
    if (newPassword.length < 4) return false;

    const store = _loadStore();
    const user  = store.users[sess.username];
    if (!user) return false;

    const { hash, salt } = await _hash(newPassword);
    user.hash = hash;
    user.salt = salt;
    _saveStore(store);
    return true;
  }

  /** Sign out: clear session, show gate again */
  function signOut() {
    sessionStorage.removeItem(SS_KEY);
    const gate = _el('loginGate');
    if (gate) {
      gate.hidden = false;
      gate.classList.remove('login-gate--out');
      requestAnimationFrame(() => gate.classList.add('login-gate--in'));
      _setMode(false);
      setTimeout(() => _el('loginUsername')?.focus(), 100);
    }
  }

  function getUsername() {
    const sess = _getSession();
    if (!sess) return null;
    const store = _loadStore();
    return store.users[sess.username]?.display || sess.username;
  }

  return { init, changePassword, signOut, getUsername };

})();

// Run immediately
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LoginGate.init());
  } else {
    LoginGate.init();
  }
}
