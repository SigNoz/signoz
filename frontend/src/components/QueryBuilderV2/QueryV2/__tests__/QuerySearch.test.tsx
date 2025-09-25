/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable import/named */
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { initialQueriesMap } from 'constants/queryBuilder';
import * as UseQBModule from 'hooks/queryBuilder/useQueryBuilder';
import React from 'react';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import type { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';

import QuerySearch from '../QuerySearch/QuerySearch';

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

jest.mock('@codemirror/autocomplete', () => ({
	autocompletion: (): Record<string, unknown> => ({}),
	closeCompletion: (): boolean => true,
	completionKeymap: [] as unknown[],
	startCompletion: (): boolean => true,
}));

jest.mock('@codemirror/lang-javascript', () => ({
	javascript: (): Record<string, unknown> => ({}),
}));

jest.mock('@uiw/codemirror-theme-copilot', () => ({
	copilot: {},
}));

jest.mock('@uiw/codemirror-theme-github', () => ({
	githubLight: {},
}));
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

// Mock CodeMirror to a simple textarea to make it testable and call onUpdate
jest.mock(
	'@uiw/react-codemirror',
	(): Record<string, unknown> => {
		// Minimal EditorView shape used by the component
		class EditorViewMock {}
		(EditorViewMock as any).domEventHandlers = (): unknown => ({} as unknown);
		(EditorViewMock as any).lineWrapping = {} as unknown;
		(EditorViewMock as any).editable = { of: () => ({}) } as unknown;

		const keymap = { of: (arr: unknown) => arr } as unknown;
		const Prec = { highest: (ext: unknown) => ext } as unknown;

		type CodeMirrorProps = {
			value?: string;
			onChange?: (v: string) => void;
			onFocus?: () => void;
			onBlur?: () => void;
			placeholder?: string;
			onCreateEditor?: (view: unknown) => unknown;
			onUpdate?: (arg: {
				view: {
					state: {
						selection: { main: { head: number } };
						doc: {
							toString: () => string;
							lineAt: (
								_pos: number,
							) => { number: number; from: number; to: number; text: string };
						};
					};
				};
			}) => void;
			'data-testid'?: string;
			extensions?: unknown[];
		};

		function CodeMirrorMock({
			value,
			onChange,
			onFocus,
			onBlur,
			placeholder,
			onCreateEditor,
			onUpdate,
			'data-testid': dataTestId,
			extensions,
		}: CodeMirrorProps): JSX.Element {
			const [localValue, setLocalValue] = React.useState<string>(value ?? '');

			// Provide a fake editor instance
			React.useEffect(() => {
				if (onCreateEditor) {
					onCreateEditor(new EditorViewMock() as any);
				}
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, []);

			// Call onUpdate whenever localValue changes to simulate cursor and doc
			React.useEffect(() => {
				if (onUpdate) {
					const text = String(localValue ?? '');
					const head = text.length;
					onUpdate({
						view: {
							state: {
								selection: { main: { head } },
								doc: {
									toString: (): string => text,
									lineAt: () => ({
										number: 1,
										from: 0,
										to: text.length,
										text,
									}),
								},
							},
						},
					});
				}
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [localValue]);

			const handleKeyDown = (
				e: React.KeyboardEvent<HTMLTextAreaElement>,
			): void => {
				const isModEnter = e.key === 'Enter' && (e.metaKey || e.ctrlKey);
				if (!isModEnter) return;
				const exts: unknown[] = Array.isArray(extensions) ? extensions : [];
				const flat: unknown[] = exts.flatMap((x: unknown) =>
					Array.isArray(x) ? x : [x],
				);
				const keyBindings = flat.filter(
					(x) =>
						Boolean(x) &&
						typeof x === 'object' &&
						'key' in (x as Record<string, unknown>),
				) as Array<{ key?: string; run?: () => boolean | void }>;
				keyBindings
					.filter((b) => b.key === 'Mod-Enter' && typeof b.run === 'function')
					.forEach((b) => {
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						b.run!();
					});
			};

			return (
				<textarea
					data-testid={dataTestId || 'query-where-clause-editor'}
					placeholder={placeholder}
					value={localValue}
					onChange={(e): void => {
						setLocalValue(e.target.value);
						if (onChange) {
							onChange(e.target.value);
						}
					}}
					onFocus={onFocus}
					onBlur={onBlur}
					onKeyDown={handleKeyDown}
					style={{ width: '100%', minHeight: 80 }}
				/>
			);
		}

		return {
			__esModule: true,
			default: CodeMirrorMock,
			EditorView: EditorViewMock,
			keymap,
			Prec,
		};
	},
);
const handleRunQueryMock = ((UseQBModule as unknown) as {
	handleRunQuery: jest.MockedFunction<() => void>;
}).handleRunQuery;

const PLACEHOLDER_TEXT =
	"Enter your filter query (e.g., http.status_code >= 500 AND service.name = 'frontend')";
const TESTID_EDITOR = 'query-where-clause-editor';
const SAMPLE_KEY_TYPING = 'http.';
const SAMPLE_VALUE_TYPING_INCOMPLETE = " service.name = '";
const SAMPLE_VALUE_TYPING_COMPLETE = " service.name = 'frontend'";
const SAMPLE_STATUS_QUERY = " status_code = '200'";

describe('QuerySearch', () => {
	it('renders with placeholder', () => {
		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
			/>,
		);

		expect(screen.getByPlaceholderText(PLACEHOLDER_TEXT)).toBeInTheDocument();
	});

	it('fetches key suggestions when typing a key (debounced)', async () => {
		jest.useFakeTimers();
		const advance = (ms: number): void => {
			jest.advanceTimersByTime(ms);
		};
		const user = userEvent.setup({
			advanceTimers: advance,
			pointerEventsCheck: 0,
		});
		const mockedGetKeys = getKeySuggestions as jest.MockedFunction<
			typeof getKeySuggestions
		>;

		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
			/>,
		);

		const editor = screen.getByTestId(TESTID_EDITOR);
		await user.type(editor, SAMPLE_KEY_TYPING);
		advance(1000);

		await waitFor(() => expect(mockedGetKeys).toHaveBeenCalled(), {
			timeout: 3000,
		});
		jest.useRealTimers();
	});

	it('fetches value suggestions when editing value context', async () => {
		jest.useFakeTimers();
		const advance = (ms: number): void => {
			jest.advanceTimersByTime(ms);
		};
		const user = userEvent.setup({
			advanceTimers: advance,
			pointerEventsCheck: 0,
		});
		const mockedGetValues = getValueSuggestions as jest.MockedFunction<
			typeof getValueSuggestions
		>;

		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
			/>,
		);

		const editor = screen.getByTestId(TESTID_EDITOR);
		await user.type(editor, SAMPLE_VALUE_TYPING_INCOMPLETE);
		advance(1000);

		await waitFor(() => expect(mockedGetValues).toHaveBeenCalled(), {
			timeout: 3000,
		});
		jest.useRealTimers();
	});

	it('fetches key suggestions on mount for LOGS', async () => {
		jest.useFakeTimers();
		const mockedGetKeysOnMount = getKeySuggestions as jest.MockedFunction<
			typeof getKeySuggestions
		>;

		render(
			<QuerySearch
				onChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				queryData={initialQueriesMap.logs.builder.queryData[0]}
				dataSource={DataSource.LOGS}
			/>,
		);

		jest.advanceTimersByTime(1000);

		await waitFor(() => expect(mockedGetKeysOnMount).toHaveBeenCalled(), {
			timeout: 3000,
		});

		const lastArgs = mockedGetKeysOnMount.mock.calls[
			mockedGetKeysOnMount.mock.calls.length - 1
		]?.[0] as { signal: unknown; searchText: string };
		expect(lastArgs).toMatchObject({ signal: DataSource.LOGS, searchText: '' });
		jest.useRealTimers();
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

		const editor = screen.getByTestId(TESTID_EDITOR);
		await user.click(editor);
		await user.type(editor, SAMPLE_STATUS_QUERY);
		await user.keyboard('{Meta>}{Enter}{/Meta}');

		await waitFor(() => expect(onRun).toHaveBeenCalled());
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

		const editor = screen.getByTestId(TESTID_EDITOR);
		await user.click(editor);
		await user.type(editor, SAMPLE_VALUE_TYPING_COMPLETE);
		await user.keyboard('{Meta>}{Enter}{/Meta}');

		await waitFor(() => expect(mockedHandleRunQuery).toHaveBeenCalled());
	});
});
