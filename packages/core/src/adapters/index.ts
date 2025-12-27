// 适配器抽象层

import type { RequestAdapter } from '../interfaces';

// 导出缓存适配器注册表
export {
  getDefaultCacheAdapter,
  resetDefaultCacheAdapter,
  setDefaultCacheAdapter,
} from './cache-registry';

import { resetDefaultCacheAdapter as resetCacheAdapter } from './cache-registry';

/**
 * 适配器注册表
 */
const adapterRegistry = new Map<string, RequestAdapter>();

/**
 * 默认适配器实例
 */
let defaultAdapter: RequestAdapter | null = null;

/**
 * FetchAdapter 实例缓存（延迟加载）
 */
let fetchAdapterInstance: RequestAdapter | null = null;

/**
 * 重置所有适配器状态
 * 用于测试环境清理，避免测试之间的状态污染
 */
export function resetAdapters(): void {
  adapterRegistry.clear();
  defaultAdapter = null;
  fetchAdapterInstance = null;
  resetCacheAdapter();
}

/**
 * 创建默认 FetchAdapter 实例
 * 使用延迟加载避免循环依赖
 */
async function createFetchAdapter(): Promise<RequestAdapter> {
  if (fetchAdapterInstance) {
    return fetchAdapterInstance;
  }

  const { FetchAdapter } = await import('@wl-request/adapter-fetch');
  const adapter = new FetchAdapter() as RequestAdapter;
  fetchAdapterInstance = adapter;
  return adapter;
}

/**
 * 注册适配器
 * @param name 适配器名称
 * @param adapter 适配器实例
 */
export function registerAdapter(name: string, adapter: RequestAdapter): void {
  adapterRegistry.set(name, adapter);
}

/**
 * 设置默认适配器
 * @param adapter 适配器实例
 */
export function setDefaultAdapter(adapter: RequestAdapter): void {
  defaultAdapter = adapter;
}

/**
 * 获取默认适配器
 * 如果未设置默认适配器，则创建并返回 FetchAdapter 代理实例
 * 代理适配器会在首次请求时异步加载 FetchAdapter
 * @returns 默认适配器实例
 */
export function getDefaultAdapter(): RequestAdapter {
  if (defaultAdapter) {
    return defaultAdapter;
  }

  if (fetchAdapterInstance) {
    return fetchAdapterInstance;
  }

  const proxyAdapter: RequestAdapter = {
    async request<T>(
      config: import('../interfaces').RequestConfig<T>
    ): Promise<import('../interfaces').Response<T>> {
      const adapter = await createFetchAdapter();
      return adapter.request(config);
    },
  };
  return proxyAdapter;
}

/**
 * 获取适配器
 * @param name 适配器名称，如果未指定或为 'default'，则返回默认适配器
 * @returns 适配器实例，如果未找到则返回 null
 */
export function getAdapter(name?: string): RequestAdapter | null {
  if (!name || name === 'default') {
    return getDefaultAdapter();
  }

  return adapterRegistry.get(name) || null;
}
