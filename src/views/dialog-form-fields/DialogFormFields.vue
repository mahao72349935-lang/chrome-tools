<!--
 * @Description: 获取弹窗页面表单字段类型 - 详情页
 * @Author: mahao
 * @Date: 2026-03-17
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
      <h2 class="page-title">获取弹窗页面表单字段类型</h2>
    </div>

    <div class="content">
      <div class="action-btns">
        <el-button type="primary" :loading="loading" class="action-btn gold-primary-btn" @click="handleGetFields">
          {{ loading ? '获取中...' : '获取新增表单字段' }}
        </el-button>
      </div>

      <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" class="error-alert" />

      <AppCard v-if="pageInfo" class="result-card" active>
        <template #header>
          <div class="result-header">
            <span class="success-title">
              <el-icon class="success-icon">
                <CircleCheck />
              </el-icon>
              获取成功
            </span>
            <div class="field-count">
              <span class="field-badge">共 {{ pageInfo.formFields?.length || 0 }} 个字段</span>
            </div>
          </div>
        </template>
        <div class="result-content">
          <el-input v-model="jsonStr" type="textarea" :rows="10" readonly class="json-preview" />
          <div class="result-actions">
            <div class="mock-data-wrap">
              <el-checkbox v-model="useDeepSeekMock" size="small" class="gold-checkbox">
                生成mock数据
              </el-checkbox>
              <template v-if="useDeepSeekMock">
                <span class="mock-count-wrap">
                  <el-input-number v-model="mockCount" :min="1" :max="100" size="small" class="mock-count-input"
                    controls-position="right" />
                  <span class="mock-count-unit">条</span>
                </span>
                <el-button class="gold-btn" size="small" :loading="generateLoading" @click="handleGenerateData">
                  生成数据
                </el-button>
              </template>
            </div>
            <el-input v-model="mockData" type="textarea" :rows="10" placeholder="请粘贴或输入mock数据（JSON 数组格式），点击「生成数据」将自动填充"
              class="mock-data-input" />
            <div class="result-header-actions">
              <el-button class="gold-btn" size="small" :disabled="!canRunScript" @click="handleRunScript">
                运行脚本
              </el-button>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, CircleCheck } from '@element-plus/icons-vue';
import AppCard from '../../components/AppCard/AppCard.vue';
import { runPlaywright } from '../../api/playwright';
import { generateMockData } from '../../utils/deepseek';
import { clickPageButton } from '../../utils/click-page-button';
import { getFormFieldsScript } from '../../utils/form-fields';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const useDeepSeekMock = ref(false);
const mockCount = ref(1);
const mockData = ref('');
const generateLoading = ref(false);
const pageInfo = ref<{
  title?: string;
  url?: string;
  dialog?: { title?: string; bodyText?: string; visible?: boolean } | null;
  formFields?: Array<{ name: string; type: string; placeholder: string; label: string }>;
  menuName?: string;
} | null>(null);

const jsonStr = computed(() => {
  if (!pageInfo.value) return '';
  return JSON.stringify(pageInfo.value.formFields || [], null, 2);
});

const canRunScript = computed(() => !!mockData.value?.trim());

const goBack = () => router.push('/');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const handleGetFields = async () => {
  loading.value = true;
  error.value = '';
  pageInfo.value = null;
  mockData.value = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      error.value = '无法获取当前标签页';
      return;
    }

    // 1. 先点击「新增」按钮打开弹窗
    const clickRes = await clickPageButton(tab.id, '新增');
    if (!clickRes.ok) {
      error.value = clickRes.msg || '未找到新增按钮';
      return;
    }
    ElMessage.success('已点击新增按钮');

    // 2. 等待弹窗打开
    await sleep(400);

    // 3. 获取弹窗表单字段
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getFormFieldsScript,
    });

    const info = results?.[0]?.result;
    if (info) {
      pageInfo.value = { ...info, url: tab.url || info.url };
      if (!info.dialog) {
        error.value = '未检测到可见的 Element UI 弹窗，请稍后重试';
      }
    } else {
      error.value = '获取失败，请确保页面已加载完成';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取页面信息失败';
  } finally {
    loading.value = false;
  }
};


const handleGenerateData = async () => {
  if (!pageInfo.value?.formFields?.length) {
    ElMessage.warning('请先获取表单字段');
    return;
  }
  generateLoading.value = true;
  error.value = '';
  try {
    const res = await generateMockData({
      formFields: pageInfo.value.formFields,
      mockCount: mockCount.value,
    });
    if (res?.success && res?.data) {
      mockData.value = res.data;
      ElMessage.success('假数据生成成功');
    } else {
      error.value = res?.message || '生成失败';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成假数据失败';
  } finally {
    generateLoading.value = false;
  }
};

const handleRunScript = async () => {
  if (!canRunScript.value) return;
  const raw = mockData.value.trim();
  let mockDataArr: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(raw);
    mockDataArr = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    error.value = 'mockData 格式无效，请确保是有效的 JSON 数组';
    return;
  }
  const params = {
    formFields: pageInfo.value?.formFields || [],
    location: pageInfo.value?.url || '',
    menuName: pageInfo.value?.menuName || '',
    mockData: mockDataArr,
  };
  console.log('params: ', params);
  const res = await runPlaywright(params);
  if (res.success) {
    ElMessage.success('脚本运行成功，请等待数据填充');
  } else {
    ElMessage.error('脚本运行失败');
  }
  console.log(res);
};
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
  margin-bottom: 5px;
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
  font-size: 14px;
  margin: 0;
}

.content {
  flex: 1;
  overflow: auto;
  padding: 0 10px 10px;
}

.tip-alert {
  margin-bottom: 10px;
  font-size: 12px;
}

.detail .tip-alert :deep(.el-alert) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.detail .error-alert :deep(.el-alert) {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.action-btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.action-btn {
  width: 100%;
}

.gold-primary-btn {
  background: #f2c94c !important;
  border-color: #f2c94c !important;
  color: #0d0d0d !important;
}

.gold-primary-btn:hover:not(:disabled) {
  background: #e6b73d !important;
  border-color: #e6b73d !important;
  color: #0d0d0d !important;
}

.error-alert {
  margin-bottom: 10px;
}


.result-header {
  display: flex;
  gap: 5px;
}

.result-header-actions {
  display: flex;
  align-items: center;
  height: 36px;
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

.result-actions {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;

  .mock-data-wrap {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    height: 36px;
  }
}



.mock-count-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mock-count-input {
  width: 80px;
  --el-input-focus-border-color: #f2c94c;
  --el-input-hover-border-color: #f2c94c;
  --el-input-focus-border: #f2c94c;
  --el-color-primary: #f2c94c;
}

.mock-count-input :deep(.el-input__wrapper) {
  background: #262626 !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: none !important;
}

.mock-count-input :deep(.el-input__wrapper:hover),
.mock-count-input :deep(.el-input.is-focus .el-input__wrapper),
.mock-count-input:hover :deep(.el-input__wrapper),
.mock-count-input:focus-within :deep(.el-input__wrapper),
.mock-count-input :deep(.el-input-number__decrease:hover ~ .el-input .el-input__wrapper),
.mock-count-input :deep(.el-input-number__increase:hover ~ .el-input .el-input__wrapper) {
  border-color: #f2c94c !important;
  box-shadow: 0 0 0 1px #f2c94c inset !important;
}

.mock-count-input :deep(.el-input__inner) {
  text-align: center;
  color: #f3f4f6;
  background: transparent;
}

.mock-count-input :deep(.el-input-number__decrease),
.mock-count-input :deep(.el-input-number__increase) {
  background: #1e1e1e !important;
  border-color: rgba(255, 255, 255, 0.08);
  color: #f2c94c !important;
}

.mock-count-input :deep(.el-input-number__decrease:hover),
.mock-count-input :deep(.el-input-number__increase:hover) {
  background: rgba(242, 201, 76, 0.15) !important;
  border-color: rgba(242, 201, 76, 0.3);
  color: #e6b73d !important;
}

.mock-count-input :deep(.el-input-number__decrease:hover .el-icon),
.mock-count-input :deep(.el-input-number__increase:hover .el-icon) {
  color: #e6b73d !important;
}

.mock-count-input :deep(.el-input-number__decrease .el-icon),
.mock-count-input :deep(.el-input-number__increase .el-icon) {
  color: #f2c94c !important;
}

.mock-count-input :deep(.el-input-number__decrease.is-disabled),
.mock-count-input :deep(.el-input-number__increase.is-disabled) {
  color: #6b7280 !important;
}

.mock-count-input :deep(.el-input-number__decrease.is-disabled .el-icon),
.mock-count-input :deep(.el-input-number__increase.is-disabled .el-icon) {
  color: #6b7280 !important;
}

.mock-count-unit {
  font-size: 12px;
  color: #9ca3af;
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

.gold-checkbox :deep(.el-checkbox__label) {
  color: #9ca3af;
}

.gold-checkbox :deep(.el-checkbox__inner) {
  background-color: #262626;
  border-color: rgba(255, 255, 255, 0.2);
}

.gold-checkbox :deep(.el-checkbox__inner:hover) {
  border-color: #f2c94c;
}

.gold-checkbox :deep(.el-checkbox__inner.is-checked) {
  background-color: #f2c94c;
  border-color: #f2c94c;
}

.gold-checkbox :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #f3f4f6;
}

.dialog-info-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dialog-info-row .label {
  color: #9ca3af;
  min-width: 70px;
}

.dialog-info-row .value {
  color: #f3f4f6;
}

.field-count {
  font-size: 12px;
  font-weight: normal;
}

.field-badge {
  display: inline-block;
  padding: 2px 4px;
  font-size: 12px;
  color: #f2c94c;
  background: rgba(242, 201, 76, 0.15);
  border-radius: 8px;
}

.json-preview :deep(.el-textarea__inner) {
  font-family: var(--mono);
  font-size: 12px;
  background: #262626;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f3f4f6;
  box-shadow: none;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.json-preview :deep(.el-textarea__inner)::-webkit-scrollbar {
  display: none;
}

.mock-data-input {
  flex: 1;
  min-width: 100%;
}

.mock-data-input :deep(.el-textarea__inner) {
  font-family: var(--mono);
  font-size: 12px;
  background: #262626;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f3f4f6;
  box-shadow: none;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.mock-data-input :deep(.el-textarea__inner)::-webkit-scrollbar {
  display: none;
}
</style>
