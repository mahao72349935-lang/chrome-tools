async function getDialogMessage(page: any) {
	const dialog = page.locator('.el-dialog').last();
	await dialog.waitFor({ state: 'visible', timeout: 5000 });

	// 方式 1: 获取弹窗标题
	const title = await dialog.locator('.el-dialog__title').innerText();

	// 方式 2: 获取弹窗 body 全部文本
	const bodyText = await dialog.locator('.el-dialog__body').innerText();

	// 方式 3: 使用 page.evaluate 在页面内执行，获取更丰富的信息
	const dialogInfo = await page.evaluate(() => {
		const el = document.querySelector('.el-dialog:last-of-type');
		if (!el) return null;
		const titleEl = el.querySelector('.el-dialog__title');
		const bodyEl = el.querySelector('.el-dialog__body');
		const formItems = Array.from(el.querySelectorAll('.el-form-item')).map((item) => {
			const label = item.querySelector('.el-form-item__label')?.textContent?.trim();
			const value = (item.querySelector('.el-input__inner') as HTMLInputElement)?.value || item.querySelector('.el-input__wrapper')?.textContent?.trim();
			return { label, value };
		});
		return {
			title: titleEl?.textContent?.trim(),
			bodyText: bodyEl?.textContent?.trim(),
			formItems,
		};
	});

	return { title, bodyText, dialogInfo };
}
