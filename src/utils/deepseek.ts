/*
 * @Description:
 * @Author: mahao
 * @Date: 2026-03-20 12:07:27
 * @LastEditors: mahao
 * @LastEditTime: 2026-03-20 14:12:06
 */
/**
 * @Description: DeepSeek 生成假数据 - 前端直接调用
 * @Author: mahao
 * @Date: 2026-03-20
 */

export interface FormField {
	name: string;
	type: string;
	placeholder: string;
	label: string;
}

export interface GenerateMockDataParams {
	formFields: FormField[];
	mockCount: number;
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

function getApiKey(): string {
	const key = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined;
	if (!key?.trim()) {
		throw new Error('请配置 VITE_DEEPSEEK_API_KEY，在项目根目录创建 .env.local 并添加：VITE_DEEPSEEK_API_KEY=你的API密钥');
	}
	return key.trim();
}

function buildPrompt(formFields: FormField[], mockCount: number): string {
	const fieldsDesc = formFields.map((f) => `- "${f.label}": 类型${f.type}`).join('\n');
	return `根据以下表单字段定义，生成 ${mockCount} 条符合中文场景的假数据。字段说明：
${fieldsDesc}

要求：
1. 严格输出 JSON 数组格式，每条数据是一个对象
2. 对象的 key 必须使用上述字段的 label（中文标签），如 "MN编码"、"设备名称"
3. 根据 type 生成合理数据：input/textarea 用中文文本，select 用选项之一，date 用 YYYY-MM-DD，number 用数字
4. 只输出 JSON 数组，不要其他说明文字
5. 数据要符合成都环境检测行业常见业务场景（如机构、地址、电话等格式），一定是真实存在的数据，不要编造数据。
6. 多条数据之间要有差异，避免完全重复
7. 每次都要重新生成，不要使用相同的值，如果出现地名，只能出现四川省范围内，不要出现其他地区。

示例格式：[{"MN编码":"MN20240521001","设备名称":"烟气流速在线监控(监测)仪器仪表",...}]`;
}

/**
 * 前端直接调用 DeepSeek API 生成假数据
 * 需在 .env.local 配置 VITE_DEEPSEEK_API_KEY
 */
export async function generateMockData(params: GenerateMockDataParams): Promise<{ success: boolean; data?: string; message?: string }> {
	const { formFields, mockCount } = params;
	const apiKey = getApiKey();

	const response = await fetch(DEEPSEEK_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: 'deepseek-chat',
			messages: [
				{
					role: 'user',
					content: buildPrompt(formFields, mockCount),
				},
			],
			response_format: { type: 'json_object' },
			temperature: 0.7,
		}),
	});

	if (!response.ok) {
		const errText = await response.text();
		let message = `请求失败 ${response.status}`;
		try {
			const errJson = JSON.parse(errText);
			message = errJson.error?.message || errJson.message || errText || message;
		} catch {
			message = errText || message;
		}
		return { success: false, message };
	}

	const json = await response.json();
	const content = json.choices?.[0]?.message?.content;
	if (!content) {
		return { success: false, message: '响应格式异常' };
	}

	// DeepSeek 可能返回 { "data": [...] } 或直接 [...]
	try {
		const parsed = JSON.parse(content);
		const arr = Array.isArray(parsed) ? parsed : (parsed.data ?? parsed.list ?? Object.values(parsed)[0]);
		const dataStr = Array.isArray(arr) ? JSON.stringify(arr, null, 2) : content;
		return { success: true, data: dataStr };
	} catch {
		return { success: true, data: content };
	}
}

/** 行为录制回放用：需填充的步骤摘要 */
export interface BehaviorStepForAi {
	index: number;
	type: string;
	selector: string;
	value?: string;
	tagName?: string;
}

export interface GenerateReplayValuesParams {
	steps: BehaviorStepForAi[];
	username?: string;
	password?: string;
}

function buildBehaviorReplayPrompt(steps: BehaviorStepForAi[]): string {
	const lines = steps.map((s) => `- 序号 ${s.index}: 事件=${s.type}, 标签=${s.tagName || '?'}, 选择器=${s.selector}, 录制时的值=${s.value ?? '(空)'}`).join('\n');
	return `你是一个前端测试助手。用户在页面上录制了若干操作，下列序号对应需要在回放时写入表单/控件的步骤（仅 input、change 类）。

步骤列表：
${lines}

要求：
1. 为上述每一个序号生成「新的」假数据值，用于自动化回填测试；语言以中文为主，电话/地址等要符合中国大陆常见格式。
2. 严格输出一个 JSON 对象，不要有其它说明文字。
3. 对象的 key 必须是步骤序号字符串，如 "0"、"3"；value 为要填入的字符串。
4. 与录制时值类型保持一致（数字框填数字文本，日期类填 YYYY-MM-DD，下拉可填合理选项文本）。
5. 数据要符合成都环境检测等行业常见业务场景，地名限定在四川省范围内。

示例：{"2":"成都某某监测站","4":"13800138000"}`;
}

/**
 * 根据录制的 input/change 步骤，生成回放用的键值 JSON（key 为步骤序号字符串）
 */
export async function generateReplayValuesFromSteps(params: GenerateReplayValuesParams): Promise<{ success: boolean; data?: string; message?: string }> {
	const { steps } = params;
	if (!steps.length) {
		return { success: false, message: '没有可生成假数据的步骤' };
	}
	const apiKey = getApiKey();

	const response = await fetch(DEEPSEEK_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: 'deepseek-chat',
			messages: [
				{
					role: 'user',
					content: buildBehaviorReplayPrompt(steps),
				},
			],
			response_format: { type: 'json_object' },
			temperature: 0.7,
		}),
	});

	if (!response.ok) {
		const errText = await response.text();
		let message = `请求失败 ${response.status}`;
		try {
			const errJson = JSON.parse(errText);
			message = errJson.error?.message || errJson.message || errText || message;
		} catch {
			message = errText || message;
		}
		return { success: false, message };
	}

	const json = await response.json();
	const content = json.choices?.[0]?.message?.content;
	if (!content) {
		return { success: false, message: '响应格式异常' };
	}

	try {
		const parsed = JSON.parse(content);
		const map = parsed.values && typeof parsed.values === 'object' ? parsed.values : parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
		if (map && typeof map === 'object' && !Array.isArray(map)) {
			return { success: true, data: JSON.stringify(map, null, 2) };
		}
		return { success: true, data: content };
	} catch {
		return { success: true, data: content };
	}
}
