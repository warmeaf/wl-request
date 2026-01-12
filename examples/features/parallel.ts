// 并行请求示例

import type { RequestConfig } from '@wl-request/core';
import { configure, FetchAdapter, useParallelRequests } from '@wl-request/core';

configure({
  baseURL: 'https://jsonplaceholder.typicode.com',
});

const output = document.getElementById('output') as HTMLDivElement;
const btnParallel = document.getElementById('btn-parallel') as HTMLButtonElement;
const btnPartialFailure = document.getElementById('btn-partial-failure') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

btnParallel.addEventListener('click', async () => {
  log('开始并行请求示例（默认 failFast: true，有一个失败就整体失败）...');
  btnParallel.disabled = true;

  const startTime = Date.now();

  try {
    const { send } = useParallelRequests(
      [{ url: '/posts/1' }, { url: '/posts/2' }, { url: '/posts/3' }],
      {
        // failFast: true 是默认值，有一个失败就整体失败
        failFast: true,
        onBefore: () => {
          log('开始并行请求...');
        },
        onSuccess: (results) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          log(`所有请求完成，耗时: ${duration}ms`, 'success');
          log(`成功请求数: ${results.length}`, 'success');
          results.forEach((result, index) => {
            log(`请求 ${index + 1} 结果: ${JSON.stringify(result.data, null, 2)}`, 'success');
          });
        },
        onError: (errors) => {
          log(`部分请求失败: ${errors.length} 个错误`, 'error');
          errors.forEach((error, index) => {
            log(`错误 ${index + 1}: ${error.message}`, 'error');
          });
        },
        onFinally: () => {
          log('并行请求完成');
        },
      }
    );

    await send();
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnParallel.disabled = false;
  }
});

btnPartialFailure.addEventListener('click', async () => {
  log('开始部分失败处理示例（failFast: false，允许部分失败，只返回成功的结果）...');
  btnPartialFailure.disabled = true;

  const errorAdapter = {
    async request<T>(config: RequestConfig<T>) {
      if (config.url === '/posts/999') {
        throw new Error('请求失败');
      }
      const fetchAdapter = new FetchAdapter();
      return fetchAdapter.request(config);
    },
  };

  try {
    const { send } = useParallelRequests(
      [
        { url: '/posts/1', adapter: errorAdapter },
        { url: '/posts/999', adapter: errorAdapter },
        { url: '/posts/3', adapter: errorAdapter },
      ],
      {
        // failFast: false 允许部分失败，只返回成功的结果，不抛出错误
        failFast: false,
        onSuccess: (results) => {
          log(`成功请求数: ${results.length}`, 'success');
          results.forEach((result, index) => {
            log(`成功请求 ${index + 1}: ${JSON.stringify(result.data, null, 2)}`, 'success');
          });
        },
        onError: (errors) => {
          log(`失败请求数: ${errors.length}`, 'error');
          errors.forEach((error, index) => {
            log(`错误 ${index + 1}: ${error.message}`, 'error');
          });
        },
      }
    );

    // failFast: false 时，即使有错误也不会抛出异常
    const results = await send();
    log(`最终返回 ${results.length} 个成功的结果`, 'success');
  } catch (error) {
    // failFast: false 时不应该进入这里
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnPartialFailure.disabled = false;
  }
});

btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

log('wl-request 并行请求示例已加载，点击按钮开始测试。');
