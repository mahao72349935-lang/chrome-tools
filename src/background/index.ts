/*
 * @Description:
 * @Author: mahao
 * @Date: 2026-03-24 17:29:31
 * @LastEditors: mahao
 * @LastEditTime: 2026-03-24 17:34:24
 */
// src/background/index.ts

// 设置点击扩展图标时直接打开侧边栏，而不是弹出 Popup
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

// 监听安装事件，可以做一些初始化
chrome.runtime.onInstalled.addListener(() => {
	console.log('Chrome Tools Extension Installed');
});
