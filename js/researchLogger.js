/**
 * Research Logger — Worldwide Radio Research Panel
 *
 * Stores research notes, observations, and discovered topics in localStorage.
 * Entries can be tagged with a topic, linked to a radio station or Bitcoin
 * block, and exported as JSON.
 *
 * Used by js/researchPanel.js for UI interactions.
 */

const ResearchLogger = (() => {
  const LS_KEY      = "www_infinity_research_v1";
  const MAX_ENTRIES = 500;

  /**
   * Predefined topic taxonomy.
   * Each entry maps to a colour-coded pill in the Research Panel.
   */
  const TOPICS = [
    { id: "quantum",  emoji: "⚛️",  label: "Quantum"     },
    { id: "tesla",    emoji: "⚡",  label: "Tesla / EM"  },
    { id: "nuclear",  emoji: "☢️",  label: "Nuclear"     },
    { id: "signal",   emoji: "📡",  label: "Signal"      },
    { id: "medical",  emoji: "🖖",  label: "Medical"     },
    { id: "radio",    emoji: "📻",  label: "Radio"       },
    { id: "physics",  emoji: "🔬",  label: "Physics"     },
    { id: "note",     emoji: "📝",  label: "Note"        },
  ];

  // ── Internal storage helpers ──────────────────────────────────────────────

  function _load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function _save(entries) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(entries));
    } catch (_) {}
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Return all entries, optionally filtered by topic id.
   * @param {string} [topicFilter]  – topic id to filter by; omit for all
   * @returns {Array}
   */
  function get(topicFilter) {
    const all = _load();
    return topicFilter ? all.filter((e) => e.topic === topicFilter) : all;
  }

  /**
   * Add a new research entry. Returns the saved entry with generated id + ts.
   * @param {{ topic, title, notes, source, linked }} entry
   * @returns {Object}
   */
  function log(entry) {
    const entries = _load();
    const saved = {
      id:     Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts:     new Date().toISOString(),
      topic:  entry.topic  || "note",
      title:  String(entry.title  || "").slice(0, 120),
      notes:  String(entry.notes  || "").slice(0, 2000),
      source: String(entry.source || "").slice(0, 500),
      // linked: { stationName, btcBlock } — both optional
      linked: entry.linked || null,
    };
    entries.unshift(saved);
    _save(entries.slice(0, MAX_ENTRIES));
    return saved;
  }

  /**
   * Remove a single entry by id.
   * @param {string} id
   */
  function remove(id) {
    _save(_load().filter((e) => e.id !== id));
  }

  /** Clear all research entries. */
  function clear() {
    _save([]);
  }

  /**
   * Export all entries as a formatted JSON string.
   * @returns {string}
   */
  function exportJson() {
    return JSON.stringify(_load(), null, 2);
  }

  return { TOPICS, get, log, remove, clear, exportJson };
})();

// CommonJS compat for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = ResearchLogger;
}
