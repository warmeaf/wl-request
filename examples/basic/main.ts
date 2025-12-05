// 基础示例

import { FetchAdapter } from '@wl-request/adapter-fetch';
import { configure, useRequest } from '@wl-request/core';

configure({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

const output = document.getElementById('output') as HTMLDivElement;
const btnBasicRequest = document.getElementById('btn-basic-request') as HTMLButtonElement;
const btnPostRequest = document.getElementById('btn-post-request') as HTMLButtonElement;
const btnWithHooks = document.getElementById('btn-with-hooks') as HTMLButtonElement;
const btnGlobalConfig = document.getElementById('btn-global-config') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  const timestamp = new Date().toLocaleTimeString();
  output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

btnBasicRequest.addEventListener('click', async () => {
  log('开始基本 GET 请求...');
  btnBasicRequest.disabled = true;

  try {
    const { send } = useRequest({
      url: '/posts/1',
    });

    const response = await send();
    log(`请求成功: ${JSON.stringify(response.data, null, 2)}`, 'success');
  } catch (error) {
    log(`请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnBasicRequest.disabled = false;
  }
});

btnPostRequest.addEventListener('click', async () => {
  log('开始 POST 请求...');
  btnPostRequest.disabled = true;

  try {
    const { send } = useRequest({
      url: '/posts',
      method: 'POST',
      data: {
        title: 'foo',
        body: 'bar',
        userId: 1,
      },
    });

    const response = await send();
    log(`POST 请求成功: ${JSON.stringify(response.data, null, 2)}`, 'success');
  } catch (error) {
    log(`POST 请求失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    btnPostRequest.disabled = false;
  }
});

btnWithHooks.addEventListener('click', async () => {
  log('开始带生命周期钩子的请求...');
  btnWithHooks.disabled = true;

  try {
    const { send } = useRequest({
      url: '/posts/1',
      onBefore: (config) => {
        log(`onBefore: 准备请求 ${config.url}`);
        return config;
      },
      onSuccess: (response) => {
        log(`onSuccess: 请求成功，状态码 ${response.status}`, 'success');
      },
      onError: (error) => {
        log(`onError: 请求失败 ${error.message}`, 'error');
      },
      onFinally: () => {
        log('onFinally: 请求完成');
      },
    });

    await send();
  } catch (_error) {
  } finally {
    btnWithHooks.disabled = false;
  }
});

btnGlobalConfig.addEventListener('click', async () => {
  log('开始全局配置示例...');
  btnGlobalConfig.disabled = true;

  configure({
    onBefore: (config) => {
      log(`全局 onBefore: ${config.url}`);
      return config;
    },
    onSuccess: (response) => {
      log(`全局 onSuccess: ${response.status}`, 'success');
    },
    onError: (error) => {
      log(`全局 onError: ${error.message}`, 'error');
    },
    onFinally: () => {
      log('全局 onFinally');
    },
  });

  try {
    const { send } = useRequest({
      url: '/posts/1',
    });

    await send();
  } catch (_error) {
  } finally {
    btnGlobalConfig.disabled = false;
  }
});

btnClear.addEventListener('click', () => {
  output.innerHTML = '';
});

log('wl-request 基础示例已加载，点击按钮开始测试。');
