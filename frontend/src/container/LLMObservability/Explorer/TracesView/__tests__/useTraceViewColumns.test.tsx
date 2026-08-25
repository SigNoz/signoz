/* eslint-disable no-restricted-syntax */
import { act, renderHook } from '@testing-library/react';
import { useColumnStore } from 'components/TanStackTableView/useColumnStore';
import { LOCALSTORAGE } from 'constants/localStorage';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { useTraceViewColumns } from '../useTraceViewColumns';

jest.mock('providers/Timezone', () => ({
	useTimezone: (): { formatTimezoneAdjustedTimestamp: () => string } => ({
		formatTimezoneAdjustedTimestamp: (): string => 'formatted',
	}),
}));

const STORAGE_KEY = LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_COLUMNS;

const fieldNames = (fields: TelemetryFieldKey[]): string[] =>
	fields.map((field) => field.name);

describe('useTraceViewColumns', () => {
	beforeEach(() => {
		useColumnStore.getState().tables = {};
		localStorage.clear();
	});

	it('offers every response column in the pool', () => {
		const { result } = renderHook(() => useTraceViewColumns());

		// The trace list always computes its whole column set.
		expect(fieldNames(result.current.availableFields)).toStrictEqual(
			expect.arrayContaining([
				'trace_id',
				'service.name',
				'root_span_name',
				'trace_duration_nano',
				'span_count',
				'llm_call_count',
				'tool_call_count',
				'distinct_tool_count',
				'input_tokens',
				'output_tokens',
				'total_tokens',
				'estimated_total_cost',
				'max_llm_duration_nano',
				'error_count',
				'last_activity_time',
				'start_time',
				'end_time',
				'input',
				'output',
			]),
		);
		expect(result.current.availableFields).toHaveLength(19);
	});

	it('selects only the default-visible columns on first render', () => {
		const { result } = renderHook(() => useTraceViewColumns());

		expect(fieldNames(result.current.selectedFields)).toStrictEqual([
			'service.name',
			'root_span_name',
			'trace_duration_nano',
			'span_count',
			'llm_call_count',
			'total_tokens',
			'estimated_total_cost',
			'trace_id',
		]);
	});

	it('hides the columns dropped from the selection', () => {
		const { result } = renderHook(() => useTraceViewColumns());

		act(() => {
			result.current.onFieldsChange([
				{ name: 'trace_id' },
				{ name: 'total_tokens' },
			]);
		});

		expect(fieldNames(result.current.selectedFields)).toStrictEqual([
			'trace_id',
			'total_tokens',
		]);
	});

	it('shows a column added back from the pool', () => {
		const { result } = renderHook(() => useTraceViewColumns());

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

	it('keeps the trace id column even when the selection drops it', () => {
		const { result } = renderHook(() => useTraceViewColumns());

		act(() => {
			result.current.onFieldsChange([{ name: 'span_count' }]);
		});

		expect(fieldNames(result.current.selectedFields)).toContain('trace_id');
		expect(result.current.requiredFields).toStrictEqual(['trace_id']);
	});

	it('persists the selection order', () => {
		const { result } = renderHook(() => useTraceViewColumns());

		act(() => {
			result.current.onFieldsChange([
				{ name: 'total_tokens' },
				{ name: 'trace_id' },
				{ name: 'service.name' },
			]);
		});

		expect(fieldNames(result.current.selectedFields)).toStrictEqual([
			'total_tokens',
			'trace_id',
			'service.name',
		]);
		expect(
			useColumnStore.getState().tables[STORAGE_KEY].columnOrder,
		).toStrictEqual(['total_tokens', 'trace_id', 'service.name']);
	});
});
