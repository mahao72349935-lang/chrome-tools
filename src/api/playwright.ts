/**
 * @Description: Playwright 相关 API
 * @Author: mahao
 * @Date: 2026-03-19
 */
import { http } from '../utils/request';

/** run-playwright 请求参数（按实际接口调整） */
export interface RunPlaywrightParams {
  /** 可扩展其他参数 */
  [key: string]: unknown;
}

/** run-playwright 响应类型（按实际接口调整） */
export interface RunPlaywrightResponse {
  success?: boolean;
  data?: unknown;
  message?: string;
  [key: string]: unknown;
}

/**
 * 调用本地 Playwright 执行接口
 * @param params 请求参数
 */
export function runPlaywright(params?: RunPlaywrightParams): Promise<RunPlaywrightResponse> {
  return http<RunPlaywrightResponse>({
    url: '/api/run-playwright',
    method: 'POST',
    data: params ?? {},
  });
}
