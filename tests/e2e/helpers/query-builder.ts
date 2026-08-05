import { Page } from '@playwright/test';

const EDITOR_CONTENT = '.query-where-clause-editor .cm-content';
const SPANS = '.query-where-clause-editor .cm-line span';

export async function typeExpression(page: Page, expr: string): Promise<void> {
	const editor = page.locator(EDITOR_CONTENT).first();
	await editor.waitFor({ state: 'visible', timeout: 15_000 });
	await editor.click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.press('Delete');
	await page.keyboard.type(expr);
	await page.waitForTimeout(300);
}

export async function tokenColor(
	page: Page,
	text: string,
): Promise<string | null> {
	return page.evaluate(
		({ selector, target }) => {
			const el = Array.from(
				document.querySelectorAll<HTMLSpanElement>(selector),
			).find((s) => s.textContent === target);
			return el ? window.getComputedStyle(el).color : null;
		},
		{ selector: SPANS, target: text },
	);
}

export async function setupTheme(
	page: Page,
	theme: 'dark' | 'light',
): Promise<void> {
	await page.addInitScript((t) => localStorage.setItem('THEME', t), theme);
}
