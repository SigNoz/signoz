/* eslint-disable no-restricted-syntax */
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useColumnStore } from 'components/TanStackTableView/useColumnStore';
import { LOCALSTORAGE } from 'constants/localStorage';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { useTraceViewColumns } from '../useTraceViewColumns';

const STORAGE_KEY = LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_COLUMNS;

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
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
		useColumnStore.getState().tables = {};
		localStorage.clear();
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
			'service.name',
			'root_span_name',
			'trace_duration_nano',
			'span_count',
			'trace_id',
			'start_time',
			'end_time',
			'error_count',
			'input',
			'output',
			...AGGREGATE_KEYS,
		]);
	});

	it('selects only the default-visible columns on first render', async () => {
		const { result } = await renderColumns();

		expect(fieldNames(result.current.selectedFields)).toStrictEqual([
			'service.name',
			'root_span_name',
			'trace_duration_nano',
			'span_count',
			'trace_id',
			'llm_call_count',
			'total_tokens',
			'estimated_total_cost',
		]);
	});

	it('keeps a newly reported aggregate hidden until it is picked', async () => {
		mockAggregateKeys(['brand_new_aggregate']);

		const { result } = await renderColumns();

		expect(columnNames(result.current.columns)).toContain('brand_new_aggregate');
		expect(fieldNames(result.current.selectedFields)).not.toContain(
			'brand_new_aggregate',
		);
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
		expect(
			useColumnStore.getState().tables[STORAGE_KEY].columnOrder,
		).toStrictEqual([
			'trace:total_tokens:float64',
			'trace_id',
			'resource:service.name',
		]);
	});
});
