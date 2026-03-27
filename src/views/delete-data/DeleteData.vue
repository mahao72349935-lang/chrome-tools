<!--
 * @Description: 
 * @Author: mahao
 * @Date: 2026-03-20 16:25:01
 * @LastEditors: mahao
 * @LastEditTime: 2026-03-20 17:20:50
-->
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
            <div class="form-actions">
              <el-button class="gold-btn" size="small" :loading="fetching" @click="handleFetchFilters">
                获取筛选条件
              </el-button>
            </div>
            <el-input v-model="filtersText" type="textarea" :autosize="{ minRows: 3, maxRows: 10 }"
              placeholder='筛选条件数组，如：[{"label":"名称","value":"张三"}]' class="field-input" />
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
import { getFilterFormItems } from '../../utils/get-filter-form-items';
import { useAuthStore } from '../../stores/useAuthStore';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const fetching = ref(false);
const error = ref('');

const location = ref('');
const menuName = ref('');

const filtersText = ref('');

const goBack = () => router.push('/');

const parsedFilters = computed<Array<{ label: string; value: string }>>(() => {
  try {
    const arr = JSON.parse(filtersText.value);
    if (Array.isArray(arr) && arr.length > 0 && arr.every((f: any) => f.label && f.value)) {
      return arr;
    }
  } catch { }
  return [];
});

const canDelete = computed(() => parsedFilters.value.length > 0);

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

const handleFetchFilters = async () => {
  fetching.value = true;
  error.value = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      error.value = '无法获取当前标签页';
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getFilterFormItems,
    });

    const filters = results?.[0]?.result || [];
    if (!filters.length) {
      ElMessage.warning('未获取到有值的筛选条件');
      return;
    }

    filtersText.value = JSON.stringify(filters, null, 2);
    ElMessage.success(`已获取 ${filters.length} 个筛选条件`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取筛选条件失败';
  } finally {
    fetching.value = false;
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
      filters: parsedFilters.value,
      location: location.value,
      menuName: menuName.value || '',
      username: authStore.username,
      password: authStore.password,
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

.form-actions {
  display: flex;
  justify-content: flex-end;
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
