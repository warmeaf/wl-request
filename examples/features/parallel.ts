// 并行请求示例

import { FetchAdapter } from '@wl-request/adapter-fetch';
import type { RequestConfig } from '@wl-request/core';
import { configure, useParallelRequests } from '@wl-request/core';

// 设置默认适配器
configure({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
});

// 获取 DOM 元素
const output = document.getElementById('output') as HTMLDivElement;
const btnParallel = document.getElementById('btn-parallel') as HTMLButtonElement;
const btnPartialFailure = document.getElementById('btn-partial-failure') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

// 输出函数
function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

// 并行请求示例
btnParallel.addEventListener('click', async () => {
  log('开始并行请求示例...');
  btnParallel.disabled = true;

  const startTime = Date.now();

  try {
    const { send } = useParallelRequests(
      [{ url: '/posts/1' }, { url: '/posts/2' }, { url: '/posts/3' }],
      {
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

// 部分失败处理示例
btnPartialFailure.addEventListener('click', async () => {
  log('开始部分失败处理示例...');
  btnPartialFailure.disabled = true;

  // 创建一个会失败的适配器
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
        { url: '/posts/999', adapter: errorAdapter }, // 这个会失败
        { url: '/posts/3', adapter: errorAdapter },
      ],
      {
        onSuccess: (results) => {
          log(`成功请求数: ${results.length}`, 'success');
        },
        onError: (errors) => {
          log(`失败请求数: ${errors.length}`, 'error');
          errors.forEach((error, index) => {
            log(`错误 ${index + 1}: ${error.message}`, 'error');
          });
        },
      }
    );

    await send();
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnPartialFailure.disabled = false;
  }
});

// 清空输出
btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

// 初始化提示
log('wl-request 并行请求示例已加载，点击按钮开始测试。');
