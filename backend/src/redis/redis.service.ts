import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor() {
    const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6380;

    this.client = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: port,
      password: process.env.REDIS_PASSWORD ?? undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        console.warn(`Redis retry attempt ${times}`);
        return Math.min(times * 50, 2000);
      },
      reconnectOnError: (err) => {
        console.error('Redis reconnect error:', err.message);
        return err.message.includes('CONNECTION_BROKEN') ? 1 : false; // Fix: Replace 0 with false
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      console.log('Connected to Redis');
      const info = await this.client.info('MEMORY');
      console.log('Redis Memory Info:', info);
    } catch (err) {
      console.error('Failed to connect to Redis:', err.message);
      throw new Error('Redis connection failed');
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
      console.log('Disconnected from Redis');
    } catch (err) {
      console.error('Failed to disconnect from Redis:', err.message);
    }
  }

  async set(key: string, value: string, expirySeconds?: number) {
    try {
      if (expirySeconds) {
        await this.client.set(key, value, 'EX', expirySeconds);
      } else {
        await this.client.set(key, value);
      }
      console.debug(`Redis set: ${key}`);
    } catch (err) {
      console.error(`Failed to set key ${key}:`, err.message);
      throw new Error('Redis set operation failed');
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      console.debug(`Redis get: ${key} -> ${value}`);
      return value;
    } catch (err) {
      console.error(`Failed to get key ${key}:`, err.message);
      throw new Error('Redis get operation failed');
    }
  }

  async del(key: string) {
    try {
      await this.client.del(key);
      console.debug(`Redis del: ${key}`);
    } catch (err) {
      console.error(`Failed to delete key ${key}:`, err.message);
      throw new Error('Redis delete operation failed');
    }
  }

  async setUserOnline(userId: string, role: 'jobseeker' | 'employer') {
    await this.set(`online:${userId}`, role, 300);
    const ttl = await this.client.ttl(`online:${userId}`);
    console.debug(`User ${userId} set online with role ${role}, TTL: ${ttl} seconds`);
  }

  async getOnlineUsers() {
    try {
      const keys = await this.client.keys('online:*');
      const users = await Promise.all(
        keys.map(async (key) => ({
          userId: key.replace('online:', ''),
          role: await this.client.get(key),
        })),
      );
      return {
        jobseekers: users.filter((u) => u.role === 'jobseeker').length,
        employers: users.filter((u) => u.role === 'employer').length,
      };
    } catch (err) {
      console.error('Failed to get online users:', err.message);
      throw new Error('Redis get online users failed');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (err) {
      console.error('Redis health check failed:', err.message);
      return false;
    }
  }
async cleanOldSessions() {
  try {
    const keys = await this.client.keys('sess:*');
    const expiredKeys = await Promise.all(
      keys.map(async (key) => {
        const ttl = await this.client.ttl(key);
        if (ttl < 0) {
          await this.client.del(key);
          return key;
        }
        return null;
      }),
    );
    console.log('Cleaned expired sessions:', expiredKeys.filter((k) => k));
  } catch (err) {
    console.error('Failed to clean old sessions:', err.message);
  }
}
}
