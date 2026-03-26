/**
 * In-Memory Cache (replaces Redis)
 * Uses a simple Map with TTL support — no external dependency required.
 * For multi-instance deployments, swap this module with a shared MongoDB TTL
 * collection or a managed cache service without changing the API surface.
 */

const logger = require('./logger');

class MemoryCache {
  constructor() {
    this.store = new Map();
    // Run cleanup every 5 minutes to evict expired keys
    this._cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);
    // Allow the process to exit even if this interval is still active
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  _isExpired(entry) {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  _cleanup() {
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (this._isExpired(entry)) {
        this.store.delete(key);
        removed++;
      }
    }
    if (removed > 0) logger.debug(`Cache cleanup: removed ${removed} expired keys`);
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this._isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 3600) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    // Convert glob-style pattern (prefix*) to a RegExp
    const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexStr);
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key);
    }
  }

  clear() {
    this.store.clear();
  }
}

const cache = new MemoryCache();

// ─── Public helpers (same API surface as the old Redis helpers) ────────────

const cacheGet = async (key) => {
  try {
    return cache.get(key);
  } catch (err) {
    logger.warn('Cache GET error:', err.message);
    return null;
  }
};

const cacheSet = async (key, value, ttlSeconds = 3600) => {
  try {
    cache.set(key, value, ttlSeconds);
  } catch (err) {
    logger.warn('Cache SET error:', err.message);
  }
};

const cacheDel = async (key) => {
  try {
    cache.del(key);
  } catch (err) {
    logger.warn('Cache DEL error:', err.message);
  }
};

const cacheDelPattern = async (pattern) => {
  try {
    cache.delPattern(pattern);
  } catch (err) {
    logger.warn('Cache DEL pattern error:', err.message);
  }
};

module.exports = { cacheGet, cacheSet, cacheDel, cacheDelPattern };
