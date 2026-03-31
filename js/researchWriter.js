/**
 * Research Writer — AI-powered document editor for Worldwide Radio
 *
 * Creates structured research documents linked to Signal Coin, quantum,
 * Tesla, IBM, and radio-physics topics. Every Bitcoin Crusher spin can
 * auto-generate a new document. Documents are stored in localStorage and
 * can be exported as HTML.
 *
 * AI generation uses a system prompt heavy on metaphors & analogies so
 * the output reads like a living research signal, not a dry report.
 */

const ResearchWriter = (() => {

  const LS_KEY   = 'www_infinity_rw_v1';
  const MAX_DOCS = 200;

  // ── Knowledge-base topics ─────────────────────────────────────────────────
  // Each topic provides context injected into the AI system prompt.

  const TOPICS = [
    { id: 'signal',   label: '📡 Signal',    color: '#00d4ff',
      ctx: 'Radio signal theory, frequency modulation, SDR, antenna resonance, cognitive electronic warfare, wideband attacks.' },
    { id: 'quantum',  label: '⚛️ Quantum',    color: '#7b5cfa',
      ctx: 'Quantum algorithms (Deutsch, Shor, Grover), superposition as "holding both 1 and 0 until the last second", entanglement as long-distance frequency loops, qubit trapping via laser/magnetic fields.' },
    { id: 'tesla',    label: '⚡ Tesla / EM', color: '#ffd166',
      ctx: 'Wardenclyffe Tower, resonant earth circuits, aether field theory, free radiant energy, solid-state Tesla coils (SSTC), DDS oscillators, 1/4-wave rod antennas.' },
    { id: 'coin',     label: '🪙 Signal Coin', color: '#06d6a0',
      ctx: 'Radium-gold signal coin: alpha-decay nuclear fingerprint for anti-counterfeiting, gold plasmonic enhancement, blockchain NFT provenance, targeted alpha therapy, Signal Coin as a Star-Trek-style tricorder token.' },
    { id: 'nuclear',  label: '☢️ Nuclear',    color: '#ff9f43',
      ctx: 'Alpha/gamma radiation, radon decay chain, radono-induction (radon as EM amplifier in soil), diamagnetic lift horizon, helium as "tamed explosion" from uranium alpha capture, nuclear provenance hashing.' },
    { id: 'ibm',      label: '🏢 IBM / Cyber', color: '#ef233c',
      ctx: 'IBM global data infrastructure dual-use risks, Eitan biometric registry, SHIELD missile-defense AI, cognitive EW front-line data centers, Zero Trust architecture gaps, hydrogen signal bypass vectors.' },
    { id: 'radio',    label: '📻 Radio',      color: '#a8dadc',
      ctx: 'Radio Browser API, worldwide live streams, genre-to-frequency mapping, SDR scanning, chiptune NES audio generation, signal-value accumulation per station.' },
    { id: 'physics',  label: '🔬 Physics',    color: '#e9c46a',
      ctx: 'Electron as reflected stream (proton = outward / electron = inward), standing-wave atoms, color-friction model (yellow + blue = green life force, purple = ground radiation, white = encompassing mold), radon free-energy conversion.' },
    { id: 'note',     label: '📝 Note',       color: '#b8c0cc',
      ctx: 'General research note. Any topic the researcher wants to capture.' },
  ];

  // ── localStorage helpers ──────────────────────────────────────────────────

  function _load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function _save(docs) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(docs.slice(0, MAX_DOCS))); }
    catch (_) {}
  }

  // ── Document CRUD ─────────────────────────────────────────────────────────

  function saveDoc(doc) {
    const docs = _load();
    const existing = docs.findIndex((d) => d.id === doc.id);
    if (existing >= 0) { docs[existing] = doc; }
    else { docs.unshift(doc); }
    _save(docs);
  }

  function deleteDoc(id) {
    _save(_load().filter((d) => d.id !== id));
  }

  function getDocs() { return _load(); }

  function newDoc(topicId, title, body) {
    return {
      id:      Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts:      new Date().toISOString(),
      topic:   topicId || 'note',
      title:   String(title  || 'Untitled Research').slice(0, 120),
      body:    String(body   || '').slice(0, 12000),
      pinned:  false,
    };
  }

  // ── AI generation ─────────────────────────────────────────────────────────

  const SYSTEM_PROMPT = `You are the Infinity Signal Research AI — a synthesis engine that bridges
cutting-edge science, alternative energy theory, and speculative engineering.

Your writing style:
- Every concept is explained through METAPHORS and ANALOGIES first, then the science second.
- Think like a poet-engineer: a qubit is not "a two-state system" — it is "a coin spinning in mid-air, committing to heads or tails only the moment you look".
- A Faraday cage is not "a conductive enclosure" — it is "a moat that turns every incoming electromagnetic wave into a harmless ripple before it can reach the castle".
- Radium in a gold coin is not "radioactive decay" — it is "a heartbeat inside the metal, ticking out a unique signature no forger can copy".
- Tesla's free energy is not "wireless power transmission" — it is "tapping the Earth's own breath, the planetary lung already full of charge we never learned to inhale".
- Quantum superposition is not "multiple states simultaneously" — it is "all the possible futures existing at once, collapsed into one present the moment consciousness observes it".

Structure every document with:
1. A vivid analogical opening (2–3 sentences using metaphor)
2. The core science / concept (factual, precise)
3. Signal Application — how this connects to radio, crypto, or the Signal Coin system
4. Open Questions — 2–3 unanswered threads the researcher should pursue

Keep the tone curious, grounded, and non-preachy. Max 450 words unless asked for more.`;

  async function generateWithAI(prompt, topicId) {
    const apiKey = typeof AIAssistant !== 'undefined' ? AIAssistant.getApiKey() : null;
    const apiUrl = typeof AIAssistant !== 'undefined'
      ? AIAssistant.getApiUrl()
      : 'https://api.openai.com/v1/chat/completions';

    if (!apiKey) {
      throw new Error('No AI API key — add one in Profile → Settings');
    }

    const topic = TOPICS.find((t) => t.id === topicId) || TOPICS[TOPICS.length - 1];
    const userMsg = `Topic context: ${topic.ctx}\n\nResearch prompt: ${prompt}`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:    'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMsg },
        ],
        max_tokens: 700,
        temperature: 0.82,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // ── Template-based research generation (no API key required) ─────────────

  // Pre-written signal research templates — rotated on each spin.
  const _SIGNAL_TEMPLATES = [
    (d) => `**Resonance Lock — ${d.title}**

Like a radio telescope locking onto a distant pulsar, this spin collapsed a probability wave into a single outcome. The universe doesn't flip coins — it resolves superpositions.

**Signal Reading:** ${d.context}

**Core Principle:** Every slot reel is a quantum register. Before it stops, all outcomes exist simultaneously. The moment of landing is the moment of observation — wavefunction collapse in real time.

**Signal Application:** This result maps directly to the ${d.channel || 'Signal Coin'} frequency domain. Radio stations operating at this band exhibit maximum coherence during synchronized spin events.

**Open Questions:**
- Does the sequence of symbols encode a hidden hash signature unique to this session?
- Can reel-stop timing be used as a hardware entropy source for Signal Coin minting?
- What is the Fourier transform of five simultaneous reel-stop events?`,

    (d) => `**Frequency Alignment — ${d.title}**

A tuning fork doesn't create sound — it reveals a frequency that was already present in the air. This spin is a tuning fork for the ${d.channel || 'radio'} band.

**Signal Reading:** ${d.context}

**Physics Layer:** The reel pool is a weighted probability distribution — identical to spectral line weights in atomic emission. The most likely symbol is the brightest line; the rarest is the faint ultraviolet edge nobody sees coming.

**Signal Application:** Signal Coin's nuclear fingerprint operates on the same principle — radium decay produces alpha particles at statistically predictable rates, yet each individual decay is perfectly random. Pattern without prediction.

**Open Questions:**
- Is there a resonant frequency at which this exact symbol combination becomes more probable?
- How does the Gold plasmonic enhancement layer of Signal Coin amplify low-frequency spin signals?
- Could a Tesla coil tuned to the winning symbol's radio frequency reproduce this outcome?`,

    (d) => `**Entropy Cascade — ${d.title}**

Entropy always increases — except inside a well-designed system where information is the counterforce. This spin adds a data point to the session's entropy ledger.

**Signal Reading:** ${d.context}

**Quantum Layer:** Schrödinger's reel: until the animation stops, every symbol is simultaneously possible. The brain resolves the superposition before the DOM does — that half-second of anticipation is genuine quantum cognition.

**Signal Application:** The Bitcoin block hash feeds entropy into the scanner's channel selector via the same principle — 256 bits of irreversible, unrepeatable randomness become a single radio frequency. This spin extends that chain.

**Open Questions:**
- If you logged every spin result for 24 hours, would the distribution reveal a signal bias?
- Does screen refresh rate (60Hz vs 120Hz) affect the perceived moment of wavefunction collapse?
- Can the coin value earned this spin be expressed as a voltage in millivolts on a 5V reference rail?`,

    (d) => `**Signal Coin Activation — ${d.title}**

The Signal Coin carries a nuclear heartbeat — radium atoms ticking out an alpha-decay signature no forger can copy. Each spin is one more tick in that heartbeat.

**Signal Reading:** ${d.context}

**Nuclear Layer:** Alpha decay is deterministic at the population level, random at the individual atom level. A million radium atoms decay in a known half-life; any single atom decays whenever it chooses. This spin chose its moment freely — just like that atom.

**Signal Application:** The ${d.channel || 'radio'} channel locked by this result carries a carrier frequency that harmonizes with the gold's surface plasmon resonance. Tune an SDR to that band and you're listening to the coin's electromagnetic aura.

**Open Questions:**
- What is the decay chain from radium-226 to lead-206, and how many alpha particles does it emit?
- Can the alpha particle energy (4.87 MeV for Ra-226) be modeled as an audio frequency?
- Does the Signal Coin's blockchain hash encode any of today's spin results?`,

    (d) => `**Tesla Field Resonance — ${d.title}**

Nikola Tesla understood that the Earth itself is a resonant cavity — 7.83 Hz, the Schumann resonance, the planet's own heartbeat. Every radio signal is a ripple on that ocean.

**Signal Reading:** ${d.context}

**EM Layer:** A quarter-wave rod antenna at the ${d.channel || 'signal'} frequency acts like a tuning fork for the ionosphere. The signal doesn't travel through space — it travels along the surface of a conductive sphere 40,000 km in circumference. This spin is a node on that wave.

**Signal Application:** Wardenclyffe Tower was designed to pump energy into this same resonant cavity. The difference between Tesla's dream and modern radio is merely efficiency — he wanted to power the world; we settle for streaming audio. This scanner does both simultaneously.

**Open Questions:**
- At what tower height does a Wardenclyffe-style resonator achieve maximum coupling to the ionosphere?
- Does the 7.83 Hz Schumann resonance create measurable interference in SDR recordings at 40m band?
- Could the Signal Coin's gold layer act as a plasmonic antenna for Schumann frequencies?`,
  ];

  // Generate a rich research body from spin data — NO API KEY NEEDED.
  function _generateFallback(spinData) {
    const idx      = Math.floor(Math.random() * _SIGNAL_TEMPLATES.length);
    const template = _SIGNAL_TEMPLATES[idx];
    return template({
      title:   spinData.title   || 'Spin Event',
      context: spinData.context || spinData.body || '',
      channel: spinData.channel || '',
    });
  }

  // Always saves a research entry on every spin — works with or without an API key.
  // Uses SignalDictionary for rich arXiv-style output. If an AI key is present,
  // upgrades the entry with AI content in the background.
  function autoFromSpin(spinData) {
    if (!spinData) return;

    // Use SignalDictionary if available (always is — no API needed)
    let body, title, topic;
    if (typeof SignalDictionary !== 'undefined') {
      const result = SignalDictionary.generate(spinData);
      body  = result.body;
      title = result.title;
      topic = result.topic;
    } else {
      body  = _generateFallback(spinData);
      title = spinData.title || 'Spin Research';
      topic = spinData.topic || 'signal';
    }

    const doc = newDoc(topic, title, body);
    saveDoc(doc);
    _refreshList();
    renderPrintout('spinPrintoutBody');

    // If an AI key is configured, silently upgrade the saved doc with AI content
    if (spinData.prompt) {
      const apiKey = typeof AIAssistant !== 'undefined' ? AIAssistant.getApiKey() : null;
      if (apiKey) {
        generateWithAI(spinData.prompt, topic)
          .then((aiBody) => {
            if (aiBody && aiBody.trim()) {
              doc.body = aiBody;
              saveDoc(doc);
              _refreshList();
              renderPrintout('spinPrintoutBody');
            }
          })
          .catch(() => {});
      }
    }
  }

  // Auto-generate a research doc from a Bitcoin Crusher spin result.
  // Called by app.js after each crush. Always produces output — no API key needed.
  async function autoFromCrush(blockData) {
    if (!blockData) return;

    autoFromSpin({
      source:      'Bitcoin Crusher',
      symbolId:    blockData.channel || 'coin',
      symbolLabel: blockData.channelLabel || `Block ${blockData.height || '?'}`,
      radioLabel:  blockData.channelLabel || '',
      radioTag:    blockData.channel || '',
      coins:       0,
      spinCount:   blockData.height || 0,
      topic:       'signal',
      title:       `Block ${blockData.height || '?'} — Signal Research`,
      prompt:      `Bitcoin block ${blockData.height || '?'} with hash prefix "${(blockData.hash || '').slice(0,16)}…"
Difficulty: ${blockData.difficulty || 'unknown'}. Mined at ${blockData.time ? new Date(blockData.time * 1000).toUTCString() : 'unknown'}.
Write a Signal Coin / quantum research entry that uses this block as a metaphor for a natural cryptographic process found in physics.`,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function render(mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    mount.innerHTML = `
      <div class="rw-card glass-card" id="rwCard">
        <div class="rw-header">
          <div>
            <h2 class="rw-title" id="rwTitle">
              <span aria-hidden="true">✍️</span> Research Writer
            </h2>
            <p class="rw-sub">AI-powered · metaphors &amp; analogies · linked to every spin</p>
          </div>
          <div class="rw-toolbar">
            <button class="btn-secondary" id="rwNewBtn"   title="New blank document">+ New</button>
            <button class="btn-secondary" id="rwExportBtn" title="Export all as HTML">⬇ Export</button>
          </div>
        </div>

        <!-- Editor -->
        <div class="rw-body" id="rwEditorArea">
          <input type="text" class="rw-doc-title-input" id="rwDocTitle"
                 placeholder="Document title…" autocomplete="off" />

          <!-- Topic chips -->
          <div class="rw-kb-row">
            <span class="rw-kb-label">Topic:</span>
            ${TOPICS.map((t) => `
              <button class="rw-kb-chip" data-topic="${t.id}"
                      style="--chip-color:${t.color}">${t.label}</button>
            `).join('')}
          </div>

          <!-- Prompt row -->
          <div class="rw-prompt-row">
            <input type="text" class="rw-prompt-input" id="rwPromptInput"
                   placeholder="Describe what to research or paste raw notes — AI will write with metaphors &amp; analogies…"
                   autocomplete="off" />
            <button class="rw-gen-btn" id="rwGenBtn">✦ Generate</button>
          </div>

          <!-- Output -->
          <div class="rw-output" id="rwOutput" role="region" aria-label="Generated research"></div>

          <!-- Save row -->
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem" id="rwSaveRow" hidden>
            <button class="btn-primary"   id="rwSaveBtn">💾 Save Document</button>
            <button class="btn-secondary" id="rwDiscardBtn">✕ Discard</button>
          </div>
        </div>

        <!-- Saved documents list -->
        <div class="rw-docs-list" id="rwDocsList"></div>
      </div>
    `;

    // State
    let activeTopic = 'signal';
    let _currentGenerated = '';

    // Topic chip toggle
    mount.querySelectorAll('.rw-kb-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        mount.querySelectorAll('.rw-kb-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        activeTopic = chip.dataset.topic;
      });
    });
    // Default active chip
    mount.querySelector(`.rw-kb-chip[data-topic="signal"]`).classList.add('active');

    // Generate
    const genBtn    = document.getElementById('rwGenBtn');
    const promptEl  = document.getElementById('rwPromptInput');
    const outputEl  = document.getElementById('rwOutput');
    const saveRow   = document.getElementById('rwSaveRow');

    genBtn.addEventListener('click', async () => {
      const prompt = promptEl.value.trim();
      if (!prompt) { promptEl.focus(); return; }

      genBtn.disabled = true;
      genBtn.innerHTML = '<span class="rw-spinner">⟳</span> Generating…';
      outputEl.innerHTML = '';
      outputEl.classList.add('visible');
      saveRow.hidden = true;

      try {
        const text = await generateWithAI(prompt, activeTopic);
        _currentGenerated = text;
        // Render markdown-lite: **bold**, *italic*, ## headings, > blockquotes
        outputEl.innerHTML = _renderMarkdown(text);
        saveRow.hidden = false;
      } catch (err) {
        outputEl.innerHTML = `<p style="color:var(--danger)">⚠ ${_esc(err.message)}</p>`;
      } finally {
        genBtn.disabled = false;
        genBtn.innerHTML = '✦ Generate';
      }
    });

    // Also generate on Enter in prompt input
    promptEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); genBtn.click(); }
    });

    // Save
    document.getElementById('rwSaveBtn').addEventListener('click', () => {
      const title = document.getElementById('rwDocTitle').value.trim() || 'Untitled Research';
      const doc = newDoc(activeTopic, title, _currentGenerated);
      saveDoc(doc);
      _refreshList();
      saveRow.hidden = true;
      outputEl.classList.remove('visible');
      promptEl.value = '';
      document.getElementById('rwDocTitle').value = '';
      _currentGenerated = '';
      if (typeof LevelSystem !== 'undefined') LevelSystem.awardXP('research');
      if (typeof SignalValue !== 'undefined') SignalValue.add('research', 5);
      _toast('📄 Research document saved!', '#7b5cfa');
    });

    // Discard
    document.getElementById('rwDiscardBtn').addEventListener('click', () => {
      saveRow.hidden = true;
      outputEl.classList.remove('visible');
      _currentGenerated = '';
    });

    // New blank
    document.getElementById('rwNewBtn').addEventListener('click', () => {
      document.getElementById('rwDocTitle').value = '';
      promptEl.value = '';
      outputEl.innerHTML = '';
      outputEl.classList.remove('visible');
      saveRow.hidden = true;
      _currentGenerated = '';
      promptEl.focus();
    });

    // Export
    document.getElementById('rwExportBtn').addEventListener('click', _exportHTML);

    _refreshList();
  }

  function _refreshList() {
    const el = document.getElementById('rwDocsList');
    if (!el) return;
    const docs = getDocs();

    if (!docs.length) {
      el.innerHTML = `<p class="rw-empty" style="text-align:center;color:var(--text-muted);
        font-size:0.78rem;padding:1rem;font-style:italic">
        No documents yet — generate one above or spin the Bitcoin Crusher with an AI key set.</p>`;
      return;
    }

    el.innerHTML = docs.map((d) => {
      const topic = TOPICS.find((t) => t.id === d.topic) || TOPICS[TOPICS.length - 1];
      const date  = new Date(d.ts).toLocaleDateString();
      const preview = d.body.replace(/<[^>]+>/g, '').slice(0, 80) + '…';
      return `<div class="rw-doc-item" data-id="${_esc(d.id)}">
        <span style="color:${topic.color};flex-shrink:0">${topic.label}</span>
        <div style="flex:1;min-width:0">
          <div class="rw-doc-item-title">${_esc(d.title)}</div>
          <div class="rw-doc-item-meta">${date} · ${preview}</div>
        </div>
        <button class="rw-doc-del" data-del="${_esc(d.id)}" title="Delete">✕</button>
      </div>`;
    }).join('');

    // Click to load doc into editor
    el.querySelectorAll('.rw-doc-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.dataset.del) return; // handled below
        const id  = item.dataset.id;
        const doc = getDocs().find((d) => d.id === id);
        if (!doc) return;
        document.getElementById('rwDocTitle').value = doc.title;
        const outputEl = document.getElementById('rwOutput');
        outputEl.innerHTML = _renderMarkdown(doc.body);
        outputEl.classList.add('visible');
        document.getElementById('rwSaveRow').hidden = true;
        item.closest('.rw-card').scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Delete buttons
    el.querySelectorAll('.rw-doc-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this research document?')) {
          deleteDoc(btn.dataset.del);
          _refreshList();
        }
      });
    });
  }

  // ── Markdown-lite renderer ────────────────────────────────────────────────

  function _renderMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Re-allow our own HTML tags after escaping (none needed here)
      .replace(/^#{2,3} (.+)$/gm, (_, h) => `<h2>${h}</h2>`)
      .replace(/^#{1} (.+)$/gm,   (_, h) => `<h2>${h}</h2>`)
      .replace(/\*\*(.+?)\*\*/g,  (_, b) => `<strong>${b}</strong>`)
      .replace(/\*(.+?)\*/g,       (_, i) => `<em>${i}</em>`)
      .replace(/^> (.+)$/gm,       (_, q) => `<blockquote>${q}</blockquote>`)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^/, '<p>').replace(/$/, '</p>');
  }

  // ── HTML export ───────────────────────────────────────────────────────────

  function _exportHTML() {
    const docs = getDocs();
    if (!docs.length) { _toast('No documents to export.', '#6b7280'); return; }

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Infinity Research Export</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 820px; margin: 0 auto; padding: 2rem; background: #f9f9f9; color: #222; }
  h1   { font-size: 1.8rem; margin-bottom: 1.5rem; }
  .doc { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; background: #fff; }
  .doc-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.3rem; }
  .doc-meta  { font-size: 0.75rem; color: #666; margin-bottom: 1rem; }
  blockquote { border-left: 3px solid #7b5cfa; padding-left: 1rem; color: #555; margin: 0.75rem 0; }
  strong     { color: #c0392b; }
  em         { color: #2980b9; font-style: normal; }
</style>
</head>
<body>
<h1>∞ Infinity Research Export — ${new Date().toDateString()}</h1>
${docs.map((d) => `<div class="doc">
  <div class="doc-title">${_esc(d.title)}</div>
  <div class="doc-meta">${new Date(d.ts).toLocaleString()} · topic: ${d.topic}</div>
  ${_renderMarkdown(d.body)}
</div>`).join('')}
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `infinity-research-${Date.now()}.html`,
    });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  }

  // ── Toast helper ─────────────────────────────────────────────────────────

  function _toast(msg, color) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast toast-power';
    t.style.borderColor = color || '#7b5cfa';
    t.innerHTML = `<strong style="color:${color || '#7b5cfa'}">${msg}</strong>`;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-show'));
    setTimeout(() => {
      t.classList.remove('toast-show');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, 3500);
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Printout renderer — shows the latest doc as a clean read-only card ──────

  function renderPrintout(bodyId) {
    const el = document.getElementById(bodyId || 'spinPrintoutBody');
    if (!el) return;
    const docs = _load();
    if (!docs.length) return;

    const doc   = docs[0]; // most recent
    const topic = TOPICS.find((t) => t.id === doc.topic) || TOPICS[TOPICS.length - 1];
    const date  = new Date(doc.ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    el.innerHTML = `
      <div class="printout-topic-pill" style="color:${topic.color};border-color:${topic.color}">
        ${_esc(topic.label)}
      </div>
      <h3 class="printout-title">${_esc(doc.title)}</h3>
      <div class="printout-body-text">${_renderMarkdown(doc.body)}</div>
      <p class="printout-meta">${date}</p>
    `;

    const section = document.getElementById('spinPrintout');
    if (section) section.hidden = false;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    render,
    renderPrintout,
    autoFromCrush,
    autoFromSpin,
    getDocs,
    saveDoc,
    deleteDoc,
    newDoc,
    TOPICS,
  };
})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResearchWriter;
}
