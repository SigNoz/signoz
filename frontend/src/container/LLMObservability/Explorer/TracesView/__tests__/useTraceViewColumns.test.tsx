/* eslint-disable no-restricted-syntax */
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { AI_OBSERVABILITY_TRACE_VIEW_URL_OPTIONS } from 'providers/preferences/types';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { useTraceViewColumns } from '../useTraceViewColumns';

// The loader reads window.location, which MemoryRouter never moves.
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: (url: string) => void } => ({
		safeNavigate: (url: string): void => window.history.replaceState({}, '', url),
	}),
}));

const STORAGE_KEY = LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_OPTIONS;

const storedColumnNames = (): string[] | undefined =>
	(
		JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
			selectColumns: TelemetryFieldKey[];
		} | null
	)?.selectColumns.map((field) => field.name);

const AGGREGATE_KEYS = [
	'llm_call_count',
	'tool_call_count',
	'distinct_tool_count',
	'input_tokens',
	'output_tokens',
	'total_tokens',
	'estimated_total_cost',
	'max_llm_duration_nano',
];

const fieldNames = (fields: TelemetryFieldKey[]): string[] =>
	fields.map((field) => field.name);

const columnNames = (columns: { header?: unknown }[]): string[] =>
	columns.map((column) => column.header as string);

function wrapper({ children }: { children: ReactNode }): JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return (
		<MemoryRouter>
			<QueryClientProvider client={queryClient}>
				<PreferenceContextProvider>{children}</PreferenceContextProvider>
			</QueryClientProvider>
		</MemoryRouter>
	);
}

const seenAI: URLSearchParams[] = [];

const mockAggregateKeys = (names: string[]): void => {
	server.use(
		rest.get(
			`${ENVIRONMENT.baseURL}/api/v1/ai_observability/fields/keys`,
			(req, res, ctx) => {
				seenAI.push(req.url.searchParams);
				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							complete: true,
							keys: Object.fromEntries(
								names.map((name) => [
									name,
									[
										{
											name,
											fieldContext: TelemetrytypesFieldContextDTO.trace,
											fieldDataType: TelemetrytypesFieldDataTypeDTO.float64,
										},
									],
								]),
							),
						},
					}),
				);
			},
		),
	);
};

const renderColumns = async (): Promise<
	ReturnType<typeof renderHook<ReturnType<typeof useTraceViewColumns>, unknown>>
> => {
	const rendered = renderHook(() => useTraceViewColumns(), { wrapper });
	await waitFor(() => {
		expect(rendered.result.current.isLoading).toBe(false);
	});
	return rendered;
};

describe('useTraceViewColumns', () => {
	beforeEach(() => {
		seenAI.length = 0;
		localStorage.clear();
		window.history.replaceState({}, '', '/');
		mockAggregateKeys(AGGREGATE_KEYS);
	});

	it('reads the aggregates from the trace context of the keys endpoint', async () => {
		await renderColumns();

		expect(seenAI).toHaveLength(1);
		expect(seenAI[0]?.get('searchText')).toBe('');
		expect(seenAI[0]?.get('fieldContext')).toBe(
			TelemetrytypesFieldContextDTO.trace,
		);
	});

	it('pools the hardcoded display-only columns with the endpoint aggregates', async () => {
		const { result } = await renderColumns();

		expect(columnNames(result.current.columns)).toStrictEqual([
			'trace_id',
			'service.name',
			'root_span_name',
			'estimated_total_cost',
			'trace_duration_nano',
			'span_count',
			'total_tokens',
			'input_tokens',
			'output_tokens',
			'distinct_tool_count',
			'llm_call_count',
			'tool_call_count',
			'start_time',
			'end_time',
			'error_count',
			'input',
			'output',
			'max_llm_duration_nano',
		]);
	});

	it('selects only the default-visible columns on first render', async () => {
		const { result } = await renderColumns();

		expect(fieldNames(result.current.selectedFields)).toStrictEqual([
			'trace_id',
			'service.name',
			'root_span_name',
			'estimated_total_cost',
			'trace_duration_nano',
			'span_count',
			'total_tokens',
			'input_tokens',
			'output_tokens',
			'distinct_tool_count',
			'llm_call_count',
			'tool_call_count',
			'start_time',
			'end_time',
			'error_count',
			'input',
			'output',
			'max_llm_duration_nano',
		]);
	});

	it('keeps a newly reported aggregate hidden until it is picked', async () => {
		mockAggregateKeys(['brand_new_aggregate']);

		const { result } = await renderColumns();

		expect(fieldNames(result.current.selectedFields)).not.toContain(
			'brand_new_aggregate',
		);

		act(() => {
			result.current.onFieldsChange([
				...result.current.selectedFields,
				{
					name: 'brand_new_aggregate',
					fieldContext: 'trace',
					fieldDataType: 'float64',
				},
			]);
		});

		expect(columnNames(result.current.columns)).toContain('brand_new_aggregate');
	});

	describe('when the keys fetch fails', () => {
		beforeEach(() => {
			server.use(
				rest.get(
					`${ENVIRONMENT.baseURL}/api/v1/ai_observability/fields/keys`,
					(_req, res, ctx) => res(ctx.status(500), ctx.json({ status: 'error' })),
				),
			);
		});

		it('does not persist defaults', async () => {
			await renderColumns();

			expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		});

		it('reports the column state as not persistable', async () => {
			const { result } = await renderColumns();

			expect(result.current.canPersistColumns).toBe(false);
		});

		it('ignores a selection change instead of persisting a partial set', async () => {
			const { result } = await renderColumns();

			act(() => {
				result.current.onFieldsChange([{ name: 'trace_id' }]);
			});

			expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		});

		it('seeds the defaults once a later fetch succeeds', async () => {
			const { unmount } = await renderColumns();
			unmount();

			mockAggregateKeys(AGGREGATE_KEYS);
			const { result } = await renderColumns();

			expect(result.current.canPersistColumns).toBe(true);
			expect(fieldNames(result.current.selectedFields)).toStrictEqual([
				'trace_id',
				'service.name',
				'root_span_name',
				'estimated_total_cost',
				'trace_duration_nano',
				'span_count',
				'total_tokens',
				'input_tokens',
				'output_tokens',
				'distinct_tool_count',
				'llm_call_count',
				'tool_call_count',
				'start_time',
				'end_time',
				'error_count',
				'input',
				'output',
				'max_llm_duration_nano',
			]);
		});
	});

	it('hides the columns dropped from the selection', async () => {
		const { result } = await renderColumns();

		act(() => {
			result.current.onFieldsChange([
				{ name: 'trace_id' },
				{ name: 'total_tokens', fieldContext: 'trace', fieldDataType: 'float64' },
			]);
		});

		expect(fieldNames(result.current.selectedFields)).toStrictEqual([
			'trace_id',
			'total_tokens',
		]);
	});

	it('shows a column added back from the pool', async () => {
		const { result } = await renderColumns();

		act(() => {
			result.current.onFieldsChange([{ name: 'trace_id' }]);
		});
		act(() => {
			result.current.onFieldsChange([{ name: 'trace_id' }, { name: 'input' }]);
		});

		expect(fieldNames(result.current.selectedFields)).toStrictEqual([
			'trace_id',
			'input',
		]);
	});

	it('keeps the trace id column even when the selection drops it', async () => {
		const { result } = await renderColumns();

		act(() => {
			result.current.onFieldsChange([{ name: 'span_count' }]);
		});

		expect(fieldNames(result.current.selectedFields)).toContain('trace_id');
		expect(result.current.requiredFields).toStrictEqual(['trace_id']);
	});

	it('persists the selection order', async () => {
		const { result } = await renderColumns();

		act(() => {
			result.current.onFieldsChange([
				{ name: 'total_tokens', fieldContext: 'trace', fieldDataType: 'float64' },
				{ name: 'trace_id' },
				{ name: 'service.name', fieldContext: 'resource' },
			]);
		});

		expect(fieldNames(result.current.selectedFields)).toStrictEqual([
			'total_tokens',
			'trace_id',
			'service.name',
		]);
		expect(storedColumnNames()).toStrictEqual([
			'total_tokens',
			'trace_id',
			'service.name',
		]);
	});

	it('writes the selection to its own URL param, not the list view one', async () => {
		const { result } = await renderColumns();

		act(() => {
			result.current.onFieldsChange([{ name: 'trace_id' }, { name: 'input' }]);
		});

		expect(window.location.search).not.toContain('options=');
		const params = new URLSearchParams(window.location.search);
		expect(
			JSON.parse(params.get(AI_OBSERVABILITY_TRACE_VIEW_URL_OPTIONS) ?? '{}')
				.selectColumns,
		).toStrictEqual([{ name: 'trace_id' }, { name: 'input' }]);
	});

	it('takes the URL columns over the stored ones', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ selectColumns: [{ name: 'trace_id' }, { name: 'input' }] }),
		);
		window.history.replaceState(
			{},
			'',
			`/?${AI_OBSERVABILITY_TRACE_VIEW_URL_OPTIONS}=${encodeURIComponent(
				JSON.stringify({
					selectColumns: [{ name: 'output' }, { name: 'trace_id' }],
				}),
			)}`,
		);

		const { result } = await renderColumns();

		expect(fieldNames(result.current.selectedFields)).toStrictEqual([
			'output',
			'trace_id',
		]);
	});

	it('drops stored fields the keys endpoint no longer reports', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				selectColumns: [{ name: 'trace_id' }, { name: 'removed_aggregate' }],
			}),
		);

		const { result } = await renderColumns();

		expect(fieldNames(result.current.selectedFields)).toStrictEqual(['trace_id']);
	});

	it('removes a column dropped from the table header', async () => {
		const { result } = await renderColumns();

		act(() => {
			result.current.onColumnRemove('input');
		});

		expect(fieldNames(result.current.selectedFields)).not.toContain('input');
		expect(storedColumnNames()).not.toContain('input');
	});
});
