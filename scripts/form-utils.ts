/**
 * 表单填充工具 - 根据 formFields 结构自动填充 Element UI 表单
 */
import type { Page, Locator } from '@playwright/test';

export interface FormField {
	name: string;
	type: 'input' | 'select' | 'date' | 'number' | 'textarea';
	placeholder: string;
	label: string;
}

/**
 * 从页面弹窗中提取 formFields（与扩展内逻辑一致）
 */
export async function getFormFieldsFromPage(page: Page): Promise<FormField[]> {
	const formFields = await page.evaluate(() => {
		const getInputType = (item: Element) => {
			const content = item.querySelector('.el-form-item__content');
			if (!content) return 'input';
			if (content.querySelector('.el-select')) return 'select';
			if (content.querySelector('.el-date-editor')) return 'date';
			if (content.querySelector('.el-input-number')) return 'number';
			if (content.querySelector('textarea')) return 'textarea';
			return 'input';
		};

		const getFormFields = (container: Document | Element) => {
			const items = container.querySelectorAll('.el-form-item');
			return Array.from(items)
				.map((item: Element, index: number) => {
					const labelEl = item.querySelector('.el-form-item__label');
					const label = labelEl?.textContent?.trim() || '';
					const prop = item.getAttribute('prop') || '';
					const input = item.querySelector('input, textarea');
					const placeholder = (input?.getAttribute('placeholder') || label || '') as string;
					const name = prop || (input?.getAttribute('name') || '').trim() || (label ? label.replace(/\s/g, '') : `field_${index}`);
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
		const container = dialog?.querySelector('.el-dialog__body') || null;
		return container ? getFormFields(container) : [];
	});
	return formFields as FormField[];
}

/**
 * 根据 formFields 和 data 自动填充表单
 * @param page Playwright Page
 * @param dialog 弹窗 Locator（可选，不传则自动取最后一个可见弹窗）
 * @param formFields 表单字段结构
 * @param data 要填充的数据对象，key 对应 formField.name
 */
export async function fillFormBySchema(page: Page, formFields: FormField[], data: Record<string, string | number | undefined>, dialog?: Locator): Promise<void> {
	const base = dialog || page.locator('.el-dialog').last();

	for (const field of formFields) {
		const value = data[field.name];
		if (value === undefined || value === null || value === '') continue;

		const valueStr = String(value);
		const formItem = base.locator('.el-form-item').filter({ has: page.locator('.el-form-item__label').filter({ hasText: field.label }) });

		if (field.type === 'input' || field.type === 'textarea' || field.type === 'number') {
			const input = formItem.locator('input, textarea').first();
			await input.waitFor({ state: 'visible', timeout: 3000 });
			await input.fill('');
			await input.fill(valueStr);
		} else if (field.type === 'select') {
			const selectTrigger = formItem.locator('.el-select .el-input, .el-select__wrapper').first();
			await selectTrigger.click();
			await page.waitForTimeout(300);
			const option = page.locator('.el-select-dropdown__item').filter({ hasText: valueStr }).first();
			await option.waitFor({ state: 'visible', timeout: 3000 });
			await option.click();
			await page.waitForTimeout(200);
		} else if (field.type === 'date') {
			const dateInput = formItem.locator('.el-date-editor input').first();
			await dateInput.waitFor({ state: 'visible', timeout: 3000 });
			await dateInput.fill(valueStr);
		}
	}
}
