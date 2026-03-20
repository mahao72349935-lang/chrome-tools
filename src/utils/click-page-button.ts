/**
 * 在目标页面中查找并点击指定文本的按钮
 * @param tabId 标签页 ID
 * @param buttonText 按钮文本，如「新增」
 * @returns { ok, msg }
 */
export async function clickPageButton(
  tabId: number,
  buttonText: string
): Promise<{ ok: boolean; msg?: string }> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: clickPageButtonScript,
    args: [buttonText],
  });
  const res = results?.[0]?.result;
  return res ?? { ok: false, msg: '执行失败' };
}

/**
 * 注入到页面的脚本：根据文本查找并点击按钮
 * 注意：此函数会被序列化注入，勿引用外部变量
 */
function clickPageButtonScript(text: string): { ok: boolean; msg: string } {
  const candidates = [
    ...document.querySelectorAll('button'),
    ...document.querySelectorAll('.el-button'),
    ...document.querySelectorAll('[role="button"]'),
    ...document.querySelectorAll('a.btn'),
  ];
  for (const el of candidates) {
    const t = el.textContent?.trim();
    if (t === text || t?.startsWith(text)) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
        (el as HTMLElement).click();
        return { ok: true, msg: `已点击${text}按钮` };
      }
    }
  }
  try {
    const xpath = `//*[contains(text(),'${text}') and (self::button or self::a or contains(@class,'el-button') or contains(@class,'btn'))]`;
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const node = result.singleNodeValue;
    if (node && node instanceof HTMLElement) {
      node.click();
      return { ok: true, msg: `已点击${text}按钮` };
    }
  } catch {
    /* ignore */
  }
  return { ok: false, msg: `未找到${text}按钮` };
}
