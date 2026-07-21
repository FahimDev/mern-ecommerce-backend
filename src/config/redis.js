const Redis = require("ioredis");

const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redis = new Redis(url, {
    // Lazy connect means we don't attempt to dial Redis until the first
    // command. This avoids noisy EHOSTUNRECONNECTED logs at boot when
    // students forgot `docker compose up -d`.
    lazyConnect: true,

    // Keep retries bounded so a dead Redis doesn't pin the event loop.
    maxRetriesPerRequest: 3,

    // Exponential backoff up to ~2s. Production should bump this.
    retryStrategy: (times) => Math.min(times * 200, 2000),

    // Surface useful lifecycle events during development.
    // In production we'd route these into a logger.
})

redis.on("connect", () => console.log("Redis is Connected!"));

redis.on("error", (err) => console.error("Redis Error: ", err.message));

redis.connect().catch((err) => console.error("Redis initial connection failed: ", err.message));

module.exports = redis;