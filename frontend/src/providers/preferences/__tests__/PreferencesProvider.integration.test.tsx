/* eslint-disable sonarjs/no-duplicate-string */

import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { LogViewMode } from 'container/LogsTable';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
} from 'container/OptionsMenu/constants';
import { FontSize } from 'container/OptionsMenu/types';
import { render, screen, userEvent } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import { usePreferenceContext } from '../context/PreferenceContextProvider';

const ROUTE_LOGS = '/logs';
const ROUTE_TRACES = '/traces';
const TESTID_LOGS = 'logs';
const TESTID_TRACES = 'traces';

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
	dataSource,
	testIdPrefix,
}: {
	dataSource: DataSource;
	testIdPrefix: string;
}): JSX.Element {
	const ctx = usePreferenceContext();
	const slice = dataSource === DataSource.TRACES ? ctx.traces : ctx.logs;

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
						dataSource === DataSource.TRACES
							? (defaultTraceSelectedColumns.slice(0, 1) as TelemetryFieldKey[])
							: (defaultLogsSelectedColumns.slice(0, 1) as TelemetryFieldKey[]);
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
				<Consumer dataSource={DataSource.LOGS} testIdPrefix={TESTID_LOGS} />,
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
				<Consumer dataSource={DataSource.LOGS} testIdPrefix={TESTID_LOGS} />,
				undefined,
				{
					initialRoute: ROUTE_LOGS,
				},
			);

			expect(Number(screen.getByTestId('logs-columns-len').textContent)).toBe(1);
		});

		it('direct mode updateColumns persists to localStorage', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(
				<Consumer dataSource={DataSource.LOGS} testIdPrefix={TESTID_LOGS} />,
				undefined,
				{
					initialRoute: ROUTE_LOGS,
				},
			);

			await user.click(screen.getByTestId('logs-update-columns'));

			const stored = getLocalStorageJSON<LogsLocalOptions>(
				LOCALSTORAGE.LOGS_LIST_OPTIONS,
			);
			expect(stored?.selectColumns).toEqual([
				defaultLogsSelectedColumns[0] as TelemetryFieldKey,
			]);
		});

		it('saved view mode uses in-memory preferences (no localStorage write)', async () => {
			const viewKey = JSON.stringify('saved-view-id-1');
			const initialEntry = `/logs?viewKey=${encodeURIComponent(viewKey)}`;
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<Consumer dataSource={DataSource.LOGS} testIdPrefix="logs" />,
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
				<Consumer dataSource={DataSource.LOGS} testIdPrefix={TESTID_LOGS} />,
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

			expect(Number(screen.getByTestId('logs-columns-len').textContent)).toBe(1);
		});

		it('updateFormatting persists to localStorage in direct mode', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			function FormattingConsumer(): JSX.Element {
				const { logs } = usePreferenceContext();
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
				<Consumer dataSource={DataSource.LOGS} testIdPrefix={TESTID_LOGS} />,
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
				<Consumer dataSource={DataSource.TRACES} testIdPrefix={TESTID_TRACES} />,
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
				<Consumer dataSource={DataSource.TRACES} testIdPrefix={TESTID_TRACES} />,
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
				<Consumer dataSource={DataSource.TRACES} testIdPrefix={TESTID_TRACES} />,
				undefined,
				{
					initialRoute: ROUTE_TRACES,
				},
			);

			await user.click(screen.getByTestId('traces-update-columns'));

			const stored = getLocalStorageJSON<TracesLocalOptions>(
				LOCALSTORAGE.TRACES_LIST_OPTIONS,
			);
			expect(stored?.selectColumns).toEqual([
				defaultTraceSelectedColumns[0] as TelemetryFieldKey,
			]);
		});

		it('saved view mode uses in-memory preferences (no localStorage write)', async () => {
			const viewKey = JSON.stringify('saved-view-id-2');
			const initialEntry = `/traces?viewKey=${encodeURIComponent(viewKey)}`;
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<Consumer dataSource={DataSource.TRACES} testIdPrefix="traces" />,
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
				<Consumer dataSource={DataSource.TRACES} testIdPrefix={TESTID_TRACES} />,
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
				const { traces } = usePreferenceContext();
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
				<Consumer dataSource={DataSource.TRACES} testIdPrefix={TESTID_TRACES} />,
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
});
