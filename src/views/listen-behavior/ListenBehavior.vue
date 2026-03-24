<!--
 * @Description: 监听页面用户行为 — 录制、AI 假数据、回放填充
 * @Author: mahao
 * @Date: 2026-03-24
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
      <h2 class="page-title">监听行为</h2>
    </div>

    <div class="content">
      <el-alert type="info" :closable="false" show-icon class="tip-alert"
        title="请先在浏览器中打开目标业务页并保持为当前标签，再在此开始录制；结束录制后可用假数据与回放。" />

      <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" class="error-alert" />

      <div class="action-btns">
        <el-button type="primary" class="action-btn gold-primary-btn" :disabled="isRecording" :loading="starting"
          @click="handleStartRecord">
          开始记录
        </el-button>
        <el-button type="warning" class="action-btn" plain :disabled="!isRecording" :loading="stopping"
          @click="handleStopRecord">
          结束记录
        </el-button>
      </div>

      <div class="status-bar">
        <span>状态：<strong>{{ statusText }}</strong></span>
        <span v-if="pageUrl" class="url-ellipsis" :title="pageUrl">页面：{{ pageUrl }}</span>
      </div>

      <AppCard class="result-card" :active="displaySteps.length > 0">
        <template #header>
          <div class="result-header">
            <span class="success-title">
              <el-icon class="success-icon">
                <List />
              </el-icon>
              操作步骤
              <span v-if="displaySteps.length" class="field-badge">{{ displaySteps.length }} 条</span>
            </span>
          </div>
        </template>
        <div class="result-content">
          <el-input v-model="stepsJson" type="textarea" :rows="8" readonly class="json-preview"
            placeholder="结束记录后将显示步骤 JSON" />

          <div class="mock-data-wrap">
            <el-checkbox v-model="useFakeData" size="small" class="gold-checkbox" :disabled="!canUseFakeData">
              回放时使用 AI 假数据
            </el-checkbox>
            <el-button class="gold-btn" size="small" :loading="generateLoading" :disabled="!canGenerate"
              @click="handleGenerateData">
              生成数据
            </el-button>
          </div>

          <el-input v-model="replayValuesJson" type="textarea" :rows="6"
            placeholder='回放覆盖值 JSON，键为步骤序号字符串，如 {"2":"某某公司","4":"13800138000"}；不勾选假数据时将使用录制时的原值'
            class="mock-data-input" />

          <div class="result-header-actions">
            <el-button class="gold-btn" size="small" :loading="replaying" :disabled="!canReplay" @click="handleReplay">
              回放行为并填充
            </el-button>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, List } from '@element-plus/icons-vue';
import AppCard from '../../components/AppCard/AppCard.vue';
import {
  startBehaviorRecordingScript,
  stopBehaviorRecordingScript,
  getBehaviorRecordingSnapshotScript,
  applySingleReplayStepScript,
  type RecordedStep,
} from '../../utils/behavior-record';
import { generateReplayValuesFromSteps } from '../../utils/deepseek';

const router = useRouter();
const error = ref('');
const isRecording = ref(false);
const starting = ref(false);
const stopping = ref(false);
const replaying = ref(false);
const generateLoading = ref(false);
const pageUrl = ref('');
const recordedSteps = ref<RecordedStep[]>([]);
const stepsJson = ref('');
const useFakeData = ref(true);
const replayValuesJson = ref('');

let pollTimer: ReturnType<typeof setInterval> | null = null;

const displaySteps = computed(() => recordedSteps.value);

const statusText = computed(() => {
  if (isRecording.value) return '录制中…';
  if (recordedSteps.value.length) return '已停止（可回放）';
  return '未开始';
});

const canUseFakeData = computed(() => recordedSteps.value.length > 0);

const canGenerate = computed(() => {
  if (!useFakeData.value || !recordedSteps.value.length) return false;
  const sorted = sortedSteps.value;
  return sorted.some((s) => s.type === 'input' || s.type === 'change');
});

const sortedSteps = computed(() =>
  [...recordedSteps.value].sort((a, b) => a.timestamp - b.timestamp),
);

const canReplay = computed(() => sortedSteps.value.length > 0);

const goBack = () => router.push('/');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function syncStepsJson() {
  stepsJson.value = JSON.stringify(sortedSteps.value, null, 2);
}

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function pollSnapshot(tabId: number) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: getBehaviorRecordingSnapshotScript,
    });
    const snap = results?.[0]?.result as { steps?: RecordedStep[] } | undefined;
    if (snap?.steps) {
      recordedSteps.value = snap.steps;
      syncStepsJson();
    }
  } catch {
    /* 页面导航或权限时忽略单次失败 */
  }
}

watch(
  () => recordedSteps.value,
  () => syncStepsJson(),
  { deep: true },
);

const handleStartRecord = async () => {
  error.value = '';
  starting.value = true;
  recordedSteps.value = [];
  stepsJson.value = '';
  replayValuesJson.value = '';
  stopPolling();
  try {
    const tabId = await getActiveTabId();
    if (!tabId) {
      error.value = '无法获取当前标签页';
      return;
    }
    const tab = await chrome.tabs.get(tabId);
    pageUrl.value = tab.url || '';

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: startBehaviorRecordingScript,
    });
    const res = results?.[0]?.result as { ok?: boolean; message?: string };
    if (res && res.ok === false) {
      error.value = res.message || '开始录制失败';
      return;
    }
    isRecording.value = true;
    ElMessage.success('已开始记录，请在页面中操作');
    pollTimer = setInterval(() => void pollSnapshot(tabId), 700);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '注入录制脚本失败，请确认当前页可访问且扩展有权限';
  } finally {
    starting.value = false;
  }
};

const handleStopRecord = async () => {
  error.value = '';
  stopping.value = true;
  stopPolling();
  try {
    const tabId = await getActiveTabId();
    if (!tabId) {
      error.value = '无法获取当前标签页';
      isRecording.value = false;
      return;
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: stopBehaviorRecordingScript,
    });
    const payload = results?.[0]?.result as { steps?: RecordedStep[] };
    recordedSteps.value = payload?.steps ?? [];
    isRecording.value = false;
    syncStepsJson();
    ElMessage.success(`已结束记录，共 ${recordedSteps.value.length} 条事件`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '结束录制失败';
    isRecording.value = false;
  } finally {
    stopping.value = false;
  }
};

const handleGenerateData = async () => {
  if (!canGenerate.value) {
    ElMessage.warning('没有可生成假数据的 input/change 步骤');
    return;
  }
  generateLoading.value = true;
  error.value = '';
  try {
    const sorted = sortedSteps.value;
    const forAi = sorted
      .map((s, i) => ({
        index: i,
        type: s.type,
        selector: s.selector,
        value: s.value,
        tagName: s.tagName,
      }))
      .filter((s) => s.type === 'input' || s.type === 'change');

    const res = await generateReplayValuesFromSteps({ steps: forAi });
    if (res.success && res.data) {
      replayValuesJson.value = res.data;
      ElMessage.success('假数据已生成，可直接回放或手动修改 JSON');
    } else {
      error.value = res.message || '生成失败';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成假数据失败';
  } finally {
    generateLoading.value = false;
  }
};

const handleReplay = async () => {
  if (!canReplay.value) return;
  let overrides: Record<string, string> = {};
  if (useFakeData.value && replayValuesJson.value.trim()) {
    try {
      const parsed = JSON.parse(replayValuesJson.value.trim()) as Record<string, unknown>;
      overrides = Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [String(k), v == null ? '' : String(v)]),
      );
    } catch {
      error.value = '回放覆盖值 JSON 格式无效';
      return;
    }
  }

  replaying.value = true;
  error.value = '';
  try {
    const tabId = await getActiveTabId();
    if (!tabId) {
      error.value = '无法获取当前标签页';
      return;
    }

    const sorted = sortedSteps.value;
    const errors: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const step = sorted[i];
      const overrideVal =
        useFakeData.value && Object.keys(overrides).length
          ? overrides[String(i)] ?? overrides[step.selector] ?? null
          : null;

      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: applySingleReplayStepScript,
        args: [step, overrideVal],
      });
      const one = results?.[0]?.result as { ok?: boolean; error?: string };
      if (one && one.ok === false && one.error) errors.push(one.error);

      const delay = step.type === 'select-option' ? 1200 : step.type === 'click' ? 1000 : 800;
      await sleep(delay);
    }

    if (errors.length) {
      ElMessage.warning(`部分步骤未成功（${errors.length} 条），请查看控制台或检查选择器`);
      console.warn('[mh-tools replay]', errors);
    } else {
      ElMessage.success('回放完成');
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '回放失败';
  } finally {
    replaying.value = false;
  }
};

onUnmounted(() => {
  stopPolling();
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

.error-alert {
  margin-bottom: 10px;
}

.action-btns {
  display: flex;
  gap: 10px;
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

.status-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  margin-bottom: 10px;
  color: #9ca3af;
}

.status-bar strong {
  color: #f3f4f6;
}

.url-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-header {
  display: flex;
  gap: 5px;
  align-items: center;
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

.field-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  color: #f2c94c;
  background: rgba(242, 201, 76, 0.15);
  border-radius: 8px;
  font-weight: normal;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mock-data-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.result-header-actions {
  display: flex;
  align-items: center;
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

.json-preview :deep(.el-textarea__inner) {
  font-family: var(--mono, ui-monospace, monospace);
  font-size: 12px;
  background: #262626;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f3f4f6;
  box-shadow: none;
}

.mock-data-input :deep(.el-textarea__inner) {
  font-family: var(--mono, ui-monospace, monospace);
  font-size: 12px;
  background: #262626;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f3f4f6;
  box-shadow: none;
}
</style>
