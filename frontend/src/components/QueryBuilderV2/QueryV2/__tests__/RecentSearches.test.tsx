import { initialQueriesMap } from 'constants/queryBuilder';
import * as recentQueriesStore from 'lib/recentQueries/recentQueriesStore';
import { fireEvent, render, userEvent, waitFor } from 'tests/test-utils';
import type { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';

import QuerySearch from '../QuerySearch/QuerySearch';

const CM_EDITOR_SELECTOR = '.cm-editor .cm-content';
const TOOLTIP_SELECTOR = '.cm-tooltip-autocomplete';

// These tests drive a real (un-mocked) CodeMirror editor with userEvent in
// jsdom, which is slow and highly variable across machines — Jest's default
// 5s per-test timeout is tighter than the 8s waitFor budgets used below and
// causes arbitrary tests to be killed on slow CI runners.
jest.setTimeout(30000);

// Mock DOM APIs that CodeMirror needs to run in jsdom. Mirrors the setup used by
// QuerySearch.test.tsx — CodeMirror measures text via Range client rects and
// element bounding rects, neither of which jsdom implements.
beforeAll(() => {
	const mockRect: DOMRect = {
		width: 100,
		height: 20,
		top: 0,
		left: 0,
		right: 100,
		bottom: 20,
		x: 0,
		y: 0,
		toJSON: (): DOMRect => mockRect,
	} as DOMRect;

	const createMockRange = (): Range => {
		let startContainer: Node = document.createTextNode('');
		let endContainer: Node = document.createTextNode('');
		let startOffset = 0;
		let endOffset = 0;
		const mockRange = {
			getClientRects: (): DOMRectList =>
				({
					length: 1,
					item: (index: number): DOMRect | null => (index === 0 ? mockRect : null),
					0: mockRect,
					*[Symbol.iterator](): Generator<DOMRect> {
						yield mockRect;
					},
				}) as unknown as DOMRectList,
			getBoundingClientRect: (): DOMRect => mockRect,
			setStart: (node: Node, offset: number): void => {
				startContainer = node;
				startOffset = offset;
			},
			setEnd: (node: Node, offset: number): void => {
				endContainer = node;
				endOffset = offset;
			},
			get startContainer(): Node {
				return startContainer;
			},
			get endContainer(): Node {
				return endContainer;
			},
			get startOffset(): number {
				return startOffset;
			},
			get endOffset(): number {
				return endOffset;
			},
			get collapsed(): boolean {
				return startContainer === endContainer && startOffset === endOffset;
			},
			commonAncestorContainer: document.body,
		};
		return mockRange as unknown as Range;
	};

	document.createRange = (): Range => createMockRange();
	Element.prototype.getBoundingClientRect = (): DOMRect => mockRect;
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('providers/Dashboard/store/useDashboardStore', () => ({
	useDashboardStore: (): { dashboardData: undefined } => ({
		dashboardData: undefined,
	}),
}));

jest.mock('hooks/queryBuilder/useQueryBuilder', () => {
	const handleRunQuery = jest.fn();
	return {
		__esModule: true,
		useQueryBuilder: (): { handleRunQuery: () => void } => ({ handleRunQuery }),
		handleRunQuery,
	};
});

jest.mock('api/querySuggestions/getKeySuggestions', () => ({
	getKeySuggestions: jest.fn().mockResolvedValue({
		data: {
			data: { keys: {} as Record<string, QueryKeyDataSuggestionsProps[]> },
		},
	}),
}));

jest.mock('api/querySuggestions/getValueSuggestion', () => ({
	getValueSuggestions: jest.fn().mockResolvedValue({
		data: { data: { values: { stringValues: [], numberValues: [] } } },
	}),
}));

// Note: CodeMirror is deliberately NOT mocked — these are integration tests that
// exercise the real editor, the real autocomplete popup, and the real (un-mocked)
// recents store that QuerySearch reads via getRecentQueries.

function renderLogsSearch(
	overrides: Partial<React.ComponentProps<typeof QuerySearch>> = {},
): ReturnType<typeof render> {
	return render(
		<QuerySearch
			onChange={jest.fn()}
			queryData={initialQueriesMap.logs.builder.queryData[0]}
			dataSource={DataSource.LOGS}
			{...overrides}
		/>,
	);
}

async function getEditor(): Promise<HTMLElement> {
	return waitFor(
		() => {
			const el = document.querySelector(CM_EDITOR_SELECTOR);
			expect(el).toBeInTheDocument();
			return el as HTMLElement;
		},
		{ timeout: 8000 },
	);
}

// The component opens the completion popup from its own timers (focus/context
// effects, "force reopen" after suggestion fetches), but a late-resolving fetch
// re-renders the editor and can close an already-open popup with nothing left
// to reopen it — in a real browser the user's next keystroke re-triggers it,
// but a test that only waits hangs forever. Poll the popup assertions with a
// nudge: whenever the popup is closed, press Ctrl-Space (bound to
// startCompletion via the component's completionKeymap) and retry.
function waitForCompletionPopup<T>(
	editor: HTMLElement,
	assertion: () => T,
): Promise<T> {
	return waitFor(
		() => {
			if (!document.querySelector(TOOLTIP_SELECTOR)) {
				fireEvent.keyDown(editor, {
					key: ' ',
					code: 'Space',
					keyCode: 32,
					ctrlKey: true,
				});
			}
			return assertion();
		},
		{ timeout: 8000 },
	);
}

describe('QuerySearch — recent searches (integration with real CodeMirror)', () => {
	beforeEach(() => {
		recentQueriesStore.useRecentQueriesStore.setState({ buckets: {} });
		localStorage.clear();
	});

	it('shows a saved recent query under "Recent searches" on focus', async () => {
		recentQueriesStore.save({
			signal: 'logs',
			filter: { expression: "service.name = 'frontend'" },
		});

		renderLogsSearch();
		const editor = await getEditor();
		await userEvent.click(editor);

		await waitForCompletionPopup(editor, () => {
			const tooltip = document.querySelector(TOOLTIP_SELECTOR);
			expect(tooltip).toBeInTheDocument();
			expect(tooltip?.textContent).toContain('Recent searches');
			expect(tooltip?.textContent).toContain("service.name = 'frontend'");
		});
	});

	it('filters recents by substring as the user types', async () => {
		recentQueriesStore.save({
			signal: 'logs',
			filter: { expression: "service.name = 'frontend'" },
		});
		recentQueriesStore.save({
			signal: 'logs',
			filter: { expression: "http.status_code = '500'" },
		});

		renderLogsSearch();
		const editor = await getEditor();
		await userEvent.click(editor);
		await userEvent.type(editor, 'status_code');

		await waitForCompletionPopup(editor, () => {
			const tooltip = document.querySelector(TOOLTIP_SELECTOR);
			expect(tooltip).toBeInTheDocument();
			expect(tooltip?.textContent).toContain("http.status_code = '500'");
			expect(tooltip?.textContent).not.toContain("service.name = 'frontend'");
		});
	});

	it('does not surface recents saved under a different signal', async () => {
		// A traces-signal recent that must NOT leak into the logs editor...
		recentQueriesStore.save({
			signal: 'traces',
			filter: { expression: "name = 'HTTP GET'" },
		});
		// ...and a logs-signal recent that acts as a positive anchor: it proves the
		// popup actually opened and rendered recents, so the absence assertion below
		// is meaningful rather than passing against an empty/closed popup.
		recentQueriesStore.save({
			signal: 'logs',
			filter: { expression: "service.name = 'frontend'" },
		});

		renderLogsSearch();
		const editor = await getEditor();
		await userEvent.click(editor);

		// Anchor: wait until the logs recent is actually rendered under the
		// "Recent searches" section.
		await waitForCompletionPopup(editor, () => {
			const tooltip = document.querySelector(TOOLTIP_SELECTOR);
			expect(tooltip).toBeInTheDocument();
			expect(tooltip?.textContent).toContain('Recent searches');
			expect(tooltip?.textContent).toContain("service.name = 'frontend'");
		});

		// Now that the popup is proven open and populated, the traces recent must be absent.
		const tooltip = document.querySelector(TOOLTIP_SELECTOR);
		expect(tooltip?.textContent ?? '').not.toContain("name = 'HTTP GET'");
	});

	it('excludes a recent that exactly matches the current editor text', async () => {
		const EXACT = "service.name = 'frontend'";
		// The exact-match recent (must be excluded once the editor holds this text)...
		recentQueriesStore.save({ signal: 'logs', filter: { expression: EXACT } });
		// ...and a superset recent that CONTAINS the typed text as a substring, so it
		// survives getRecentOptions' substring filter and serves as a positive anchor
		// proving the popup is open and populated. Only the exact-match one should drop.
		const ANCHOR = "service.name = 'frontend' AND http.status_code = '500'";
		recentQueriesStore.save({ signal: 'logs', filter: { expression: ANCHOR } });

		renderLogsSearch();
		const editor = await getEditor();
		await userEvent.click(editor);
		await userEvent.type(editor, EXACT);

		// Anchor: the superset recent renders under "Recent searches"...
		await waitForCompletionPopup(editor, () => {
			const labels = Array.from(
				document.querySelectorAll('.cm-completionLabel'),
			).map((n) => n.textContent ?? '');
			expect(labels).toContain(ANCHOR);
		});

		// ...but no completion is the exact-match recent (an entry equal to the
		// current doc is filtered out). Assert on exact label equality — a substring
		// check would false-match because ANCHOR also contains EXACT.
		const labels = Array.from(
			document.querySelectorAll('.cm-completionLabel'),
		).map((n) => n.textContent ?? '');
		expect(labels).not.toContain(EXACT);
	});

	it('applies the full expression to the editor when a recent is clicked', async () => {
		recentQueriesStore.save({
			signal: 'logs',
			filter: { expression: "service.name = 'frontend'" },
		});

		renderLogsSearch();
		const editor = await getEditor();
		await userEvent.click(editor);

		const option = await waitForCompletionPopup(editor, () => {
			const opts = Array.from(document.querySelectorAll('.cm-completionLabel'));
			const match = opts.find((o) =>
				o.textContent?.includes("service.name = 'frontend'"),
			);
			expect(match).toBeTruthy();
			return match as HTMLElement;
		});

		await userEvent.click(option);

		await waitFor(
			() => {
				const content = document.querySelector(CM_EDITOR_SELECTOR) as HTMLElement;
				expect(content.textContent).toBe("service.name = 'frontend'");
				expect(document.querySelector(TOOLTIP_SELECTOR)).not.toBeInTheDocument();
			},
			{ timeout: 8000 },
		);
	});

	it('caps recents at RECENTS_DISPLAY_CAP (5) and lists newest first', async () => {
		// Save 6 distinct entries; newest saved last.
		for (let i = 1; i <= 6; i += 1) {
			recentQueriesStore.save({
				signal: 'logs',
				filter: { expression: `attribute_${i} = 'v'` },
			});
		}

		renderLogsSearch();
		const editor = await getEditor();
		await userEvent.click(editor);

		await waitForCompletionPopup(editor, () => {
			const labels = Array.from(
				document.querySelectorAll('.cm-completionLabel'),
			).map((n) => n.textContent ?? '');
			const recentLabels = labels.filter((l) => l.startsWith('attribute_'));

			// Newest saved (attribute_6) first, descending; attribute_1 evicted from the
			// 5-item display cap. Assert the full ordered array so a boost regression that
			// scrambles the middle positions is caught, not just position 0.
			expect(recentLabels).toStrictEqual([
				"attribute_6 = 'v'",
				"attribute_5 = 'v'",
				"attribute_4 = 'v'",
				"attribute_3 = 'v'",
				"attribute_2 = 'v'",
			]);
		});
	});

	it('removes a recent from the dropdown and store when the delete button is clicked', async () => {
		recentQueriesStore.save({
			signal: 'logs',
			filter: { expression: "service.name = 'frontend'" },
		});

		renderLogsSearch();
		const editor = await getEditor();
		await userEvent.click(editor);

		const deleteBtn = await waitForCompletionPopup(editor, () => {
			const btn = document.querySelector('.cm-recent-delete');
			expect(btn).toBeInTheDocument();
			return btn as HTMLElement;
		});

		fireEvent.mouseDown(deleteBtn);
		fireEvent.click(deleteBtn);

		await waitFor(() => {
			expect(recentQueriesStore.list('logs', '')).toHaveLength(0);
		});

		// The editor must not have had the expression applied by the delete click.
		// An empty editor still renders CodeMirror's placeholder (whose example text
		// coincidentally mentions service.name), so a textContent check is unreliable.
		// Instead assert the placeholder is still present — i.e. the document is empty
		// and the recent's expression was never inserted.
		expect(document.querySelector('.cm-placeholder')).toBeInTheDocument();
	});
});
