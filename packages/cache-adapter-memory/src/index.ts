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
 * 内存缓存适配器
 * 基于内存 Map 存储，支持 TTL 过期清理
 */
export class MemoryCacheAdapter implements CacheAdapter {
  /** 内存存储 */
  private cache: Map<string, CacheItem> = new Map();

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns Promise<T | null> 缓存值，不存在或已过期时返回 null
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    // 缓存不存在
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      // 已过期，删除缓存项
      this.cache.delete(key);
      return null;
    }

    // 返回缓存值
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
    // 如果 TTL 为 0 或负数，立即过期（设置为当前时间之前）
    const expiresAt =
      ttl !== undefined ? (ttl <= 0 ? Date.now() - 1 : Date.now() + ttl) : Number.MAX_SAFE_INTEGER;

    this.cache.set(key, {
      value,
      expiresAt,
    });
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
}
