// 全局配置管理

import type { GlobalConfig, RequestConfig } from './interfaces';

/**
 * 钩子键常量，用于类型安全的钩子检查
 */
const HOOK_KEYS = ['onBefore', 'onSuccess', 'onError', 'onFinally'] as const;
type HookKey = (typeof HOOK_KEYS)[number];

/**
 * 检查值是否为普通对象（非数组、非 null）
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 全局配置存储
 */
let globalConfig: Partial<GlobalConfig> = {};

/**
 * 类型安全的值设置函数
 * 避免使用类型断言，通过泛型约束确保类型安全
 */
function setMergedValue<T extends Record<string, unknown>, K extends keyof T>(
  target: T,
  key: K,
  value: T[K]
): void {
  target[key] = value;
}

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

      // null 值直接设置
      if (sourceValue === null) {
        setMergedValue(result, key as keyof T, null as T[keyof T]);
        continue;
      }

      // 对象合并处理
      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        // adapter 和 cacheAdapter 不深度合并，直接覆盖
        if (key === 'adapter' || key === 'cacheAdapter') {
          setMergedValue(result, key as keyof T, sourceValue as T[keyof T]);
        } else {
          const merged = deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as Record<string, unknown>
          );
          setMergedValue(result, key as keyof T, merged as T[keyof T]);
        }
      } else {
        // 非对象值直接设置
        setMergedValue(result, key as keyof T, sourceValue as T[keyof T]);
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
 * 设置配置值的辅助函数（类型安全）
 */
function setConfigValue<T>(result: Partial<RequestConfig<T>>, key: string, value: unknown): void {
  (result as Record<string, unknown>)[key] = value;
}

/**
 * 获取配置值的辅助函数
 */
function getConfigValue<T>(config: Partial<RequestConfig<T>>, key: string): unknown {
  return (config as Record<string, unknown>)[key];
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
  const result: Partial<RequestConfig<T>> = { ...local };

  for (const key in global) {
    if (Object.hasOwn(global, key)) {
      const globalValue = global[key as keyof GlobalConfig];
      const localValue = getConfigValue(result, key);

      if (localValue === undefined) {
        // 本地配置未定义，使用全局配置
        if (isPlainObject(globalValue)) {
          if (key === 'adapter' || key === 'cacheAdapter') {
            // 适配器直接引用，不复制
            setConfigValue(result, key, globalValue);
          } else {
            // 其他对象浅拷贝
            setConfigValue(result, key, { ...globalValue });
          }
        } else {
          setConfigValue(result, key, globalValue);
        }
        continue;
      }

      // 钩子函数特殊处理
      if (HOOK_KEYS.includes(key as HookKey)) {
        // 钩子只在本地未定义时使用全局值
        if (localValue === undefined && globalValue !== undefined) {
          setConfigValue(result, key, globalValue);
        }
        continue;
      }

      // headers 和 params 需要深度合并
      if (
        (key === 'headers' || key === 'params') &&
        isPlainObject(globalValue) &&
        isPlainObject(localValue)
      ) {
        const localKeys = Object.keys(localValue as Record<string, unknown>);
        if (localKeys.length === 0) {
          // 本地配置为空对象，直接使用
          setConfigValue(result, key, localValue);
        } else {
          // 深度合并全局和本地配置
          setConfigValue(
            result,
            key,
            deepMerge(globalValue as Record<string, unknown>, localValue as Record<string, unknown>)
          );
        }
      } else {
        // 其他情况使用本地值覆盖
        setConfigValue(result, key, localValue);
      }
    }
  }

  return result as RequestConfig<T>;
}
