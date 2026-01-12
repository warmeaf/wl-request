// IndexedDB 缓存适配器实现

import type { CacheAdapter } from '@wl-request/core';
import { calculateExpiresAt, serializeResponse } from '@wl-request/core';

/**
 * 缓存项结构
 */
interface CacheItem {
  /** 缓存键 */
  key: string;
  /** 缓存值 */
  value: unknown;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
}

/**
 * IndexedDB 缓存适配器
 * 基于浏览器 IndexedDB API，支持 TTL 过期清理
 */
export class IndexedDBCacheAdapter implements CacheAdapter {
  /** 数据库名称 */
  private dbName: string;
  /** 对象存储名称 */
  private storeName: string;
  /** 数据库实例 */
  private db: IDBDatabase | null = null;
  /** 数据库初始化 Promise */
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * 构造函数
   * @param dbName 数据库名称，默认为 'wl-request-cache'
   * @param storeName 对象存储名称，默认为 'cache'
   */
  constructor(dbName = 'wl-request-cache', storeName = 'cache') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  /**
   * 初始化数据库
   * @returns Promise<IDBDatabase>
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return await this.initPromise;
    }

    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not supported in this environment');
    }

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        this.initPromise = null;
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'key' });
          objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });

    return await this.initPromise;
  }

  /**
   * 获取数据库实例（确保已初始化）
   * @returns Promise<IDBDatabase>
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns Promise<T | null> 缓存值，不存在或已过期时返回 null
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise<T | null>((resolve, reject) => {
        const request = store.get(key);

        request.onerror = () => {
          reject(new Error(`Failed to get cache: ${request.error?.message}`));
        };

        request.onsuccess = () => {
          const item = request.result as CacheItem | undefined;

          if (!item) {
            resolve(null);
            return;
          }

          if (Date.now() > item.expiresAt) {
            // 延迟删除到当前事务完成后
            transaction.oncomplete = () => {
              this.delete(key).catch(() => {
                // 静默处理：过期项删除失败不影响主流程
              });
            };
            resolve(null);
            return;
          }

          resolve(item.value as T);
        };
      });
    } catch {
      // 静默处理：IndexedDB 访问可能因各种原因失败
      // 缓存失败不应阻断主流程，返回 null 表示未命中
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），可选。如果不提供，缓存永久有效
   * @returns Promise<void>
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    const expiresAt = calculateExpiresAt(ttl);
    const serializedValue = serializeResponse(value);

    const item: CacheItem = {
      key,
      value: serializedValue,
      expiresAt,
    };

    return new Promise<void>((resolve, reject) => {
      const request = store.put(item);

      request.onerror = () => {
        reject(new Error(`Failed to set cache: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 删除缓存值
   * @param key 缓存键
   * @returns Promise<void>
   */
  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise<void>((resolve, reject) => {
        const request = store.delete(key);

        request.onerror = () => {
          reject(new Error(`Failed to delete cache: ${request.error?.message}`));
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      // 静默处理 IndexedDB 相关错误，其他错误继续抛出
      if (error instanceof Error && error.message.includes('IndexedDB')) {
        return;
      }
      throw error;
    }
  }

  /**
   * 清空所有缓存
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise<void>((resolve, reject) => {
        const request = store.clear();

        request.onerror = () => {
          reject(new Error(`Failed to clear cache: ${request.error?.message}`));
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      // 静默处理 IndexedDB 相关错误，其他错误继续抛出
      if (error instanceof Error && error.message.includes('IndexedDB')) {
        return;
      }
      throw error;
    }
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns Promise<boolean> 缓存存在返回 true，否则返回 false
   */
  async has(key: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise<boolean>((resolve, reject) => {
        const request = store.get(key);

        request.onerror = () => {
          reject(new Error(`Failed to check cache: ${request.error?.message}`));
        };

        request.onsuccess = () => {
          const item = request.result as CacheItem | undefined;

          if (!item) {
            resolve(false);
            return;
          }

          const isValid = Date.now() <= item.expiresAt;

          if (!isValid) {
            // 延迟删除到当前事务完成后
            transaction.oncomplete = () => {
              this.delete(key).catch(() => {
                // 静默处理：过期项删除失败不影响主流程
              });
            };
          }

          resolve(isValid);
        };
      });
    } catch {
      // 静默处理：IndexedDB 访问可能因各种原因失败
      // 返回 false 表示缓存不存在
      return false;
    }
  }

  /**
   * 清理过期的缓存项
   * @returns Promise<void>
   */
  async cleanup(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('expiresAt');
      const now = Date.now();

      return new Promise<void>((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.upperBound(now));

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            // 在同一个事务中删除
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () =>
          reject(new Error(`Failed to cleanup cache: ${request.error?.message}`));
      });
    } catch {
      // 静默处理：cleanup 是维护性操作，失败不应影响主流程
    }
  }
}
