// 串行请求示例

import { FetchAdapter } from '@wl-request/adapter-fetch';
import type { RequestConfig } from '@wl-request/core';
import { configure, useSerialRequests } from '@wl-request/core';

// 设置默认适配器
configure({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
});

// 获取 DOM 元素
const output = document.getElementById('output') as HTMLDivElement;
const btnSerial = document.getElementById('btn-serial') as HTMLButtonElement;
const btnInterrupt = document.getElementById('btn-interrupt') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

// 输出函数
function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

// 串行请求示例
btnSerial.addEventListener('click', async () => {
  log('开始串行请求示例...');
  btnSerial.disabled = true;

  const requestOrder: string[] = [];
  const startTime = Date.now();

  try {
    // 记录请求顺序
    const originalAdapter = new FetchAdapter();
    const trackingAdapter = {
      async request<T>(config: RequestConfig<T>) {
        requestOrder.push(config.url);
        return originalAdapter.request(config);
      },
    };

    // 使用跟踪适配器
    const { send: sendWithTracking } = useSerialRequests(
      [
        { url: '/posts/1', adapter: trackingAdapter },
        { url: '/posts/2', adapter: trackingAdapter },
        { url: '/posts/3', adapter: trackingAdapter },
      ],
      {
        onSuccess: (results) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          log(`所有请求完成，耗时: ${duration}ms`, 'success');
          log(`成功请求数: ${results.length}`, 'success');
          log(`请求顺序: ${requestOrder.join(' -> ')}`, 'success');
        },
      }
    );

    await sendWithTracking();
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnSerial.disabled = false;
  }
});

// 中断处理示例
btnInterrupt.addEventListener('click', async () => {
  log('开始中断处理示例...');
  btnInterrupt.disabled = true;

  // 创建一个会失败的适配器
  const errorAdapter = {
    async request<T>(config: RequestConfig<T>) {
      if (config.url === '/posts/999') {
        throw new Error('请求失败，中断后续请求');
      }
      const fetchAdapter = new FetchAdapter();
      return fetchAdapter.request(config);
    },
  };

  try {
    const { send } = useSerialRequests(
      [
        { url: '/posts/1', adapter: errorAdapter },
        { url: '/posts/999', adapter: errorAdapter }, // 这个会失败，中断后续请求
        { url: '/posts/3', adapter: errorAdapter }, // 这个不会执行
      ],
      {
        onSuccess: (results) => {
          log(`成功请求数: ${results.length}`, 'success');
        },
        onError: (error, index) => {
          log(`第 ${index + 1} 个请求失败，中断后续请求: ${error.message}`, 'error');
        },
      }
    );

    await send();
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnInterrupt.disabled = false;
  }
});

// 清空输出
btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

// 初始化提示
log('wl-request 串行请求示例已加载，点击按钮开始测试。');
