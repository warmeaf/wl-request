// LocalStorage 缓存适配器实现

import type { CacheAdapter } from '../interfaces';

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
 * LocalStorage 缓存适配器
 * 基于浏览器 localStorage API，支持 TTL 过期清理
 */
export class LocalStorageCacheAdapter implements CacheAdapter {
  private prefix: string;

  /**
   * 构造函数
   * @param prefix 缓存键前缀，默认为 'wl-request:'
   */
  constructor(prefix = 'wl-request:') {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }
    this.prefix = prefix;
  }

  /**
   * 获取完整的缓存键（添加前缀）
   * @param key 原始键
   * @returns 完整键
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 序列化 Response 对象，移除不可序列化的 raw 属性
   * @param value 要序列化的值
   * @returns 序列化后的值
   */
  private serializeValue(value: unknown): unknown {
    if (
      value &&
      typeof value === 'object' &&
      'status' in value &&
      'statusText' in value &&
      'headers' in value &&
      'data' in value
    ) {
      const { raw: _raw, ...serializableResponse } = value as {
        raw?: unknown;
        [key: string]: unknown;
      };
      return serializableResponse;
    }
    return value;
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns Promise<T | null> 缓存值，不存在或已过期时返回 null
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const item = await this.validateAndGetItem(key);
    return item ? (item.value as T) : null;
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），可选。如果不提供，缓存永久有效
   * @returns Promise<void>
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const expiresAt =
      ttl !== undefined ? (ttl <= 0 ? Date.now() - 1 : Date.now() + ttl) : Number.MAX_SAFE_INTEGER;

    const serializedValue = this.serializeValue(value);

    const item: CacheItem = {
      value: serializedValue,
      expiresAt,
    };

    try {
      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      if (error instanceof Error) {
        const quotaError = error as Error & { code?: number; name?: string };
        if (
          quotaError.code === 22 ||
          quotaError.name === 'QuotaExceededError' ||
          quotaError.message.includes('QuotaExceededError')
        ) {
          throw new Error('Storage quota exceeded');
        }
      }
      throw error;
    }
  }

  /**
   * 验证并获取缓存项，处理过期和无效数据
   * @param key 缓存键
   * @returns Promise<CacheItem | null> 有效的缓存项，否则返回 null
   */
  private async validateAndGetItem(key: string): Promise<CacheItem | null> {
    try {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);

      if (!stored) {
        return null;
      }

      let item: CacheItem;
      try {
        item = JSON.parse(stored) as CacheItem;
      } catch {
        localStorage.removeItem(fullKey);
        return null;
      }

      if (typeof item.expiresAt !== 'number') {
        localStorage.removeItem(fullKey);
        return null;
      }

      if (Date.now() > item.expiresAt) {
        localStorage.removeItem(fullKey);
        return null;
      }

      return item;
    } catch {
      return null;
    }
  }

  /**
   * 删除缓存值
   * @param key 缓存键
   * @returns Promise<void>
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    localStorage.removeItem(fullKey);
  }

  /**
   * 清空所有缓存
   * 只清除带前缀的键
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns Promise<boolean> 缓存存在返回 true，否则返回 false
   */
  async has(key: string): Promise<boolean> {
    return (await this.validateAndGetItem(key)) !== null;
  }

  /**
   * 清理过期的缓存项
   * @returns Promise<void>
   */
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const item = JSON.parse(stored) as CacheItem;
              if (typeof item.expiresAt === 'number' && now > item.expiresAt) {
                keysToRemove.push(key);
              }
            } catch {
              keysToRemove.push(key);
            }
          }
        }
      }

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch {
      // 忽略错误
    }
  }
}
