/**
 * Research Panel — UI Controller
 *
 * The researcher's workspace for logging signal observations while using
 * Worldwide Radio as a tricorder to study signal properties for the
 * physical coin project.
 *
 * Depends on: ResearchLogger
 */

const ResearchPanel = (() => {

  let currentTopic = '';

  // DOM refs — populated in init()
  let topicsEl, topicSelect, titleInput, notesInput, sourceInput;
  let logBtn, askAiBtn, listEl, emptyEl, countEl, clearBtn, exportBtn, collapseBtn, bodyEl;

  // Context supplied by app.js
  let currentStation = null;
  let currentBlock   = null;

  function setCurrentStation(s) { currentStation = s; }
  function setCurrentBlock(b)   { currentBlock   = b; }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _topic(id) {
    return ResearchLogger.TOPICS.find((t) => t.id === id)
      || ResearchLogger.TOPICS[ResearchLogger.TOPICS.length - 1];
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmt(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
           + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function _renderPills() {
    if (!topicsEl) return;
    topicsEl.innerHTML = '';

    const make = (label, id, active) => {
      const b = document.createElement('button');
      b.className = 'topic-pill' + (active ? ' active' : '');
      b.dataset.topic = id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(active));
      b.textContent = label;
      b.addEventListener('click', () => _filter(id));
      topicsEl.appendChild(b);
    };

    make('All', '', !currentTopic);
    ResearchLogger.TOPICS.forEach((t) =>
      make(`${t.emoji} ${t.label}`, t.id, currentTopic === t.id)
    );
  }

  function _renderSelect() {
    if (!topicSelect) return;
    topicSelect.innerHTML = ResearchLogger.TOPICS
      .map((t) => `<option value="${t.id}">${t.emoji} ${t.label}</option>`)
      .join('');
  }

  function renderList() {
    if (!listEl) return;
    const entries = ResearchLogger.get(currentTopic || undefined);
    if (countEl) countEl.textContent = `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`;
    if (emptyEl) emptyEl.hidden = entries.length > 0;

    listEl.innerHTML = '';
    entries.forEach((entry) => {
      const t  = _topic(entry.topic);
      const li = document.createElement('li');
      li.className = 'research-entry';

      const linkedHtml = entry.linked
        ? `<span class="research-linked">📻 ${_esc(entry.linked.stationName || '')}${entry.linked.btcBlock ? ` · ₿ #${Number(entry.linked.btcBlock).toLocaleString()}` : ''}</span>`
        : '';
      const srcHtml = entry.source
        ? `<a class="research-source-link" href="${_esc(entry.source)}" target="_blank" rel="noopener noreferrer">🔗 Source</a>`
        : '';

      li.innerHTML = `
        <div class="research-entry-header">
          <span class="research-entry-topic">${t.emoji} ${_esc(t.label)}</span>
          <span class="research-entry-time">${_esc(_fmt(entry.ts))}</span>
          <button class="research-delete-btn" data-id="${_esc(entry.id)}" aria-label="Delete entry">✕</button>
        </div>
        ${entry.title ? `<p class="research-entry-title">${_esc(entry.title)}</p>` : ''}
        ${entry.notes ? `<p class="research-entry-notes">${_esc(entry.notes)}</p>` : ''}
        <div class="research-entry-footer">${linkedHtml}${srcHtml}</div>
      `;

      li.querySelector('.research-delete-btn').addEventListener('click', () => {
        ResearchLogger.remove(entry.id);
        renderList();
      });

      listEl.appendChild(li);
    });
  }

  function _filter(id) {
    currentTopic = id;
    _renderPills();
    renderList();
  }

  // ── Log entry ─────────────────────────────────────────────────────────────

  function _log() {
    const title  = titleInput  ? titleInput.value.trim()  : '';
    const notes  = notesInput  ? notesInput.value.trim()  : '';
    const source = sourceInput ? sourceInput.value.trim() : '';
    const topic  = topicSelect ? topicSelect.value        : 'note';

    if (!title && !notes) { if (titleInput) titleInput.focus(); return; }

    const linked = (currentStation || currentBlock) ? {
      stationName: currentStation ? (currentStation.name || '') : null,
      btcBlock:    currentBlock   ? currentBlock.height         : null,
    } : null;

    ResearchLogger.log({ topic, title, notes, source, linked });

    if (titleInput)  titleInput.value  = '';
    if (notesInput)  notesInput.value  = '';
    if (sourceInput) sourceInput.value = '';

    if (currentTopic && currentTopic !== topic) _filter('');
    else renderList();
  }

  // ── Ask AI ────────────────────────────────────────────────────────────────

  function _askAi() {
    const title = titleInput  ? titleInput.value.trim() : '';
    const notes = notesInput  ? notesInput.value.trim() : '';
    const topic = topicSelect ? topicSelect.value       : 'note';
    const t     = _topic(topic);

    const prompt = title
      || (notes ? notes.slice(0, 200) : `Tell me about ${t.label} signals for the gold + radium coin project.`);

    const aiPanel  = document.getElementById('aiChatPanel');
    const aiInput  = document.getElementById('aiChatInput');
    const aiToggle = document.getElementById('aiChatToggle');

    if (aiPanel && aiPanel.hidden && aiToggle) aiToggle.click();
    if (aiInput) { aiInput.value = prompt; aiInput.focus(); }
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function _export() {
    const blob = new Blob([ResearchLogger.exportJson()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href:     url,
      download: `signal-research-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Collapse ──────────────────────────────────────────────────────────────

  let _collapsed = false;

  function _toggleCollapse() {
    _collapsed = !_collapsed;
    if (bodyEl)      bodyEl.hidden          = _collapsed;
    if (collapseBtn) {
      collapseBtn.textContent = _collapsed ? '▼' : '▲';
      collapseBtn.title       = _collapsed ? 'Expand' : 'Collapse';
      collapseBtn.setAttribute('aria-expanded', String(!_collapsed));
    }
  }

  // ── Public: auto-log a coin study entry after each BTC Crusher spin ───────

  function logCoinStudy(coinResult) {
    if (!coinResult) return;
    const { coinId, dominant, composite, height } = coinResult;
    ResearchLogger.log({
      topic:  'signal',
      title:  `Coin ${coinId} — ${dominant.emoji} ${dominant.label} dominant`,
      notes:  `Composite: ${composite}%. Block #${height ? height.toLocaleString() : '—'}. ${dominant.desc}`,
      linked: height ? { btcBlock: height } : null,
    });
    if (!currentTopic || currentTopic === 'signal') renderList();
  }

  // ── Research Terms — unlocks extra daily token quota ─────────────────────

  function _submitResearchTerms() {
    const input = document.getElementById('researchTermsInput');
    const terms = input ? input.value.trim() : '';
    if (!terms || terms.split(/\s+/).length < 2) {
      if (input) {
        input.style.borderColor = 'var(--danger)';
        setTimeout(() => { input.style.borderColor = ''; }, 1500);
        input.focus();
      }
      return;
    }

    // Log the research terms as a research entry
    ResearchLogger.log({
      topic: 'note',
      title: 'Research Terms',
      notes: terms,
    });
    if (input) input.value = '';

    // Unlock extra daily tokens via RewardVault
    if (typeof RewardVault !== 'undefined') {
      RewardVault.unlockResearchBonus();
    }

    const status = document.getElementById('researchTermsStatus');
    if (status) {
      status.textContent = '✓ Research terms saved — extended token quota unlocked for today!';
      status.hidden = false;
      setTimeout(() => { status.hidden = true; }, 4000);
    }

    if (!currentTopic || currentTopic === 'note') renderList();
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    topicsEl    = document.getElementById('researchTopics');
    topicSelect = document.getElementById('researchTopicSelect');
    titleInput  = document.getElementById('researchTitleInput');
    notesInput  = document.getElementById('researchNotesInput');
    sourceInput = document.getElementById('researchSourceInput');
    logBtn      = document.getElementById('researchLogBtn');
    askAiBtn    = document.getElementById('researchAskAiBtn');
    listEl      = document.getElementById('researchList');
    emptyEl     = document.getElementById('researchEmpty');
    countEl     = document.getElementById('researchCount');
    clearBtn    = document.getElementById('researchClearBtn');
    exportBtn   = document.getElementById('researchExportBtn');
    collapseBtn = document.getElementById('researchCollapseBtn');
    bodyEl      = document.getElementById('researchBody');

    if (!topicsEl) return;

    _renderPills();
    _renderSelect();
    renderList();

    logBtn      && logBtn.addEventListener('click', _log);
    askAiBtn    && askAiBtn.addEventListener('click', _askAi);
    exportBtn   && exportBtn.addEventListener('click', _export);
    collapseBtn && collapseBtn.addEventListener('click', _toggleCollapse);

    clearBtn && clearBtn.addEventListener('click', () => {
      if (confirm('Clear all research entries?')) { ResearchLogger.clear(); renderList(); }
    });

    notesInput && notesInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); _log(); }
    });

    // Wire research terms submit
    const termsBtn = document.getElementById('researchTermsBtn');
    termsBtn && termsBtn.addEventListener('click', _submitResearchTerms);

    const termsInput = document.getElementById('researchTermsInput');
    termsInput && termsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); _submitResearchTerms(); }
    });
  }

  return { init, setCurrentStation, setCurrentBlock, logCoinStudy, renderList };
})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResearchPanel;
}
