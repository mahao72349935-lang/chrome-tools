/**
 * @Description: 认证信息 Store - 存储 username 和 password
 * @Author: mahao
 * @Date: 2026-03-27
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const username = ref('15888888888');
  const password = ref('admin123');

  return { username, password };
});
