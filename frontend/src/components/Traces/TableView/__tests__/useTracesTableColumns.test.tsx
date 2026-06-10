import { renderHook } from '@testing-library/react';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import type { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { useTracesTableColumns } from '../useTracesTableColumns';

type Row = { trace_id: string; span_id: string };

const cellStub = (): JSX.Element => <span />;

const baseColumns: TableColumnDef<Row>[] = [
	{
		id: 'span.timestamp',
		header: 'Timestamp',
		accessorFn: (r): unknown => r.span_id,
		width: { default: 170, min: 170 },
		cell: cellStub,
	},
	{
		id: 'span.trace_id',
		header: 'Trace ID',
		accessorFn: (r): unknown => r.trace_id,
		width: { min: 200 },
		cell: cellStub,
	},
];

describe('useTracesTableColumns', () => {
	it('returns baseColumns as-is when no fields are provided', () => {
		const { result } = renderHook(() =>
			useTracesTableColumns<Row>({ baseColumns }),
		);
		expect(result.current).toHaveLength(baseColumns.length);
		expect(result.current.map((c) => c.id)).toStrictEqual([
			'span.timestamp',
			'span.trace_id',
		]);
	});

	it('appends dynamic field columns after baseColumns', () => {
		const fields: TelemetryFieldKey[] = [
			{
				name: 'http.method',
				fieldContext: 'attribute',
				fieldDataType: 'string',
				signal: 'traces',
			} as TelemetryFieldKey,
			{
				name: 'duration_nano',
				fieldContext: 'span',
				fieldDataType: 'int64',
				signal: 'traces',
			} as TelemetryFieldKey,
		];

		const { result } = renderHook(() =>
			useTracesTableColumns<Row>({ baseColumns, fields }),
		);

		expect(result.current).toHaveLength(baseColumns.length + fields.length);
		// baseColumns first.
		expect(
			result.current.slice(0, baseColumns.length).map((c) => c.id),
		).toStrictEqual(['span.timestamp', 'span.trace_id']);
		// Then dynamic fields with 3-arg composite IDs (context.name.dataType).
		expect(
			result.current.slice(baseColumns.length).map((c) => c.id),
		).toStrictEqual(['attribute.http.method.string', 'span.duration_nano.int64']);
	});

	it('preserves the same array reference when inputs are stable (memoization)', () => {
		const fields: TelemetryFieldKey[] = [];
		const { result, rerender } = renderHook(() =>
			useTracesTableColumns<Row>({ baseColumns, fields }),
		);
		const first = result.current;
		rerender();
		expect(result.current).toBe(first);
	});

	it('returns a new array when baseColumns reference changes', () => {
		const { result, rerender } = renderHook(
			(props: { baseColumns: TableColumnDef<Row>[] }) =>
				useTracesTableColumns<Row>({ baseColumns: props.baseColumns }),
			{ initialProps: { baseColumns } },
		);
		const first = result.current;
		rerender({ baseColumns: [...baseColumns] });
		expect(result.current).not.toBe(first);
		expect(result.current.map((c) => c.id)).toStrictEqual(first.map((c) => c.id));
	});

	it('uses 2-arg composite ID when fieldDataType is empty', () => {
		const fields: TelemetryFieldKey[] = [
			{
				name: 'service.name',
				fieldContext: 'resource',
				fieldDataType: '',
				signal: 'traces',
			} as TelemetryFieldKey,
		];
		const { result } = renderHook(() =>
			useTracesTableColumns<Row>({ baseColumns: [], fields }),
		);
		expect(result.current[0].id).toBe('resource.service.name');
	});
});
