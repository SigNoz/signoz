import { completionStatus } from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';
import { initialQueriesMap } from 'constants/queryBuilder';
import * as recentQueriesStore from 'lib/recentQueries/recentQueriesStore';
import { fireEvent, render, userEvent, waitFor } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import { RECENTS_DISPLAY_CAP } from '../QuerySearch/constants';
import QuerySearch from '../QuerySearch/QuerySearch';
import { mockCodeMirrorDomApis } from './codemirrorDomMocks';

const CM_ROOT_SELECTOR = '.cm-editor';
const CM_EDITOR_SELECTOR = '.cm-editor .cm-content';
const TOOLTIP_SELECTOR = '.cm-tooltip-autocomplete';
const COMPLETION_LABEL_SELECTOR = '.cm-completionLabel';
const DELETE_BUTTON_SELECTOR = '.cm-recent-delete';

const POPUP_TIMEOUT = 500;

const FRONTEND_FILTER = "service.name = 'frontend'";
const STATUS_CODE_FILTER = "http.status_code = '500'";
const TRACES_FILTER = "name = 'HTTP GET'";

jest.setTimeout(30000);

beforeAll(() => {
	mockCodeMirrorDomApis();
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('providers/Dashboard/store/useDashboardStore', () => ({
	useDashboardStore: (): { dashboardData: undefined } => ({
		dashboardData: undefined,
	}),
}));

jest.mock('api/querySuggestions/getKeySuggestions', () => ({
	getKeySuggestions: jest.fn().mockResolvedValue({
		data: { data: { keys: {} } },
	}),
}));

jest.mock('api/querySuggestions/getValueSuggestion', () => ({
	getValueSuggestions: jest.fn().mockResolvedValue({
		data: { data: { values: { stringValues: [], numberValues: [] } } },
	}),
}));

function renderLogsSearch(onChange: (value: string) => void = jest.fn()): void {
	render(
		<QuerySearch
			onChange={onChange}
			queryData={initialQueriesMap.logs.builder.queryData[0]}
			dataSource={DataSource.LOGS}
		/>,
	);
}

function saveLogsRecent(expression: string): void {
	recentQueriesStore.save({ signal: 'logs', filter: { expression } });
}

function getTooltipText(): string {
	return document.querySelector(TOOLTIP_SELECTOR)?.textContent ?? '';
}

function getCompletionLabels(): string[] {
	return Array.from(document.querySelectorAll(COMPLETION_LABEL_SELECTOR)).map(
		(node) => node.textContent ?? '',
	);
}

function findCompletionOption(label: string): HTMLElement | undefined {
	return Array.from(
		document.querySelectorAll<HTMLElement>(COMPLETION_LABEL_SELECTOR),
	).find((node) => node.textContent === label);
}

function getEditorView(): EditorView | null {
	const root = document.querySelector<HTMLElement>(CM_ROOT_SELECTOR);
	return root ? EditorView.findFromDOM(root) : null;
}

function getDocText(): string {
	return getEditorView()?.state.doc.toString() ?? '';
}

function isCompletionOpen(): boolean {
	const view = getEditorView();
	return !!view && completionStatus(view.state) === 'active';
}

function getOpenCompletionOption(label: string): HTMLElement {
	const option = findCompletionOption(label);
	expect(option).toBeDefined();
	expect(isCompletionOpen()).toBe(true);
	return option as HTMLElement;
}

async function focusEditor(): Promise<HTMLElement> {
	const editor = await waitFor(
		() => {
			const element = document.querySelector(CM_EDITOR_SELECTOR);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		},
		{ timeout: POPUP_TIMEOUT },
	);

	await userEvent.click(editor);

	await waitFor(
		() => {
			expect(isCompletionOpen()).toBe(true);
		},
		{ timeout: POPUP_TIMEOUT },
	);

	return editor;
}

function waitForCompletionPopup<T>(assertion: () => T): Promise<T> {
	return waitFor(assertion, { timeout: POPUP_TIMEOUT });
}

describe('QuerySearch recent searches', () => {
	beforeEach(() => {
		recentQueriesStore.useRecentQueriesStore.setState({ buckets: {} });
		localStorage.clear();
	});

	it('shows a saved recent query under "Recent searches" on focus', async () => {
		saveLogsRecent(FRONTEND_FILTER);

		renderLogsSearch();
		await focusEditor();

		await waitForCompletionPopup(() => {
			expect(getTooltipText()).toContain('Recent searches');
			expect(getTooltipText()).toContain(FRONTEND_FILTER);
		});
	});

	it('filters recents by substring as the user types', async () => {
		saveLogsRecent(FRONTEND_FILTER);
		saveLogsRecent(STATUS_CODE_FILTER);

		renderLogsSearch();
		const editor = await focusEditor();
		await userEvent.type(editor, 'status_code');

		await waitForCompletionPopup(() => {
			expect(getTooltipText()).toContain(STATUS_CODE_FILTER);
			expect(getTooltipText()).not.toContain(FRONTEND_FILTER);
		});
	});

	it('does not surface recents saved under a different signal', async () => {
		recentQueriesStore.save({
			signal: 'traces',
			filter: { expression: TRACES_FILTER },
		});
		saveLogsRecent(FRONTEND_FILTER);

		renderLogsSearch();
		await focusEditor();

		await waitForCompletionPopup(() => {
			expect(getTooltipText()).toContain('Recent searches');
			expect(getTooltipText()).toContain(FRONTEND_FILTER);
		});

		expect(getTooltipText()).not.toContain(TRACES_FILTER);
	});

	it('excludes a recent that exactly matches the current editor text', async () => {
		const supersetFilter = `${FRONTEND_FILTER} AND ${STATUS_CODE_FILTER}`;
		saveLogsRecent(FRONTEND_FILTER);
		saveLogsRecent(supersetFilter);

		renderLogsSearch();
		const editor = await focusEditor();
		await userEvent.type(editor, FRONTEND_FILTER);

		await waitForCompletionPopup(() => {
			expect(getCompletionLabels()).toContain(supersetFilter);
		});

		// Exact equality, not substring — the superset label contains this one.
		expect(getCompletionLabels()).not.toContain(FRONTEND_FILTER);
	});

	it('applies the full expression to the editor when a recent is clicked', async () => {
		saveLogsRecent(FRONTEND_FILTER);

		const onChange = jest.fn();
		renderLogsSearch(onChange);
		await focusEditor();

		const option = await waitForCompletionPopup(() =>
			getOpenCompletionOption(FRONTEND_FILTER),
		);
		await userEvent.click(option);

		await waitFor(
			() => {
				expect(getDocText()).toBe(FRONTEND_FILTER);
			},
			{ timeout: POPUP_TIMEOUT },
		);

		expect(onChange).toHaveBeenCalledWith(FRONTEND_FILTER);

		await waitFor(
			() => {
				expect(document.querySelector(TOOLTIP_SELECTOR)).not.toBeInTheDocument();
			},
			{ timeout: POPUP_TIMEOUT },
		);
	});

	it('caps the dropdown at RECENTS_DISPLAY_CAP entries, newest first', async () => {
		const filters = Array.from(
			{ length: RECENTS_DISPLAY_CAP + 1 },
			(_, index) => `attribute_${index + 1} = 'v'`,
		);
		filters.forEach((filter) => saveLogsRecent(filter));
		const expectedLabels = [...filters].reverse().slice(0, RECENTS_DISPLAY_CAP);

		renderLogsSearch();
		await focusEditor();

		await waitForCompletionPopup(() => {
			const recentLabels = getCompletionLabels().filter((label) =>
				label.startsWith('attribute_'),
			);
			expect(recentLabels).toStrictEqual(expectedLabels);
		});
	});

	it('removes a recent from the dropdown and the store when delete is clicked', async () => {
		saveLogsRecent(FRONTEND_FILTER);

		renderLogsSearch();
		await focusEditor();

		const deleteButton = await waitForCompletionPopup(() => {
			const button = document.querySelector(DELETE_BUTTON_SELECTOR);
			expect(button).toBeInTheDocument();
			return button as HTMLElement;
		});

		// fireEvent: the button preventDefaults pointerdown, which makes userEvent.click drop the mouse chain.
		fireEvent.click(deleteButton);

		await waitFor(
			() => {
				expect(recentQueriesStore.list('logs')).toHaveLength(0);
				expect(getCompletionLabels()).not.toContain(FRONTEND_FILTER);
			},
			{ timeout: POPUP_TIMEOUT },
		);
		expect(getDocText()).toBe('');
	});
});
