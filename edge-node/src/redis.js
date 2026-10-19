const Redis = require('ioredis');
let Redlock = require('redlock');

// Handle ESM/CommonJS default export mismatch safely
if (Redlock.default) {
  Redlock = Redlock.default;
}

const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = process.env.REDIS_PORT || 6379;

const redis = new Redis({
  host: redisHost,
  port: Number(redisPort),
  retryStrategy: (times) => Math.min(times * 100, 2000)
});

const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 100
});

module.exports = { redis, redlock };