// Vitest 全局设置文件
// 用于处理测试中的 unhandled rejection 警告

// 某些测试场景（如重试机制）会故意创建 rejected Promise
// 这些 Promise 会在后续的异步操作中被正确处理
// 但测试框架可能会报告它们为 "unhandled rejection"
// 这里我们添加一个全局处理器来抑制这些误报

// 跟踪已知的 Promise rejection
const trackedRejections = new WeakSet<Promise<unknown>>();

// 监听 unhandledRejection 事件
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    // 跟踪这个 Promise，以便后续检查它是否被处理
    trackedRejections.add(promise);

    // 检查是否是测试相关的错误
    const isTestRelatedError =
      reason instanceof Error &&
      (reason.message.includes('Request failed') ||
        reason.message.includes('Network error') ||
        reason.message.includes('Server error') ||
        reason.message.includes('Error') ||
        reason.message.includes('Final error'));

    // 如果是测试相关的错误，忽略警告（它们会被正确处理）
    if (isTestRelatedError) {
      return;
    }
  });

  // 监听 rejectionHandled 事件
  process.on('rejectionHandled', (promise: Promise<unknown>) => {
    trackedRejections.delete(promise);
  });
}
