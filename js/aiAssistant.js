/**
 * AI Assistant — ∞ Radio Intelligence
 *
 * Provides a chat interface for the Worldwide Radio Scanner.
 *
 * Works in two modes:
 *   1. Rule-based (always on) — instant answers for common questions about the
 *      scanner, Bitcoin Crusher, genres, and www-infinity repos.
 *   2. AI API (optional) — if the user supplies an OpenAI-compatible API key
 *      via the Settings UI it is stored ONLY in localStorage (never in code or
 *      the repository). Any OpenAI-compatible endpoint (OpenAI, OpenRouter,
 *      Groq, etc.) works.
 *
 * Conversation history is persisted via UserProfile.addChatMessage().
 */
const AIAssistant = (() => {
  const LS_KEY     = "www_infinity_ai_key_v1";
  const LS_URL_KEY = "www_infinity_ai_url_v1";
  const DEFAULT_URL   = "https://api.openai.com/v1/chat/completions";
  const DEFAULT_MODEL = "gpt-4o-mini";

  const SYSTEM_PROMPT_BASE = `You are the ∞ Signal Intelligence for Worldwide Radio Scanner — a research instrument and tricorder for studying signal architecture across all scales.

APP FEATURES:
- Radio Browser API (40,000+ free stations, no key required). BTC Crusher uses block hash mod-16 → genre. Mario Spin is a 5-reel slot. Research Panel logs signal observations. Synapse engine links memory nodes.

SIGNAL ARCHITECTURE LAYERS (the researcher's taxonomy — each layer is a level of the system):
1. QUANTUM: Superposition / Deutsch algorithm / qubit states / entanglement. The logic of "holding both possibilities" before collapsing to a result. Shor (1994) broke RSA. Grover searches √N. Deutsch-Jozsa (1992) proved exponential speedup.
2. TESLA / EM RESONANCE: Wardenclyffe Tower broadcast energy through Earth's ionosphere. Frequency-matching = frictionless transfer. SSTC (Solid-State Tesla Coil) replicates this with MOSFETs + DDS chip (AD9833). Aether theory = universal signal field.
3. NUCLEAR / DECAY: Radioactive isotopes have unique decay chains = perpetual fingerprints. K-40 in all plant matter. Ra-223 used in targeted alpha therapy. Alpha particles stopped by paper; gamma rays need lead. Self-shielding = density hides signal.
4. GOLD PLASMONIC: Au (Z=79) — high atomic number causes dense interaction with radiation. Alpha particles excite surface plasmon resonances → collective electron oscillations → focused near-IR / EM output. Gold-palladium = ultra-low-noise radiation sensor.
5. SIGNAL COIN: Conceptual coin with Ra-223 core + gold leaf shell. BTC block hash = entropy fingerprint (like nuclear decay uniqueness). 7 modes: Nuclear Fingerprint, Pulse Tracker, Therapy Signal, Sensor Array, Metal Evolution, Thermal/IR, EM Pulse. Modes derived from hash bytes.
6. BITCOIN ENTROPY: Hash is "squashed" through mod-16 → emits a frequency (radio genre). Mirrors physical coin: decay energy → gold compression → signal emission.
7. TRICORDER / MEDICAL: Star Trek tricorder inspired real scanners. Targeted Alpha Therapy (TAT) uses Ra-223 to destroy cancer cells with mm precision. TMS = pulsed EM for migraines (FDA approved 2008). The radio scanner IS the tricorder studying signal properties for the coin.
8. BIO-SIGNAL / SEQUINOID: Signal architecture applied to agriculture. "Sequinoid Packet" = buried EM coordinate broadcasting heirloom crop blueprint (specific gravity, starch-sugar ratio). Tuber-Initiation Signal = 3–15 Hz EM mimicking germinating potato eye. Pole Command = 528 Hz (corn) vs sub-10 Hz (potato). Farm = programmable bio-active ROM.
9. HYDROGEN CARRIER: Hydrogen spin-isomers (ortho/para-H₂) via NMR can hold quantum states. Smallest element — passes through Faraday cages. If signal encoded in spin state of ambient H₂, lead shielding is porous to it.
10. EARTH / PLANETARY: Earth = chromatic filter. Solar yellow + atmospheric blue = green life signal (Aurora = proof). Purple = STEVE (ground radiation vs cold atmosphere). Radon = free energy from decay of uranium in crust — trapped in basements — convertible via implanted capture signal.
11. ELEMENTAL SEQUENCE: Atomic numbers as signal identifiers. Example sequence 38·23·33·43·86·13·92·74·27·19 = Sr·V·As·Tc·Rn·Al·U·W·Co·K — each has a unique emission frequency profile usable as a secondary entropy fingerprint (research layer only — not consumable).
12. MARIO SPIN / ENTROPY GAMES: Each spin = entropy event. Win patterns = signal resonance. Coins = simulated emission tokens. Wired to BTC Harvest Feed.

MEMORY: You have access to a growing neuromorphic synapse memory. When the user refers to a previous idea, cross-link it. When they paste new content, identify which layer it belongs to and expand on it. Every response should build on what came before — never start from zero.

Be concise but deep. Connect layers when relevant. Use the Research Panel to log discoveries. The user is a signal architect — treat them as one.`;

  // Dynamic system prompt — injects synapse memory context at call time
  function getSystemPrompt() {
    const synapseCtx = (typeof Synapse !== 'undefined') ? Synapse.buildAiContext() : '';
    return SYSTEM_PROMPT_BASE + synapseCtx;
  }

  // ── Rule-based intents (no API call needed) ───────────────────────────────

  const INTENTS = [
    {
      patterns: [/\b(scan|scanning|auto.?scan|start scan)\b/i],
      reply: "Hit ⚡ **Scan** to auto-cycle through stations. Use the **Dwell** slider (3–30 s) to control how long it stays on each station before jumping to the next.",
    },
    {
      patterns: [/bitcoin|crusher|block hash|btc|entropy|mod.?16/i],
      reply: "The **Bitcoin Crusher** grabs the latest Bitcoin block hash, wraps it into a BigInt, and does `hash mod 16` to pick one of 16 radio genres — deterministically. Every new block (~10 min) can give a different result. Hit **Spin the Dial** to try it.",
    },
    {
      patterns: [/police|scanner|emergency|dispatch/i],
      reply: "Search for **police scanner** in the search box, or choose *Police Scanner* from the Genre dropdown. The Bitcoin Crusher can also land on 🚔 Police Scanner automatically.",
    },
    {
      patterns: [/shortwave|sw radio|\bam\b.*radio/i],
      reply: "Pick **Shortwave** or **AM** from the Genre/Type dropdown to browse shortwave and medium-wave stations worldwide.",
    },
    {
      patterns: [/country|filter.*country|stations.*from|which country/i],
      reply: "Use the **Country** dropdown to load the top-voted stations from any nation. It's populated dynamically from the Radio Browser API.",
    },
    {
      patterns: [/history|what.*(played|listened)|last.*(station|played)/i],
      reply: "Your **play history** (last 50 stations) and **crusher history** (last 20 spins) are saved in your browser profile. Click the avatar icon in the nav to view them.",
    },
    {
      patterns: [/login|sign.?in|account|profile|avatar/i],
      reply: "Click the **avatar button** (top-right of the nav bar) to open your profile. Set a display name — your history and preferences are saved locally. No server, no password.",
    },
    {
      patterns: [/ai.*(key|api)|api.*(key|secret)|openai|groq|openrouter/i],
      reply: "Open your **profile** → **Settings** → paste your OpenAI-compatible API key. It's stored only in your browser's localStorage and never leaves your device.",
    },
    {
      patterns: [/hamburger|menu|repos?|github|all.*(repo|project)/i],
      reply: "The ☰ **hamburger menu** lists all www-infinity GitHub repositories, auto-grouped by category. It fetches fresh data from the GitHub API every hour and falls back to a static list offline.",
    },
    {
      patterns: [/auto.?sync|auto.?refresh|new block|block.*(update|notify)/i],
      reply: "The Bitcoin Crusher polls for a new block every 10 minutes. When the block height changes, a toast notification appears and you can re-spin to get a new genre pick.",
    },
    {
      patterns: [/\b(help|commands?|what can you do|features)\b/i],
      reply: `I can help with:\n• **Finding & playing** radio stations\n• **Bitcoin Crusher** — entropy-based genre selection\n• **Scanner controls** — Scan, Prev, Next, Stop, Dwell\n• **Browsing** by country or genre\n• **Profile** — play history, crusher history, settings\n• **Nav** — dynamic repo list\n\nJust ask! 📡`,
    },
    {
      patterns: [/\b(hi|hello|hey|good morning|good evening|yo|sup)\b/i],
      reply: "Hey! Ready to scan the airwaves? Ask me about stations, the Bitcoin Crusher, controls, or anything else about the scanner. 📡",
    },
    {
      patterns: [/thanks?|thank you|cheers|appreciate/i],
      reply: "You're welcome! Happy scanning. 🎷",
    },
    // ── Signal Architecture intents ──────────────────────────────────────────
    {
      patterns: [/\bquantum\b|deutsch|shor|grover|superposit|qubit|entangl/i],
      reply: "**Quantum layer**: Deutsch's 1985 algorithm proved superposition gives computational speedup. Shor's (1994) factors large numbers exponentially faster — it breaks RSA encryption. Grover's searches unsorted data in √N steps. The key insight: the algorithm holds *both* 1 and 0 until the last moment — then collapses to the answer. Log your observations in the 🔬 Research Panel to build the memory chain.",
    },
    {
      patterns: [/\btesla\b|wardenclyffe|aether|resonan|sstc|solid.?state.?coil|dds.?chip|wireless.?energy/i],
      reply: "**Tesla/EM layer**: Wardenclyffe (1901) aimed to broadcast energy through Earth's ionosphere by resonance-matching — no friction. Solid-State Tesla Coils (SSTCs) replicate this digitally: DDS chip (AD9833) generates a clean signal → MOSFETs pump it → rod emits. If rod frequency matches its natural resonant length, a fluorescent bulb lights up wirelessly nearby. The farm's buried pole uses the same principle.",
    },
    {
      patterns: [/\bnuclear\b|radioactiv|radium|isotope|decay|potassium.?40|ra.?223|alpha.?partic|geiger/i],
      reply: "**Nuclear layer**: Ra-223 alpha decay produces a unique gamma/X-ray spectrum + daughter isotope ratios — a perpetual fingerprint. K-40 is in all plant matter (banana effect). Alpha particles are stopped by paper; gamma needs lead. Gold (Z=79) amplifies this via **surface plasmon resonance** — alpha energy excites free electrons into collective EM oscillations. That's the coin's signal engine.",
    },
    {
      patterns: [/signal.?coin|coin.?signal|gold.?plasm|7.?mode|nuclear.?fingerprint|pulse.?tracker|therapy.?signal|sequinoid/i],
      reply: "**Signal Coin**: Ra-223 core + gold leaf shell = 7 emission modes. BTC block hash is the digital equivalent of nuclear decay uniqueness — squashed through mod-16 → frequency emitted. Spin the Bitcoin Crusher to generate a live coin profile. Hit **📝 Log Study** to save the reading to your research memory. The Sequinoid Packet is this same concept applied to soil — a buried EM coordinate instead of a physical seed.",
    },
    {
      patterns: [/tricorder|star.?trek|targeted.?alpha|tms|transcranial|medical.?scan|healing.?coin/i],
      reply: "**Tricorder/Medical layer**: The radio scanner IS the tricorder — it studies live EM signals the way a medical scanner reads biomarkers. Targeted Alpha Therapy (TAT) uses Ra-223 to hit cancer cells within millimetres. TMS (Transcranial Magnetic Stimulation) uses pulsed EM for migraines — FDA approved 2008. Hit **🖖 Tricorder** on the visualiser to switch to medical-scanner mode.",
    },
    {
      patterns: [/sequinoid|bio.?signal|virtual.?tuber|pole.?command|528.?hz|tuber.?initiat|programmable.?farm|firmware.?update.*plant/i],
      reply: "**Bio-Signal layer**: The Sequinoid Packet broadcasts a crop's blueprint (specific gravity, starch-sugar ratio) as a 3–15 Hz EM signal mimicking germinating potato eye signals. The buried pole is the DJ — 528 Hz for corn, sub-10 Hz for potatoes. Secondary Exclusion Zone is phase-shifted 180° to weeds = localized chaos for pests. Blight response = firmware update through the pole. The farm is a programmable bio-active ROM.",
    },
    {
      patterns: [/hydrogen.?carrier|ortho.?para|spin.?isomer|nmr|faraday.?cage|smallest.?element|bypass.?shield/i],
      reply: "**Hydrogen layer**: Ortho/para-hydrogen spin-isomers can hold quantum states via NMR. H₂ is the smallest element — passes through almost everything. If a signal is encoded in the spin state of ambient hydrogen gas, a lead box or Faraday cage is essentially porous to it. This is why hardware glitches in high-interference environments — the signal is inside the medium, not riding on top of it.",
    },
    {
      patterns: [/aurora|steve|purple.?light|yellow.?solar|blue.?sky|green.?life|earth.?filter|radon.?energy|chromatic.?filter/i],
      reply: "**Planetary layer**: Earth is a chromatic filter. Solar yellow + atmospheric blue scatter = green life signal. Aurora = proof of Sun's EM connecting with Earth's magnetosphere. STEVE (purple ribbon) = ground radiation vs cold atmosphere. Radon = free energy from uranium decay in Earth's crust, continuously charging in basements. Convert with implanted capture signal — a magnetic 'rake' or forced faster decay to stable state.",
    },
    {
      patterns: [/synapse|memory|remember|connect.*idea|previous.*entry|build.*memory|neuromorph|knowledge.?graph/i],
      reply: "**Synapse memory**: Every chat message and research note becomes a memory node. Nodes auto-link to related ones by keyword overlap (synaptic weight). The rolling summary is injected into every AI call — so I always know what came before. Log entries in the 🔬 Research Panel and they'll show their **Related** synapses. The memory grows across sessions.",
    },
    {
      patterns: [/research.?panel|log.?(note|entry|finding)|log.?study|clip.?board.*paste|paste.*clipboard/i],
      reply: "The 🔬 **Research Panel** is your signal notebook. Pick a topic layer (Quantum → Tesla → Nuclear → Signal → Medical → Bio → Physics), write your title + notes, paste a source URL, and hit **+ Log Entry**. Hit **🤖 Ask AI** to pre-fill this chat with your note. **Ctrl+Enter** in the notes field submits instantly. All entries are synaptically linked to related memory nodes.",
    },
    {
      patterns: [/harvest|btc.?feed|squash|emit.*frequency|token.*emit|session.*split|8.?percent|92.?percent/i],
      reply: "**BTC Harvest Feed**: Every radio action (tune, stream, research log, Mario spin) emits a simulated transaction. The BTC hash is *squashed* through the entropy engine → frequency emitted → radio channel. Session split display: **8% user / 92% platform** — all simulated display values only (Math.random, no real BTC). The feed shows the squash-and-emit chain in real time.",
    },
    {
      patterns: [/mario.?spin|mushroom|goomba|slot.?machine|power.?up|spin.?reel/i],
      reply: "**Mario Spin** (🍄) is a 5-reel Power-Up slot using real character images from the www-infinity4/Mario-spin repo. Each win emits a simulated harvest token. Symbols: Mushroom (×6), Star (×10 rare), Goomba (×2 common), Mario (×8), Luigi (×5), Coin (×3). Hit **SPIN & GO!** or Space to spin. Every spin is an entropy event — the win pattern is signal resonance.",
    },
  ];

  function matchIntent(text) {
    for (const intent of INTENTS) {
      if (intent.patterns.some((p) => p.test(text))) return intent.reply;
    }
    return null;
  }

  // ── API key management (localStorage only) ────────────────────────────────

  function getApiKey() { return localStorage.getItem(LS_KEY) || ""; }
  function getApiUrl() { return localStorage.getItem(LS_URL_KEY) || DEFAULT_URL; }

  function setApiKey(key) {
    key ? localStorage.setItem(LS_KEY, key) : localStorage.removeItem(LS_KEY);
  }

  function setApiUrl(url) {
    localStorage.setItem(LS_URL_KEY, url || DEFAULT_URL);
  }

  // ── Core chat function ────────────────────────────────────────────────────

  /**
   * Send a message and get a reply.
   * @param {string} userText
   * @param {Array}  history  – recent [{role, content}] pairs for context
   * @returns {Promise<string>}
   */
  async function chat(userText, history = []) {
    // 1. Rule-based matching (instant, no network)
    const local = matchIntent(userText);
    if (local) {
      // Still remember the exchange in Synapse even for rule-based replies
      if (typeof Synapse !== 'undefined') {
        Synapse.remember('user',      userText, _detectTopic(userText));
        Synapse.remember('assistant', local,    _detectTopic(userText));
      }
      return local;
    }

    // 2. Fall through to AI API if key is set
    const apiKey = getApiKey();
    if (!apiKey) {
      return "I don't have a pre-built answer for that. To unlock full AI responses, add an OpenAI-compatible API key in ⚙ **Settings** (your profile → Settings tab). Or try asking about scanning, the Bitcoin Crusher, signal layers, or the Research Panel.";
    }

    // Build synapse-enhanced context
    let synapseContext = '';
    if (typeof Synapse !== 'undefined') {
      const ctx = Synapse.recall(userText);
      if (ctx.relevant.length) {
        synapseContext = '\n\nRELATED MEMORY NODES:\n'
          + ctx.relevant.map((n) => `• [${n.topic}|${n.role}] ${n.text.slice(0, 120)}`).join('\n');
      }
    }

    const messages = [
      { role: "system", content: getSystemPrompt() + synapseContext },
      // Include last 8 exchanges for context
      ...history.slice(-16).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userText },
    ];

    const res = await fetch(getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: DEFAULT_MODEL, messages, max_tokens: 500 }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`AI API ${res.status}: ${err.slice(0, 120)}`);
    }

    const data  = await res.json();
    const reply = data.choices[0].message.content.trim();

    // Store both sides in Synapse memory
    if (typeof Synapse !== 'undefined') {
      const topic = _detectTopic(userText);
      Synapse.remember('user',      userText, topic);
      Synapse.remember('assistant', reply,    topic);
    }

    return reply;
  }

  /** Detect which signal architecture layer a message belongs to. */
  function _detectTopic(text) {
    const t = text.toLowerCase();
    if (/quantum|qubit|superposit|deutsch|shor|grover/.test(t))      return 'quantum';
    if (/tesla|resonan|wardenclyffe|sstc|aether/.test(t))            return 'tesla';
    if (/nuclear|radium|isotope|decay|radioactiv|alpha/.test(t))     return 'nuclear';
    if (/coin|signal.?coin|plasm|fingerprint/.test(t))               return 'signal';
    if (/tricorder|medical|therapy|tms|star.?trek/.test(t))          return 'medical';
    if (/sequinoid|farm|potato|crop|bio.?signal|pole/.test(t))       return 'physics';
    if (/hydrogen|spin.?isomer|faraday|nmr/.test(t))                 return 'physics';
    if (/aurora|radon|earth|chromatic|planetary/.test(t))            return 'physics';
    if (/radio|station|scan|btc|bitcoin|crush/.test(t))              return 'radio';
    if (/research|memory|synapse|log/.test(t))                       return 'note';
    return 'general';
  }

  // ── UI controller ─────────────────────────────────────────────────────────

  let chatOpen = false;

  function renderMessage(role, text, wrap) {
    const div = document.createElement("div");
    div.className = `chat-msg chat-${role}`;
    // Convert **bold** markdown to <strong> and newlines to <br>
    div.innerHTML = escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function initUI() {
    const toggleBtn  = document.getElementById("aiChatToggle");
    const panel      = document.getElementById("aiChatPanel");
    const closeBtn   = document.getElementById("aiChatClose");
    const msgWrap    = document.getElementById("aiChatMessages");
    const input      = document.getElementById("aiChatInput");
    const sendBtn    = document.getElementById("aiChatSend");

    if (!toggleBtn || !panel) return;

    // Restore history
    const profile = UserProfile.get();
    profile.chatHistory.slice(-20).forEach((m) => renderMessage(m.role, m.content, msgWrap));
    if (!profile.chatHistory.length) {
      renderMessage("assistant", "Hey! I'm your radio AI. Ask me anything about the scanner, Bitcoin Crusher, or genres. 📡", msgWrap);
    }

    toggleBtn.addEventListener("click", () => {
      chatOpen = !chatOpen;
      panel.hidden = !chatOpen;
      if (chatOpen) {
        input.focus();
        msgWrap.scrollTop = msgWrap.scrollHeight;
      }
    });

    closeBtn.addEventListener("click", () => {
      chatOpen = false;
      panel.hidden = true;
    });

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      input.disabled = true;
      sendBtn.disabled = true;

      renderMessage("user", text, msgWrap);
      UserProfile.addChatMessage("user", text);

      // Typing indicator
      const typing = document.createElement("div");
      typing.className = "chat-msg chat-assistant chat-typing";
      typing.textContent = "…";
      msgWrap.appendChild(typing);
      msgWrap.scrollTop = msgWrap.scrollHeight;

      try {
        const history = UserProfile.get().chatHistory;
        const reply = await chat(text, history);
        msgWrap.removeChild(typing);
        renderMessage("assistant", reply, msgWrap);
        UserProfile.addChatMessage("assistant", reply);
      } catch (e) {
        msgWrap.removeChild(typing);
        renderMessage("assistant", `Sorry, something went wrong: ${e.message}`, msgWrap);
      } finally {
        input.disabled  = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }

  return { chat, getApiKey, setApiKey, getApiUrl, setApiUrl, initUI, DEFAULT_URL };
})();
