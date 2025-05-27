import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }

  async onModuleInit() {
    await this.client.ping();
    console.log('Connected to Redis');
  }

  async onModuleDestroy() {
    await this.client.quit();
    console.log('Disconnected from Redis');
  }

  async set(key: string, value: string, expirySeconds?: number) {
    if (expirySeconds) {
      await this.client.set(key, value, 'EX', expirySeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async setUserOnline(userId: string, role: 'jobseeker' | 'employer') {
    await this.client.set(`online:${userId}`, role, 'EX', 300); // 5 минут
  }

  async getOnlineUsers() {
    const keys = await this.client.keys('online:*');
    const users = await Promise.all(keys.map(async key => ({
      userId: key.replace('online:', ''),
      role: await this.client.get(key),
    })));
    return {
      jobseekers: users.filter(u => u.role === 'jobseeker').length,
      employers: users.filter(u => u.role === 'employer').length,
    };
  }

  getClient(): Redis {
    return this.client;
  }
}