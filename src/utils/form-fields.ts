/**
 * @Description: 从页面提取 Element UI 表单字段（用于 chrome.scripting.executeScript 注入）
 * @Author: mahao
 * @Date: 2026-03-17
 */

export interface FormFieldResult {
  name: string;
  type: string;
  placeholder: string;
  label: string;
}

export interface PageInfoResult {
  title: string;
  url: string;
  dialog: { title?: string; bodyText?: string; visible?: boolean } | null;
  formFields: FormFieldResult[];
  menuName: string;
}

/**
 * 注入到目标页面执行的脚本：获取弹窗表单字段
 * 注意：此函数会被序列化注入，勿引用外部变量
 */
export function getFormFieldsScript(): PageInfoResult {
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
      const comp = anyEl.__vueParentComponent;
      if (comp?.props?.prop) {
        const p = comp.props.prop;
        return Array.isArray(p) ? p.join('.') : String(p);
      }
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
        const name = prop || (label ? label.replace(/\s/g, '') : `field_${index}`);
        return {
          name,
          type: getInputType(item),
          placeholder: placeholder || label,
          label: label || placeholder,
        };
      })
      .filter((f: { label: string; placeholder: string }) => f.label || f.placeholder);
  };

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
  const activeMenuItem = document.querySelector('.el-menu-item.is-active');
  const menuName = activeMenuItem?.textContent?.trim() || '';

  return {
    title: document.title,
    url: window.location.href,
    dialog: dialogInfo,
    formFields,
    menuName,
  };
}
