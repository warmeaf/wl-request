// 序列化工具函数

/**
 * 检查值是否为类似 Response 的对象
 * @param value 要检查的值
 * @returns 是否为 Response 类对象
 */
function isResponseLike(value: unknown): value is Record<string, unknown> & { raw?: unknown } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'status' in value &&
    'statusText' in value &&
    'headers' in value &&
    'data' in value
  );
}

/**
 * 序列化 Response 对象，移除不可序列化的 raw 属性
 * 用于缓存适配器在存储 Response 时移除原始响应对象
 * @param value 要序列化的值
 * @returns 序列化后的值
 */
export function serializeResponse(value: unknown): unknown {
  if (isResponseLike(value)) {
    const { raw: _raw, ...serializableResponse } = value;
    return serializableResponse;
  }
  return value;
}
