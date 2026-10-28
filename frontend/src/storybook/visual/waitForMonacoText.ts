import { waitFor } from 'storybook/test';

/**
 * Monaco mounts its container before its language loads, so the editor is on
 * screen while still blank or uncoloured. Waits for text with at least two
 * token colours, which only exists once the tokenizer has run.
 */
export const waitForMonacoText = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await waitFor(
		() => {
			const lines = canvasElement.querySelector('.monaco-editor .view-lines');
			const tokens = new Set(
				Array.from(lines?.querySelectorAll('span[class^="mtk"]') ?? []).map(
					(token) => token.className,
				),
			);

			if (!lines?.textContent?.trim() || tokens.size < 2) {
				throw new Error('Monaco has not rendered its text');
			}
		},
		{ timeout: 15_000 },
	);
};
