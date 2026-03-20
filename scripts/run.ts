/**
 * Playwright 自动填充表单脚本
 * 根据页面 formFields 结构自动填充 Element UI 表单
 */
import { chromium } from '@playwright/test';
import { getFormFieldsFromPage, fillFormBySchema } from './form-utils';

// ============ 假数据（请根据实际业务替换） ============
const siteFakerData = [
  { stationName: '宽窄巷子空气监测', stationCode: 'KZXZ001', address: '成都市宽窄巷子' },
  // 更多站点...
];

const deviceFakerData = [
  { mn: 'MN1773304839709', deviceName: '设备1', password: '123456', deviceCategory: '空气监测', overdueTime: '2025-12-31', stationId: '宽窄巷子空气监测' },
  // 更多设备...
];

const siteTypeFakerData = { deviceCategory: '空气监测' }; // 站点表单中 select 的选项映射
const deviceTypeFakerData = { deviceCategory: '空气监测' }; // 设备表单中 select 的选项映射

async function run() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 800,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/siteManage');
    console.log('🚀 已进入页面...');

    // 登录
    const loginButton = page.locator('button.el-button:has-text("登"), button.el-button:has-text("登录")').first();
    await loginButton.waitFor({ state: 'visible', timeout: 5000 });
    await loginButton.click();

    // ============ 站点管理 ============
    await page.locator('.el-menu-item:has-text("站点管理")').click();

    for (let i = 0; i < siteFakerData.length; i++) {
      const data = siteFakerData[i];
      console.log(`正在处理站点 ${i + 1}/${siteFakerData.length}: ${data.stationName}`);

      const addButton = page.locator('button.el-button:has-text("新"), button.el-button:has-text("新增")').first();
      await addButton.waitFor({ state: 'visible', timeout: 5000 });
      await addButton.click();

      const dialog = page.locator('.el-dialog').last();
      await dialog.waitFor({ state: 'visible', timeout: 5000 });

      // 从页面获取 formFields，再按 data 填充
      const formFields = await getFormFieldsFromPage(page);
      const formData = { ...siteTypeFakerData, ...data };
      await fillFormBySchema(page, formFields, formData, dialog);

      const confirmBtn = dialog.locator('button.el-button--primary:has-text("确"), .el-dialog__footer button:has-text("确定")').first();
      await confirmBtn.click();
      await dialog.waitFor({ state: 'hidden', timeout: 5000 });
      console.log(`✅ 站点 ${i + 1} 创建成功`);
      await page.waitForTimeout(500);
    }

    // ============ 设备管理 ============
    await page.locator('.el-menu-item:has-text("设备管理")').click();

    for (let i = 0; i < deviceFakerData.length; i++) {
      const data = deviceFakerData[i];
      console.log(`正在处理设备 ${i + 1}/${deviceFakerData.length}: ${data.mn}`);

      const addButton = page.locator('button.el-button:has-text("新"), button.el-button:has-text("新增")').first();
      await addButton.waitFor({ state: 'visible', timeout: 5000 });
      await addButton.click();

      const dialog = page.locator('.el-dialog').last();
      await dialog.waitFor({ state: 'visible', timeout: 5000 });

      const formFields = await getFormFieldsFromPage(page);
      const formData = { ...deviceTypeFakerData, ...data };
      await fillFormBySchema(page, formFields, formData, dialog);

      const confirmBtn = dialog.locator('button.el-button--primary:has-text("确"), .el-dialog__footer button:has-text("确定")').first();
      await confirmBtn.click();
      await dialog.waitFor({ state: 'hidden', timeout: 5000 });
      console.log(`✅ 设备 ${i + 1} 创建成功`);
      await page.waitForTimeout(500);
    }

    // ============ 更换站点 ============
    const changeSiteBtn = page.locator('tr', { hasText: 'MN1773304839709' }).locator('button:has-text("更换站点")').first();
    await changeSiteBtn.waitFor({ state: 'visible', timeout: 5000 });
    await changeSiteBtn.click();

    const changeSiteDialog = page.locator('.el-dialog').last();
    await changeSiteDialog.waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('.el-dialog .el-form-item__label').getByText('所属站点').click();
    const options = page.locator('.el-select-dropdown__item:visible');
    const count = await options.count();
    if (count > 0) {
      const randomIndex = Math.floor(Math.random() * count);
      const selectedText = await options.nth(randomIndex).innerText();
      console.log(`所属站点 随机选择: ${selectedText}`);
      await options.nth(randomIndex).click();
    }

    const changeConfirmBtn = changeSiteDialog.locator('button.el-button--primary:has-text("确"), .el-dialog__footer button:has-text("确定")').first();
    await changeConfirmBtn.click();
    await changeSiteDialog.waitFor({ state: 'hidden', timeout: 500 });
    console.log('🎉 所有假数据全部处理完毕！');
  } catch (error) {
    console.error('❌ 脚本运行出错:', error);
    await page.pause();
  }
}

run();
