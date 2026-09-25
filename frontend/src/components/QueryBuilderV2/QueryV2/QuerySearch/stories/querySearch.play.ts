import { EditorView } from '@codemirror/view';
import { userEvent, waitFor, within } from 'storybook/test';

/** Suggestions wait on a 300ms debounce and a fetch, past the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * The editor is controlled: each change round-trips through React state before
 * the next one is applied on top of it. People type slower than this.
 */
const KEYSTROKE_MS = 50;

/** Throws until `found` holds something, which is what `waitFor` retries on. */
const present = <TValue>(
	found: TValue | null | undefined,
	what: string,
): TValue => {
	if (found === null || found === undefined) {
		throw new Error(`${what} not found`);
	}

	return found;
};

const pause = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

const suggestionList = (canvasElement: HTMLElement): HTMLElement | null =>
	canvasElement.querySelector<HTMLElement>('.cm-tooltip-autocomplete');

const suggestionRow = (
	canvasElement: HTMLElement,
	text: string,
): HTMLElement | undefined => {
	const list = suggestionList(canvasElement);

	return list
		? within(list)
				.queryAllByRole('option')
				.find((option) => option.textContent?.includes(text))
		: undefined;
};

/** Ctrl+Space, the editor's own shortcut for asking for suggestions. */
const requestSuggestions = (editor: HTMLElement): void => {
	editor.dispatchEvent(
		new KeyboardEvent('keydown', {
			key: ' ',
			code: 'Space',
			ctrlKey: true,
			bubbles: true,
		}),
	);
};

/**
 * Asks for suggestions until the row shows. Focus and typing only open the
 * list once the keys have loaded, and moving the caret never does.
 */
const requestUntilShown = (
	canvasElement: HTMLElement,
	editor: HTMLElement,
	text: string,
): Promise<HTMLElement> =>
	waitFor(
		() => {
			const row = suggestionRow(canvasElement, text);

			if (!row) {
				requestSuggestions(editor);
			}

			return present(row, `suggestion "${text}"`);
		},
		{ ...untilLoaded, interval: 250 },
	);

const findView = async (
	canvasElement: HTMLElement,
): Promise<{ editor: HTMLElement; view: EditorView }> => {
	// An explorer renders one editor per query; the first is the one on screen.
	const editor = await waitFor(
		() =>
			present(
				canvasElement.querySelector<HTMLElement>(
					'.code-mirror-where-clause .cm-content',
				),
				'filter editor',
			),
		untilLoaded,
	);

	return {
		editor,
		view: present(EditorView.findFromDOM(editor), 'editor view'),
	};
};

/**
 * Focuses the filter and waits for its suggestion list. Until the list first
 * opens the editor is still settling from the focus, and moves the caret back
 * to the start of the line once on the way.
 */
const focusFilter = async (
	canvasElement: HTMLElement,
): Promise<{ editor: HTMLElement; view: EditorView }> => {
	const found = await findView(canvasElement);

	found.view.focus();
	await waitFor(
		() => {
			const list = suggestionList(canvasElement);

			if (!list) {
				requestSuggestions(found.editor);
			}

			return present(list, 'suggestion list');
		},
		{ ...untilLoaded, interval: 250 },
	);

	return found;
};

/** Waits for a row of the open suggestion list. */
export const findSuggestion = (
	canvasElement: HTMLElement,
	text: string,
): Promise<HTMLElement> =>
	waitFor(
		// Matched on text content: the typed prefix is split into its own span.
		() => present(suggestionRow(canvasElement, text), `suggestion "${text}"`),
		untilLoaded,
	);

/** Focuses the empty filter: every key, with any recent filters above them. */
export const openKeySuggestions = async (
	canvasElement: HTMLElement,
	row: string,
): Promise<void> => {
	const { editor } = await focusFilter(canvasElement);

	await requestUntilShown(canvasElement, editor, row);
};

/**
 * Focuses the filter and types onto the end of it one character at a time,
 * each as the transaction a keystroke makes, leaving the caret at the end so
 * the suggestion list follows what was typed. Quotes and brackets are not
 * closed for it: type both.
 *
 * `userEvent.type` cannot be used: CodeMirror redraws the line as tokens are
 * highlighted, which strands the caret `userEvent` tracks.
 */
export const typeFilter = async (
	canvasElement: HTMLElement,
	text: string,
): Promise<void> => {
	const { view } = await focusFilter(canvasElement);

	for (const character of text) {
		const at = view.state.doc.length;

		view.dispatch({
			changes: { from: at, insert: character },
			selection: { anchor: at + character.length },
			userEvent: 'input.type',
		});
		await pause(KEYSTROKE_MS);
	}
};

/**
 * Types an expression, then steps the caret back inside it, before a closing
 * bracket or parenthesis, where the suggestions are about what goes in there.
 */
export const typeFilterWithCaretBack = async (
	canvasElement: HTMLElement,
	text: string,
	stepsBack: number,
	row: string,
): Promise<void> => {
	await typeFilter(canvasElement, text);

	const { editor, view } = await findView(canvasElement);

	view.dispatch({
		selection: { anchor: view.state.doc.length - stepsBack },
		userEvent: 'select',
	});
	await requestUntilShown(canvasElement, editor, row);
};

/**
 * Moves focus off the filter, which is when the expression is validated and
 * the error marker can show.
 */
export const blurFilter = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.keyboard('{Escape}');
	await userEvent.click(canvasElement.ownerDocument.body);
};

/** Types an expression, leaves the filter and opens its validation errors. */
export const showFilterErrors = async (
	canvasElement: HTMLElement,
	text: string,
): Promise<void> => {
	await typeFilter(canvasElement, text);
	await blurFilter(canvasElement);

	const marker = await waitFor(
		() =>
			present(
				canvasElement.querySelector<HTMLElement>('.query-status-container button'),
				'error marker',
			),
		untilLoaded,
	);

	await userEvent.hover(marker);
	await waitFor(
		() =>
			present(
				canvasElement.ownerDocument.querySelector('.query-validation-error'),
				'validation error',
			),
		untilLoaded,
	);
};
