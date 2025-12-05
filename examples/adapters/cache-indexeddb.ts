// IndexedDB 缓存适配器示例

import { FetchAdapter } from '@wl-request/adapter-fetch';
import { IndexedDBCacheAdapter } from '@wl-request/cache-adapter-indexeddb';
import type { RequestConfig } from '@wl-request/core';
import { configure, useRequest } from '@wl-request/core';

const indexedDBCacheAdapter = new IndexedDBCacheAdapter();

configure({
  cacheAdapter: indexedDBCacheAdapter,
  baseURL: 'https://jsonplaceholder.typicode.com',
});

const output = document.getElementById('output') as HTMLDivElement;
const btnIndexedDBCache = document.getElementById('btn-indexeddb-cache') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

let requestCount = 0;

btnIndexedDBCache.addEventListener('click', async () => {
  log('开始 IndexedDB 缓存适配器示例...');
  btnIndexedDBCache.disabled = true;
  requestCount = 0;

  const countingAdapter = {
    async request<T>(config: RequestConfig<T>) {
      requestCount++;
      log(`实际请求次数: ${requestCount}`);
      const fetchAdapter = new FetchAdapter();
      return fetchAdapter.request(config);
    },
  };

  try {
    const { send } = useRequest({
      url: '/posts/1',
      adapter: countingAdapter,
      cache: {
        key: 'post-1-indexeddb',
        ttl: 5000,
        cacheAdapter: indexedDBCacheAdapter,
      },
      onSuccess: (response) => {
        log(`请求成功: ${JSON.stringify(response.data, null, 2)}`, 'success');
      },
    });

    log('第一次请求（会实际发送请求）...');
    await send();
    log(`第一次请求完成，实际请求次数: ${requestCount}`);

    log('第二次请求（应该使用缓存，不会实际发送请求）...');
    await send();
    log(`第二次请求完成，实际请求次数: ${requestCount}（应该还是1）`, 'success');
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnIndexedDBCache.disabled = false;
  }
});

btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

log('wl-request IndexedDB 缓存适配器示例已加载，点击按钮开始测试。');
