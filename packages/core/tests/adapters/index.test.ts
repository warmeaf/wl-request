// 适配器抽象层测试

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getAdapter,
  getDefaultAdapter,
  registerAdapter,
  resetAdapters,
  setDefaultAdapter,
} from '../../src/adapters';
import type { RequestAdapter, RequestConfig, Response } from '../../src/interfaces';

describe('适配器抽象层', () => {
  let mockAdapter: RequestAdapter;
  let anotherAdapter: RequestAdapter;

  beforeEach(() => {
    // 重置适配器状态，确保测试隔离
    resetAdapters();

    // 创建模拟适配器
    mockAdapter = {
      async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
        };
      },
    };

    anotherAdapter = {
      async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
        return {
          status: 201,
          statusText: 'Created',
          headers: {},
          data: {} as T,
        };
      },
    };
  });

  afterEach(() => {
    // 清理：重置适配器注册表
    resetAdapters();
  });

  describe('适配器注册', () => {
    it('应该能够注册自定义适配器', () => {
      registerAdapter('custom', mockAdapter);
      const adapter = getAdapter('custom');
      expect(adapter).toBe(mockAdapter);
    });

    it('注册同名适配器时应该覆盖原有适配器', () => {
      registerAdapter('test', mockAdapter);
      expect(getAdapter('test')).toBe(mockAdapter);

      registerAdapter('test', anotherAdapter);
      expect(getAdapter('test')).toBe(anotherAdapter);
      expect(getAdapter('test')).not.toBe(mockAdapter);
    });

    it('应该能够获取已注册的适配器', () => {
      registerAdapter('test1', mockAdapter);
      registerAdapter('test2', anotherAdapter);

      expect(getAdapter('test1')).toBe(mockAdapter);
      expect(getAdapter('test2')).toBe(anotherAdapter);
    });
  });

  describe('默认适配器设置', () => {
    it('应该能够设置默认适配器', () => {
      setDefaultAdapter(mockAdapter);
      const defaultAdapter = getDefaultAdapter();
      expect(defaultAdapter).toBe(mockAdapter);
    });

    it('应该能够获取默认适配器', () => {
      setDefaultAdapter(mockAdapter);
      expect(getDefaultAdapter()).toBe(mockAdapter);
    });

    it('未设置默认适配器时应该返回 FetchAdapter 实例', () => {
      // 先清除默认适配器（如果之前设置过）
      // 注意：这需要实现清除功能，或者测试时确保是初始状态
      const defaultAdapter = getDefaultAdapter();
      expect(defaultAdapter).toBeDefined();
      expect(defaultAdapter).toHaveProperty('request');
      expect(typeof defaultAdapter.request).toBe('function');
    });

    it('设置默认适配器后，getAdapter() 应该返回设置的适配器', () => {
      setDefaultAdapter(mockAdapter);
      const adapter = getAdapter();
      expect(adapter).toBe(mockAdapter);
    });
  });

  describe('适配器获取', () => {
    beforeEach(() => {
      registerAdapter('test', mockAdapter);
    });

    it('应该能够通过名称获取适配器', () => {
      const adapter = getAdapter('test');
      expect(adapter).toBe(mockAdapter);
    });

    it('获取不存在的适配器时应该返回 null', () => {
      const adapter = getAdapter('non-existent');
      expect(adapter).toBeNull();
    });

    it('未指定名称时应该返回默认适配器', () => {
      setDefaultAdapter(mockAdapter);
      const adapter = getAdapter();
      expect(adapter).toBe(mockAdapter);
    });

    it('名称为 "default" 时应该返回默认适配器', () => {
      setDefaultAdapter(mockAdapter);
      const adapter = getAdapter('default');
      expect(adapter).toBe(mockAdapter);
    });
  });

  describe('代理适配器', () => {
    it('未设置默认适配器时应该返回代理适配器', () => {
      // 确保状态已重置
      resetAdapters();

      const defaultAdapter = getDefaultAdapter();
      expect(defaultAdapter).toBeDefined();
      expect(defaultAdapter).toHaveProperty('request');
      expect(typeof defaultAdapter.request).toBe('function');
    });

    it('代理适配器应该具有 request 方法', () => {
      resetAdapters();

      const proxyAdapter = getDefaultAdapter();
      expect(proxyAdapter.request).toBeDefined();
      expect(typeof proxyAdapter.request).toBe('function');
    });

    it('代理适配器的 request 方法应该返回 Promise', () => {
      resetAdapters();

      const proxyAdapter = getDefaultAdapter();
      const result = proxyAdapter.request({ url: '/test' });

      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('重置功能', () => {
    it('resetAdapters 应该清除所有注册的适配器', () => {
      registerAdapter('test1', mockAdapter);
      registerAdapter('test2', anotherAdapter);

      expect(getAdapter('test1')).toBe(mockAdapter);
      expect(getAdapter('test2')).toBe(anotherAdapter);

      resetAdapters();

      expect(getAdapter('test1')).toBeNull();
      expect(getAdapter('test2')).toBeNull();
    });

    it('resetAdapters 应该清除默认适配器', () => {
      setDefaultAdapter(mockAdapter);
      expect(getDefaultAdapter()).toBe(mockAdapter);

      resetAdapters();

      // 重置后应该返回代理适配器而不是之前设置的 mockAdapter
      const newDefault = getDefaultAdapter();
      expect(newDefault).not.toBe(mockAdapter);
      expect(newDefault).toHaveProperty('request');
    });
  });
});
