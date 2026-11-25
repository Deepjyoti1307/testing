import { Redis } from 'ioredis';
import { ENV } from './env.js';

// BullMQ requires maxRetriesPerRequest: null
export const redisConnection = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    // Exponential backoff with a cap of 3 seconds
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis successfully.');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});

export default redisConnection;
