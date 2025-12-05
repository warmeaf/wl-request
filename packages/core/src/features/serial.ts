// 串行请求功能

/**
 * 串行执行多个请求函数
 * 按数组顺序依次执行，某个请求失败时停止后续请求并抛出错误
 * @param requestFns 请求函数数组
 * @returns Promise<T[]> 所有请求的结果数组
 */
export async function serialRequests<T>(requestFns: Array<() => Promise<T>>): Promise<T[]> {
  // 空数组直接返回
  if (requestFns.length === 0) {
    return [];
  }

  const results: T[] = [];

  // 串行执行所有请求
  for (const requestFn of requestFns) {
    const result = await requestFn();
    results.push(result);
  }

  return results;
}
