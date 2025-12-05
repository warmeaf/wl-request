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

      // 如果源值为 undefined，跳过（不覆盖）
      if (sourceValue === undefined) {
        continue;
      }

      // 如果源值为 null，直接覆盖
      if (sourceValue === null) {
        result[key] = null as T[Extract<keyof T, string>];
        continue;
      }

      // 如果源值和目标值都是对象，且不是数组，进行深度合并
      if (
        typeof sourceValue === 'object' &&
        typeof targetValue === 'object' &&
        sourceValue !== null &&
        targetValue !== null &&
        !Array.isArray(sourceValue) &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        // 否则直接覆盖
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
export function mergeConfig<T extends Partial<RequestConfig>>(
  global: Partial<GlobalConfig>,
  local: T
): T {
  // 创建本地配置的副本
  const result = { ...local };

  // 遍历全局配置的所有属性
  for (const key in global) {
    if (Object.hasOwn(global, key)) {
      const globalValue = global[key as keyof GlobalConfig];
      const localValue = result[key as keyof T];

      // 如果本地配置中不存在该属性，使用全局配置的值
      if (localValue === undefined) {
        // 对于对象类型（headers、params），需要深度复制
        if (
          typeof globalValue === 'object' &&
          globalValue !== null &&
          !Array.isArray(globalValue)
        ) {
          result[key as keyof T] = { ...globalValue } as T[keyof T];
        } else {
          result[key as keyof T] = globalValue as T[keyof T];
        }
        continue;
      }

      // 如果本地配置中存在该属性，需要处理合并逻辑
      // Hook 函数直接覆盖，不合并
      if (key === 'onBefore' || key === 'onSuccess' || key === 'onError' || key === 'onFinally') {
        // Hook 函数：本地配置覆盖全局配置
        continue;
      }

      // 对象类型字段（headers、params）需要深度合并
      // 但如果本地配置是空对象，则直接覆盖（不合并）
      if (
        (key === 'headers' || key === 'params') &&
        typeof globalValue === 'object' &&
        globalValue !== null &&
        typeof localValue === 'object' &&
        localValue !== null &&
        !Array.isArray(globalValue) &&
        !Array.isArray(localValue)
      ) {
        // 检查本地配置是否为空对象
        const localKeys = Object.keys(localValue as Record<string, unknown>);
        if (localKeys.length === 0) {
          // 空对象直接覆盖
          result[key as keyof T] = localValue;
        } else {
          // 非空对象深度合并
          result[key as keyof T] = deepMerge(
            globalValue as Record<string, unknown>,
            localValue as Record<string, unknown>
          ) as T[keyof T];
        }
      }
      // 其他情况：本地配置优先级更高，已经使用本地配置的值
    }
  }

  return result;
}
