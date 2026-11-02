/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator, type Page } from '@playwright/test';

/** The Text kind's editor pane and its own config controls. */
export interface TextPane {
	pane(): Locator;
	/**
	 * Replaces the whole body. Inserted as text, not typed, so CodeMirror's
	 * bracket auto-close cannot double `[` or `(`.
	 */
	setMarkdown(markdown: string): Promise<void>;
	toolbar(): Locator;
}

export function textPaneAt(page: Page): TextPane {
	const textPane = (): Locator => page.getByTestId('text-panel-editor-pane');
	const textInput = (): Locator => textPane().locator('.cm-content');
	return {
		pane: textPane,
		async setMarkdown(markdown) {
			await textInput().click();
			await page.keyboard.press('ControlOrMeta+a');
			await page.keyboard.press('Delete');
			await page.keyboard.insertText(markdown);
		},
		toolbar: () => textPane().getByTestId('markdown-editor-toolbar'),
	};
}
