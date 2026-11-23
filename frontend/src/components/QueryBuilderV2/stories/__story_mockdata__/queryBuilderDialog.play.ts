/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { EditorView } from '@codemirror/view';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { selectMetric } from '../QueryBuilderV2.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
}

const OPEN_SELECT_DROPDOWN =
	'.ant-select-dropdown:not(.ant-select-dropdown-hidden)';

/**
 * Query `name`, once the dialog has taken its opening focus: a click before
 * that loses focus to the dialog and closes what it opened.
 */
const findQuery = async (
	canvasElement: HTMLElement,
	name: string,
): Promise<HTMLElement> => {
	const query = await within(canvasElement).findByTestId(
		`query-${name}`,
		{},
		{ timeout: 10000 },
	);
	await waitFor(() =>
		expect(query.closest('[role=dialog]')?.contains(document.activeElement)).toBe(
			true,
		),
	);
	return query;
};

/** Clicks `target` and moves the pointer off it, so its hover tooltip closes. */
const press = async (target: Element): Promise<void> => {
	await userEvent.click(target);
	await userEvent.unhover(target);
};

const openSelect = async (field: HTMLElement): Promise<void> => {
	const selector = field.matches('.ant-select-selector')
		? field
		: field.querySelector<HTMLElement>('.ant-select-selector');
	if (!selector) {
		throw new Error('no select in field');
	}
	await userEvent.click(selector);
	await waitFor(() =>
		expect(document.querySelector(OPEN_SELECT_DROPDOWN)).not.toBeNull(),
	);
};

const editorIn = (scope: HTMLElement): EditorView => {
	const content = scope.querySelector<HTMLElement>('.cm-content');
	const view = content ? EditorView.findFromDOM(content) : null;
	if (!view) {
		throw new Error('editor not mounted');
	}
	return view;
};

/**
 * Focuses the editor in `scope`, types `text` as a CodeMirror transaction
 * (`userEvent.keyboard` does not start completion), and waits for options.
 */
const openSuggestions = async (
	scope: HTMLElement,
	text = '',
): Promise<void> => {
	const view = editorIn(scope);
	await userEvent.click(view.contentDOM);
	if (text) {
		const end = view.state.doc.length;
		view.dispatch({
			changes: { from: end, insert: text },
			selection: { anchor: end + text.length },
			userEvent: 'input.type',
		});
	}
	await waitFor(
		() =>
			expect(
				document.querySelectorAll('.cm-tooltip-autocomplete li').length,
			).toBeGreaterThan(0),
		{ timeout: 10000 },
	);
};

export const addQueryAndFormula = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await findQuery(canvasElement, 'A');
	const canvas = within(canvasElement);
	await press(canvas.getByTestId('add-new-query-button'));
	await findQuery(canvasElement, 'B');
	await press(canvas.getByTestId('add-formula-button'));
	await canvas.findByTestId('formula-F1');
};

export const collapseAndHideQueries = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await findQuery(canvasElement, 'A');
	await press(within(canvasElement).getByTestId('add-new-query-button'));
	const queryB = await findQuery(canvasElement, 'B');
	await press(within(queryB).getByTestId('qb-entity-collapse'));
	const queryA = await findQuery(canvasElement, 'A');
	await press(within(queryA).getByTestId('qb-entity-visibility'));
};

export const addFunction = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const query = await findQuery(canvasElement, 'A');
	const button = query.querySelector<HTMLElement>('.function-btn');
	if (!button) {
		throw new Error('no function button');
	}
	await press(button);
	await waitFor(() =>
		expect(
			query.querySelector('.query-functions-list')?.childElementCount,
		).toBeGreaterThan(0),
	);
};

export const openDataSourceSelect = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await findQuery(canvasElement, 'A');
	await openSelect(
		within(canvasElement).getByTestId('query-data-source-selector-0'),
	);
};

export const openWhereClauseSuggestions = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const query = await findQuery(canvasElement, 'A');
	await openSuggestions(
		within(query).getByTestId('query-where-clause-editor'),
		'serv',
	);
};

export const typeInvalidWhereClause = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const query = await findQuery(canvasElement, 'A');
	const editor = within(query).getByTestId('query-where-clause-editor');
	const view = editorIn(editor);
	view.dispatch({
		changes: { from: 0, insert: 'service.name = AND (' },
		userEvent: 'input.type',
	});
	view.contentDOM.blur();
	await waitFor(
		() =>
			expect(within(query).getByTestId('query-validation-status')).toBeVisible(),
		{ timeout: 10000 },
	);
};

export const openAggregationSuggestions = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const query = await findQuery(canvasElement, 'A');
	await openSuggestions(within(query).getByTestId('query-aggregation-editor'));
};

export const openTimeAggregationSelect = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await findQuery(canvasElement, 'A');
	await selectMetric(canvasElement, 'signoz_calls_total');
	await openSelect(
		within(canvasElement).getByTestId('metrics-time-aggregation'),
	);
};

export const openGroupBySelect = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const query = await findQuery(canvasElement, 'A');
	if (!within(query).queryByTestId('group-by-content')) {
		await userEvent.click(within(query).getByTestId('query-add-on-group_by'));
	}
	await openSelect(await within(query).findByTestId('group-by-content'));
};

export const openQueryActions = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const query = await findQuery(canvasElement, 'A');
	await userEvent.click(within(query).getByTestId('query-actions'));
	await screen.findByRole('menu');
};
