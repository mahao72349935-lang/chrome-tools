<!--
 * @Description: 首页 - 功能列表
 * @Author: mahao
 * @Date: 2026-03-17
-->
<template>
  <div class="home">
    <h1 class="title">mh-tools 工具箱</h1>

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
import { useRouter } from 'vue-router';
import { ArrowRight } from '@element-plus/icons-vue';

const router = useRouter();

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
