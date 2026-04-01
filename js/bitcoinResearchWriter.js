/**
 * Bitcoin Research Writer
 *
 * Stores Bitcoin Crusher spin results locally via UserProfile.logCrush().
 * Public GitHub writes are disabled — research data stays private to the user.
 */

const BitcoinResearchWriter = (() => {
  /** No-op: public GitHub writes are disabled. */
  function getToken() { return ""; }

  /** No-op: token setting is disabled. */
  function setToken() {}

  /**
   * Store the spin result locally only.
   * @returns {Promise<boolean>} always false (no remote write)
   */
  async function write() {
    return false;
  }

  return { write, getToken, setToken };
})();

// CommonJS compat for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = BitcoinResearchWriter;
}
