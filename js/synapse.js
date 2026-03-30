/**
 * Synapse — Neuromorphic Memory Engine
 *
 * Every conversation and research entry becomes a memory node.
 * Nodes auto-link to related nodes by keyword overlap (synaptic weight).
 * Current responses expand previous entries rather than replacing them.
 * The memory summary grows continuously and is injected into every AI call.
 *
 * Architecture:
 *   User speaks  →  node created  →  auto-linked to similar nodes
 *   AI responds  →  node created  →  expands linked nodes with new insight
 *   Research log →  node created  →  cross-linked to chat + other entries
 *   Next session →  summary loaded →  AI already knows everything
 */

const Synapse = (() => {

  const LS_KEY          = 'www_infinity_synapse_v1';
  const MAX_NODES       = 300;
  const MAX_SUMMARY     = 3000;  // chars kept in rolling summary
  const LINK_THRESHOLD  = 0.12;  // min similarity to form a synapse

  // ── Stop-word filter ──────────────────────────────────────────────────────
  const STOP = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'by','from','is','are','was','were','be','been','being','have','has',
    'had','do','does','did','will','would','could','should','may','might',
    'can','it','its','this','that','these','those','i','you','we','they',
    'he','she','not','so','as','if','like','just','about','into','also',
    'what','how','when','where','which','who','then','than','more','some',
    'all','one','two','three','very','much','such','here','there','up',
    'out','get','use','its','your','our','their','my','his','her',
  ]);

  // ── Internal helpers ──────────────────────────────────────────────────────

  function _load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : _empty();
    } catch (_) { return _empty(); }
  }

  function _empty() {
    return { summary: '', nodes: [], links: [], lastUpdated: null };
  }

  function _save(state) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (_) {}
  }

  /**
   * Extract weighted keyword map from text.
   * @param {string} text
   * @returns {Object} { word: count }
   */
  function _keywords(text) {
    const kw = {};
    String(text || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .forEach((w) => {
        if (w.length > 3 && !STOP.has(w)) kw[w] = (kw[w] || 0) + 1;
      });
    return kw;
  }

  /**
   * Jaccard-style similarity between two keyword maps.
   * @returns {number} 0–1
   */
  function _similarity(kw1, kw2) {
    const k1 = Object.keys(kw1);
    const k2set = new Set(Object.keys(kw2));
    const shared = k1.filter((k) => k2set.has(k)).length;
    const union  = new Set([...k1, ...Object.keys(kw2)]).size;
    return union === 0 ? 0 : shared / union;
  }

  /** Top-N keywords by frequency. */
  function _topKeywords(kwMap, n = 10) {
    return Object.entries(kwMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Store a new memory node and auto-synapse it to similar existing nodes.
   *
   * @param {string} role     – 'user' | 'assistant' | 'research'
   * @param {string} content  – the message / note text
   * @param {string} [topic]  – optional topic tag
   * @returns {Object} the created node
   */
  function remember(role, content, topic) {
    const state  = _load();
    const kw     = _keywords(content);
    const topKw  = _topKeywords(kw);

    const node = {
      id:       Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      ts:       new Date().toISOString(),
      role,
      topic:    topic || 'general',
      keywords: topKw,
      text:     String(content).slice(0, 600),
      expanded: 0,
    };

    // Auto-synapse: link to similar existing nodes
    state.nodes.forEach((other) => {
      const otherKw = _keywords(other.text);
      const score   = _similarity(kw, otherKw);
      if (score >= LINK_THRESHOLD) {
        const exists = state.links.some(
          (l) => (l.a === node.id && l.b === other.id)
              || (l.a === other.id && l.b === node.id)
        );
        if (!exists) {
          state.links.push({
            a:      node.id,
            b:      other.id,
            weight: Math.round(score * 100),
          });
          // Expand the older node's text with the new connection signal
          other.expanded = (other.expanded || 0) + 1;
        }
      }
    });

    state.nodes.unshift(node);
    state.nodes = state.nodes.slice(0, MAX_NODES);

    // Rolling summary — always grows, oldest chars drop off the front
    const line = `[${new Date().toLocaleTimeString('en-US',{hour12:false})}|${role}|${topic||'?'}] ${String(content).slice(0, 150)}`;
    state.summary = (state.summary + '\n' + line).slice(-MAX_SUMMARY);
    state.lastUpdated = new Date().toISOString();

    _save(state);
    return node;
  }

  /**
   * Recall context most relevant to a query string.
   * Returns the rolling summary plus the top-5 most relevant nodes.
   *
   * @param {string} query
   * @returns {{ summary: string, relevant: Array, linkCount: number }}
   */
  function recall(query) {
    const state = _load();
    const qKw   = _keywords(query);

    const scored = state.nodes
      .map((node) => ({ node, score: _similarity(qKw, _keywords(node.text)) }))
      .filter((x) => x.score > 0.08)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return {
      summary:   state.summary.slice(-1200),
      relevant:  scored.map((x) => x.node),
      linkCount: state.links.length,
    };
  }

  /**
   * Get all nodes synaptically linked to a given node id.
   * @param {string} nodeId
   * @returns {Array<{ node, weight }>} sorted by weight desc
   */
  function getLinks(nodeId) {
    const state = _load();
    return state.links
      .filter((l) => l.a === nodeId || l.b === nodeId)
      .map((l) => {
        const otherId = l.a === nodeId ? l.b : l.a;
        const node    = state.nodes.find((n) => n.id === otherId);
        return node ? { node, weight: l.weight } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
  }

  /**
   * Expand an existing node with new content (e.g. when a follow-up
   * conversation adds to a previously logged research entry).
   *
   * @param {string} nodeId
   * @param {string} addedContent
   * @returns {boolean}
   */
  function expand(nodeId, addedContent) {
    const state = _load();
    const node  = state.nodes.find((n) => n.id === nodeId);
    if (!node) return false;
    node.text     = (node.text + ' ↳ ' + addedContent).slice(0, 600);
    node.expanded = (node.expanded || 0) + 1;
    node.lastExpanded = new Date().toISOString();

    // Re-synapse with updated content
    const newKw = _keywords(node.text);
    state.nodes.filter((n) => n.id !== nodeId).forEach((other) => {
      const score = _similarity(newKw, _keywords(other.text));
      if (score >= LINK_THRESHOLD) {
        const exists = state.links.some(
          (l) => (l.a === nodeId && l.b === other.id)
              || (l.a === other.id && l.b === nodeId)
        );
        if (!exists) state.links.push({ a: nodeId, b: other.id, weight: Math.round(score * 100) });
      }
    });

    _save(state);
    return true;
  }

  /**
   * Build a compact context string for the AI system prompt.
   * Includes the rolling summary + top recent nodes.
   */
  function buildAiContext() {
    const state = _load();
    if (!state.nodes.length) return '';

    const recentNodes = state.nodes.slice(0, 8)
      .map((n) => `• [${n.topic}] ${n.text.slice(0, 120)}`)
      .join('\n');

    return `\n\n--- MEMORY (${state.nodes.length} nodes · ${state.links.length} synapses) ---\n`
         + `SUMMARY:\n${state.summary.slice(-600)}\n`
         + `RECENT:\n${recentNodes}\n--- END MEMORY ---`;
  }

  /** Total node + link counts. */
  function getStats() {
    const s = _load();
    return { nodes: s.nodes.length, links: s.links.length, lastUpdated: s.lastUpdated };
  }

  function getSummary()  { return _load().summary; }
  function getState()    { return _load(); }
  function clear()       { _save(_empty()); }

  return {
    remember,
    recall,
    expand,
    getLinks,
    buildAiContext,
    getStats,
    getSummary,
    getState,
    clear,
  };
})();

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Synapse;
}
