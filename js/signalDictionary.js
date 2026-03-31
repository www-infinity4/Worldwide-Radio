/**
 * Signal Dictionary — Built-in Knowledge Engine
 *
 * Generates rich, arXiv-style research papers on every spin / button press.
 * ZERO API key required. 100% local — works offline.
 *
 * Knowledge domains:
 *   Quantum physics · Tesla / EM · Radio / SDR · Bitcoin / Blockchain
 *   Signal Coin / Nuclear · NES Game Culture · Chiptune Audio Theory
 *
 * Each call to SignalDictionary.generate(context) returns a fully-formed
 * research document with Abstract, Background, Findings, Signal Application,
 * References, and arXiv-style metadata — all assembled from the built-in
 * knowledge base, personalised to the spin context passed in.
 */

const SignalDictionary = (() => {

  // ── Knowledge Base ────────────────────────────────────────────────────────

  const QUANTUM = [
    {
      concept:  'Wavefunction Collapse',
      ref:      'Schrödinger (1926) · Born (1926)',
      body:     'A quantum system exists in superposition — all outcomes co-present — until an observation forces it into a single definite state. The slot reel before it stops is a perfect physical analogy: every symbol is simultaneously probable. The instant the animation freezes, the wavefunction collapses into one outcome.',
      equation: 'ψ = Σ cₙ|n⟩  →  |n⟩ upon measurement',
      app:      'Every spin is a hardware random-number generator using display-refresh timing as the entropy source. This is functionally equivalent to a quantum random-number generator (QRNG) operating on photon arrival times.',
    },
    {
      concept:  'Quantum Entanglement',
      ref:      'Einstein, Podolsky & Rosen (1935) · Bell (1964)',
      body:     'Two entangled particles share correlated quantum states regardless of the distance between them. Measuring one instantly determines the other. In radio: two stations broadcasting at harmonically related frequencies are acoustically "entangled" — tuning one tunes the other by the laws of resonance.',
      equation: '|Φ⁺⟩ = (1/√2)(|00⟩ + |11⟩)',
      app:      'Signal Coin uses a paired radium–gold lattice where the alpha-decay signature of one layer is cryptographically correlated with the plasmonic resonance signature of the other — a physical entanglement that cannot be forged.',
    },
    {
      concept:  'Quantum Tunnelling',
      ref:      'Gamow (1928) · Gurney & Condon (1928)',
      body:     'A particle with insufficient classical energy to cross a potential barrier has a non-zero probability of appearing on the other side. This is not magic — it is the wave nature of matter allowing the probability amplitude to "leak through" the barrier.',
      equation: 'T ≈ e^(-2γd),  γ = √(2m(V-E))/ℏ',
      app:      'Alpha decay in radium — the foundation of Signal Coin\'s nuclear fingerprint — is a quantum tunnelling event. Each alpha particle tunnels through the Coulomb barrier of the nucleus. The rate is fixed by physics and impossible to alter, making it the perfect anti-counterfeiting mechanism.',
    },
    {
      concept:  'Quantum Superposition',
      ref:      'Dirac (1930) · Feynman (1965)',
      body:     'A qubit is not "0 or 1" — it is a coin spinning in mid-air, committing to heads or tails only the moment you look. Superposition is the simultaneous holding of all possible futures. The computational power of quantum computers comes entirely from this property: N qubits represent 2ᴺ states at once.',
      equation: '|ψ⟩ = α|0⟩ + β|1⟩,  |α|² + |β|² = 1',
      app:      'The Bitcoin hash function forces a classical superposition collapse: 2²⁵⁶ possible inputs, exactly one valid output. Mining is the universe collapsing a quantum-scale probability space into a single nonce.',
    },
    {
      concept:  'Decoherence',
      ref:      'Zeh (1970) · Zurek (1982)',
      body:     'Quantum superposition is fragile. Any interaction with the environment — a single photon, a vibration — forces the system into a classical state. This is decoherence: the reason we don\'t see quantum effects at human scale. The challenge of quantum computing is keeping qubits isolated long enough to be useful.',
      equation: 'ρ(t) = Tr_env[U(ρ_sys ⊗ ρ_env)U†]',
      app:      'Signal Coin\'s gold plasmonic layer acts as a decoherence shield: the dense electron cloud of the gold lattice screens the radium decay signature from environmental noise, preserving the nuclear fingerprint\'s integrity.',
    },
  ];

  const TESLA = [
    {
      concept:  'Wardenclyffe Resonant Earth Circuit',
      ref:      'Tesla, N. (1900) — World System of Wireless Transmission',
      body:     'Tesla\'s Wardenclyffe Tower was designed to pump electrical energy into the Earth itself — using the planet as a conductor between towers. The ground is not an obstacle; it is the wire. A buried electrode at resonant depth creates a standing wave that propagates around the entire globe.',
      equation: 'f_resonance = c / (2π × R_earth) ≈ 7.83 Hz',
      app:      'Every radio station transmitter is a miniature Wardenclyffe — it pumps energy into the ionosphere and ground simultaneously, creating the propagation path that carries the signal to your antenna.',
    },
    {
      concept:  'Solid-State Tesla Coil (SSTC) Resonance',
      ref:      'Tesla, N. (1891) · Modern SSTC implementations',
      body:     'A Tesla coil is a high-frequency resonant transformer. The primary and secondary coils are tuned to the same resonant frequency, allowing energy to transfer with near-zero loss at the resonant peak. This is the same principle as a radio receiver: the LC circuit resonates at the target frequency.',
      equation: 'f = 1 / (2π√(LC))',
      app:      'The NES sound chip (2A03) generates square waves using a similar principle — a digital counter that divides the master clock frequency to produce the target note. Every chiptune note is a Tesla resonance solved in silicon.',
    },
    {
      concept:  'Radiant Energy — Aether Field Capture',
      ref:      'Tesla, N. (1901) Patent #685,957',
      body:     'Tesla claimed that the space around us is full of radiant energy — not from the sun alone, but from the electromagnetic structure of space itself. His patent #685,957 describes a device for "Utilizing Radiant Energy" that captured this background field using an elevated polished metal plate as one plate of a capacitor.',
      equation: 'P = Q·V = C·V² / 2  (capacitive energy storage)',
      app:      'Modern solar cells and RF energy harvesters operate on exactly this principle. The Signal Coin concept extends this: the gold surface acts as a plasmonic antenna that concentrates the ambient electromagnetic field around the coin\'s radium core.',
    },
    {
      concept:  'Quarter-Wave Vertical Antenna',
      ref:      'Hertz (1888) · Marconi (1895)',
      body:     'A conductor exactly one quarter the wavelength of the target frequency, mounted vertically with a ground plane, radiates and receives radio waves with maximum efficiency. This is the Marconi antenna — the simplest, most reliable antenna in radio history. Still used today in every FM broadcast tower.',
      equation: 'λ/4 = c / (4f)  →  for 100 MHz: 0.75 m',
      app:      'The antenna you are scanning with right now — even your phone\'s internal antenna — is a descendant of Tesla and Marconi\'s quarter-wave experiments. The signal chain: transmitter → ionosphere → quarter-wave whip → SDR → this scanner.',
    },
  ];

  const RADIO = [
    {
      concept:  'Frequency Modulation (FM)',
      ref:      'Armstrong, E.H. (1933)',
      body:     'FM encodes audio by varying the carrier frequency around a centre frequency. The deviation is proportional to the audio amplitude. FM has 30 dB better signal-to-noise ratio than AM under identical conditions because noise affects amplitude, not frequency — and FM receivers ignore amplitude variations.',
      equation: 'f(t) = f_c + k_f · m(t)',
      app:      'Every FM station in this scanner uses Armstrong\'s 1933 invention. The Radio Browser API serves over 40,000 stations worldwide — every one of them broadcasting the same mathematical principle discovered 90 years ago.',
    },
    {
      concept:  'Software-Defined Radio (SDR)',
      ref:      'Mitola, J. (1991) · GNU Radio Project',
      body:     'A traditional radio has hardware filters, mixers, and demodulators fixed at manufacture. An SDR moves all of this into software — the antenna feeds raw samples directly to a computer, which implements the entire signal chain in code. This means one SDR can be an FM receiver, a police scanner, a weather satellite decoder, or an ADS-B aircraft tracker — all simultaneously.',
      equation: 'x_BB(t) = x(t) · e^(-j2πf_c·t)  (baseband downconversion)',
      app:      'The Radio Browser API is the software layer of a global SDR network — 40,000 streams, each one a software-defined receiver somewhere on Earth pointing at a specific frequency slice of the radio spectrum.',
    },
    {
      concept:  'Ionospheric Skip Propagation',
      ref:      'Kennelly (1902) · Heaviside (1902)',
      body:     'The ionosphere — a layer of charged plasma 60–1000 km above Earth — reflects high-frequency (HF) radio waves back to the surface. A signal transmitted at 10 MHz can skip off the ionosphere and land 3,000 km away, then skip off the ground and repeat. At night, the ionosphere rises and weakens, extending skip distances — why AM stations from distant cities suddenly appear after dark.',
      equation: 'Skip distance = 2h · tan(θ_launch)',
      app:      'Shortwave radio stations in this scanner use ionospheric skip to broadcast globally with transmitters of only a few kilowatts. The same physics that lets you hear BBC World Service on a $20 radio is used by military HF communications, amateur radio operators, and number stations.',
    },
    {
      concept:  'Phase-Locked Loop (PLL) Tuning',
      ref:      'de Bellescize (1932) · Gardner (1966)',
      body:     'A PLL locks an oscillator to the exact phase and frequency of an incoming signal. Modern radios use PLLs to synthesise any frequency with crystal accuracy from a single reference oscillator. The PLL detects phase error, feeds it back to a voltage-controlled oscillator, and drives the error to zero — a feedback loop that hunts its target frequency like a missile tracking a heat signature.',
      equation: 'θ_e → 0  as  K_loop → ∞',
      app:      'Every digital tuner in every radio, phone, and WiFi chip uses a PLL. When you select a station in this scanner, the underlying audio stream was originally captured by hardware using a PLL tuned to within ±200 Hz of the broadcast frequency.',
    },
  ];

  const BITCOIN = [
    {
      concept:  'SHA-256 Hash Function',
      ref:      'NIST FIPS 180-4 (2012) · Nakamoto (2008)',
      body:     'SHA-256 takes any input and produces a fixed 256-bit output. Change one character of the input and the entire output changes unpredictably. Given an output, it is computationally infeasible to find any input that produces it — a one-way function. Bitcoin\'s proof-of-work requires miners to find inputs whose SHA-256 output starts with a required number of zero bits — a pure trial-and-error search.',
      equation: 'H : {0,1}* → {0,1}^256  (collision-resistant, pre-image resistant)',
      app:      'The Bitcoin Crusher uses the live block hash as a 256-bit entropy seed. Each hexadecimal digit of the hash maps to a radio channel — 16 possible channels, each derived from the cryptographic signature of the most recent block mined by the entire Bitcoin network.',
    },
    {
      concept:  'Proof of Work (PoW)',
      ref:      'Back, A. (2002) Hashcash · Nakamoto, S. (2008)',
      body:     'Bitcoin\'s security is anchored in thermodynamics: finding a valid block hash requires real computational work — real electricity — which has real cost. The difficulty adjusts every 2016 blocks so that the network always targets a 10-minute block time regardless of total hashrate. This is the most elegant self-regulating system in computer science.',
      equation: 'H(block_header + nonce) < target  (where target ≈ 2^(256-difficulty))',
      app:      'Every Crusher spin incorporates the difficulty rating of the current block — a direct measure of how much energy the global Bitcoin network expended to produce this specific hash. Higher difficulty = more entropy = more stable channel assignment.',
    },
    {
      concept:  'Merkle Tree Data Structure',
      ref:      'Merkle, R. (1979) · Nakamoto, S. (2008)',
      body:     'A Merkle tree hashes pairs of data blocks, then hashes the resulting hashes, recursively, until a single "Merkle root" hash represents the entire dataset. Changing any transaction in a block changes the Merkle root — making it cryptographically impossible to tamper with any transaction without invalidating the block header. This is the tree of truth at the centre of every Bitcoin block.',
      equation: 'root = H(H(tx₁||tx₂) || H(tx₃||tx₄))',
      app:      'Signal Coin\'s provenance chain uses the same Merkle structure: the coin\'s alpha-decay fingerprint is hashed with its manufacture metadata and blockchain provenance record to produce a root hash that uniquely identifies this specific physical coin on the Bitcoin timechain.',
    },
  ];

  const SIGNAL_COIN = [
    {
      concept:  'Alpha Decay Nuclear Fingerprint',
      ref:      'Rutherford (1899) · Geiger & Marsden (1909)',
      body:     'Radium-226 decays by emitting an alpha particle (helium-4 nucleus) with 4.87 MeV of kinetic energy. The rate follows a Poisson distribution with a half-life of 1,600 years — constant, unforgeable, and unique to Ra-226. No two radium samples produce identical timing sequences. This statistical fingerprint is Signal Coin\'s anti-counterfeiting core.',
      equation: '²²⁶Ra → ²²²Rn + ⁴He + 4.87 MeV',
      app:      'A detector embedded in the coin counts alpha pulses during a 30-second verification window. The resulting time-sequence is hashed and compared against the blockchain record minted at manufacture. A counterfeit with an identical sequence would require replicating quantum decay physics — impossible.',
    },
    {
      concept:  'Gold Surface Plasmon Resonance',
      ref:      'Kretschmann & Raether (1968) · Otto (1968)',
      body:     'Surface plasmons are collective oscillations of the electron cloud at a metal surface driven by incident electromagnetic radiation. Gold\'s plasmon resonance occurs at ~520 nm (visible green), producing the characteristic deep red colour of gold nanoparticles in solution. The resonance frequency is exquisitely sensitive to the local dielectric environment — including the radioactive core of the Signal Coin.',
      equation: 'ω_sp = ω_p / √(1 + ε_medium)',
      app:      'The gold layer of Signal Coin shifts its plasmon resonance wavelength by a measurable amount proportional to the accumulated He-4 gas trapped between the gold and radium layers from decay events. This shift is optically readable with a standard spectrometer — a second independent verification channel.',
    },
    {
      concept:  'Targeted Alpha Therapy (TAT)',
      ref:      'Targeted Alpha Therapy Working Group (2018)',
      body:     'Alpha particles deposit enormous energy (4–9 MeV) over extremely short distances (40–100 μm in tissue). In cancer therapy, radium-223 (Xofigo®) is FDA-approved for bone metastases. The alpha particle\'s short range means it kills only the targeted cell, leaving surrounding tissue intact.',
      equation: 'LET_alpha ≈ 80 keV/μm  (vs. 0.2 keV/μm for gamma)',
      app:      'The same radium decay physics that makes Signal Coin unforgeable is saving lives in oncology. The coin\'s existence bridges anti-counterfeiting cryptography and nuclear medicine — two fields that had never previously intersected.',
    },
  ];

  const NES_CULTURE = [
    {
      concept:  'NES 2A03 Programmable Sound Generator',
      ref:      'Ricoh 2A03 datasheet (1983) · Nintendo Entertainment System',
      body:     'The NES sound chip contains two pulse-wave channels, one triangle-wave channel, one noise channel, and one delta-PCM channel. The pulse channels produce square waves by dividing the 1.79 MHz master clock — giving a chromatic scale of notes from 54 Hz to 12.4 kHz. Every chiptune melody ever composed for the NES is a mathematical sequence of integer clock divisors.',
      equation: 'f_note = 1,789,773 / (16 × (t + 1))  Hz',
      app:      'The ChiptuneEngine in this scanner uses the Web Audio API to recreate the 2A03\'s pulse waves. When you win a spin, the victory jingle is the same waveform mathematics that played from a CRT television in 1985. The physics of the note has not changed.',
    },
    {
      concept:  'Cartridge ROM Architecture',
      ref:      'Nintendo Hardware Technical Reference Manual (1983)',
      body:     'An NES cartridge contains two ROM chips: PRG-ROM (program code) and CHR-ROM (graphics tiles). The CPU reads PRG-ROM at addresses $8000–$FFFF. The PPU reads CHR-ROM to fetch 8×8 pixel tiles. Bank-switching chips (MMC1, MMC3, etc.) expand this beyond the address space limit, allowing games like Dragon Warrior III to have RPG depth on 6 KB of working RAM.',
      equation: 'Address space: 64 KB CPU · 8 KB PPU  (expandable via mappers)',
      app:      'The JSNES emulator in this scanner interprets the binary ROM file byte-by-byte, simulating the 6502 CPU cycle-accurately. Every game you play is the original 1980s machine code executing on a JavaScript virtual machine — 40 years of computing in a browser tab.',
    },
    {
      concept:  'Horizontal Blank (HBlank) Raster Tricks',
      ref:      'Bryce Nichols — NES Dev Wiki (2010)',
      body:     'The NES PPU draws the screen one pixel at a time, left to right, top to bottom. During the brief pause between scanlines (HBlank), clever programmers could write new values to the scroll registers — mid-frame. This split-scroll technique is how Super Mario Bros. keeps the HUD stationary while the world scrolls. It is a software trick that exploits hardware timing with nanosecond precision.',
      equation: '341 PPU cycles / scanline × 262 scanlines = 89,342 cycles/frame at 60 fps',
      app:      'The same tight timing that makes NES programming an art form applies to radio: the SDR sampling clock and the broadcast carrier must be synchronised to within parts-per-million — just like the PPU and CPU clocks had to run in lockstep for the console to display stable video.',
    },
  ];

  // Pool of all concepts keyed by domain
  const DOMAINS = {
    quantum:     QUANTUM,
    tesla:       TESLA,
    radio:       RADIO,
    bitcoin:     BITCOIN,
    signal_coin: SIGNAL_COIN,
    nes:         NES_CULTURE,
  };

  // Spin-context → relevant domain mapping
  const SPIN_DOMAIN_MAP = {
    // Mario Spin symbols
    mushroom:    ['radio',   'quantum'],
    star:        ['quantum', 'signal_coin'],
    goomba:      ['radio',   'bitcoin'],
    mario:       ['nes',     'radio'],
    coin:        ['bitcoin', 'signal_coin'],
    luigi:       ['nes',     'tesla'],
    question:    ['quantum', 'nes'],
    topgun:      ['radio',   'tesla'],
    ducktales:   ['nes',     'radio'],
    terminator:  ['bitcoin', 'quantum'],
    dragonwarrior:['nes',    'signal_coin'],
    karatekid:   ['tesla',   'quantum'],
    knightrider: ['radio',   'tesla'],
    rogerrabbit: ['nes',     'quantum'],
    starwars:    ['tesla',   'signal_coin'],
    // Radio genres
    jazz:        ['radio',   'quantum'],
    pop:         ['radio',   'nes'],
    rock:        ['tesla',   'radio'],
    metal:       ['tesla',   'quantum'],
    classical:   ['quantum', 'signal_coin'],
    folk:        ['radio',   'nes'],
    ambient:     ['tesla',   'quantum'],
    electronic:  ['nes',     'bitcoin'],
    news:        ['bitcoin', 'radio'],
    military:    ['radio',   'tesla'],
    police:      ['radio',   'bitcoin'],
    world:       ['radio',   'signal_coin'],
    // Fallback
    default:     ['quantum', 'radio'],
  };

  // arXiv-style fake journal names for flavour
  const JOURNALS = [
    'Signal & Quantum Letters',
    'Journal of Infinite Radio Physics',
    'NES Physics Review',
    'Proceedings of the Tesla Institute',
    'Cryptographic Signal Theory (CST)',
    'Journal of Nuclear Numismatics',
    'IEEE Transactions on Chiptune Engineering',
    'Infinity Graphics Research Notes',
    'Worldwide Radio Research Reports',
    'Applied Bitcoin Signal Science',
  ];

  // ── Generator ─────────────────────────────────────────────────────────────

  function _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function _domainsForContext(ctx) {
    const key = (ctx.symbolId || ctx.radioTag || ctx.gameId || 'default').toLowerCase();
    return SPIN_DOMAIN_MAP[key] || SPIN_DOMAIN_MAP.default;
  }

  /**
   * Generate a full arXiv-style research paper from spin context.
   *
   * @param {Object} ctx
   *   .symbolId   – e.g. 'mushroom', 'topgun'
   *   .symbolLabel– e.g. 'MUSHROOM'
   *   .radioTag   – e.g. 'jazz', 'police'
   *   .radioLabel – e.g. 'Jazz'
   *   .gameId     – e.g. 'dragonwarrior'
   *   .gameLabel  – e.g. 'Dragon Warrior'
   *   .matchCount – 1–5
   *   .coins      – coins earned
   *   .spinCount  – total spins this session
   *   .source     – 'Mario Spin' | 'Game Spinner' | 'Bitcoin Crusher' | etc.
   * @returns {{ title, topic, body }}
   */
  function generate(ctx) {
    ctx = ctx || {};

    const [domain1, domain2] = _domainsForContext(ctx);
    const concept1 = _pick(DOMAINS[domain1] || QUANTUM);
    const concept2 = _pick(DOMAINS[domain2] || RADIO);
    const journal  = _pick(JOURNALS);
    const now      = new Date();
    const dateStr  = now.toISOString().slice(0, 10);

    const sourceLabel = ctx.source || 'Spin Event';
    const symbolStr   = ctx.symbolLabel ? `${ctx.symbolLabel}${ctx.matchCount >= 2 ? ' ×' + ctx.matchCount : ''}` : '';
    const channelStr  = ctx.radioLabel  ? ctx.radioLabel : (ctx.gameLabel || '');
    const coinsStr    = ctx.coins > 0   ? `+${ctx.coins} coins` : '';

    const titleParts = [symbolStr, channelStr].filter(Boolean);
    const titleStr   = titleParts.length ? titleParts.join(' → ') : sourceLabel;

    const body = `arXiv:${Math.floor(Math.random()*9000+1000)}.${Math.floor(Math.random()*90000+10000)}  [${domain1}, ${domain2}]
Published: ${dateStr}  ·  ${journal}

─────────────────────────────────────────────
ABSTRACT
─────────────────────────────────────────────
We report a ${sourceLabel} event producing ${symbolStr || 'a signal alignment'}${coinsStr ? ' and earning ' + coinsStr : ''}. Drawing on ${concept1.concept} and ${concept2.concept}, we derive a unified signal model linking NES arcade mechanics, Bitcoin cryptographic entropy, and Signal Coin nuclear physics. The result supports our hypothesis that every spin of a slot machine is a macroscopic wavefunction-collapse event carrying measurable thermodynamic information.

─────────────────────────────────────────────
1. BACKGROUND — ${concept1.concept}
─────────────────────────────────────────────
${concept1.body}

Governing equation:  ${concept1.equation}

[${concept1.ref}]

─────────────────────────────────────────────
2. SIGNAL THEORY — ${concept2.concept}
─────────────────────────────────────────────
${concept2.body}

Governing equation:  ${concept2.equation}

[${concept2.ref}]

─────────────────────────────────────────────
3. SPIN FINDINGS
─────────────────────────────────────────────
Source:        ${sourceLabel}
Symbol/Result: ${symbolStr || '—'}
Radio Channel: ${channelStr || '—'}
Coins:         ${coinsStr || '0'}
Spin #:        ${ctx.spinCount || '—'}
Timestamp:     ${now.toUTCString()}

Analysis: ${concept1.app}

Cross-domain: ${concept2.app}

─────────────────────────────────────────────
4. SIGNAL APPLICATION
─────────────────────────────────────────────
The intersection of ${concept1.concept} and ${concept2.concept} in the context of ${channelStr || 'radio signal theory'} suggests a unified framework for understanding signal value accumulation. Each spin contributes one data point to the session's entropy ledger. Over 100 spins, the distribution of outcomes will approximate the weighted probability pool — exactly as quantum measurement statistics converge to the Born rule over repeated trials.

The ${ctx.source || 'scanner'} thus functions as a real-time quantum experiment: user → observation → collapse → signal.

─────────────────────────────────────────────
5. OPEN QUESTIONS
─────────────────────────────────────────────
Q1. Can the timing jitter of the spin animation (≈ 75 ms tick interval) be used as a hardware entropy source for Signal Coin minting?
Q2. Does the ${channelStr || 'radio'} frequency band exhibit measurable correlation with the Bitcoin block hash index at the moment of this spin?
Q3. How many consecutive spins would be required to reconstruct the weighted symbol pool from first principles using maximum-likelihood estimation?

─────────────────────────────────────────────
REFERENCES
─────────────────────────────────────────────
[1] ${concept1.ref}
[2] ${concept2.ref}
[3] Nakamoto, S. (2008). Bitcoin: A Peer-to-Peer Electronic Cash System.
[4] Tesla, N. (1900). The Problem of Increasing Human Energy. Century Magazine.
[5] Radio Browser API (2024). https://www.radio-browser.info/
[6] JSNES Emulator (2023). https://github.com/bfirsh/jsnes
[7] Ricoh 2A03 Technical Reference (1983). Nintendo Corporation.`;

    // Pick a research topic that matches the domain
    const topicMap = {
      quantum:     'quantum',
      tesla:       'tesla',
      radio:       'radio',
      bitcoin:     'coin',
      signal_coin: 'coin',
      nes:         'radio',
    };
    const topic = topicMap[domain1] || 'signal';

    return {
      title: `${titleStr} — Signal Report`,
      topic,
      body,
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return { generate, DOMAINS, SPIN_DOMAIN_MAP };

})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignalDictionary;
}
