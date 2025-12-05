// Fetch 适配器示例

import { FetchAdapter } from '@wl-request/adapter-fetch';
import { configure, useRequest } from '@wl-request/core';

// 配置使用 Fetch 适配器
configure({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
});

// 获取 DOM 元素
const output = document.getElementById('output') as HTMLDivElement;
const btnFetch = document.getElementById('btn-fetch') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

// 输出函数
function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

// Fetch 适配器示例
btnFetch.addEventListener('click', async () => {
  log('开始 Fetch 适配器示例...');
  btnFetch.disabled = true;

  try {
    const { send } = useRequest({
      url: '/posts/1',
      onSuccess: (response) => {
        log(`请求成功: ${JSON.stringify(response.data, null, 2)}`, 'success');
      },
      onError: (error) => {
        log(`请求失败: ${error.message}`, 'error');
      },
    });

    await send();
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnFetch.disabled = false;
  }
});

// 清空输出
btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

// 初始化提示
log('wl-request Fetch 适配器示例已加载，点击按钮开始测试。');
