/*
 * @Description:
 * @Author: mahao
 * @Date: 2026-03-17 15:38:40
 * @LastEditors: mahao
 * @LastEditTime: 2026-03-24 17:30:44
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

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
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				background: resolve(__dirname, 'src/background/index.ts'),
				'content-login': resolve(__dirname, 'src/content/captureLogin.ts'),
			},
			output: {
				entryFileNames: (chunkInfo) => {
					if (chunkInfo.name === 'background') return 'background.js';
					if (chunkInfo.name === 'content-login') return 'content-login.js';
					return 'assets/[name]-[hash].js';
				},
			},
		},
	},
});
