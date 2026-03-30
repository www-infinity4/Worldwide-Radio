/**
 * Worldwide Radio Scanner – Main Application
 *
 * Orchestrates station fetching, scanning, and audio playback.
 * Depends on: js/radioBrowser.js, js/visualiser.js, js/bitcoinResearchWriter.js
 * (must be loaded first)
 */

(() => {
  // ── State ─────────────────────────────────────────────────────────────────
  let stations = [];          // current station list
  let currentIndex = 0;       // index in stations array being played
  let scanTimer = null;       // setInterval handle while scanning
  let isScanning = false;
  let isPlaying = false;
  let scanDwell = 6;          // seconds per station while scanning

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const audioEl        = document.getElementById("audioPlayer");
  const loadingEl      = document.getElementById("loading");
  const errorEl        = document.getElementById("errorMsg");
  const stationListEl  = document.getElementById("stationList");
  const nowPlayingEl   = document.getElementById("nowPlaying");
  const stationNameEl  = document.getElementById("stationName");
  const stationTagsEl  = document.getElementById("stationTags");
  const stationCountEl = document.getElementById("stationCountry");
  const stationBitrateEl = document.getElementById("stationBitrate");
  const visualiserCanvas = document.getElementById("visualiserCanvas");
  const scanBtn        = document.getElementById("btnScan");
  const prevBtn        = document.getElementById("btnPrev");
  const nextBtn        = document.getElementById("btnNext");
  const stopBtn        = document.getElementById("btnStop");
  const searchBtn      = document.getElementById("btnSearch");
  const queryInput     = document.getElementById("searchQuery");
  const countrySelect  = document.getElementById("countrySelect");
  const tagSelect      = document.getElementById("tagSelect");
  const dwellRange     = document.getElementById("dwellTime");
  const dwellLabel     = document.getElementById("dwellLabel");
  const volumeRange    = document.getElementById("volume");
  const resultCount    = document.getElementById("resultCount");
  const signalBar      = document.getElementById("signalBar");

  // Bitcoin Crusher DOM refs
  const crushBtn       = document.getElementById("btnCrush");
  const slotEmoji      = document.getElementById("slotEmoji");
  const slotLabel      = document.getElementById("slotLabel");
  const crusherMeta    = document.getElementById("crusherMeta");
  const crusherHeight  = document.getElementById("crusherHeight");
  const crusherHash    = document.getElementById("crusherHash");
  const crusherIndex   = document.getElementById("crusherIndex");
  const crusherHint    = document.getElementById("crusherHint");
  const crusherError   = document.getElementById("crusherError");

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    dwellRange.value = scanDwell;
    dwellLabel.textContent = `${scanDwell}s`;
    volumeRange.value = audioEl.volume * 100;

    // Boot visualiser (safe no-op if canvas not present)
    if (visualiserCanvas && typeof Visualiser !== "undefined") {
      Visualiser.init(audioEl, visualiserCanvas);
    }

    // ── Level System (OS layers — runs silently underneath everything) ─────
    if (typeof LevelSystem !== "undefined") {
      LevelSystem.init();
    }

    // ── Signal Value — every action earns visible value ───────────────────
    if (typeof SignalValue !== "undefined") {
      SignalValue.init();
    }

    // ── Mario Spin ─────────────────────────────────────────────────────────
    if (typeof MarioSpin !== "undefined") {
      MarioSpin.render("marioSpinMount");
    }

    // ── Token Vault (Music · Video · Games) ───────────────────────────────
    if (typeof RewardVault !== "undefined") {
      RewardVault.render("vaultMount");
    }

    // ── Game Spinner (3-reel NES cartridge slot) ──────────────────────────
    if (typeof GameSpinner !== "undefined") {
      GameSpinner.render("gameSpinnerMount");
    }

    // ── NES Emulator (launched by Game Spinner 3-of-a-kind) ──────────────
    if (typeof GameEmulator !== "undefined") {
      GameEmulator.render("emuMount");
    }

    // ── BTC Ticker ────────────────────────────────────────────────────────
    if (typeof BtcHarvester !== "undefined") {
      _renderTicker();
    }

    // ── Research Panel ────────────────────────────────────────────────────
    if (typeof ResearchPanel !== "undefined") {
      ResearchPanel.init();
    }

    // ── Tricorder button ──────────────────────────────────────────────────
    const tricorderBtn = document.getElementById("tricorderBtn");
    if (tricorderBtn) {
      tricorderBtn.addEventListener("click", () => {
        const on = tricorderBtn.getAttribute("aria-pressed") !== "true";
        tricorderBtn.setAttribute("aria-pressed", String(on));
        tricorderBtn.classList.toggle("active", on);
        if (typeof Visualiser !== "undefined") Visualiser.setTricorderMode(on);
        if (typeof ChiptuneEngine !== "undefined" && on) ChiptuneEngine.play("coin");
      });
    }

    // ── Trending Boost hook (⭐ Star power from LevelSystem) ──────────────
    window._onTrendingBoost = async function () {
      queryInput.value    = "";
      tagSelect.value     = "";
      countrySelect.value = "";
      showLoading(true);
      clearError();
      stopAll();
      try {
        stations = await RadioBrowser.getTopStations(200);
        renderStationList();
        showToast("⭐ Trending Boost — top stations loaded!");
        if (typeof LevelSystem !== "undefined") LevelSystem.awardXP("tune");
      } catch (_) {
        showError("Could not load trending stations.");
      } finally {
        showLoading(false);
      }
    };

    // ── Mario Spin → Radio channel hook ──────────────────────────────────
    window._onMarioSlotWin = async function (symbol, matchCount) {
      if (!symbol.radioTag) return;
      const tag = symbol.radioTag;
      tagSelect.value = tag;
      queryInput.value = "";
      countrySelect.value = "";
      showLoading(true);
      clearError();
      stopAll();
      try {
        stations = await RadioBrowser.getStationsByTag(tag, 200);
        renderStationList();
        showToast(`${symbol.emoji} ${symbol.label} → ${symbol.radioEmoji} ${symbol.radioLabel}`);
        if (stations.length === 0) showError(`No stations found for "${symbol.radioLabel}".`);
        if (typeof LevelSystem !== "undefined") LevelSystem.awardXP("tune");
        if (typeof SignalValue  !== "undefined") SignalValue.add("tune");
        // Set combo flag so Game Spinner can detect Mario→Game chain
        window._lastMarioSpinWin = true;
      } catch (_) {
        showError("Could not load stations for this channel.");
      } finally {
        showLoading(false);
      }
    };

    await loadCountries();
    await loadTopStations();
    setupEventListeners();
    startBlockPoller();
  }

  async function loadCountries() {
    try {
      const countries = await RadioBrowser.getCountries();
      countries.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.iso_3166_1;
        opt.textContent = `${c.name} (${c.stationcount})`;
        countrySelect.appendChild(opt);
      });
    } catch (e) {
      console.warn("Could not load country list:", e);
    }
  }

  async function loadTopStations() {
    showLoading(true);
    clearError();
    try {
      stations = await RadioBrowser.getTopStations(200);
      renderStationList();
    } catch (e) {
      showError("Could not load stations. Check your connection and try again.");
    } finally {
      showLoading(false);
    }
  }

  // ── Event Listeners ───────────────────────────────────────────────────────
  function setupEventListeners() {
    searchBtn.addEventListener("click", handleSearch);
    queryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });

    countrySelect.addEventListener("change", handleCountryChange);
    tagSelect.addEventListener("change", handleTagChange);

    scanBtn.addEventListener("click", startScan);
    prevBtn.addEventListener("click", playPrev);
    nextBtn.addEventListener("click", playNext);
    stopBtn.addEventListener("click", stopAll);
    crushBtn.addEventListener("click", handleCrush);

    dwellRange.addEventListener("input", () => {
      scanDwell = parseInt(dwellRange.value, 10);
      dwellLabel.textContent = `${scanDwell}s`;
      // Restart scan timer if scanning so the new dwell takes effect
      if (isScanning) {
        clearInterval(scanTimer);
        scanTimer = setInterval(playNext, scanDwell * 1000);
      }
    });

    volumeRange.addEventListener("input", () => {
      audioEl.volume = volumeRange.value / 100;
    });

    audioEl.addEventListener("playing", () => {
      isPlaying = true;
      animateSignal(true);
    });
    audioEl.addEventListener("pause", () => {
      isPlaying = false;
      animateSignal(false);
    });
    audioEl.addEventListener("error", () => {
      // Station stream failed – skip to next when scanning, else show error
      if (isScanning) {
        playNext();
      } else {
        showError(`Stream error. The station may be offline. Try another.`);
        animateSignal(false);
      }
    });
  }

  // ── Search & Filter ───────────────────────────────────────────────────────
  async function handleSearch() {
    const query = queryInput.value.trim();
    if (!query) return;

    countrySelect.value = "";
    tagSelect.value = "";
    showLoading(true);
    clearError();
    stopAll();

    try {
      stations = await RadioBrowser.searchByName(query, 200);
      if (stations.length === 0) {
        showError(`No stations found for "${query}". Try a different search.`);
      }
      renderStationList();
    } catch (e) {
      showError("Search failed. Please try again.");
    } finally {
      showLoading(false);
    }
  }

  async function handleCountryChange() {
    const code = countrySelect.value;
    if (!code) return;

    queryInput.value = "";
    tagSelect.value = "";
    showLoading(true);
    clearError();
    stopAll();

    try {
      stations = await RadioBrowser.getStationsByCountry(code, 200);
      if (stations.length === 0) {
        showError("No stations found for that country.");
      }
      renderStationList();
    } catch (e) {
      showError("Could not load country stations. Please try again.");
    } finally {
      showLoading(false);
    }
  }

  async function handleTagChange() {
    const tag = tagSelect.value;
    if (!tag) return;

    queryInput.value = "";
    countrySelect.value = "";
    showLoading(true);
    clearError();
    stopAll();

    try {
      stations = await RadioBrowser.getStationsByTag(tag, 200);
      if (stations.length === 0) {
        showError("No stations found for that genre.");
      }
      renderStationList();
    } catch (e) {
      showError("Could not load genre stations. Please try again.");
    } finally {
      showLoading(false);
    }
  }

  // ── Playback ──────────────────────────────────────────────────────────────
  function playStation(index) {
    if (stations.length === 0) return;

    currentIndex = ((index % stations.length) + stations.length) % stations.length;
    const station = stations[currentIndex];

    if (!station.url_resolved && !station.url) {
      // No stream URL – skip
      playNext();
      return;
    }

    clearError();
    audioEl.src = station.url_resolved || station.url;
    audioEl.load();
    audioEl.play().catch((err) => {
      // Ignore AbortError: it means we intentionally changed stations (load()
      // rejects any pending play() with AbortError when the src is swapped).
      // Without this guard the scanner cascades: each abort triggers playNext()
      // which aborts the next station, looping infinitely and playing nothing.
      if (err.name === "AbortError") return;
      if (isScanning) {
        playNext();
      } else {
        showError("Stream error. The station may be offline. Try another.");
        animateSignal(false);
      }
    });

    RadioBrowser.registerClick(station.stationuuid);
    UserProfile.logStation(station);
    updateNowPlaying(station);
    highlightListItem(currentIndex);
  }

  function playNext() {
    playStation(currentIndex + 1);
  }

  function playPrev() {
    playStation(currentIndex - 1);
  }

  function startScan() {
    if (stations.length === 0) {
      showError("Load stations first before scanning.");
      return;
    }
    isScanning = true;
    scanBtn.classList.add("active");
    scanBtn.textContent = "⚡ Scanning…";
    playStation(currentIndex);
    scanTimer = setInterval(playNext, scanDwell * 1000);
  }

  function stopAll() {
    isScanning = false;
    clearInterval(scanTimer);
    scanTimer = null;
    audioEl.pause();
    audioEl.src = "";
    scanBtn.classList.remove("active");
    scanBtn.textContent = "⚡ Scan";
    animateSignal(false);
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  function renderStationList() {
    stationListEl.innerHTML = "";
    resultCount.textContent = stations.length
      ? `${stations.length} station${stations.length !== 1 ? "s" : ""}`
      : "0 stations";

    stations.forEach((s, i) => {
      const li = document.createElement("li");
      li.className = "station-item";
      li.dataset.index = i;

      const favicon = s.favicon
        ? `<img class="favicon" src="${escapeHtml(s.favicon)}" alt="" onerror="this.style.display='none'">`
        : `<span class="favicon-placeholder">📻</span>`;

      li.innerHTML = `
        ${favicon}
        <div class="station-info">
          <span class="station-item-name">${escapeHtml(s.name || "Unknown")}</span>
          <span class="station-item-meta">${escapeHtml(s.country || "")}${s.tags ? " · " + escapeHtml(s.tags.split(",").slice(0, 3).join(", ")) : ""}</span>
        </div>
        <span class="station-codec">${escapeHtml(s.codec || "")}</span>
      `;

      li.addEventListener("click", () => {
        isScanning = false;
        clearInterval(scanTimer);
        scanTimer = null;
        scanBtn.classList.remove("active");
        scanBtn.textContent = "⚡ Scan";
        playStation(i);
      });

      stationListEl.appendChild(li);
    });
  }

  function highlightListItem(index) {
    document.querySelectorAll(".station-item").forEach((el) => el.classList.remove("playing"));
    const target = stationListEl.querySelector(`[data-index="${index}"]`);
    if (target) {
      target.classList.add("playing");
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function updateNowPlaying(station) {
    nowPlayingEl.hidden = false;
    stationNameEl.textContent = station.name || "Unknown Station";
    stationTagsEl.textContent = station.tags
      ? station.tags.split(",").slice(0, 5).join(" · ")
      : "—";
    stationCountEl.textContent = [station.country, station.state]
      .filter(Boolean)
      .join(", ") || "—";
    stationBitrateEl.textContent = station.bitrate ? `${station.bitrate} kbps` : "—";
  }

  function animateSignal(active) {
    if (active) {
      signalBar.classList.add("active");
    } else {
      signalBar.classList.remove("active");
    }
  }

  function showLoading(show) {
    loadingEl.hidden = !show;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ── Bitcoin Crusher ───────────────────────────────────────────────────────

  /**
   * Handle the "Spin the Dial" button click.
   * Fetches the latest BTC block hash, crushes it to a channel index,
   * loads matching stations, and logs the result to the user profile.
   */
  async function handleCrush() {
    crushBtn.disabled = true;
    crushBtn.textContent = "⚡ Fetching block…";
    crusherError.hidden = true;

    // Animate the slot
    slotEmoji.classList.add("spinning");
    slotLabel.textContent = "Crushing hash…";

    try {
      const result = await BitcoinCrusher.spin();
      const { hash, height, index, channel } = result;

      // Update slot display
      slotEmoji.classList.remove("spinning");
      slotEmoji.textContent = channel.emoji;
      slotLabel.textContent = channel.label;

      // Update metadata row
      crusherMeta.hidden   = false;
      crusherHeight.textContent = `#${height.toLocaleString()}`;
      crusherHash.textContent   = hash.slice(0, 20) + "…";
      crusherHash.title         = hash;
      crusherIndex.textContent  = `${index} / ${BitcoinCrusher.CHANNELS.length - 1}`;

      // Update hint to show the formula
      crusherHint.textContent =
        `0x${hash.slice(0, 8)}… mod 16 = ${index} → ${channel.emoji} ${channel.label}`;

      // Update the tag selector to reflect the crushed genre
      tagSelect.value = channel.tag;

      // Load stations for the selected genre
      queryInput.value  = "";
      countrySelect.value = "";
      showLoading(true);
      clearError();
      stopAll();

      try {
        stations = await RadioBrowser.getStationsByTag(channel.tag, 200);
        renderStationList();
        if (stations.length === 0) {
          showError(`No stations found for "${channel.label}". Try spinning again.`);
        }
      } catch (e) {
        showError("Could not load stations for this channel. Check your connection.");
      } finally {
        showLoading(false);
      }

      // Persist to user profile
      UserProfile.logCrush(result);
      showToast(`${channel.emoji} ${channel.label} — Block #${height.toLocaleString()}`);

      // Level System — award XP for a crush
      if (typeof LevelSystem  !== "undefined") LevelSystem.awardXP("crush");
      if (typeof SignalValue  !== "undefined") SignalValue.add("crush");

      // Feed hash to Game Spinner for Daily Featured game
      if (typeof GameSpinner !== "undefined") GameSpinner.setFeaturedFromHash(hash);

      // Signal Coin — generate nuclear fingerprint from this hash
      _renderSignalCoin(result);

      // BTC Harvest Feed — emit a simulated harvest transaction
      if (typeof BtcHarvester !== "undefined") {
        BtcHarvester.emit(`₿ Crush → ${channel.emoji} ${channel.label} · Block #${height.toLocaleString()}`);
        _renderHarvestFeed();
      }

      // Ticker update
      _updateTicker(result);

      // Synapse memory — remember this crush
      if (typeof Synapse !== "undefined") {
        Synapse.remember("user", `Bitcoin Crush: block #${height} → ${channel.label} (hash ${hash.slice(0,16)})`, "signal");
      }

      // Write spin to GitHub research file if a GHP token is configured
      if (typeof BitcoinResearchWriter !== "undefined") {
        BitcoinResearchWriter.write(result).then((written) => {
          if (written) {
            showToast("₿ Spin logged to research file ✓");
          }
        }).catch((err) => {
          console.warn("[BitcoinResearchWriter] Write failed:", err);
        });
      }

    } catch (err) {
      slotEmoji.classList.remove("spinning");
      slotEmoji.textContent = "⚠️";
      slotLabel.textContent = "Could not fetch block";
      crusherError.textContent = err.message;
      crusherError.hidden = false;
    } finally {
      crushBtn.disabled    = false;
      crushBtn.innerHTML   = '<span class="crush-btn-icon" aria-hidden="true">🎰</span> Spin the Dial';
    }
  }

  /**
   * Auto-poll Bitcoin for new blocks (every 10 minutes).
   * Only shows a toast when the block height increases; does NOT auto-spin.
   */
  let lastKnownBlock = 0;

  const BLOCK_POLL_MS = 10 * 60 * 1000; // 10 minutes — approx. Bitcoin block time

  function startBlockPoller() {
    async function poll() {
      try {
        const result = await BitcoinCrusher.spin();
        if (lastKnownBlock && result.height > lastKnownBlock) {
          showToast(`₿ New Bitcoin block #${result.height.toLocaleString()} — spin to refresh your channel!`);
        }
        lastKnownBlock = result.height;
      } catch (_) { /* silently ignore network errors in background poll */ }
    }
    // Delay first poll by 30 s so page load finishes first
    setTimeout(() => { poll(); setInterval(poll, BLOCK_POLL_MS); }, 30_000);
  }

  // ── BTC Ticker renderer ───────────────────────────────────────────────────

  function _renderTicker() {
    const track = document.getElementById("btcTickerTrack");
    if (!track) return;

    const items = [
      { label: "BTC BLOCK",   id: "tickerBlock",   val: "…" },
      { label: "HASH",        id: "tickerHash",    val: "…" },
      { label: "GENRE INDEX", id: "tickerIndex",   val: "…" },
      { label: "SESSION ₿",   id: "tickerSession", val: "0.00000000" },
      { label: "YOUR 8%",     id: "tickerUser",    val: "0.00000000" },
      { label: "SPINS",       id: "tickerSpins",   val: "0" },
    ];

    // Duplicate for seamless loop
    const html = [...items, ...items].map((it) =>
      `<span class="ticker-item">
         <span class="ticker-label">${it.label}</span>
         <span class="ticker-value" id="${it.id}">${it.val}</span>
       </span>`
    ).join('<span class="ticker-item" aria-hidden="true">·</span>');

    track.innerHTML = html;
  }

  function _updateTicker(result) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    if (!result) return;
    set("tickerBlock", `#${result.height ? result.height.toLocaleString() : "—"}`);
    set("tickerHash",  result.hash ? result.hash.slice(0, 12) + "…" : "—");
    set("tickerIndex", result.index !== undefined ? `${result.index}/15` : "—");
  }

  function _updateHarvestTicker(state) {
    if (!state) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("tickerSession", (state.total  || 0).toFixed(8));
    set("tickerUser",    (state.user   || 0).toFixed(8));
    set("tickerSpins",   (state.spins  || 0).toString());
  }

  // ── Harvest Feed renderer ─────────────────────────────────────────────────

  function _renderHarvestFeed() {
    if (typeof BtcHarvester === "undefined") return;

    const state  = BtcHarvester.getState();
    const txList = document.getElementById("harvestTxList");
    const totEl  = document.getElementById("harvestTotal");
    const usrEl  = document.getElementById("harvestUser");

    if (totEl) totEl.textContent = (state.total || 0).toFixed(8) + " ₿";
    if (usrEl) usrEl.textContent = (state.user  || 0).toFixed(8) + " ₿";

    _updateHarvestTicker(state);

    if (!txList) return;
    txList.innerHTML = "";
    (state.txs || []).slice(0, 20).forEach((tx) => {
      const li = document.createElement("li");
      li.className = "harvest-tx harvest-tx--new";
      li.innerHTML = `
        <span class="htx-icon">${tx.icon || "⛓"}</span>
        <span class="htx-action">${tx.action || ""}</span>
        <span class="htx-btc">${(tx.amount || 0).toFixed(8)} ₿</span>
        <span class="htx-hash">${(tx.hash || "").slice(0, 8)}</span>
        <span class="htx-time">${tx.time || ""}</span>
      `;
      txList.appendChild(li);
      setTimeout(() => li.classList.remove("harvest-tx--new"), 2000);
    });
  }

  // ── Signal Coin renderer ──────────────────────────────────────────────────

  function _renderSignalCoin(result) {
    if (typeof SignalCoin === "undefined" || !result) return;

    const profile = SignalCoin.generate(result.hash, result.height);
    if (!profile) return;

    const idEl   = document.getElementById("coinId");
    const compEl = document.getElementById("coinComposite");
    const domEl  = document.getElementById("coinDominant");
    const idle   = document.getElementById("coinIdle");
    const modes  = document.getElementById("coinModes");
    const meta   = document.getElementById("coinMeta");
    const logBtn = document.getElementById("coinStudyBtn");

    if (idEl)   idEl.textContent   = profile.coinId;
    if (compEl) compEl.textContent = profile.composite + "%";
    if (domEl)  domEl.textContent  = `${profile.dominant.emoji} ${profile.dominant.label}`;
    if (idle)   idle.hidden        = true;
    if (meta)   meta.hidden        = false;
    if (logBtn) logBtn.hidden      = false;

    if (modes) {
      modes.hidden = false;
      modes.innerHTML = profile.modes.map((m) => `
        <div class="coin-mode-row">
          <span class="coin-mode-emoji">${m.emoji}</span>
          <div class="coin-mode-bar-wrap">
            <div class="coin-mode-bar" style="width:${m.value}%;background:${m.color};color:${m.color}"></div>
          </div>
          <span class="coin-mode-val">${m.label} ${m.value}%</span>
        </div>
      `).join("");
    }

    // Auto-log to research panel
    if (typeof ResearchPanel !== "undefined") {
      ResearchPanel.logCoinStudy({
        coinId:    profile.coinId,
        dominant:  profile.dominant,
        composite: profile.composite,
        height:    result.height,
      });
    }
  }

  // ── Toast notifications ───────────────────────────────────────────────────

  function showToast(msg) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className   = "toast";
    toast.textContent = msg;
    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => toast.classList.add("toast-show"));

    setTimeout(() => {
      toast.classList.remove("toast-show");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, 4000);
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", init);
})();
