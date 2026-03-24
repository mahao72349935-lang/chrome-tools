/**
 * @Description: 页面行为录制与回放（供 chrome.scripting.executeScript 注入）
 * @Author: mahao
 * @Date: 2026-03-24
 * 注意：导出函数会被序列化注入目标页，勿引用外部变量/模块
 */

export interface RecordedStep {
	type: string;
	selector: string;
	value?: string;
	tagName?: string;
	label?: string;
	timestamp: number;
}

type MhRecordWindow = Window & {
	__mhBehaviorSteps?: RecordedStep[];
	__mhStopBehaviorRecord?: () => RecordedStep[];
	__mhInputTimers?: Map<Element, number>;
};

/**
 * 开始录制：在 document 上捕获 click / input / change
 * el-select 下拉选项点击 → 语义化为 select-option 步骤
 */
export function startBehaviorRecordingScript(): { ok: boolean; message?: string } {
	function isStableId(id: string): boolean {
		if (/^el-id-/i.test(id)) return false;
		if (/^el-popper-/i.test(id)) return false;
		if (/^\d+$/.test(id)) return false;
		if (id.length > 60) return false;
		return true;
	}

	function getSelector(el: Element | null): string {
		if (!el || el.nodeType !== 1) return '';
		const htmlEl = el as HTMLElement;
		if (htmlEl.id && isStableId(htmlEl.id)) {
			try {
				return '#' + CSS.escape(htmlEl.id);
			} catch {
				return '#' + String(htmlEl.id).replace(/([\\.#:[\],])/g, '\\$1');
			}
		}
		const segments: string[] = [];
		let current: Element | null = el;
		let depth = 0;
		while (current && current !== document.documentElement && depth < 10) {
			let part = current.tagName.toLowerCase();
			if (current.className && typeof current.className === 'string') {
				const cls = current.className
					.trim()
					.split(/\s+/)
					.filter((c) => c && !c.startsWith('ng-') && !c.startsWith('is-'))
					.slice(0, 2);
				if (cls.length) {
					try {
						part += '.' + cls.map((c) => CSS.escape(c)).join('.');
					} catch {
						part += '.' + cls.join('.');
					}
				}
			}
			const parentEl: Element | null = current.parentElement;
			if (parentEl) {
				const cur = current;
				const sameTag = Array.from(parentEl.children).filter(
					(child): child is Element => child.nodeType === 1 && child.tagName === cur.tagName,
				);
				if (sameTag.length > 1) {
					const idx = sameTag.indexOf(cur) + 1;
					part += `:nth-of-type(${idx})`;
				}
			}
			segments.unshift(part);
			current = parentEl;
			depth++;
		}
		return segments.join(' > ') || el.tagName.toLowerCase();
	}

	/** 找 el-select 的触发容器：从 popper 找回它对应的 select wrapper */
	function findSelectTriggerForPopperItem(optionEl: Element): Element | null {
		const popper = optionEl.closest('.el-select-dropdown, .el-popper');
		if (!popper) return null;
		const popperId =
			popper.id || popper.getAttribute('aria-label') || '';
		if (popperId) {
			const trigger = document.querySelector(
				`[aria-controls="${popperId}"], [aria-describedby="${popperId}"]`,
			);
			if (trigger) return trigger.closest('.el-select') || trigger;
		}
		const allSelects = document.querySelectorAll('.el-select');
		for (const sel of Array.from(allSelects)) {
			const wrapper = sel.querySelector('.el-select__wrapper, .el-input');
			if (!wrapper) continue;
			if (wrapper.getAttribute('aria-expanded') === 'true' ||
				sel.classList.contains('is-focus') ||
				sel.querySelector('.el-input.is-focus')) {
				return sel;
			}
		}
		return null;
	}

	function readValue(target: EventTarget | null): string | undefined {
		if (!target || !(target as HTMLElement).tagName) return undefined;
		const t = target as HTMLInputElement;
		const tag = t.tagName.toLowerCase();
		if (tag === 'input' || tag === 'textarea' || tag === 'select') {
			if (tag === 'input' && t.type === 'password') return '[password]';
			return typeof t.value === 'string' ? t.value : undefined;
		}
		return undefined;
	}

	/** 获取 el-form-item label */
	function getFormItemLabel(el: Element): string {
		const formItem = el.closest('.el-form-item');
		if (formItem) {
			const label = formItem.querySelector('.el-form-item__label');
			if (label) return label.textContent?.trim() || '';
		}
		return '';
	}

	const w = window as MhRecordWindow;
	if (typeof w.__mhStopBehaviorRecord === 'function') {
		w.__mhStopBehaviorRecord();
	}

	const steps: RecordedStep[] = [];
	w.__mhBehaviorSteps = steps;
	const timers = new Map<Element, number>();
	w.__mhInputTimers = timers;

	function handleClick(e: Event) {
		const target = e.target;
		if (!target || !(target instanceof Element)) return;
		if (target.closest('[data-mh-ignore-behavior]')) return;

		const dropdownItem = target.closest('.el-select-dropdown__item');
		if (dropdownItem) {
			const optionText = dropdownItem.textContent?.trim() || '';
			const selectEl = findSelectTriggerForPopperItem(dropdownItem);
			if (selectEl) {
				const selector = getSelector(selectEl);
				steps.push({
					type: 'select-option',
					selector,
					value: optionText,
					tagName: 'el-select',
					label: getFormItemLabel(selectEl),
					timestamp: Date.now(),
				});
				return;
			}
		}

		const selectWrapper = target.closest('.el-select');
		if (selectWrapper) {
			const selector = getSelector(selectWrapper);
			if (selector) {
				steps.push({
					type: 'select-click',
					selector,
					tagName: 'el-select',
					label: getFormItemLabel(selectWrapper),
					timestamp: Date.now(),
				});
			}
			return;
		}

		const selector = getSelector(target);
		if (!selector) return;
		const tagName = (target as HTMLElement).tagName.toLowerCase();

		steps.push({
			type: 'click',
			selector,
			tagName,
			label: getFormItemLabel(target),
			timestamp: Date.now(),
		});
	}

	function handleInput(e: Event) {
		const target = e.target;
		if (!target || !(target instanceof Element)) return;
		if (target.closest('[data-mh-ignore-behavior]')) return;
		if (target.closest('.el-select')) return;

		const prev = timers.get(target);
		if (prev) window.clearTimeout(prev);
		const id = window.setTimeout(() => {
			timers.delete(target);
			const selector = getSelector(target);
			if (!selector) return;
			steps.push({
				type: 'input',
				selector,
				value: readValue(target),
				tagName: (target as HTMLElement).tagName.toLowerCase(),
				label: getFormItemLabel(target),
				timestamp: Date.now(),
			});
		}, 400);
		timers.set(target, id);
	}

	function handleChange(e: Event) {
		const target = e.target;
		if (!target || !(target instanceof Element)) return;
		if (target.closest('[data-mh-ignore-behavior]')) return;
		if (target.closest('.el-select')) return;

		const selector = getSelector(target);
		if (!selector) return;
		steps.push({
			type: 'change',
			selector,
			value: readValue(target),
			tagName: (target as HTMLElement).tagName.toLowerCase(),
			label: getFormItemLabel(target),
			timestamp: Date.now(),
		});
	}

	document.addEventListener('click', handleClick, true);
	document.addEventListener('input', handleInput, true);
	document.addEventListener('change', handleChange, true);

	w.__mhStopBehaviorRecord = () => {
		document.removeEventListener('click', handleClick, true);
		document.removeEventListener('input', handleInput, true);
		document.removeEventListener('change', handleChange, true);
		timers.forEach((tid) => window.clearTimeout(tid));
		timers.clear();
		const copy = [...steps];
		steps.length = 0;
		w.__mhBehaviorSteps = undefined;
		w.__mhStopBehaviorRecord = undefined;
		w.__mhInputTimers = undefined;
		return copy;
	};

	return { ok: true };
}

/**
 * 结束录制并返回步骤副本（若未在录制则返回空数组）
 */
export function stopBehaviorRecordingScript(): { steps: RecordedStep[] } {
	const w = window as MhRecordWindow;
	const stop = w.__mhStopBehaviorRecord;
	if (typeof stop !== 'function') return { steps: [] };
	const steps = stop();
	return { steps };
}

/**
 * 录制过程中拉取当前已收集步骤（不停止录制）
 */
export function getBehaviorRecordingSnapshotScript(): { steps: RecordedStep[] } {
	const w = window as MhRecordWindow;
	const steps = w.__mhBehaviorSteps;
	return { steps: steps ? [...steps] : [] };
}

export interface SingleReplayResult {
	ok: boolean;
	error?: string;
}

/**
 * 单步回放 — 异步版本（el-select 需要等弹层出现）
 * 由扩展端循环调用，步骤间加延迟
 */
export async function applySingleReplayStepScript(
	step: { type: string; selector: string; value?: string; tagName?: string },
	overrideValue: string | null,
): Promise<SingleReplayResult> {
	const el = document.querySelector(step.selector);
	if (!el) return { ok: false, error: `未找到元素: ${step.selector}` };

	const tag = (step.tagName || el.tagName || '').toLowerCase();

	if (step.type === 'click') {
		(el as HTMLElement).click();
		return { ok: true };
	}

	if (step.type === 'select-click') {
		return replayElSelectClick(el);
	}

	if (step.type === 'select-option') {
		const val =
			overrideValue != null && overrideValue !== '' ? overrideValue : (step.value ?? '');
		return await replayElSelectOption(val);
	}

	if (step.type === 'input' || step.type === 'change') {
		const val =
			overrideValue != null && overrideValue !== '' ? overrideValue : (step.value ?? '');
		if (tag === 'select') {
			const sel = el as HTMLSelectElement;
			sel.focus();
			sel.value = val;
			sel.dispatchEvent(new Event('input', { bubbles: true }));
			sel.dispatchEvent(new Event('change', { bubbles: true }));
			return { ok: true };
		}
		if (tag === 'textarea' || tag === 'input') {
			const input = el as HTMLInputElement | HTMLTextAreaElement;
			input.focus();
			input.value = val;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			try {
				input.dispatchEvent(new InputEvent('input', { bubbles: true, data: val }));
			} catch {
				/* ignore */
			}
			input.dispatchEvent(new Event('change', { bubbles: true }));
			return { ok: true };
		}
		return { ok: false, error: `不支持的标签: ${tag}` };
	}

	return { ok: false, error: `跳过类型: ${step.type}` };
}

/** select-click：点击 el-select 触发器打开下拉 */
function replayElSelectClick(selectEl: Element): SingleReplayResult {
	const trigger =
		selectEl.querySelector('.el-select__wrapper') ||
		selectEl.querySelector('.el-input__wrapper') ||
		selectEl.querySelector('.el-input') ||
		selectEl;
	(trigger as HTMLElement).click();
	return { ok: true };
}

/** select-option：在当前已打开的下拉弹层中按文本匹配并点击选项 */
async function replayElSelectOption(optionText: string): Promise<SingleReplayResult> {
	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

	let dropdown: Element | null = null;
	for (let i = 0; i < 20; i++) {
		await wait(80);
		const poppers = document.querySelectorAll('.el-select-dropdown, .el-popper');
		for (const p of Array.from(poppers)) {
			const style = window.getComputedStyle(p);
			if (style.display !== 'none' && style.visibility !== 'hidden') {
				dropdown = p;
				break;
			}
		}
		if (dropdown) break;
	}
	if (!dropdown) return { ok: false, error: `el-select 下拉弹层未弹出` };

	const items = dropdown.querySelectorAll('.el-select-dropdown__item');
	let matched: Element | null = null;
	for (const item of Array.from(items)) {
		if ((item.textContent?.trim() || '') === optionText) {
			matched = item;
			break;
		}
	}
	if (!matched) {
		for (const item of Array.from(items)) {
			const txt = item.textContent?.trim() || '';
			if (txt.includes(optionText) || optionText.includes(txt)) {
				matched = item;
				break;
			}
		}
	}
	if (!matched) {
		return { ok: false, error: `下拉中未找到选项: "${optionText}"` };
	}

	(matched as HTMLElement).click();
	return { ok: true };
}
