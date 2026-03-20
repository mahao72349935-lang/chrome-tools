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
          <el-input v-model="jsonStr" type="textarea" :rows="14" readonly class="json-preview" />
          <div class="result-actions">
            <div class="mock-data-wrap">
              <el-checkbox v-model="useDeepSeekMock" size="small" class="gold-checkbox">
                是否需要生成假数据
              </el-checkbox>
              <span v-if="useDeepSeekMock" class="mock-count-wrap">
                <el-input-number v-model="mockCount" :min="1" :max="100" size="small" class="mock-count-input"
                  controls-position="right" />
                <span class="mock-count-unit">条</span>
              </span>
            </div>
            <div class="result-header-actions">
              <el-button class="gold-btn" size="small" @click="handleRunScript">
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
import { clickPageButton } from '../../utils/click-page-button';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const useDeepSeekMock = ref(false);
const mockCount = ref(1);
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

const goBack = () => router.push('/');

const getFormFieldsScript = () => {
  const getInputType = (item: Element) => {
    const content = item.querySelector('.el-form-item__content');
    if (!content) return 'input';
    if (content.querySelector('.el-select')) return 'select';
    if (content.querySelector('.el-date-editor')) return 'date';
    if (content.querySelector('.el-input-number')) return 'number';
    if (content.querySelector('textarea')) return 'textarea';
    return 'input';
  };

  const getPropFromVue = (el: Element): string => {
    try {
      const anyEl = el as any;
      // Vue 3: el-form-item 根元素的 __vueParentComponent 即 FormItem 组件实例
      const comp = anyEl.__vueParentComponent;
      if (comp?.props?.prop) {
        const p = comp.props.prop;
        return Array.isArray(p) ? p.join('.') : String(p);
      }
      // Vue 2 / Element UI: 根元素的 __vue__ 即 FormItem 组件实例
      const vue2Comp = anyEl.__vue__;
      if (vue2Comp?.prop) {
        const p = vue2Comp.prop;
        return Array.isArray(p) ? p.join('.') : String(p);
      }
    } catch {
      /* ignore */
    }
    return '';
  };

  const getFormFields = (container: Document | Element) => {
    const items = container.querySelectorAll('.el-form-item');
    return Array.from(items)
      .map((item: Element, index: number) => {
        const labelEl = item.querySelector('.el-form-item__label');
        const label = labelEl?.textContent?.trim() || '';
        const prop =
          item.getAttribute('prop') ||
          getPropFromVue(item) ||
          (item.querySelector('input, textarea')?.getAttribute('name') || '').trim();
        const input = item.querySelector('input, textarea');
        const placeholder = (input?.getAttribute('placeholder') || label || '') as string;
        const name =
          prop ||
          (label ? label.replace(/\s/g, '') : `field_${index}`);
        return {
          name,
          type: getInputType(item),
          placeholder: placeholder || label,
          label: label || placeholder,
        };
      })
      .filter((f: { label: string; placeholder: string }) => f.label || f.placeholder);
  };

  const getPageInfo = () => {
    const dialogs = document.querySelectorAll('.el-dialog');
    let dialog: Element | null = null;
    for (let i = dialogs.length - 1; i >= 0; i--) {
      const d = dialogs[i];
      const rect = d.getBoundingClientRect();
      const parent = d.closest('.el-overlay-dialog, .el-dialog__wrapper');
      const hidden = parent && getComputedStyle(parent).display === 'none';
      if (rect.width > 0 && rect.height > 0 && !hidden) {
        dialog = d;
        break;
      }
    }
    if (!dialog) dialog = document.querySelector('.el-dialog');

    const dialogInfo = dialog
      ? {
        title: dialog.querySelector('.el-dialog__title')?.textContent?.trim(),
        bodyText: dialog.querySelector('.el-dialog__body')?.textContent?.trim(),
        visible: true,
      }
      : null;

    const container = dialog ? dialog.querySelector('.el-dialog__body') : null;
    const formFields = container ? getFormFields(container) : [];

    // 通过 el-menu-item.is-active 获取当前激活的菜单名称
    const activeMenuItem = document.querySelector('.el-menu-item.is-active');
    const menuName = activeMenuItem?.textContent?.trim() || '';

    return {
      title: document.title,
      url: window.location.href,
      dialog: dialogInfo,
      formFields,
      menuName,
    };
  };

  return getPageInfo();
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const handleGetFields = async () => {
  loading.value = true;
  error.value = '';
  pageInfo.value = null;
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


const handleRunScript = async () => {
  const params = {
    formFields: pageInfo.value?.formFields || [],
    location: pageInfo.value?.url || '',
    menuName: pageInfo.value?.menuName || '',
    useDeepSeekMock: useDeepSeekMock.value,
    mockCount: useDeepSeekMock.value ? mockCount.value : undefined,
  };
  console.log('params: ', params);
  const res = await runPlaywright(params);
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
  padding: 0 10px;
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
  gap: 10px;
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
    align-items: center;
    gap: 10px;
    height: 34px;
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

.gold-btn:hover {
  background: #e6b73d !important;
  border-color: #e6b73d !important;
  color: #0d0d0d !important;
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
</style>
