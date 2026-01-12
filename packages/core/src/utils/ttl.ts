// TTL 工具函数

/**
 * 计算过期时间戳
 * @param ttl 过期时间（毫秒），可选。如果不提供，返回最大安全整数表示永不过期
 * @returns 过期时间戳（毫秒）
 */
export function calculateExpiresAt(ttl?: number): number {
  if (ttl === undefined) {
    return Number.MAX_SAFE_INTEGER;
  }
  // TTL <= 0 表示立即过期
  return ttl <= 0 ? Date.now() - 1 : Date.now() + ttl;
}
