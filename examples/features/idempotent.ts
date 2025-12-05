// 幂等功能示例

import { FetchAdapter } from '@wl-request/adapter-fetch';
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory';
import type { RequestConfig } from '@wl-request/core';
import { configure, useRequest } from '@wl-request/core';

configure({
  baseURL: 'https://jsonplaceholder.typicode.com',
});

const output = document.getElementById('output') as HTMLDivElement;
const btnIdempotent = document.getElementById('btn-idempotent') as HTMLButtonElement;
const btnDifferentKeys = document.getElementById('btn-different-keys') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

const cacheAdapter = new MemoryCacheAdapter();

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

let requestCount = 0;

btnIdempotent.addEventListener('click', async () => {
  log('开始幂等请求示例...');
  btnIdempotent.disabled = true;
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
      url: '/posts',
      method: 'POST',
      adapter: countingAdapter,
      data: {
        title: 'foo',
        body: 'bar',
        userId: 1,
      },
      idempotent: {
        key: 'create-post-123',
        ttl: 5000, // 5秒内相同请求只执行一次
        cacheAdapter,
      },
      onSuccess: (response) => {
        log(`请求成功: ${JSON.stringify(response.data, null, 2)}`, 'success');
      },
    });

    log('第一次请求（会实际发送请求）...');
    const response1 = await send();
    log(`第一次请求完成，实际请求次数: ${requestCount}`);

    log('第二次请求（相同幂等键，应该被拦截）...');
    const response2 = await send();
    log(`第二次请求完成，实际请求次数: ${requestCount}（应该还是1）`, 'success');
    log(`两次请求返回相同结果: ${response1.data === response2.data}`, 'success');
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnIdempotent.disabled = false;
  }
});

btnDifferentKeys.addEventListener('click', async () => {
  log('开始不同幂等键的请求示例...');
  btnDifferentKeys.disabled = true;
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
    const instance1 = useRequest({
      url: '/posts',
      method: 'POST',
      adapter: countingAdapter,
      data: {
        title: 'foo',
        body: 'bar',
        userId: 1,
      },
      idempotent: {
        key: 'create-post-456',
        ttl: 5000,
        cacheAdapter,
      },
    });

    const instance2 = useRequest({
      url: '/posts',
      method: 'POST',
      adapter: countingAdapter,
      data: {
        title: 'baz',
        body: 'qux',
        userId: 2,
      },
      idempotent: {
        key: 'create-post-789',
        ttl: 5000,
        cacheAdapter,
      },
    });

    log('并发发送两个不同幂等键的请求...');
    await Promise.all([instance1.send(), instance2.send()]);
    log(`两个请求完成，实际请求次数: ${requestCount}（应该是2）`, 'success');
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnDifferentKeys.disabled = false;
  }
});

btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

log('wl-request 幂等功能示例已加载，点击按钮开始测试。');
