// 重试功能示例

import { FetchAdapter } from '@wl-request/adapter-fetch';
import { configure, useRequest } from '@wl-request/core';

configure({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
});

const output = document.getElementById('output') as HTMLDivElement;
const btnRetry = document.getElementById('btn-retry') as HTMLButtonElement;
const btnExponentialBackoff = document.getElementById(
  'btn-exponential-backoff'
) as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

let attemptCount = 0;

btnRetry.addEventListener('click', async () => {
  log('开始重试请求示例...');
  btnRetry.disabled = true;
  attemptCount = 0;

  const mockAdapter = {
    async request() {
      attemptCount++;
      log(`尝试第 ${attemptCount} 次请求...`);
      if (attemptCount < 3) {
        throw new Error(`请求失败 (尝试 ${attemptCount})`);
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { message: '请求成功！', attempts: attemptCount },
      };
    },
  };

  try {
    const { send } = useRequest({
      url: '/posts/1',
      adapter: mockAdapter,
      retry: {
        count: 3,
        delay: 500,
      },
      onSuccess: (response) => {
        log(`请求成功: ${JSON.stringify(response.data, null, 2)}`, 'success');
      },
      onError: (error) => {
        log(`请求最终失败: ${error.message}`, 'error');
      },
    });

    await send();
    log(`总共尝试了 ${attemptCount} 次`, 'success');
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnRetry.disabled = false;
  }
});

btnExponentialBackoff.addEventListener('click', async () => {
  log('开始指数退避策略示例...');
  btnExponentialBackoff.disabled = true;
  attemptCount = 0;

  const delays: number[] = [];
  let lastTime = Date.now();

  const mockAdapter = {
    async request() {
      const currentTime = Date.now();
      if (lastTime > 0 && attemptCount > 0) {
        const delay = currentTime - lastTime;
        delays.push(delay);
        log(`延迟时间: ${delay}ms`);
      }
      lastTime = currentTime;
      attemptCount++;

      if (attemptCount < 3) {
        throw new Error(`请求失败 (尝试 ${attemptCount})`);
      }

      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { message: '请求成功！', delays },
      };
    },
  };

  try {
    const { send } = useRequest({
      url: '/posts/1',
      adapter: mockAdapter,
      retry: {
        count: 3,
        delay: 200,
        strategy: 'exponential',
      },
      onSuccess: (response) => {
        log(`请求成功: ${JSON.stringify(response.data, null, 2)}`, 'success');
      },
    });

    await send();
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnExponentialBackoff.disabled = false;
  }
});

btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

log('wl-request 重试功能示例已加载，点击按钮开始测试。');
