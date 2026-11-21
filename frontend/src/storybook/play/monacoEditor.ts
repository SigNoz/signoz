import { loader } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import { waitFor } from 'storybook/test';

// The first editor on a page loads Monaco itself, which takes a while on a cold
// cache.
const MONACO_LOAD = { timeout: 20_000 };

/**
 * The first Monaco editor under `root`, once it has painted its lines. Until then
 * `@monaco-editor/react` shows its loading text in place of the editor.
 */
export const findMonacoEditor = (
	root: ParentNode = document,
	text: string | RegExp = /\S/,
): Promise<HTMLElement> =>
	waitFor(() => {
		const editor = root.querySelector<HTMLElement>('.monaco-editor');
		const lines = editor?.querySelector('.view-lines')?.textContent ?? '';
		const painted =
			typeof text === 'string' ? lines.includes(text) : text.test(lines);

		if (!editor || !painted) {
			throw new Error('Monaco has not rendered its lines yet');
		}

		return editor;
	}, MONACO_LOAD);

/**
 * Replaces the text of the model whose language is `languageId`. Typing into
 * Monaco's hidden textarea never reaches the model in the test runner; an edit
 * on the model reaches the editor's `onChange` like a keystroke does.
 */
export const setMonacoText = async (
	languageId: string,
	text: string,
): Promise<void> => {
	const monaco = await loader.init();
	const models: monacoEditor.ITextModel[] = monaco.editor.getModels();
	const model = models.find(
		(candidate) => candidate.getLanguageId() === languageId,
	);

	if (!model) {
		throw new Error(`No Monaco model in ${languageId}`);
	}

	model.applyEdits([{ range: model.getFullModelRange(), text }]);
};

/** Drops focus, so the capture has no blinking cursor or focus ring. */
export const blurActiveElement = (): void => {
	(document.activeElement as HTMLElement | null)?.blur();
};
