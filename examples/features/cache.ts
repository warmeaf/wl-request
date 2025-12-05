// 缓存功能示例

import { FetchAdapter } from '@wl-request/adapter-fetch';
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory';
import type { RequestConfig } from '@wl-request/core';
import { configure, useRequest } from '@wl-request/core';

configure({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
});

const output = document.getElementById('output') as HTMLDivElement;
const btnCache = document.getElementById('btn-cache') as HTMLButtonElement;
const btnCacheExpired = document.getElementById('btn-cache-expired') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

const cacheAdapter = new MemoryCacheAdapter();

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

let requestCount = 0;

btnCache.addEventListener('click', async () => {
  log('开始缓存请求示例...');
  btnCache.disabled = true;
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
        key: 'post-1',
        ttl: 5000, // 5秒缓存
        cacheAdapter,
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
    btnCache.disabled = false;
  }
});

btnCacheExpired.addEventListener('click', async () => {
  log('开始缓存过期示例...');
  btnCacheExpired.disabled = true;
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
        key: 'post-1-expired',
        ttl: 500, // 0.5秒缓存（很短）
        cacheAdapter,
      },
      onSuccess: (response) => {
        log(`请求成功: ${JSON.stringify(response.data, null, 2)}`, 'success');
      },
    });

    log('第一次请求...');
    await send();
    log(`第一次请求完成，实际请求次数: ${requestCount}`);

    log('等待缓存过期（600ms）...');
    await new Promise((resolve) => setTimeout(resolve, 600));

    log('第二次请求（缓存已过期，应该重新请求）...');
    await send();
    log(`第二次请求完成，实际请求次数: ${requestCount}（应该是2）`, 'success');
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnCacheExpired.disabled = false;
  }
});

btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

log('wl-request 缓存功能示例已加载，点击按钮开始测试。');
