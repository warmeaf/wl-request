// 内存缓存适配器实现

import type { CacheAdapter } from '@wl-request/core';

/**
 * 缓存项结构
 */
interface CacheItem {
  /** 缓存值 */
  value: unknown;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
}

/**
 * 内存缓存适配器配置选项
 */
interface CacheAdapterOptions {
  /** 最大缓存条目数，超过时淘汰最旧的项 */
  maxEntries?: number;
}

/**
 * 内存缓存适配器
 * 基于内存 Map 存储，支持 TTL 过期清理和最大容量限制
 */
export class MemoryCacheAdapter implements CacheAdapter {
  /** 内存存储 */
  private cache: Map<string, CacheItem> = new Map();
  /** 最大缓存条目数 */
  private maxEntries?: number;

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options?: CacheAdapterOptions) {
    this.maxEntries = options?.maxEntries;
  }

  /**
   * 淘汰最旧的缓存项
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestExpiresAt = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt < oldestExpiresAt) {
        oldestExpiresAt = item.expiresAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns Promise<T | null> 缓存值，不存在或已过期时返回 null
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），可选。如果不提供，缓存永久有效
   * @returns Promise<void>
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt =
      ttl !== undefined ? (ttl <= 0 ? Date.now() - 1 : Date.now() + ttl) : Number.MAX_SAFE_INTEGER;

    this.cache.set(key, {
      value,
      expiresAt,
    });

    // 如果设置了 maxEntries，清理多余的项
    if (this.maxEntries !== undefined && this.cache.size > this.maxEntries) {
      this.evictOldest();
    }
  }

  /**
   * 删除缓存值
   * @param key 缓存键
   * @returns Promise<void>
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns Promise<boolean> 缓存存在返回 true，否则返回 false
   */
  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清理过期的缓存项
   * @returns Promise<void>
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
