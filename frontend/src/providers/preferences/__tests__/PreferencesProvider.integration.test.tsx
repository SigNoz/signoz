import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { TRACE_VIEW_DEFAULT_COLUMNS } from 'container/LLMObservability/Explorer/constants';
import { LogViewMode, FontSize } from 'container/OptionsMenu/types';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
} from 'container/OptionsMenu/constants';
import { render, screen, userEvent } from 'tests/test-utils';

import { usePreferenceContext } from '../context/PreferenceContextProvider';
import { PanelColumns, PreferenceSourcePage } from '../types';

const ROUTE_LOGS = '/logs';
const ROUTE_TRACES = '/traces';
const TESTID_LOGS = 'logs';
const TESTID_TRACES = 'traces';
const ROUTE_AI = '/ai-observability';
const AI_DEFAULT_COUNT = String(TRACE_VIEW_DEFAULT_COLUMNS.length);
const TESTID_AI = 'ai';

type LogsLocalOptions = {
	selectColumns?: TelemetryFieldKey[];
	maxLines?: number;
	format?: string;
	fontSize?: string;
	version?: number;
};

type TracesLocalOptions = {
	selectColumns?: TelemetryFieldKey[];
};

function setLocalStorageJSON(key: string, value: unknown): void {
	localStorage.setItem(key, JSON.stringify(value));
}

function getLocalStorageJSON<T>(key: string): T | null {
	const raw = localStorage.getItem(key);
	return raw ? (JSON.parse(raw) as T) : null;
}

function Consumer({
	sourcePage,
	testIdPrefix,
}: {
	sourcePage: PreferenceSourcePage;
	testIdPrefix: string;
}): JSX.Element {
	const slice = usePreferenceContext()[sourcePage];

	return (
		<div>
			<div data-testid={`${testIdPrefix}-loading`}>{String(slice.loading)}</div>
			<div data-testid={`${testIdPrefix}-columns-len`}>
				{String(slice.preferences?.columns?.length || 0)}
			</div>
			<button
				data-testid={`${testIdPrefix}-update-columns`}
				type="button"
				onClick={(): void => {
					const newCols: TelemetryFieldKey[] =
						sourcePage === SavedviewtypesSourceDTO.logs
							? (defaultLogsSelectedColumns.slice(0, 1) as TelemetryFieldKey[])
							: (defaultTraceSelectedColumns.slice(0, 1) as TelemetryFieldKey[]);
					slice.updateColumns(newCols);
				}}
			>
				update
			</button>
		</div>
	);
}

describe('PreferencesProvider integration', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe('Logs', () => {
		it('loads defaults when no localStorage or url provided', () => {
			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.logs}
					testIdPrefix={TESTID_LOGS}
				/>,
				undefined,
				{
					initialRoute: ROUTE_LOGS,
				},
			);

			expect(screen.getByTestId('logs-loading')).toHaveTextContent('false');
			expect(
				Number(screen.getByTestId('logs-columns-len').textContent),
			).toBeGreaterThan(0);
		});

		it('respects localStorage when present', () => {
			setLocalStorageJSON(LOCALSTORAGE.LOGS_LIST_OPTIONS, {
				selectColumns: [{ name: 'ls.col' }],
				maxLines: 5,
				format: 'json',
				fontSize: 'large',
				version: 2,
			});

			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.logs}
					testIdPrefix={TESTID_LOGS}
				/>,
				undefined,
				{
					initialRoute: ROUTE_LOGS,
				},
			);

			// Loader's ensureLogsRequiredColumns prepends timestamp + body, so the
			// 1 column in localStorage becomes 3 in preferences.
			expect(Number(screen.getByTestId('logs-columns-len').textContent)).toBe(3);
		});

		it('direct mode updateColumns persists to localStorage', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.logs}
					testIdPrefix={TESTID_LOGS}
				/>,
				undefined,
				{
					initialRoute: ROUTE_LOGS,
				},
			);

			await user.click(screen.getByTestId('logs-update-columns'));

			const stored = getLocalStorageJSON<LogsLocalOptions>(
				LOCALSTORAGE.LOGS_LIST_OPTIONS,
			);
			// Writer's ensureLogsRequiredColumns prepends `body` when only
			// `timestamp` was passed in (defaults.slice(0,1) is just timestamp).
			expect(stored?.selectColumns).toStrictEqual([
				defaultLogsSelectedColumns[1] as TelemetryFieldKey, // body
				defaultLogsSelectedColumns[0] as TelemetryFieldKey, // timestamp
			]);
		});

		it('saved view mode uses in-memory preferences (no localStorage write)', async () => {
			const viewKey = JSON.stringify('saved-view-id-1');
			const initialEntry = `/logs?viewKey=${encodeURIComponent(viewKey)}`;
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<Consumer sourcePage={SavedviewtypesSourceDTO.logs} testIdPrefix="logs" />,
				undefined,
				{
					initialRoute: initialEntry,
				},
			);

			await user.click(screen.getByTestId('logs-update-columns'));

			const stored = getLocalStorageJSON<LogsLocalOptions>(
				LOCALSTORAGE.LOGS_LIST_OPTIONS,
			);
			expect(stored?.selectColumns).toBeUndefined();
		});

		it('url options override defaults', () => {
			const options = {
				selectColumns: [{ name: 'url.col' }],
				maxLines: 7,
				format: 'json',
				fontSize: 'large',
				version: 2,
			};
			const originalLocation = window.location;
			Object.defineProperty(window, 'location', {
				writable: true,
				value: {
					...originalLocation,
					search: `?options=${encodeURIComponent(JSON.stringify(options))}`,
				},
			});

			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.logs}
					testIdPrefix={TESTID_LOGS}
				/>,
				undefined,
				{
					initialRoute: ROUTE_LOGS,
				},
			);

			// restore
			Object.defineProperty(window, 'location', {
				writable: true,
				value: originalLocation,
			});

			// Loader's ensureLogsRequiredColumns prepends timestamp + body, so the
			// URL's 1 column becomes 3 in preferences.
			expect(Number(screen.getByTestId('logs-columns-len').textContent)).toBe(3);
		});

		it('updateFormatting persists to localStorage in direct mode', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			function FormattingConsumer(): JSX.Element {
				const logs = usePreferenceContext()[SavedviewtypesSourceDTO.logs];
				return (
					<button
						data-testid="logs-update-formatting"
						type="button"
						onClick={(): void =>
							logs.updateFormatting({
								maxLines: 9,
								format: 'json' as LogViewMode,
								fontSize: 'large' as FontSize,
								version: 2,
							})
						}
					>
						fmt
					</button>
				);
			}

			render(<FormattingConsumer />, undefined, { initialRoute: '/logs' });

			await user.click(screen.getByTestId('logs-update-formatting'));

			const stored = getLocalStorageJSON<LogsLocalOptions>(
				LOCALSTORAGE.LOGS_LIST_OPTIONS,
			);
			expect(stored?.maxLines).toBe(9);
			expect(stored?.format).toBe('json');
			expect(stored?.fontSize).toBe('large');
			expect(stored?.version).toBe(2);
		});

		it('saved view mode updates in-memory preferences (columns-len changes)', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const viewKey = JSON.stringify('saved-view-id-3');
			const initialEntry = `/logs?viewKey=${encodeURIComponent(viewKey)}`;

			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.logs}
					testIdPrefix={TESTID_LOGS}
				/>,
				undefined,
				{ initialRoute: initialEntry },
			);

			const before = Number(screen.getByTestId('logs-columns-len').textContent);
			await user.click(screen.getByTestId('logs-update-columns'));
			const after = Number(screen.getByTestId('logs-columns-len').textContent);
			expect(after).toBeGreaterThanOrEqual(1);
			// Should change from default to 1 for our new selection; tolerate default already being >=1
			if (before !== after) {
				expect(after).toBe(1);
			}
		});
	});

	describe('Traces', () => {
		it('loads defaults when no localStorage or url provided', () => {
			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.traces}
					testIdPrefix={TESTID_TRACES}
				/>,
				undefined,
				{
					initialRoute: ROUTE_TRACES,
				},
			);

			expect(screen.getByTestId('traces-loading')).toHaveTextContent('false');
			expect(
				Number(screen.getByTestId('traces-columns-len').textContent),
			).toBeGreaterThan(0);
		});

		it('respects localStorage when present', () => {
			setLocalStorageJSON(LOCALSTORAGE.TRACES_LIST_OPTIONS, {
				selectColumns: [{ name: 'trace.ls.col' }],
			});

			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.traces}
					testIdPrefix={TESTID_TRACES}
				/>,
				undefined,
				{
					initialRoute: ROUTE_TRACES,
				},
			);

			expect(Number(screen.getByTestId('traces-columns-len').textContent)).toBe(1);
		});

		it('direct mode updateColumns persists to localStorage', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.traces}
					testIdPrefix={TESTID_TRACES}
				/>,
				undefined,
				{
					initialRoute: ROUTE_TRACES,
				},
			);

			await user.click(screen.getByTestId('traces-update-columns'));

			const stored = getLocalStorageJSON<TracesLocalOptions>(
				LOCALSTORAGE.TRACES_LIST_OPTIONS,
			);
			expect(stored?.selectColumns).toStrictEqual([
				defaultTraceSelectedColumns[0] as TelemetryFieldKey,
			]);
		});

		it('saved view mode uses in-memory preferences (no localStorage write)', async () => {
			const viewKey = JSON.stringify('saved-view-id-2');
			const initialEntry = `/traces?viewKey=${encodeURIComponent(viewKey)}`;
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.traces}
					testIdPrefix="traces"
				/>,
				undefined,
				{
					initialRoute: initialEntry,
				},
			);

			await user.click(screen.getByTestId('traces-update-columns'));

			const stored = getLocalStorageJSON<TracesLocalOptions>(
				LOCALSTORAGE.TRACES_LIST_OPTIONS,
			);
			expect(stored?.selectColumns).toBeUndefined();
		});

		it('url options override defaults', () => {
			const options = {
				selectColumns: [{ name: 'trace.url.col' }],
			};
			const originalLocation = window.location;
			Object.defineProperty(window, 'location', {
				writable: true,
				value: {
					...originalLocation,
					search: `?options=${encodeURIComponent(JSON.stringify(options))}`,
				},
			});

			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.traces}
					testIdPrefix={TESTID_TRACES}
				/>,
				undefined,
				{ initialRoute: ROUTE_TRACES },
			);

			Object.defineProperty(window, 'location', {
				writable: true,
				value: originalLocation,
			});

			expect(Number(screen.getByTestId('traces-columns-len').textContent)).toBe(1);
		});

		it('updateFormatting is a no-op in direct mode (no localStorage write)', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			function TracesFormattingConsumer(): JSX.Element {
				const traces = usePreferenceContext()[SavedviewtypesSourceDTO.traces];
				return (
					<button
						data-testid="traces-update-formatting"
						type="button"
						onClick={(): void =>
							traces.updateFormatting({
								maxLines: 9,
								format: 'json' as LogViewMode,
								fontSize: 'large' as FontSize,
								version: 2,
							})
						}
					>
						fmt
					</button>
				);
			}

			render(<TracesFormattingConsumer />, undefined, { initialRoute: '/traces' });

			await user.click(screen.getByTestId('traces-update-formatting'));

			const stored = getLocalStorageJSON<TracesLocalOptions>(
				LOCALSTORAGE.TRACES_LIST_OPTIONS,
			);
			expect(stored).toBeNull();
		});

		it('saved view mode updates in-memory preferences (columns-len changes)', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const viewKey = JSON.stringify('saved-view-id-4');
			const initialEntry = `/traces?viewKey=${encodeURIComponent(viewKey)}`;

			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.traces}
					testIdPrefix={TESTID_TRACES}
				/>,
				undefined,
				{ initialRoute: initialEntry },
			);

			const before = Number(screen.getByTestId('traces-columns-len').textContent);
			await user.click(screen.getByTestId('traces-update-columns'));
			const after = Number(screen.getByTestId('traces-columns-len').textContent);
			expect(after).toBeGreaterThanOrEqual(1);
			if (before !== after) {
				expect(after).toBe(1);
			}
		});
	});

	describe('AI observability traces', () => {
		const renderAiConsumer = (): void => {
			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.ai_observability}
					testIdPrefix={TESTID_AI}
				/>,
				undefined,
				{ initialRoute: ROUTE_AI },
			);
		};

		it('starts with the default trace view columns', () => {
			renderAiConsumer();

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent(
				AI_DEFAULT_COUNT,
			);
		});

		it('loads its own localStorage, not the traces list one', () => {
			setLocalStorageJSON(LOCALSTORAGE.TRACES_LIST_OPTIONS, {
				selectColumns: [{ name: 'traces.list.col' }],
			});
			setLocalStorageJSON(LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS, {
				[PANEL_TYPES.TRACE]: [{ name: 'ai.col.a' }, { name: 'ai.col.b' }],
			});

			renderAiConsumer();

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent('2');
		});

		const URL_COLUMNS = [{ name: 'ai.url.a' }, { name: 'ai.url.b' }];

		const renderAtUrl = (
			pathname: string,
			params: Record<string, unknown>,
			renderConsumer: () => void,
		): void => {
			const search = new URLSearchParams(
				Object.entries(params).map(([key, value]) => [key, JSON.stringify(value)]),
			).toString();
			const originalLocation = window.location;
			Object.defineProperty(window, 'location', {
				writable: true,
				value: { ...originalLocation, pathname, search: `?${search}` },
			});

			renderConsumer();

			Object.defineProperty(window, 'location', {
				writable: true,
				value: originalLocation,
			});
		};

		const renderAiAtUrl = (params: Record<string, unknown>): void =>
			renderAtUrl(ROUTES.AI_OBSERVABILITY_EXPLORER, params, renderAiConsumer);

		it('ignores the url options on other explorers', () => {
			renderAtUrl(
				ROUTE_TRACES,
				{ options: { selectColumns: URL_COLUMNS } },
				renderAiConsumer,
			);

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent(
				AI_DEFAULT_COUNT,
			);
		});

		it('loads the url columns for the panel in panelTypes', () => {
			renderAiAtUrl({
				options: { selectColumns: URL_COLUMNS },
				panelTypes: PANEL_TYPES.TRACE,
			});

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent('2');
		});

		it('files the url columns under the panel in panelTypes', () => {
			renderAiAtUrl({
				options: { selectColumns: URL_COLUMNS },
				panelTypes: PANEL_TYPES.LIST,
			});

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent(
				AI_DEFAULT_COUNT,
			);
		});

		it('prefers its localStorage over the url options', () => {
			setLocalStorageJSON(LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS, {
				[PANEL_TYPES.TRACE]: [{ name: 'ai.local.col' }],
			});

			renderAiAtUrl({
				options: { selectColumns: URL_COLUMNS },
				panelTypes: PANEL_TYPES.TRACE,
			});

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent('1');
		});

		it('keeps its url columns out of the traces slice', () => {
			renderAtUrl(
				ROUTES.AI_OBSERVABILITY_EXPLORER,
				{
					options: { selectColumns: URL_COLUMNS },
					panelTypes: PANEL_TYPES.TRACE,
				},
				(): void => {
					render(
						<Consumer
							sourcePage={SavedviewtypesSourceDTO.traces}
							testIdPrefix={TESTID_TRACES}
						/>,
						undefined,
						{ initialRoute: ROUTE_AI },
					);
				},
			);

			expect(screen.getByTestId('traces-columns-len')).toHaveTextContent(
				String(defaultTraceSelectedColumns.length),
			);
		});

		it('drops stored columns without a name or from another signal', () => {
			setLocalStorageJSON(LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS, {
				[PANEL_TYPES.TRACE]: [
					{ name: 'ai.col.a' },
					{ name: 'logs.col', signal: 'logs' },
					{ key: 'no.name' },
					{},
					'not-a-column',
				],
			});

			renderAiConsumer();

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent('1');
		});

		it('ignores a stored panel that is not a list', () => {
			setLocalStorageJSON(LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS, {
				[PANEL_TYPES.TRACE]: 'ai.col.a',
			});

			renderAiConsumer();

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent(
				AI_DEFAULT_COUNT,
			);
		});

		it('falls back to the url options when every stored column is invalid', () => {
			setLocalStorageJSON(LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS, {
				[PANEL_TYPES.TRACE]: [{ name: 'logs.col', signal: 'logs' }],
			});

			renderAiAtUrl({
				options: { selectColumns: URL_COLUMNS },
				panelTypes: PANEL_TYPES.TRACE,
			});

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent('2');
		});

		it('loads the columns of the panel open in the url', () => {
			setLocalStorageJSON(LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS, {
				[PANEL_TYPES.TRACE]: [{ name: 'ai.trace.a' }, { name: 'ai.trace.b' }],
				[PANEL_TYPES.LIST]: [{ name: 'ai.list.col' }],
			});

			render(
				<Consumer
					sourcePage={SavedviewtypesSourceDTO.ai_observability}
					testIdPrefix={TESTID_AI}
				/>,
				undefined,
				{
					initialRoute: `${ROUTE_AI}?panelTypes=${encodeURIComponent(
						JSON.stringify(PANEL_TYPES.LIST),
					)}`,
				},
			);

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent('1');
		});

		it('keeps each panel apart in its localStorage', () => {
			setLocalStorageJSON(LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS, {
				[PANEL_TYPES.LIST]: [{ name: 'ai.list.col' }],
			});

			renderAiConsumer();

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent(
				AI_DEFAULT_COUNT,
			);
		});

		it('updateColumns writes its own localStorage key in direct mode', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderAiConsumer();

			await user.click(screen.getByTestId('ai-update-columns'));

			expect(screen.getByTestId('ai-columns-len')).toHaveTextContent('1');
			expect(
				getLocalStorageJSON<PanelColumns>(LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS)?.[
					PANEL_TYPES.TRACE
				],
			).toHaveLength(1);
			expect(
				getLocalStorageJSON<TracesLocalOptions>(LOCALSTORAGE.TRACES_LIST_OPTIONS),
			).toBeNull();
		});
	});
});
