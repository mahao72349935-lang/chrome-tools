<!--
 * @Description: 首页 - 功能列表
 * @Author: mahao
 * @Date: 2026-03-17
-->
<template>
  <div class="home">
    <h1 class="title">mh-tools 工具箱</h1>

    <!-- 账号信息区域 -->
    <div class="auth-card">
      <div class="auth-field">
        <label class="auth-label">用户名</label>
        <el-input
          v-model="authStore.username"
          class="auth-input"
          placeholder="请输入用户名"
          size="small"
        />
      </div>
      <div class="auth-field">
        <label class="auth-label">密码</label>
        <el-input
          v-model="authStore.password"
          class="auth-input"
          placeholder="请输入密码"
          size="small"
          show-password
        />
      </div>
    </div>

    <ul class="feature-list">
      <li v-for="item in features" :key="item.path" class="feature-item" @click="goTo(item.path)">
        <span class="feature-name">{{ item.name }}</span>
        <span class="feature-desc">{{ item.desc }}</span>
        <el-icon class="arrow">
          <ArrowRight />
        </el-icon>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight } from '@element-plus/icons-vue';
import { useAuthStore } from '../stores/useAuthStore';
import { setupLoginCaptureListener } from '../utils/listenLoginCapture';

const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
  setupLoginCaptureListener();
});

const features = [
  {
    name: '新增数据',
    path: '/dialog-form-fields',
    desc: '从当前页面的弹窗中提取表单字段及类型',
  },
  {
    name: '删除数据',
    path: '/delete-data',
    desc: '删除当前页面的数据',
  },
  {
    name: '监听行为',
    path: '/listen-behavior',
    desc: '监听当前页面的行为',
  },
  // 后续可在此添加更多功能
];

const goTo = (path: string) => {
  router.push(path);
};
</script>

<style scoped>
.home {
  padding: 1rem;
  text-align: left;
  min-height: 100%;
  background: linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%);
  color: #9ca3af;
}

.title {
  font-size: 1.25rem;
  margin: 0 0 1rem;
  color: #f3f4f6;
  font-weight: 600;
}

/* 账号信息卡片 */
.auth-card {
  background: #1e1e1e;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 14px 16px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auth-field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-label {
  font-size: 12px;
  color: #9ca3af;
  min-width: 44px;
  flex-shrink: 0;
}

.auth-input {
  flex: 1;
  --el-input-focus-border-color: #f2c94c;
  --el-input-hover-border-color: #f2c94c;
  --el-color-primary: #f2c94c;
}

.auth-input :deep(.el-input__wrapper) {
  background: #262626 !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: none !important;
}

.auth-input :deep(.el-input__wrapper:hover),
.auth-input :deep(.el-input__wrapper.is-focus) {
  border-color: #f2c94c !important;
  box-shadow: 0 0 0 1px rgba(242, 201, 76, 0.3) inset !important;
}

.auth-input :deep(.el-input__inner) {
  color: #f3f4f6;
  background: transparent;
  font-size: 13px;
}

.auth-input :deep(.el-input__password) {
  color: #9ca3af;
}

.auth-input :deep(.el-input__password:hover) {
  color: #f2c94c;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 16px 20px;
  margin-bottom: 12px;
  background: #1e1e1e;
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  border: 1px solid transparent;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #f2c94c;
  box-shadow: 0 0 0 1px rgba(242, 201, 76, 0.3);
}

.feature-item:active {
  background: rgba(242, 201, 76, 0.1);
}

.feature-name {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  color: #f3f4f6;
}

.feature-desc {
  flex: 2;
  font-size: 0.8rem;
  color: #9ca3af;
}

.arrow {
  color: #f2c94c;
  font-size: 1rem;
  flex-shrink: 0;
}
</style>
