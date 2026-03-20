/*
 * @Description: 路由配置
 * @Author: mahao
 * @Date: 2026-03-17
 */
import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  // Chrome 扩展 popup 使用 file:// 协议，必须用 hash 模式
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue'),
      meta: { title: '工具箱' },
    },
    {
      path: '/dialog-form-fields',
      name: 'DialogFormFields',
      component: () => import('../views/dialog-form-fields/DialogFormFields.vue'),
      meta: { title: '获取弹窗页面表单字段类型' },
    },
    {
      path: '/delete-data',
      name: 'DeleteData',
      component: () => import('../views/delete-data/DeleteData.vue'),
      meta: { title: '删除数据' },
    },
  ],
});

export default router;
