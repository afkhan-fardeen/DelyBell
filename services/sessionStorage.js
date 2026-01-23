/**
 * Session Storage Service
 * Stores Shopify OAuth sessions
 * 
 * NOTE: This is an in-memory implementation for development.
 * For production, replace with a database (Redis, PostgreSQL, etc.)
 */

class SessionStorage {
  constructor() {
    // In-memory storage (will be lost on server restart)
    this.sessions = new Map();
  }

  /**
   * Store a session
   * @param {string} id - Session ID (usually shop domain)
   * @param {Object} session - Session object
   */
  async storeSession(id, session) {
    this.sessions.set(id, session);
    console.log(`Stored session for: ${id}`);
  }

  /**
   * Load a session
   * @param {string} id - Session ID
   * @returns {Object|null} Session object or null if not found
   */
  async loadSession(id) {
    const session = this.sessions.get(id);
    if (session) {
      console.log(`[SessionStorage] Loaded session for: ${id}`);
      return session;
    }
    console.log(`[SessionStorage] No session found for: ${id}`);
    console.log(`[SessionStorage] Available sessions: ${Array.from(this.sessions.keys()).join(', ') || 'none'}`);
    return null;
  }

  /**
   * Delete a session
   * @param {string} id - Session ID
   */
  async deleteSession(id) {
    this.sessions.delete(id);
    console.log(`Deleted session for: ${id}`);
  }

  /**
   * Check if session exists
   * @param {string} id - Session ID
   * @returns {boolean}
   */
  async sessionExists(id) {
    return this.sessions.has(id);
  }

  /**
   * Get all sessions (for debugging)
   * @returns {Array} Array of session IDs
   */
  getAllSessionIds() {
    return Array.from(this.sessions.keys());
  }
}

// Export singleton instance
module.exports = new SessionStorage();

