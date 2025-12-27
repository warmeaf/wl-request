// 缓存适配器注册表

import { getGlobalConfig } from '../config';
import type { CacheAdapter } from '../interfaces';

/**
 * 默认缓存适配器
 * 必须通过 setDefaultCacheAdapter 设置，或者在全局配置中指定
 */
let defaultCacheAdapter: CacheAdapter | null = null;

/**
 * 设置默认缓存适配器
 * @param adapter 缓存适配器实例
 */
export function setDefaultCacheAdapter(adapter: CacheAdapter): void {
  defaultCacheAdapter = adapter;
}

/**
 * 获取默认缓存适配器
 * @returns 当前默认缓存适配器，未设置时返回 null
 */
export function getDefaultCacheAdapter(): CacheAdapter | null {
  const globalConfig = getGlobalConfig();
  if (globalConfig.cacheAdapter) {
    return globalConfig.cacheAdapter;
  }
  return defaultCacheAdapter;
}

/**
 * 重置默认缓存适配器
 * 用于测试或需要切换默认适配器的场景
 */
export function resetDefaultCacheAdapter(): void {
  defaultCacheAdapter = null;
}
