import { EditorView } from '@uiw/react-codemirror';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { initialQueriesMap } from 'constants/queryBuilder';
import { fireEvent, render, userEvent, waitFor } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';

import QuerySearch from '../QuerySearch/QuerySearch';
import { mockCodeMirrorDomApis } from './codemirrorDomMocks';

const CM_EDITOR_SELECTOR = '.cm-editor .cm-content';

// Mock DOM APIs that CodeMirror needs
beforeAll(() => {
	mockCodeMirrorDomApis();
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
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

const SAMPLE_KEY_TYPING = 'http.';
const SAMPLE_VALUE_TYPING_INCOMPLETE = "service.name = '";
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
		await userEvent.click(editor);
		await userEvent.type(editor, SAMPLE_KEY_TYPING);

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
		await userEvent.click(editor);
		await userEvent.type(editor, SAMPLE_VALUE_TYPING_INCOMPLETE);

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

		// Wait for the mount fetch specifically. A debounced fetch from an earlier test
		// can still land after mockClear(), so waiting on "any call" would let this
		// assert against that one instead and make the result order-dependent.
		await waitFor(
			() =>
				expect(mockedGetKeysOnMount).toHaveBeenCalledWith(
					expect.objectContaining({ signal: DataSource.LOGS, searchText: '' }),
				),
			{ timeout: 2000 },
		);
	});

	it('calls provided onRun on Mod-Enter', async () => {
		const onRun = jest.fn() as jest.MockedFunction<(q: string) => void>;

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
		await userEvent.click(editor);
		await userEvent.type(editor, SAMPLE_STATUS_QUERY);

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

	it('handles queryData.filter.expression changes without triggering onChange', async () => {
		// Spy on CodeMirror's EditorView.dispatch, which is invoked when updateEditorValue
		// applies a programmatic change to the editor.
		const dispatchSpy = jest.spyOn(EditorView.prototype, 'dispatch');
		const initialExpression = "service.name = 'frontend'";
		const updatedExpression = "service.name = 'backend'";

		const onChange = jest.fn() as jest.MockedFunction<(v: string) => void>;

		const initialQueryData = {
			...initialQueriesMap.logs.builder.queryData[0],
			filter: {
				expression: initialExpression,
			},
		};

		const { rerender } = render(
			<QuerySearch
				onChange={onChange}
				queryData={initialQueryData}
				dataSource={DataSource.LOGS}
			/>,
		);

		// Wait for CodeMirror to initialize with the initial expression
		await waitFor(
			() => {
				const editorContent = document.querySelector(
					CM_EDITOR_SELECTOR,
				) as HTMLElement;
				expect(editorContent).toBeInTheDocument();
				const textContent = editorContent.textContent || '';
				expect(textContent).toBe(initialExpression);
			},
			{ timeout: 3000 },
		);

		// Ensure the editor is explicitly blurred (not focused)
		// Blur the actual CodeMirror editor container so that QuerySearch's onBlur handler runs.
		// Note: In jsdom + CodeMirror we can't reliably assert the DOM text content changes when
		// the expression is updated programmatically, but we can assert that:
		// 1) The component continues to render, and
		// 2) No onChange is fired for programmatic updates.

		const updatedQueryData = {
			...initialQueryData,
			filter: {
				expression: updatedExpression,
			},
		};

		// Re-render with updated queryData.filter.expression
		rerender(
			<QuerySearch
				onChange={onChange}
				queryData={updatedQueryData}
				dataSource={DataSource.LOGS}
			/>,
		);

		// updateEditorValue should have resulted in a dispatch call + onChange should not have been called
		await waitFor(() => {
			expect(dispatchSpy).toHaveBeenCalled();
			expect(onChange).not.toHaveBeenCalled();
		});

		dispatchSpy.mockRestore();
	});

	it('does not crash when the expression contains CRLF line breaks (issue #5869)', async () => {
		const dispatchSpy = jest.spyOn(EditorView.prototype, 'dispatch');
		const onChange = jest.fn() as jest.MockedFunction<(v: string) => void>;
		const initialExpression = "service.name = 'frontend'";
		// Filtering on a multi-line log value (CRLF) used to throw
		// "RangeError: Selection points outside of document".
		const crlfExpression = "body CONTAINS 'line1\r\nline2\r\nline3'";

		const baseQueryData = {
			...initialQueriesMap.logs.builder.queryData[0],
			filter: { expression: initialExpression },
		};

		const { rerender } = render(
			<QuerySearch
				onChange={onChange}
				queryData={baseQueryData}
				dataSource={DataSource.LOGS}
			/>,
		);

		await waitFor(
			() => {
				const editorContent = document.querySelector(
					CM_EDITOR_SELECTOR,
				) as HTMLElement;
				expect(editorContent.textContent || '').toBe(initialExpression);
			},
			{ timeout: 3000 },
		);

		rerender(
			<QuerySearch
				onChange={onChange}
				queryData={{ ...baseQueryData, filter: { expression: crlfExpression } }}
				dataSource={DataSource.LOGS}
			/>,
		);

		// The programmatic replace dispatched without throwing, and the selection anchor
		// stayed within the CRLF-normalized document (the bug set it past the end).
		await waitFor(() => {
			const spec = dispatchSpy.mock.calls
				.map(
					(call) =>
						call[0] as {
							selection?: { anchor?: number };
							changes?: { newLength?: number };
						},
				)
				.find((s) => s?.selection?.anchor != null && s?.changes?.newLength != null);
			expect(spec).toBeDefined();
			expect(spec?.selection?.anchor).toBeLessThanOrEqual(
				spec?.changes?.newLength as number,
			);
		});

		dispatchSpy.mockRestore();
	});

	it('fetches key suggestions for metrics even without aggregateAttribute.key when showFilterSuggestionsWithoutMetric is true', async () => {
		const mockedGetKeys = getKeySuggestions as jest.MockedFunction<
			typeof getKeySuggestions
		>;
		mockedGetKeys.mockClear();

		const queryData = {
			...initialQueriesMap.metrics.builder.queryData[0],
			aggregateAttribute: {
				key: '',
				dataType: DataTypes.String,
				type: 'string',
			},
		};

		render(
			<QuerySearch
				onChange={jest.fn()}
				queryData={queryData}
				dataSource={DataSource.METRICS}
				showFilterSuggestionsWithoutMetric
			/>,
		);

		await waitFor(
			() => {
				expect(mockedGetKeys).toHaveBeenCalled();
			},
			{ timeout: 2000 },
		);
	});
});
