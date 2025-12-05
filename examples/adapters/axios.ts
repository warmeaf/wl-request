// Axios 适配器示例

import { AxiosAdapter } from '@wl-request/adapter-axios';
import { configure, useRequest } from '@wl-request/core';

configure({
  adapter: new AxiosAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
});

const output = document.getElementById('output') as HTMLDivElement;
const btnAxios = document.getElementById('btn-axios') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

btnAxios.addEventListener('click', async () => {
  log('开始 Axios 适配器示例...');
  btnAxios.disabled = true;

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
    btnAxios.disabled = false;
  }
});

btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

log('wl-request Axios 适配器示例已加载，点击按钮开始测试。');
