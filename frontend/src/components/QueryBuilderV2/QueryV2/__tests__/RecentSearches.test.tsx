import {
	completionStatus,
	currentCompletions,
	startCompletion,
} from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';
import { initialQueriesMap } from 'constants/queryBuilder';
import * as recentQueriesStore from 'lib/recentQueries/recentQueriesStore';
import { fireEvent, render, userEvent, waitFor } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import { RECENTS_DISPLAY_CAP, RECENTS_SECTION } from '../QuerySearch/constants';
import QuerySearch from '../QuerySearch/QuerySearch';
import { mockCodeMirrorDomApis } from './codemirrorDomMocks';

const CM_ROOT_SELECTOR = '.cm-editor';
const CM_EDITOR_SELECTOR = '.cm-editor .cm-content';
const TOOLTIP_SELECTOR = '.cm-tooltip-autocomplete';
const COMPLETION_LABEL_SELECTOR = '.cm-completionLabel';
const DELETE_BUTTON_SELECTOR = '.cm-recent-delete';

const FRONTEND_FILTER = "service.name = 'frontend'";
const STATUS_CODE_FILTER = "http.status_code = '500'";
const TRACES_FILTER = "name = 'HTTP GET'";

beforeAll(() => {
	mockCodeMirrorDomApis();
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
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

// Reads recents from completion state, not the tooltip: the tooltip is a later render
// pass over this same state, so going to the source drops a layer of timing.
function getRecentLabels(): string[] {
	const view = getEditorView();
	if (!view) {
		return [];
	}
	return currentCompletions(view.state)
		.filter((completion) => completion.section === RECENTS_SECTION)
		.map((completion) => completion.label);
}

async function renderAndFocus(
	onChange: (value: string) => void = jest.fn(),
): Promise<HTMLElement> {
	renderLogsSearch(onChange);

	const editor = await waitFor(
		() => {
			const element = document.querySelector(CM_EDITOR_SELECTOR);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		},
		{ timeout: 2000 },
	);

	await userEvent.click(editor);
	return editor;
}

// Re-requests completions while waiting: typing and the async fetches can close the popup.
function waitForRecents(
	assertLabels: (labels: string[]) => void,
): Promise<void> {
	return waitFor(
		() => {
			const view = getEditorView();
			if (view && !isCompletionOpen()) {
				startCompletion(view);
			}
			assertLabels(getRecentLabels());
		},
		{ timeout: 3000 },
	);
}

function openRecents(): Promise<void> {
	return waitForRecents((labels) => expect(labels.length).toBeGreaterThan(0));
}

function waitForPopupElement(
	find: () => HTMLElement | null | undefined,
): Promise<HTMLElement> {
	return waitFor(
		() => {
			const view = getEditorView();
			if (view && !isCompletionOpen()) {
				startCompletion(view);
			}
			const node = find();
			expect(node).toBeTruthy();
			return node as HTMLElement;
		},
		{ timeout: 3000 },
	);
}

describe('QuerySearch recent searches', () => {
	beforeEach(() => {
		recentQueriesStore.useRecentQueriesStore.setState({ buckets: {} });
		localStorage.clear();
	});

	it('shows a saved recent query under "Recent searches" on focus', async () => {
		saveLogsRecent(FRONTEND_FILTER);

		await renderAndFocus();
		await openRecents();

		await waitForRecents((labels) =>
			expect(labels).toStrictEqual([FRONTEND_FILTER]),
		);

		const view = getEditorView() as EditorView;
		const [recent] = currentCompletions(view.state);
		expect(recent.section).toBe(RECENTS_SECTION);
	});

	it('filters recents by substring as the user types', async () => {
		saveLogsRecent(FRONTEND_FILTER);
		saveLogsRecent(STATUS_CODE_FILTER);

		const editor = await renderAndFocus();
		await openRecents();
		await userEvent.type(editor, 'status_code');

		await waitForRecents((labels) =>
			expect(labels).toStrictEqual([STATUS_CODE_FILTER]),
		);
	});

	it('does not surface recents saved under a different signal', async () => {
		recentQueriesStore.save({
			signal: 'traces',
			filter: { expression: TRACES_FILTER },
		});
		saveLogsRecent(FRONTEND_FILTER);

		await renderAndFocus();
		await openRecents();

		await waitForRecents((labels) =>
			expect(labels).toStrictEqual([FRONTEND_FILTER]),
		);
	});

	it('excludes a recent that exactly matches the current editor text', async () => {
		const supersetFilter = `${FRONTEND_FILTER} AND ${STATUS_CODE_FILTER}`;
		saveLogsRecent(FRONTEND_FILTER);
		saveLogsRecent(supersetFilter);

		const editor = await renderAndFocus();
		await openRecents();
		await userEvent.type(editor, FRONTEND_FILTER);

		await waitForRecents((labels) =>
			expect(labels).toStrictEqual([supersetFilter]),
		);
	});

	it('caps the dropdown at RECENTS_DISPLAY_CAP entries, newest first', async () => {
		const filters = Array.from(
			{ length: RECENTS_DISPLAY_CAP + 1 },
			(_, index) => `attribute_${index + 1} = 'v'`,
		);
		filters.forEach((filter) => saveLogsRecent(filter));
		const expectedLabels = [...filters].reverse().slice(0, RECENTS_DISPLAY_CAP);

		await renderAndFocus();
		await openRecents();

		await waitForRecents((labels) =>
			expect(labels).toStrictEqual(expectedLabels),
		);
	});

	it('applies the full expression to the editor when a recent is clicked', async () => {
		saveLogsRecent(FRONTEND_FILTER);

		const onChange = jest.fn();
		await renderAndFocus(onChange);
		await openRecents();

		const option = await waitForPopupElement(() =>
			Array.from(
				document.querySelectorAll<HTMLElement>(COMPLETION_LABEL_SELECTOR),
			).find((element) => element.textContent === FRONTEND_FILTER),
		);
		// fireEvent: userEvent's pointerdown blurs the editor, closing the popup before CM's mousedown apply.
		fireEvent.mouseDown(option);

		await waitFor(
			() => {
				expect(getDocText()).toBe(FRONTEND_FILTER);
			},
			{ timeout: 2000 },
		);

		expect(onChange).toHaveBeenCalledWith(FRONTEND_FILTER);

		await waitFor(
			() => {
				expect(document.querySelector(TOOLTIP_SELECTOR)).not.toBeInTheDocument();
			},
			{ timeout: 2000 },
		);
	});

	it('removes a recent from the dropdown and the store when delete is clicked', async () => {
		saveLogsRecent(FRONTEND_FILTER);

		await renderAndFocus();
		await openRecents();

		const deleteButton = await waitForPopupElement(() =>
			document.querySelector<HTMLElement>(DELETE_BUTTON_SELECTOR),
		);

		// fireEvent: the button preventDefaults pointerdown, which makes userEvent.click drop the mouse chain.
		fireEvent.click(deleteButton);

		await waitFor(
			() => {
				expect(recentQueriesStore.list('logs')).toHaveLength(0);
				expect(getRecentLabels()).not.toContain(FRONTEND_FILTER);
			},
			{ timeout: 2000 },
		);
		expect(getDocText()).toBe('');
	});
});
