// 全局配置管理

import type { GlobalConfig, RequestConfig } from './interfaces';

/**
 * 全局配置存储
 */
let globalConfig: Partial<GlobalConfig> = {};

/**
 * 深度合并对象
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的对象
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (sourceValue === undefined) {
        continue;
      }

      if (sourceValue === null) {
        result[key] = null as T[Extract<keyof T, string>];
        continue;
      }

      if (
        typeof sourceValue === 'object' &&
        typeof targetValue === 'object' &&
        sourceValue !== null &&
        targetValue !== null &&
        !Array.isArray(sourceValue) &&
        !Array.isArray(targetValue)
      ) {
        if (key === 'adapter' || key === 'cacheAdapter') {
          result[key] = sourceValue as T[Extract<keyof T, string>];
        } else {
          result[key] = deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as Record<string, unknown>
          ) as T[Extract<keyof T, string>];
        }
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * 设置全局配置
 * 新配置会与现有全局配置合并（深度合并）
 * @param config 全局配置
 */
export function configure(config: Partial<GlobalConfig>): void {
  globalConfig = deepMerge(globalConfig, config);
}

/**
 * 重置全局配置
 * 用于测试环境清理，避免测试之间的状态污染
 */
export function resetConfig(): void {
  globalConfig = {};
}

/**
 * 获取全局配置
 * @returns 全局配置的副本
 */
export function getGlobalConfig(): Partial<GlobalConfig> {
  return { ...globalConfig };
}

/**
 * 合并全局配置和请求配置
 * 请求配置优先级高于全局配置
 * @param global 全局配置
 * @param local 请求配置
 * @returns 合并后的配置
 */
export function mergeConfig<T = unknown>(
  global: Partial<GlobalConfig>,
  local: Partial<RequestConfig<T>>
): RequestConfig<T> {
  const result = { ...local } as Partial<RequestConfig<T>>;

  for (const key in global) {
    if (Object.hasOwn(global, key)) {
      const globalValue = global[key as keyof GlobalConfig];
      const localValue = result[key as keyof RequestConfig<T>];

      if (localValue === undefined) {
        if (
          typeof globalValue === 'object' &&
          globalValue !== null &&
          !Array.isArray(globalValue)
        ) {
          if (key === 'adapter' || key === 'cacheAdapter') {
            (result as Record<string, unknown>)[key] = globalValue;
          } else {
            (result as Record<string, unknown>)[key] = { ...globalValue };
          }
        } else {
          (result as Record<string, unknown>)[key] = globalValue;
        }
        continue;
      }

      if (key === 'onBefore' || key === 'onSuccess' || key === 'onError' || key === 'onFinally') {
        if (localValue === undefined && globalValue !== undefined) {
          (result as Record<string, unknown>)[key] = globalValue;
        }
        continue;
      }

      if (
        (key === 'headers' || key === 'params') &&
        typeof globalValue === 'object' &&
        globalValue !== null &&
        typeof localValue === 'object' &&
        localValue !== null &&
        !Array.isArray(globalValue) &&
        !Array.isArray(localValue)
      ) {
        const localKeys = Object.keys(localValue as Record<string, unknown>);
        if (localKeys.length === 0) {
          (result as Record<string, unknown>)[key] = localValue;
        } else {
          (result as Record<string, unknown>)[key] = deepMerge(
            globalValue as Record<string, unknown>,
            localValue as Record<string, unknown>
          );
        }
      }
    }
  }

  return result as RequestConfig<T>;
}
