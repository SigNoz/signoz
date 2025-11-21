/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable import/named */
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { initialQueriesMap } from 'constants/queryBuilder';
import * as UseQBModule from 'hooks/queryBuilder/useQueryBuilder';
import { fireEvent, render, userEvent, waitFor } from 'tests/test-utils';
import type { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';

import QuerySearch from '../QuerySearch/QuerySearch';

const CM_EDITOR_SELECTOR = '.cm-editor .cm-content';

// Mock DOM APIs that CodeMirror needs
beforeAll(() => {
	// Mock getClientRects and getBoundingClientRect for Range objects
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

	// Create a minimal Range mock with only what CodeMirror actually uses
	const createMockRange = (): Range => {
		let startContainer: Node = document.createTextNode('');
		let endContainer: Node = document.createTextNode('');
		let startOffset = 0;
		let endOffset = 0;

		const mockRange = {
			// CodeMirror uses these for text measurement
			getClientRects: (): DOMRectList =>
				(({
					length: 1,
					item: (index: number): DOMRect | null => (index === 0 ? mockRect : null),
					0: mockRect,
					*[Symbol.iterator](): Generator<DOMRect> {
						yield mockRect;
					},
				} as unknown) as DOMRectList),
			getBoundingClientRect: (): DOMRect => mockRect,
			// CodeMirror calls these to set up text ranges
			setStart: (node: Node, offset: number): void => {
				startContainer = node;
				startOffset = offset;
			},
			setEnd: (node: Node, offset: number): void => {
				endContainer = node;
				endOffset = offset;
			},
			// Minimal Range properties (TypeScript requires these)
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
		return (mockRange as unknown) as Range;
	};

	// Mock document.createRange to return a new Range instance each time
	document.createRange = (): Range => createMockRange();

	// Mock getBoundingClientRect for elements
	Element.prototype.getBoundingClientRect = (): DOMRect => mockRect;
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: (): { selectedDashboard: undefined } => ({
		selectedDashboard: undefined,
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

// Note: We're NOT mocking CodeMirror here - using the real component
// This provides integration testing with the actual CodeMirror editor

const handleRunQueryMock = ((UseQBModule as unknown) as {
	handleRunQuery: jest.MockedFunction<() => void>;
}).handleRunQuery;

const SAMPLE_KEY_TYPING = 'http.';
const SAMPLE_VALUE_TYPING_INCOMPLETE = "service.name = '";
const SAMPLE_VALUE_TYPING_COMPLETE = "service.name = 'frontend'";
const SAMPLE_STATUS_QUERY = "http.status_code = '200'";

describe('QuerySearch (Integration with Real CodeMirror)', () => {
	it('renders with placeholder', () => {
		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
			/>,
		);

		// CodeMirror renders a contenteditable div, so we check for the container
		const editorContainer = document.querySelector('.query-where-clause-editor');
		expect(editorContainer).toBeInTheDocument();
	});

	it('fetches key suggestions when typing a key (debounced)', async () => {
		// Use real timers for CodeMirror integration tests
		const mockedGetKeys = getKeySuggestions as jest.MockedFunction<
			typeof getKeySuggestions
		>;
		mockedGetKeys.mockClear();

		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
			/>,
		);

		// Wait for CodeMirror to initialize
		await waitFor(() => {
			const editor = document.querySelector(CM_EDITOR_SELECTOR);
			expect(editor).toBeInTheDocument();
		});

		// Find the CodeMirror editor contenteditable element
		const editor = document.querySelector(CM_EDITOR_SELECTOR) as HTMLElement;

		// Focus and type into the editor
		await user.click(editor);
		await user.type(editor, SAMPLE_KEY_TYPING);

		// Wait for debounced API call (300ms debounce + some buffer)
		await waitFor(() => expect(mockedGetKeys).toHaveBeenCalled(), {
			timeout: 2000,
		});
	});

	it('fetches value suggestions when editing value context', async () => {
		// Use real timers for CodeMirror integration tests
		const mockedGetValues = getValueSuggestions as jest.MockedFunction<
			typeof getValueSuggestions
		>;
		mockedGetValues.mockClear();

		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
			/>,
		);

		// Wait for CodeMirror to initialize
		await waitFor(() => {
			const editor = document.querySelector(CM_EDITOR_SELECTOR);
			expect(editor).toBeInTheDocument();
		});

		const editor = document.querySelector(CM_EDITOR_SELECTOR) as HTMLElement;
		await user.click(editor);
		await user.type(editor, SAMPLE_VALUE_TYPING_INCOMPLETE);

		// Wait for debounced API call (300ms debounce + some buffer)
		await waitFor(() => expect(mockedGetValues).toHaveBeenCalled(), {
			timeout: 2000,
		});
	});

	it('fetches key suggestions on mount for LOGS', async () => {
		// Use real timers for CodeMirror integration tests
		const mockedGetKeysOnMount = getKeySuggestions as jest.MockedFunction<
			typeof getKeySuggestions
		>;
		mockedGetKeysOnMount.mockClear();

		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
			/>,
		);

		// Wait for debounced API call (300ms debounce + some buffer)
		await waitFor(() => expect(mockedGetKeysOnMount).toHaveBeenCalled(), {
			timeout: 2000,
		});

		const lastArgs = mockedGetKeysOnMount.mock.calls[
			mockedGetKeysOnMount.mock.calls.length - 1
		]?.[0] as { signal: unknown; searchText: string };
		expect(lastArgs).toMatchObject({ signal: DataSource.LOGS, searchText: '' });
	});

	it('calls provided onRun on Mod-Enter', async () => {
		const onRun = jest.fn() as jest.MockedFunction<(q: string) => void>;
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
				onRun={onRun}
			/>,
		);

		// Wait for CodeMirror to initialize
		await waitFor(() => {
			const editor = document.querySelector(CM_EDITOR_SELECTOR);
			expect(editor).toBeInTheDocument();
		});

		const editor = document.querySelector(CM_EDITOR_SELECTOR) as HTMLElement;
		await user.click(editor);
		await user.type(editor, SAMPLE_STATUS_QUERY);

		// Use fireEvent for keyboard shortcuts as userEvent might not work well with CodeMirror
		const modKey = navigator.platform.includes('Mac') ? 'metaKey' : 'ctrlKey';
		fireEvent.keyDown(editor, {
			key: 'Enter',
			code: 'Enter',
			[modKey]: true,
			keyCode: 13,
		});

		await waitFor(() => expect(onRun).toHaveBeenCalled(), { timeout: 2000 });
	});

	it('calls handleRunQuery when Mod-Enter without onRun', async () => {
		const mockedHandleRunQuery = handleRunQueryMock as jest.MockedFunction<
			() => void
		>;
		mockedHandleRunQuery.mockClear();

		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
			/>,
		);

		// Wait for CodeMirror to initialize
		await waitFor(() => {
			const editor = document.querySelector(CM_EDITOR_SELECTOR);
			expect(editor).toBeInTheDocument();
		});

		const editor = document.querySelector(CM_EDITOR_SELECTOR) as HTMLElement;
		await user.click(editor);
		await user.type(editor, SAMPLE_VALUE_TYPING_COMPLETE);

		// Use fireEvent for keyboard shortcuts as userEvent might not work well with CodeMirror
		const modKey = navigator.platform.includes('Mac') ? 'metaKey' : 'ctrlKey';
		fireEvent.keyDown(editor, {
			key: 'Enter',
			code: 'Enter',
			[modKey]: true,
			keyCode: 13,
		});

		await waitFor(() => expect(mockedHandleRunQuery).toHaveBeenCalled(), {
			timeout: 2000,
		});
	});

	it('initializes CodeMirror with expression from queryData.filter.expression on mount', async () => {
		const testExpression =
			"http.status_code >= 500 AND service.name = 'frontend'";
		const queryDataWithExpression = {
			...initialQueriesMap.logs.builder.queryData[0],
			filter: {
				expression: testExpression,
			},
		};

		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={queryDataWithExpression}
				dataSource={DataSource.LOGS}
			/>,
		);

		// Wait for CodeMirror to initialize and the expression to be set
		await waitFor(
			() => {
				// CodeMirror stores content in .cm-content, check the text content
				const editorContent = document.querySelector(
					CM_EDITOR_SELECTOR,
				) as HTMLElement;
				expect(editorContent).toBeInTheDocument();
				// CodeMirror may render the text in multiple ways, check if it contains our expression
				const textContent = editorContent.textContent || '';
				expect(textContent).toContain('http.status_code');
				expect(textContent).toContain('service.name');
			},
			{ timeout: 3000 },
		);
	});
});
