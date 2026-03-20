<!--
 * @Description: 删除数据 - label/value
 * @Author: mahao
 * @Date: 2026-03-20
-->
<template>
  <div class="detail">
    <div class="header">
      <el-button link type="primary" class="back-btn" @click="goBack">
        <el-icon>
          <ArrowLeft />
        </el-icon>
        返回
      </el-button>
      <h2 class="page-title">删除数据</h2>
    </div>

    <div class="content">
      <!-- <el-alert type="info" :closable="false" show-icon class="tip-alert"
        title="请在目标页面选择要删除的字段含义（label）与具体值（value），然后点击删除。" /> -->

      <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" class="error-alert" />

      <AppCard v-if="location || menuName" class="result-card" active>
        <template #header>
          <div class="result-header">
            <span class="success-title">
              <el-icon class="success-icon">
                <CircleCheck />
              </el-icon>
              已获取上下文
            </span>
          </div>
        </template>

        <div class="result-content">
          <div class="context-row">
            <div class="context-item">
              <span class="label">地址</span>
              <span class="value">{{ location || '-' }}</span>
            </div>
            <div class="context-item">
              <span class="label">左侧菜单</span>
              <span class="value">{{ menuName || '-' }}</span>
            </div>
          </div>

          <div class="form">
            <el-input v-model="deleteLabel" placeholder="label（要匹配/删除的字段名）" class="field-input" />
            <el-input v-model="deleteValue" placeholder="value（要删除的具体值）" class="field-input" />
          </div>

          <div class="actions">
            <el-button class="gold-btn" size="small" :loading="loading" :disabled="!canDelete" @click="handleDelete">
              删除
            </el-button>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, CircleCheck } from '@element-plus/icons-vue';
import AppCard from '../../components/AppCard/AppCard.vue';
import { runDelete } from '../../api/delete';

const router = useRouter();
const loading = ref(false);
const error = ref('');

const location = ref('');
const menuName = ref('');

const deleteLabel = ref('');
const deleteValue = ref('');

const goBack = () => router.push('/');

const canDelete = computed(() => {
  return !!deleteLabel.value.trim() && !!deleteValue.value.trim();
});

const getContextScript = () => {
  const activeMenu =
    document.querySelector('.el-menu-item.is-active') ||
    document.querySelector('.el-sub-menu.is-active .el-sub-menu__title') ||
    document.querySelector('.el-menu-item.is-active a');
  return (activeMenu?.textContent || '').trim();
};

const loadContext = async () => {
  error.value = '';
  location.value = '';
  menuName.value = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      error.value = '无法获取当前标签页';
      return;
    }

    location.value = tab.url || '';

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getContextScript,
    });

    menuName.value = results?.[0]?.result || '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取上下文失败';
  }
};

const handleDelete = async () => {
  if (!canDelete.value) return;
  if (!location.value) {
    error.value = '缺少当前页面地址，请刷新后重试';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const res = await runDelete({
      label: deleteLabel.value.trim(),
      value: deleteValue.value.trim(),
      location: location.value,
      menuName: menuName.value || '',
    });

    ElMessage.success('删除请求已发送');
    console.log('delete-data res:', res);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadContext();
});
</script>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%);
  color: #9ca3af;
}

.detail .page-title {
  color: #f3f4f6;
}

.detail .back-btn {
  color: #f2c94c;
}

.detail .back-btn:hover {
  color: #e6b73d;
}

.header {
  margin-bottom: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  height: 40px;
}

.back-btn {
  position: absolute;
  left: 0;
  top: 0;
  height: 40px;
  padding: 0 8px;
}

.back-btn .el-icon {
  margin-right: 4px;
  vertical-align: middle;
}

.page-title {
  font-size: 16px;
  margin: 0;
}

.content {
  flex: 1;
  overflow: auto;
  padding: 0 10px;
}

.tip-alert {
  margin-bottom: 10px;
  font-size: 12px;
}

.error-alert {
  margin-bottom: 10px;
}

.result-card {
  margin-top: 12px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.success-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
}

.success-icon {
  color: #f2c94c;
}

.result-content {
  padding: 14px 0 0;
}

.context-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 12px;
}

.context-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.context-item .label {
  color: #9ca3af;
  min-width: 70px;
}

.context-item .value {
  color: #f3f4f6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-input {
  width: 100%;
}

.actions {
  margin-top: 12px;
}

.gold-btn {
  background: #f2c94c !important;
  border-color: #f2c94c !important;
  color: #0d0d0d !important;
}

.gold-btn:hover:not(:disabled) {
  background: #e6b73d !important;
  border-color: #e6b73d !important;
  color: #0d0d0d !important;
}

.gold-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
