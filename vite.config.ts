/*
 * @Description:
 * @Author: mahao
 * @Date: 2026-03-17 15:38:40
 * @LastEditors: mahao
 * @LastEditTime: 2026-03-19 17:23:36
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	// 关键：将 base 设置为相对路径，否则插件内引用的 JS/CSS 会路径报错
	base: './',
	server: {
		host: '0.0.0.0',
		port: 5175,
		proxy: {
			//前端跨域
			'/api': {
				target: 'http://localhost:5173', //目标地址
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ''), //重写地址
			},
		},
	},
});
