// 完整示例 - 综合演示所有功能

import { FetchAdapter } from '@wl-request/adapter-fetch';
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory';
import type { RequestConfig } from '@wl-request/core';
import { configure, useParallelRequests, useRequest, useSerialRequests } from '@wl-request/core';

// 全局配置
const cacheAdapter = new MemoryCacheAdapter();

configure({
  adapter: new FetchAdapter(),
  cacheAdapter,
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: {
    'Content-Type': 'application/json',
  },
  onBefore: (config) => {
    log(`准备请求: ${config.url}`);
    return config;
  },
  onSuccess: (response) => {
    log(`请求成功: ${response.status}`, 'success');
  },
  onError: (error) => {
    log(`请求失败: ${error.message}`, 'error');
  },
  onFinally: () => {
    log('请求完成');
  },
});

// 获取 DOM 元素
const output = document.getElementById('output') as HTMLDivElement;
const btnBasic = document.getElementById('btn-basic') as HTMLButtonElement;
const btnRetry = document.getElementById('btn-retry') as HTMLButtonElement;
const btnCache = document.getElementById('btn-cache') as HTMLButtonElement;
const btnIdempotent = document.getElementById('btn-idempotent') as HTMLButtonElement;
const btnParallel = document.getElementById('btn-parallel') as HTMLButtonElement;
const btnSerial = document.getElementById('btn-serial') as HTMLButtonElement;
const btnCombined = document.getElementById('btn-combined') as HTMLButtonElement;

// 输出函数
function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

// 基本请求
btnBasic.addEventListener('click', async () => {
  log('=== 基本请求示例 ===');
  btnBasic.disabled = true;

  try {
    const { send } = useRequest({
      url: '/posts/1',
    });

    const response = await send();
    log(`响应数据: ${JSON.stringify(response.data, null, 2)}`, 'success');
  } catch (error) {
    log(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnBasic.disabled = false;
  }
});

// 重试请求
btnRetry.addEventListener('click', async () => {
  log('=== 重试请求示例 ===');
  btnRetry.disabled = true;

  let attemptCount = 0;
  const errorAdapter = {
    async request<T>(config: RequestConfig<T>) {
      attemptCount++;
      log(`尝试第 ${attemptCount} 次`);
      if (attemptCount < 3) {
        throw new Error(`请求失败 (尝试 ${attemptCount})`);
      }
      const fetchAdapter = new FetchAdapter();
      return fetchAdapter.request(config);
    },
  };

  try {
    const { send } = useRequest({
      url: '/posts/1',
      adapter: errorAdapter,
      retry: {
        count: 3,
        delay: 200,
      },
    });

    await send();
    log(`重试成功，总共尝试 ${attemptCount} 次`, 'success');
  } catch (error) {
    log(`重试失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnRetry.disabled = false;
  }
});

// 缓存请求
btnCache.addEventListener('click', async () => {
  log('=== 缓存请求示例 ===');
  btnCache.disabled = true;

  let requestCount = 0;
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
        key: 'post-1-full',
        ttl: 5000,
      },
    });

    await send();
    await send();
    log(`两次请求完成，实际请求次数: ${requestCount}（应该只有1次）`, 'success');
  } catch (error) {
    log(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnCache.disabled = false;
  }
});

// 幂等请求
btnIdempotent.addEventListener('click', async () => {
  log('=== 幂等请求示例 ===');
  btnIdempotent.disabled = true;

  let requestCount = 0;
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
        key: 'create-post-full',
        ttl: 5000,
      },
    });

    await send();
    await send();
    log(`两次请求完成，实际请求次数: ${requestCount}（应该只有1次）`, 'success');
  } catch (error) {
    log(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnIdempotent.disabled = false;
  }
});

// 并行请求
btnParallel.addEventListener('click', async () => {
  log('=== 并行请求示例 ===');
  btnParallel.disabled = true;

  const startTime = Date.now();

  try {
    const { send } = useParallelRequests(
      [{ url: '/posts/1' }, { url: '/posts/2' }, { url: '/posts/3' }],
      {
        onSuccess: (results) => {
          const duration = Date.now() - startTime;
          log(`并行请求完成，耗时: ${duration}ms，成功: ${results.length} 个`, 'success');
        },
      }
    );

    await send();
  } catch (error) {
    log(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnParallel.disabled = false;
  }
});

// 串行请求
btnSerial.addEventListener('click', async () => {
  log('=== 串行请求示例 ===');
  btnSerial.disabled = true;

  const startTime = Date.now();

  try {
    const { send } = useSerialRequests(
      [{ url: '/posts/1' }, { url: '/posts/2' }, { url: '/posts/3' }],
      {
        onSuccess: (results) => {
          const duration = Date.now() - startTime;
          log(`串行请求完成，耗时: ${duration}ms，成功: ${results.length} 个`, 'success');
        },
      }
    );

    await send();
  } catch (error) {
    log(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnSerial.disabled = false;
  }
});

// 组合功能
btnCombined.addEventListener('click', async () => {
  log('=== 组合功能示例（重试 + 缓存 + 幂等） ===');
  btnCombined.disabled = true;

  let attemptCount = 0;
  let requestCount = 0;

  const combinedAdapter = {
    async request<T>(config: RequestConfig<T>) {
      attemptCount++;
      requestCount++;
      log(`尝试 ${attemptCount}，实际请求 ${requestCount}`);
      if (attemptCount < 2) {
        throw new Error('请求失败');
      }
      const fetchAdapter = new FetchAdapter();
      return fetchAdapter.request(config);
    },
  };

  try {
    const { send } = useRequest({
      url: '/posts',
      method: 'POST',
      adapter: combinedAdapter,
      data: {
        title: 'combined',
        body: 'test',
        userId: 1,
      },
      retry: {
        count: 3,
        delay: 200,
      },
      cache: {
        key: 'combined-cache',
        ttl: 5000,
      },
      idempotent: {
        key: 'combined-idempotent',
        ttl: 5000,
      },
    });

    // 第一次请求（会重试）
    log('第一次请求（会重试）...');
    attemptCount = 0;
    await send();

    // 第二次请求（使用缓存和幂等）
    log('第二次请求（使用缓存和幂等）...');
    attemptCount = 0;
    await send();

    log(`组合功能测试完成，实际请求次数: ${requestCount}`, 'success');
  } catch (error) {
    log(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnCombined.disabled = false;
  }
});

// 初始化提示
log('wl-request 完整示例已加载，点击按钮开始测试。');
