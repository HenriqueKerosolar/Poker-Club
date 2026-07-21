import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private logger = new Logger('RedisService');

  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', err => {
      this.logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Conectado ao Redis');
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log('❌ Desconectado do Redis');
    }
  }

  /**
   * Get string value
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set string value with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get JSON value
   */
  async getJson<T = any>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Set JSON value with optional TTL
   */
  async setJson<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Delete key
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) > 0;
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  /**
   * Subscribe to channel (use with caution in services)
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();

    await subscriber.subscribe(channel, (message: string) => {
      callback(message);
    });
  }

  /**
   * Atomic increment
   */
  async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Atomic decrement
   */
  async decrement(key: string): Promise<number> {
    return this.client.decr(key);
  }

  /**
   * Get client for advanced operations
   */
  getClient(): RedisClientType {
    return this.client;
  }
}
