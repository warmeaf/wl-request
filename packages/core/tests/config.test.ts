// 全局配置管理测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, getGlobalConfig, mergeConfig, resetConfig } from '../src/config';
import type { GlobalConfig, RequestConfig } from '../src/interfaces';

describe('全局配置管理', () => {
  beforeEach(() => {
    // 重置全局配置，确保测试隔离
    resetConfig();
  });

  afterEach(() => {
    // 清理全局配置
    resetConfig();
  });

  describe('全局配置设置', () => {
    it('应该能够设置全局配置', () => {
      const config: Partial<GlobalConfig> = {
        baseURL: 'https://api.example.com',
        timeout: 5000,
      };

      configure(config);
      const globalConfig = getGlobalConfig();

      expect(globalConfig.baseURL).toBe('https://api.example.com');
      expect(globalConfig.timeout).toBe(5000);
    });

    it('多次调用 configure 时应该合并配置', () => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 5000,
      });

      configure({
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const globalConfig = getGlobalConfig();

      expect(globalConfig.baseURL).toBe('https://api.example.com');
      expect(globalConfig.timeout).toBe(10000);
      expect(globalConfig.headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('应该能够获取全局配置', () => {
      const config: Partial<GlobalConfig> = {
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: {
          Authorization: 'Bearer token',
        },
      };

      configure(config);
      const globalConfig = getGlobalConfig();

      expect(globalConfig).toMatchObject(config);
    });
  });

  describe('配置合并和继承', () => {
    beforeEach(() => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer global-token',
        },
        params: {
          version: '1.0',
        },
      });
    });

    it('请求配置应该继承全局配置', () => {
      const localConfig: RequestConfig = {
        url: '/api/users',
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.baseURL).toBe('https://api.example.com');
      expect(merged.timeout).toBe(5000);
      expect(merged.url).toBe('/api/users');
    });

    it('请求配置应该覆盖全局配置', () => {
      const localConfig: RequestConfig = {
        url: '/api/users',
        timeout: 10000,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.baseURL).toBe('https://api.example.com');
      expect(merged.timeout).toBe(10000); // 被覆盖
      expect(merged.url).toBe('/api/users');
    });

    it('对象类型配置（headers）应该深度合并', () => {
      const localConfig: RequestConfig = {
        url: '/api/users',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer global-token',
        'X-Custom-Header': 'custom-value',
      });
    });

    it('对象类型配置（params）应该深度合并', () => {
      const localConfig: RequestConfig = {
        url: '/api/users',
        params: {
          page: 1,
        },
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.params).toEqual({
        version: '1.0',
        page: 1,
      });
    });

    it('Hook 函数应该被请求配置覆盖，而不是合并', () => {
      const globalOnBefore = vi.fn();
      const localOnBefore = vi.fn();

      configure({
        onBefore: globalOnBefore,
      });

      const localConfig: RequestConfig = {
        url: '/api/users',
        onBefore: localOnBefore,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.onBefore).toBe(localOnBefore);
      expect(merged.onBefore).not.toBe(globalOnBefore);
    });

    it('请求配置中的 headers 为 undefined 时不应该覆盖全局 headers', () => {
      const localConfig: RequestConfig = {
        url: '/api/users',
        headers: undefined,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer global-token',
      });
    });
  });

  describe('配置覆盖机制', () => {
    beforeEach(() => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        method: 'GET',
      });
    });

    it('基本类型字段（url、method、timeout）应该被覆盖', () => {
      const localConfig: RequestConfig = {
        url: '/api/users',
        method: 'POST',
        timeout: 10000,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.baseURL).toBe('https://api.example.com');
      expect(merged.method).toBe('POST');
      expect(merged.timeout).toBe(10000);
      expect(merged.url).toBe('/api/users');
    });

    it('undefined 值不应该覆盖已存在的配置', () => {
      const localConfig: RequestConfig = {
        url: '/api/users',
        timeout: undefined,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.timeout).toBe(5000); // 保持全局配置的值
    });

    it('null 值应该覆盖已存在的配置', () => {
      const localConfig: RequestConfig = {
        url: '/api/users',
        timeout: null as unknown as number,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.timeout).toBeNull();
    });

    it('空对象应该覆盖全局对象配置', () => {
      configure({
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const localConfig: RequestConfig = {
        url: '/api/users',
        headers: {},
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.headers).toEqual({});
    });
  });

  describe('边界情况', () => {
    it('全局配置为空时，请求配置应该保持不变', () => {
      const localConfig: RequestConfig = {
        url: '/api/users',
        timeout: 5000,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.url).toBe('/api/users');
      expect(merged.timeout).toBe(5000);
    });

    it('请求配置为空时，应该返回全局配置', () => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 5000,
      });

      const localConfig: Partial<RequestConfig> = {};

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.baseURL).toBe('https://api.example.com');
      expect(merged.timeout).toBe(5000);
    });

    it('应该正确处理嵌套对象的深度合并', () => {
      configure({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token1',
        },
      });

      configure({
        headers: {
          Authorization: 'Bearer token2',
          'X-Custom': 'value1',
        },
      });

      const globalConfig = getGlobalConfig();

      expect(globalConfig.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token2',
        'X-Custom': 'value1',
      });
    });
  });

  describe('headers/params 边界情况', () => {
    beforeEach(() => {
      resetConfig();
    });

    it('当 local headers 为 null 时应该保留 local 值', () => {
      configure({
        headers: { 'Global-Header': 'global-value' },
      });

      const localConfig: RequestConfig = {
        url: '/api/users',
        headers: null as unknown as Record<string, string>,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.headers).toBeNull();
    });

    it('当 global headers 为 null 时应该使用 local headers', () => {
      configure({
        headers: null as unknown as Record<string, string>,
      });

      const localConfig: RequestConfig = {
        url: '/api/users',
        headers: { 'Local-Header': 'local-value' },
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.headers).toEqual({ 'Local-Header': 'local-value' });
    });

    it('当 global headers 为数组时应该使用 local 值', () => {
      configure({
        headers: ['Array-Header'] as unknown as Record<string, string>,
      });

      const localConfig: RequestConfig = {
        url: '/api/users',
        headers: { 'Local-Header': 'local-value' },
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.headers).toEqual({ 'Local-Header': 'local-value' });
    });

    it('当 local headers 为数组时应该保留 local 值（数组类型）', () => {
      configure({
        headers: { 'Global-Header': 'global-value' },
      });

      const localConfig: RequestConfig = {
        url: '/api/users',
        headers: ['Array-Header'] as unknown as Record<string, string>,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      // local 为数组时，保留 local 值
      expect(merged.headers).toEqual(['Array-Header']);
    });

    it('当 global params 为 null 时应该使用 local params', () => {
      configure({
        params: null as unknown as Record<string, string>,
      });

      const localConfig: RequestConfig = {
        url: '/api/users',
        params: { 'local-param': 'local-value' },
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      expect(merged.params).toEqual({ 'local-param': 'local-value' });
    });

    it('当 local params 为数组时应该保留 local 值（数组类型）', () => {
      configure({
        params: { 'global-param': 'global-value' },
      });

      const localConfig: RequestConfig = {
        url: '/api/users',
        params: ['Array-Param'] as unknown as Record<string, string>,
      };

      const merged = mergeConfig(getGlobalConfig(), localConfig);

      // local 为数组时，保留 local 值
      expect(merged.params).toEqual(['Array-Param']);
    });
  });

  describe('重置功能', () => {
    it('resetConfig 应该清空所有全局配置', () => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(getGlobalConfig().baseURL).toBe('https://api.example.com');

      resetConfig();

      const config = getGlobalConfig();
      expect(config.baseURL).toBeUndefined();
      expect(config.timeout).toBeUndefined();
      expect(config.headers).toBeUndefined();
    });

    it('resetConfig 后应该能够重新设置配置', () => {
      configure({
        baseURL: 'https://old-api.example.com',
      });

      resetConfig();

      configure({
        baseURL: 'https://new-api.example.com',
      });

      expect(getGlobalConfig().baseURL).toBe('https://new-api.example.com');
    });

    it('resetConfig 应该返回空对象', () => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 5000,
      });

      resetConfig();

      const config = getGlobalConfig();
      expect(Object.keys(config).length).toBe(0);
    });
  });
});
