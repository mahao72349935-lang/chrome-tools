/** Page-injected: 获取筛选表单的项 — exported as `getFilterFormItems`. */
export function getFilterFormItems() {
  const form = document.querySelector('.query-filter-container .el-form');
  if (!form) return [];

  const items = form.querySelectorAll('.el-form-item');
  const filters: Array<{ label: string; value: string }> = [];

  items.forEach((item) => {
    const labelEl = item.querySelector('.el-form-item__label');
    const label = (labelEl?.textContent || '').replace(/[:：\s]/g, '').trim();
    if (!label) return;

    const content = item.querySelector('.el-form-item__content');
    if (!content) return;

    let value = '';
    // 1. 判断是否为下拉选择 (Select)
    const selectEl = content.querySelector('.el-select');
    // 2. 判断是否为日期范围选择 (Date Range Picker)
    const rangeEl = content.querySelector('.el-date-editor--daterange');
    // 3. 判断是否为普通输入框 (Input)
    const inputEl = content.querySelector('.el-input');
    // 4. 判断是否为文本域 (Textarea)
    const textareaEl = content.querySelector('.el-textarea__inner');

    if (selectEl) {
      // 获取 Select 的显示文字（注意：Element Plus 选中后文字可能在 .el-select__selected-item 或 input 的 value 中）
      // 这里优先获取 placeholder 所在的展示区域或 input 的实际 value
      const selectedText = selectEl.querySelector('.el-select__placeholder');
      value = selectedText ? (selectedText as HTMLElement).textContent?.trim() || '' : '';

      // 如果上面没拿到，尝试拿 input 的 value (适用于某些配置)
      if (!value) {
        const selectInput = selectEl.querySelector('input');
        if (selectInput) value = selectInput.value.trim();
      }
    }
    else if (rangeEl) {
      // 处理时间区间：找到两个 range-input
      const rangeInputs = rangeEl.querySelectorAll('.el-range-input');
      if (rangeInputs.length >= 2) {
        const start = (rangeInputs[0] as HTMLInputElement).value.trim();
        const end = (rangeInputs[1] as HTMLInputElement).value.trim();
        value = (start && end) ? `${start} 至 ${end}` : (start || end || '');
      }
    }
    else if (inputEl) {
      // 普通输入框或单选日期
      const inputInner = inputEl.querySelector('.el-input__inner') as HTMLInputElement;
      if (inputInner) value = inputInner.value.trim();
    }
    else if (textareaEl) {
      // 文本域
      value = (textareaEl as HTMLTextAreaElement).value.trim();
    }

    if (value) {
      filters.push({ label, value });
    }
  });

  return filters;
}
