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
  if (requestFns.length === 0) {
    return [];
  }

  const promises = requestFns.map((fn) => fn());

  return await Promise.allSettled(promises);
}
