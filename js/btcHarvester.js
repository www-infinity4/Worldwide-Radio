/**
 * BTC Harvest Feed — Squashed Hash → Emitted Signal → Token Display
 *
 * Visual layer that shows the Bitcoin hash being squashed through the
 * entropy engine and emitting a frequency signal.  The resulting
 * simulated token values represent that emitted energy.
 *
 * ─────────────────────────────────────────────────────────────────────
 * IMPORTANT — SIMULATION ONLY
 * All BTC values are generated with Math.random().
 * No real Bitcoin is collected, transferred, stored, or promised.
 * This is a display-only representation of the signal-squash concept.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Adapted from www-infinity4/Alien-Radio harvest feed.
 *
 * Session split display (simulated totals only):
 *   Platform (www-infinity) : 92 %
 *   User session share      :  8 %
 */

const BtcHarvester = (() => {

  const USER_PCT     = 0.08;
  const PLATFORM_PCT = 0.92;

  let sessionTotal = 0;   // running simulated satoshi accumulation

  // ── Ticker data (static display — refreshed cosmetically) ─────────────────
  const TICKER_ITEMS = [
    { label: 'BTC/USD',  value: '$67,420',    delta: '+2.14%', up: true  },
    { label: 'SAT/vB',   value: '24 sat',     delta: '−3.50%', up: false },
    { label: 'HASHRATE', value: '642 EH/s',   delta: '+0.95%', up: true  },
    { label: 'MEMPOOL',  value: '148,923 tx', delta: '+8.20%', up: true  },
    { label: 'BLOCKS',   value: '847,291',    delta: '+1',     up: true  },
    { label: 'FEES',     value: '0.00024 ₿',  delta: '−1.10%', up: false },
  ];

  // ── Transaction templates — each radio action emits a simulated harvest ────
  const TX_TEMPLATES = [
    { icon: '⚡', action: 'Station tuned',       weight: () => Math.random() * 0.0001   },
    { icon: '📡', action: 'Signal acquired',      weight: () => Math.random() * 0.00005  },
    { icon: '🎵', action: 'Stream active',        weight: () => Math.random() * 0.00002  },
    { icon: '🔬', action: 'Research logged',      weight: () => Math.random() * 0.00008  },
    { icon: '₿',  action: 'Block hash squashed',  weight: () => Math.random() * 0.0003   },
    { icon: '🪙', action: 'Coin signal emitted',  weight: () => Math.random() * 0.00015  },
    { icon: '🌡️', action: 'Thermal IR captured',  weight: () => Math.random() * 0.00006  },
    { icon: '📻', action: 'Frequency locked',     weight: () => Math.random() * 0.00004  },
  ];

  // ── Internal helpers ──────────────────────────────────────────────────────

  function _hex16() {
    const c = '0123456789abcdef';
    let s = '';
    for (let i = 0; i < 16; i++) s += c[Math.floor(Math.random() * 16)];
    return s;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Generate one simulated squash-and-emit transaction.
   *
   * @param {string} [actionOverride]  – optional label (e.g. "Block #847,291 squashed")
   * @returns {{ icon, action, btc, userBtc, platformBtc, hash, ts }}
   */
  function emit(actionOverride) {
    const tmpl = TX_TEMPLATES[Math.floor(Math.random() * TX_TEMPLATES.length)];
    const btc  = actionOverride
      ? Math.random() * 0.0003
      : tmpl.weight();

    sessionTotal += btc;

    return {
      icon:        tmpl.icon,
      action:      actionOverride || tmpl.action,
      btc:         btc.toFixed(8),
      userBtc:     (btc * USER_PCT).toFixed(8),
      platformBtc: (btc * PLATFORM_PCT).toFixed(8),
      hash:        _hex16(),
      ts:          new Date().toLocaleTimeString('en-US', { hour12: false }),
    };
  }

  /**
   * Emit a transaction specifically for a BTC Crusher spin result.
   * Labels it with the block height and emitted channel.
   *
   * @param {{ height, channel }} spinResult
   * @returns {Object}
   */
  function emitCrush(spinResult) {
    const label = `Block #${spinResult.height.toLocaleString()} → ${spinResult.channel.emoji} ${spinResult.channel.label}`;
    return emit(label);
  }

  /** Current session totals. */
  function getTotals() {
    return {
      total:        sessionTotal.toFixed(8),
      userTotal:    (sessionTotal * USER_PCT).toFixed(8),
      platformTotal:(sessionTotal * PLATFORM_PCT).toFixed(8),
    };
  }

  function getTickerItems()  { return TICKER_ITEMS; }
  function reset()           { sessionTotal = 0; }

  return {
    emit,
    emitCrush,
    getTotals,
    getTickerItems,
    USER_PCT,
    PLATFORM_PCT,
    reset,
  };
})();

// CommonJS compat for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BtcHarvester;
}
