/**
 * @Description: 删除数据相关 API
 * @Author: mahao
 * @Date: 2026-03-20
 */
import { http } from '../utils/request';

export interface RunDeleteParams {
  label: string;
  value: string;
  location: string;
  menuName?: string;
}

export interface RunDeleteResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

/**
 * 调用后端删除接口
 * POST /api/run-delete
 */
export function runDelete(params: RunDeleteParams): Promise<RunDeleteResponse> {
  return http<RunDeleteResponse>({
    url: '/api/run-delete',
    method: 'POST',
    data: params,
  });
}

