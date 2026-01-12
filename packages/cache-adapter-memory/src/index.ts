// 内存缓存适配器实现

import type { CacheAdapter } from '@wl-request/core';
import { calculateExpiresAt } from '@wl-request/core';

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
 * 利用 Map 的迭代顺序特性实现 O(1) 的 LRU 淘汰算法
 */
export class MemoryCacheAdapter implements CacheAdapter {
  /** 内存存储（Map 保持插入顺序，用于 LRU） */
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
   * 更新访问顺序（O(1) 复杂度）
   * 利用 Map 的迭代顺序特性：delete 后 set 会将 key 移到末尾
   * @param key 缓存键
   */
  private updateAccessOrder(key: string): void {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
  }

  /**
   * 淘汰最旧的缓存项（O(1) 复杂度）
   * Map 的第一个元素就是最早插入（最旧）的
   */
  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
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

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问顺序（LRU）
    this.updateAccessOrder(key);

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
    const expiresAt = calculateExpiresAt(ttl);

    // 如果 key 已存在，先删除以更新访问顺序
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

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

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    // 更新访问顺序（LRU）
    this.updateAccessOrder(key);

    return true;
  }

  /**
   * 清理过期的缓存项
   * @returns Promise<void>
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // 收集过期的键
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expiredKeys.push(key);
      }
    }

    // 删除过期的键
    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }
}
