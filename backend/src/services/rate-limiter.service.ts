import { redisConnection } from '../config/redis.js';
import { EventEmitter } from 'events';

export const rateLimitEvents = new EventEmitter();

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  rescheduleDelayMs: number;
  nextWindow: Date;
}

export class RateLimiterService {
  /**
   * Generates the cache key for a given sender in the current hour window:
   * ratelimit:sender:{senderId}:{YYYY-MM-DD-HH}
   */
  static getHourWindowKey(senderId: string, date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `ratelimit:sender:${senderId}:${year}-${month}-${day}-${hour}`;
  }

  /**
   * Calculates milliseconds until the start of the next hour window
   */
  static getMsUntilNextHour(date: Date = new Date()): { delayMs: number; nextWindow: Date } {
    const now = date.getTime();
    const nextHourMs = Math.ceil((now + 1) / 3600000) * 3600000;
    const delayMs = Math.max(1000, nextHourMs - now);
    return {
      delayMs,
      nextWindow: new Date(nextHourMs),
    };
  }

  /**
   * Atomically checks and increments the hourly sending quota for a sender using a Redis Lua script.
   * Safe across multiple concurrent workers and distributed instances.
   */
  static async checkAndIncrement(senderId: string, limit: number): Promise<RateLimitResult> {
    const key = this.getHourWindowKey(senderId);
    const { delayMs, nextWindow } = this.getMsUntilNextHour();

    // Redis Lua Script: Atomic Check and Increment with 2-hour TTL
    const luaScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local current = tonumber(redis.call('get', key) or "0")

      if current < limit then
          local nextCount = redis.call('incr', key)
          if current == 0 then
              redis.call('expire', key, 7200)
          end
          return {1, nextCount}
      else
          return {0, current}
      end
    `;

    try {
      const result = (await redisConnection.eval(luaScript, 1, key, limit)) as [number, number];
      const allowed = result[0] === 1;
      const currentCount = result[1];

      return {
        allowed,
        currentCount,
        limit,
        rescheduleDelayMs: delayMs,
        nextWindow,
      };
    } catch (err: any) {
      console.error('RateLimiter Redis Error:', err.message);
      // Fallback: If Redis Lua evaluation encounters an unexpected glitch, permit execution safely
      return {
        allowed: true,
        currentCount: 0,
        limit,
        rescheduleDelayMs: delayMs,
        nextWindow,
      };
    }
  }

  /**
   * Reads current hourly usage for a sender
   */
  static async getSenderHourlyUsage(senderId: string, limit: number) {
    const key = this.getHourWindowKey(senderId);
    const val = await redisConnection.get(key);
    const currentCount = val ? parseInt(val, 10) : 0;
    const { delayMs, nextWindow } = this.getMsUntilNextHour();

    return {
      currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      rescheduleDelayMs: delayMs,
      nextResetTime: nextWindow.toISOString(),
    };
  }

  /**
   * Decrements counter (used if email fails before reaching SMTP)
   */
  static async rollbackIncrement(senderId: string): Promise<void> {
    const key = this.getHourWindowKey(senderId);
    await redisConnection.decr(key);
  }
}
