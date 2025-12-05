// 并行请求功能

/**
 * 并行执行多个请求函数
 * 使用 Promise.allSettled 确保所有请求都完成（无论成功或失败）
 * @param requestFns 请求函数数组
 * @returns Promise<PromiseSettledResult<T>[]> 所有请求的结果数组
 */
export async function parallelRequests<T>(
  requestFns: Array<() => Promise<T>>
): Promise<Array<PromiseSettledResult<T>>> {
  // 空数组直接返回
  if (requestFns.length === 0) {
    return [];
  }

  // 并行执行所有请求
  const promises = requestFns.map((fn) => fn());

  // 使用 Promise.allSettled 等待所有请求完成
  return await Promise.allSettled(promises);
}
