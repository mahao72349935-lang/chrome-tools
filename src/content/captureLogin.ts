/**
 * @Description: Content Script - 监听登录页面的登录行为，抓取用户名和密码
 * @Author: mahao
 * @Date: 2026-03-27
 *
 * 注意：此文件运行在目标页面上下文中，不能引用 Vue/Pinia 等扩展内部模块。
 * 通过 chrome.runtime.sendMessage 将凭证发回侧边栏。
 */

/** 判断当前页面是否为登录页 */
function isLoginPage(): boolean {
	return window.location.href.toLowerCase().includes('login');
}

/**
 * 从页面中提取用户名和密码输入框的当前值
 * 支持常见的用户名/手机/账号输入框命名
 */
function readCredentials(): { username: string; password: string } | null {
	const passwordEl = document.querySelector<HTMLInputElement>('input[type="password"]');
	if (!passwordEl) return null;

	// 按优先级依次匹配用户名输入框
	const usernameEl =
		document.querySelector<HTMLInputElement>('input[name*="user"]') ||
		document.querySelector<HTMLInputElement>('input[name*="phone"]') ||
		document.querySelector<HTMLInputElement>('input[name*="account"]') ||
		document.querySelector<HTMLInputElement>('input[name*="login"]') ||
		document.querySelector<HTMLInputElement>('input[name*="email"]') ||
		document.querySelector<HTMLInputElement>('input[placeholder*="用户名"]') ||
		document.querySelector<HTMLInputElement>('input[placeholder*="手机"]') ||
		document.querySelector<HTMLInputElement>('input[placeholder*="账号"]') ||
		document.querySelector<HTMLInputElement>('input[type="text"]') ||
		document.querySelector<HTMLInputElement>('input[type="tel"]') ||
		document.querySelector<HTMLInputElement>('input[type="email"]');

	if (!usernameEl) return null;

	return {
		username: usernameEl.value.trim(),
		password: passwordEl.value.trim(),
	};
}

/** 判断元素是否为登录按钮 */
function isLoginButton(el: Element): boolean {
	const text = el.textContent?.trim().toLowerCase() || '';
	const keywords = ['登录', '登 录', 'login', 'sign in', '确认', '提交'];
	const hasKeyword = keywords.some((kw) => text.includes(kw));

	const type = (el as HTMLInputElement).type?.toLowerCase();
	const isSubmit = type === 'submit';

	return hasKeyword || isSubmit;
}

function sendCredentials(): void {
	const loginInfo = readCredentials();
	if (!loginInfo || (!loginInfo.username && !loginInfo.password)) return;
	chrome.runtime.sendMessage({
		type: 'MH_LOGIN_CAPTURED',
		username: loginInfo.username,
		password: loginInfo.password,
	});
}

function setupCapture(): void {
	if (!isLoginPage()) return;

	// 监听表单提交（兜底方案）
	document.addEventListener(
		'submit',
		() => {
			sendCredentials();
		},
		true,
	);

	// 监听按钮点击
	document.addEventListener(
		'click',
		(e: MouseEvent) => {
			const target = e.target as HTMLElement;
			// 向上查找最近的按钮类元素
			const button = target.closest('button, [role="button"], .el-button, input[type="submit"], input[type="button"]');
			if (!button || !isLoginButton(button)) return;

			// 稍微延迟，确保双向绑定/input 值已同步
			setTimeout(sendCredentials, 0);
		},
		true,
	);
}

// DOM 就绪后执行
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setupCapture);
} else {
	setupCapture();
}
