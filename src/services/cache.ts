import { Redis } from '@upstash/redis/cloudflare';

export const getRedis = (url: string, token: string) => {
  return new Redis({
    url,
    token,
  });
};

export const getCache = async <T>(redis: Redis, key: string): Promise<T | null> => {
  return await redis.get<T>(key);
};

export const setCache = async <T>(redis: Redis, key: string, value: T, ttlSeconds: number = 3600): Promise<void> => {
  await redis.set(key, value, { ex: ttlSeconds });
};

export const deleteCache = async (redis: Redis, key: string): Promise<void> => {
  await redis.del(key);
};
