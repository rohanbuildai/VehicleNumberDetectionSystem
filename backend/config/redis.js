/**
 * Redis Cache Module (Wrapper)
 * 
 * This file provides a compatibility layer for code that expects a 'redis' module.
 * The actual implementation uses an in-memory cache (cache.js) which doesn't
 * require external Redis to be running.
 * 
 * For production with actual Redis, replace these with:
 * const redis = require('ioredis');
 * const client = new redis.Redis(...);
 */

const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('./cache');

module.exports = {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern
};