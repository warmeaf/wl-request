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
 * 通过泛型约束确保类型安全，避免在调用处使用类型断言
 * @param target 目标对象
 * @param key 键名
 * @param value 要设置的值
 */
function setObjectValue<T extends Record<string, unknown>, K extends keyof T>(
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
        setObjectValue(result, key as keyof T, null as T[keyof T]);
        continue;
      }

      // 对象合并处理
      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        // adapter 和 cacheAdapter 不深度合并，直接覆盖
        if (key === 'adapter' || key === 'cacheAdapter') {
          setObjectValue(result, key as keyof T, sourceValue as T[keyof T]);
        } else {
          const merged = deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as Record<string, unknown>
          );
          setObjectValue(result, key as keyof T, merged as T[keyof T]);
        }
      } else {
        // 非对象值直接设置
        setObjectValue(result, key as keyof T, sourceValue as T[keyof T]);
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
 *
 * 注意：由于需要动态遍历配置键，此函数内部使用 Record<string, unknown>
 * 进行类型转换，这是处理动态键访问的必要做法
 *
 * @param global 全局配置
 * @param local 请求配置
 * @returns 合并后的配置
 */
export function mergeConfig<T = unknown>(
  global: Partial<GlobalConfig>,
  local: Partial<RequestConfig<T>>
): RequestConfig<T> {
  // 使用 Record 类型进行动态键操作
  const result = { ...local } as Record<string, unknown>;

  for (const key in global) {
    if (Object.hasOwn(global, key)) {
      const globalValue = (global as Record<string, unknown>)[key];
      const localValue = result[key];

      if (localValue === undefined) {
        // 本地配置未定义，使用全局配置
        if (isPlainObject(globalValue)) {
          if (key === 'adapter' || key === 'cacheAdapter') {
            // 适配器直接引用，不复制
            result[key] = globalValue;
          } else {
            // 其他对象浅拷贝
            result[key] = { ...globalValue };
          }
        } else {
          result[key] = globalValue;
        }
        continue;
      }

      // 钩子函数特殊处理：只在本地未定义时使用全局值
      if (HOOK_KEYS.includes(key as HookKey)) {
        if (localValue === undefined && globalValue !== undefined) {
          result[key] = globalValue;
        }
        continue;
      }

      // headers 和 params 需要深度合并
      if (
        (key === 'headers' || key === 'params') &&
        isPlainObject(globalValue) &&
        isPlainObject(localValue)
      ) {
        const localKeys = Object.keys(localValue);
        if (localKeys.length === 0) {
          // 本地配置为空对象，直接使用
          result[key] = localValue;
        } else {
          // 深度合并全局和本地配置
          result[key] = deepMerge(globalValue, localValue);
        }
      }
      // 其他情况保持本地值（已在初始复制时设置）
    }
  }

  return result as unknown as RequestConfig<T>;
}
