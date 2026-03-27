/**
 * @Description: 监听来自登录页 content script 的凭证消息，自动更新 authStore
 * @Author: mahao
 * @Date: 2026-03-27
 *
 * 使用方式：在 Home.vue 的 onMounted 中调用 setupLoginCaptureListener()
 */
import { useAuthStore } from '../stores/useAuthStore';

interface LoginCapturedMessage {
  type: 'MH_LOGIN_CAPTURED';
  username: string;
  password: string;
}

let listenerAttached = false;

/**
 * 在侧边栏注册 runtime 消息监听器。
 * 当登录页 content script 抓取到凭证时，自动同步到 authStore。
 * 重复调用是安全的，内部做了幂等保护。
 */
export function setupLoginCaptureListener(): void {
  if (listenerAttached) return;
  listenerAttached = true;

  chrome.runtime.onMessage.addListener((message: LoginCapturedMessage) => {
    if (message.type !== 'MH_LOGIN_CAPTURED') return;

    const authStore = useAuthStore();

    if (message.username) {
      authStore.username = message.username;
    }
    if (message.password) {
      authStore.password = message.password;
    }
  });
}
