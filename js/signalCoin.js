/**
 * Signal Coin — Nuclear Fingerprint & 7-Mode Signal Analyzer
 *
 * The coin being studied: a conceptual gold-shelled, radium-core token
 * whose nuclear decay produces a unique, persistent multi-spectrum signal
 * fingerprint. Here the BTC block hash serves as the entropy source —
 * analogous to the uniqueness of a nuclear decay chain.
 *
 * Process (mirrors the physical coin):
 *   BTC hash arrives  →  squashed through entropy engine  →  frequency emitted
 *   (nuclear decay)       (gold plasmonic compression)        (signal output)
 *
 * Seven signal modes are derived from successive 8-hex-char blocks of
 * the hash, each mapped to a real physical emission mechanism.
 */

const SignalCoin = (() => {

  const MODES = [
    {
      id:    'fingerprint',
      emoji: '🔬',
      label: 'Nuclear Fingerprint',
      desc:  'Gamma/X-ray spectrum — unique decay chain provenance beacon',
      unit:  'keV',
      color: '#00d4ff',
    },
    {
      id:    'pulse',
      emoji: '📡',
      label: 'Pulse Tracker',
      desc:  'Modulated surface plasmon EM pulse — non-contact ID signal',
      unit:  'kHz',
      color: '#7b5cfa',
    },
    {
      id:    'therapy',
      emoji: '💊',
      label: 'Therapy Signal',
      desc:  'Localised alpha-energy delivery — apothecary mode (Ra-223)',
      unit:  'mGy',
      color: '#ff6b9d',
    },
    {
      id:    'sensor',
      emoji: '⚗️',
      label: 'Sensor Array',
      desc:  'Gold-palladium hybrid detector — metal purity verification',
      unit:  'nA',
      color: '#ffd166',
    },
    {
      id:    'evolution',
      emoji: '🧬',
      label: 'Metal Evolution',
      desc:  'Radiolysis electrodeposition — adaptive nanostructure growth',
      unit:  'nm/h',
      color: '#06d6a0',
    },
    {
      id:    'thermal',
      emoji: '🌡️',
      label: 'Thermal / IR',
      desc:  'Decay heat + plasmonic boost — IR emission spectrum (Au Z=79)',
      unit:  'nm',
      color: '#f4a261',
    },
    {
      id:    'emp',
      emoji: '⚡',
      label: 'EM Pulse',
      desc:  'Transient magnetic micro-pulse — TMS-inspired signal therapy',
      unit:  'μT',
      color: '#ef233c',
    },
  ];

  // ── Frequency ranges per mode (physical analogues) ────────────────────────
  const FREQ_RANGES = {
    fingerprint: [10,    1460  ],   // keV — characteristic X-ray window
    pulse:       [100,   900   ],   // kHz — EM pulse modulation band
    therapy:     [0.1,   8.0   ],   // mGy — localised dose
    sensor:      [0.01,  2.50  ],   // nA  — detector current
    evolution:   [0.01,  1.20  ],   // nm/h — nanostructure growth rate
    thermal:     [780,   2500  ],   // nm  — near-IR to mid-IR
    emp:         [0.1,   50.0  ],   // μT  — micro-pulse field strength
  };

  /**
   * Derive a full signal profile from a 64-char BTC block hash.
   *
   * The hash is "squashed" through the entropy engine:
   *   Each 8-hex-char slice  →  parseInt(16)  →  normalised 0–100 strength
   *
   * This mirrors the coin: the incoming decay energy (hash) is compressed
   * through the gold shell (entropy function) and emits seven frequency
   * outputs (the signal modes).
   *
   * @param {string} hash    – 64-char hex BTC block hash
   * @param {number} height  – block height
   * @returns {Object|null}
   */
  function analyze(hash, height) {
    if (!hash || hash.length < 56) return null;

    const modes = MODES.map((mode, i) => {
      const slice    = hash.slice(i * 8, i * 8 + 8);
      const raw      = parseInt(slice, 16);
      const strength = Math.round((raw / 0xFFFFFFFF) * 100);
      const reading  = _deriveReading(raw, mode.id);
      return { ...mode, strength, reading, active: strength > 25 };
    });

    // Coin fingerprint: first 8 + last 8 hex chars of hash
    const coinId    = hash.slice(0, 8).toUpperCase() + '…' + hash.slice(-8).toUpperCase();
    const dominant  = modes.reduce((a, b) => a.strength > b.strength ? a : b);
    const composite = Math.round(modes.reduce((s, m) => s + m.strength, 0) / modes.length);

    return { coinId, height, hash, modes, dominant, composite };
  }

  function _deriveReading(raw, modeId) {
    const norm = raw / 0xFFFFFFFF;
    const [min, max] = FREQ_RANGES[modeId] || [0, 100];
    return (min + norm * (max - min)).toFixed(2);
  }

  return { analyze, MODES };
})();

// CommonJS compat for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignalCoin;
}
