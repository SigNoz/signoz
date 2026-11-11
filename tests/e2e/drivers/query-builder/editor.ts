/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import type { FilterEditor } from './types';

/** CodeMirror renders its placeholder inside the empty line. */
const EDITOR_DOC = async (root: Locator): Promise<string> => {
	const lines = root.locator('.cm-content .cm-line');
	const texts = await lines.allTextContents();
	const placeholders = await lines.evaluateAll((nodes) =>
		nodes.map((node) => node.querySelector('.cm-placeholder')?.textContent ?? ''),
	);
	return texts
		.map((text, i) =>
			placeholders[i] ? text.replace(placeholders[i], '') : text,
		)
		.join('\n');
};

export function editorAt(page: Page, root: () => Locator): FilterEditor {
	const content = (): Locator => root().locator('.cm-content');
	const editor: FilterEditor = {
		root,
		content,
		async type(text) {
			await editor.clear();
			await page.keyboard.type(text);
		},
		async append(text) {
			await content().click();
			await page.keyboard.press('End');
			await page.keyboard.type(text);
		},
		async clear() {
			await content().click();
			await page.keyboard.press('ControlOrMeta+a');
			await page.keyboard.press('Backspace');
			await expect.poll(() => EDITOR_DOC(root())).toBe('');
		},
		press: (key) => page.keyboard.press(key),
		expression: () => EDITOR_DOC(root()),
		lineCount: () => root().locator('.cm-line'),
		suggestions: () => page.locator('.cm-tooltip-autocomplete'),
		async openSuggestions() {
			await expect(async () => {
				await page.keyboard.press('Control+Space');
				await expect(editor.suggestions()).toBeVisible({ timeout: 2_000 });
			}).toPass({ timeout: 15_000 });
		},
		suggestion: (label) =>
			page
				.locator('.cm-tooltip-autocomplete [role="option"]')
				.filter({ hasText: label }),
	};
	return editor;
}

/**
 * Two frames: an edit reaches React state on its next scheduler task, and an
 * action in the same frame reads the previous render. A long render delays
 * the frame itself, so this cannot pass before the commit.
 */
export async function afterRender(page: Page): Promise<void> {
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				// Runs in the browser; the e2e tsconfig has no DOM lib.
				const { requestAnimationFrame: frame } = globalThis as unknown as {
					requestAnimationFrame(this: void, callback: () => void): number;
				};
				frame(() => frame(() => resolve()));
			}),
	);
}
