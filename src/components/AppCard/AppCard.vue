<!--
 * @Description: 自定义卡片组件 - 深色+金色风格
 * @Author: mahao
 * @Date: 2026-03-20
-->
<template>
  <div class="app-card" :class="{ 'is-active': active }">
    <div v-if="$slots.header" class="app-card__header">
      <slot name="header" />
    </div>
    <div class="app-card__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** 是否激活/选中状态，显示金色边框 */
  active?: boolean;
}>();
</script>

<style scoped>
.app-card {
  --card-bg: rgba(255, 255, 255, 0.05);
  --card-bg-solid: #1e1e1e;
  --card-border: transparent;
  --card-radius: 16px;
  --card-padding: 5px 10px;
  --card-header-bg: rgba(255, 255, 255, 0.03);
  --card-accent: #f2c94c;
  --card-text: #f3f4f6;
  --card-text-muted: #9ca3af;

  background: var(--card-bg-solid);
  border-radius: var(--card-radius);
  border: 1px solid var(--card-border);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  padding-bottom: 10px;
}

.app-card.is-active {
  border-color: var(--card-accent);
  box-shadow: 0 0 0 1px var(--card-accent);
}

.app-card__header {
  padding: var(--card-padding);
  background: var(--card-header-bg);
  font-weight: 600;
  font-size: 14px;
  color: var(--card-text);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.app-card__body {
  padding: 0 10px;
  color: var(--card-text-muted);
  font-size: 13px;
}
</style>
