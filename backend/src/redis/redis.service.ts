import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) { 
    const port = this.configService.get<string>('REDIS_PORT');
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: parseInt(port, 10),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
      },
      reconnectOnError: (err) => {
        return err.message.includes('CONNECTION_BROKEN') ? 1 : false;
      },
    });

    this.client.on('error', (err) => {
    });

    this.client.on('connect', () => {
    });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      const info = await this.client.info('MEMORY');
    } catch (err) {
      throw new Error('Redis connection failed');
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch (err) {
    }
  }

  async set(key: string, value: string, expirySeconds?: number) {
    try {
      if (expirySeconds) {
        await this.client.set(key, value, 'EX', expirySeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      throw new Error('Redis set operation failed');
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      return value;
    } catch (err) {
      throw new Error('Redis get operation failed');
    }
  }

  async del(key: string) {
    try {
      await this.client.del(key);
    } catch (err) {
      throw new Error('Redis delete operation failed');
    }
  }

async setUserOnline(
  userId: string,
  role: 'jobseeker' | 'employer' | 'admin' | 'moderator' | 'affiliate',
) {
  await this.set(`online:${userId}`, role, 300);
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
  } catch (err) {
  }
}

async extendOnlineStatus(
  userId: string,
  role: 'jobseeker' | 'employer' | 'admin' | 'moderator' | 'affiliate',
) {
  const key = `online:${userId}`;
  const exists = await this.client.get(key);
  if (exists) {
    await this.client.expire(key, 300); 
  } else {
    await this.setUserOnline(userId, role);
  }
}
}
