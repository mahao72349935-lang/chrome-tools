/**
 * @Description: Axios 请求封装
 * @Author: mahao
 * @Date: 2026-03-19
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

/** 开发环境 API 基础地址 */
const BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'http://localhost:3000';

/** 创建 axios 实例 */
const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** 请求拦截器 */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 可在此添加 token、公共参数等
    return config;
  },
  (error) => Promise.reject(error)
);

/** 响应拦截器 */
request.interceptors.response.use(
  (response) => {
    const { data } = response;
    return data;
  },
  (error) => {
    const message = error.response?.data?.message ?? error.message ?? '请求失败';
    return Promise.reject(new Error(message));
  }
);

/** 通用请求方法 */
export function http<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  return request(config) as Promise<T>;
}

export default request;
