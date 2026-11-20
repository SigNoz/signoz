import { rest, server } from 'mocks-server/server';
import { act, AllTheProviders, renderHook, waitFor } from 'tests/test-utils';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';

import { useSpanDrawer } from '../useSpanDrawer';

let mockQueryId = 'query-1';
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({ stagedQuery: { id: mockQueryId } }),
}));

const rows: TracesTableRow[] = [
	{ id: 'row-a', trace_id: 'trace-1', span_id: 'span-a' },
	{ id: 'row-b', trace_id: 'trace-1', span_id: 'span-b' },
];

describe('useSpanDrawer', () => {
	beforeEach(() => {
		mockQueryId = 'query-1';
	});

	it('keeps a span open after its row leaves the list, without row navigation', () => {
		const { result, rerender } = renderHook(
			({ current }: { current: TracesTableRow[] }) => useSpanDrawer(current),
			{ initialProps: { current: rows }, wrapper: AllTheProviders },
		);

		act(() => result.current.tableProps.onRowClick?.(rows[1]));
		expect(result.current.drawerProps.spanId).toBe('span-b');
		expect(result.current.drawerProps.navigation).not.toBeNull();

		rerender({ current: [rows[0]] });
		expect(result.current.drawerProps.traceId).toBe('trace-1');
		expect(result.current.drawerProps.spanId).toBe('span-b');
		expect(result.current.drawerProps.navigation).toBeNull();
	});

	it('steps past a span stored twice', () => {
		const withDuplicate: TracesTableRow[] = [
			{ id: 'row-a', trace_id: 'trace-1', span_id: 'span-a' },
			{ id: 'row-a-copy', trace_id: 'trace-1', span_id: 'span-a' },
			{ id: 'row-b', trace_id: 'trace-1', span_id: 'span-b' },
		];
		const { result } = renderHook(() => useSpanDrawer(withDuplicate), {
			wrapper: AllTheProviders,
		});

		act(() => result.current.tableProps.onRowClick?.(withDuplicate[0]));
		act(() => result.current.drawerProps.navigation?.goToNext());
		expect(result.current.tableProps.activeRowIndex).toBe(1);

		act(() => result.current.drawerProps.navigation?.goToNext());
		expect(result.current.drawerProps.spanId).toBe('span-b');
	});

	it('closes on a new query', () => {
		const { result, rerender } = renderHook(() => useSpanDrawer(rows), {
			wrapper: AllTheProviders,
		});

		act(() => result.current.tableProps.onRowClick?.(rows[1]));
		expect(result.current.drawerProps.spanId).toBe('span-b');

		mockQueryId = 'query-2';
		rerender();
		expect(result.current.drawerProps.spanId).toBeNull();
	});

	describe('summary prefetch', () => {
		const threeTraces: TracesTableRow[] = [
			{ id: 'row-1', trace_id: 'trace-1', span_id: 'span-1' },
			{ id: 'row-2', trace_id: 'trace-2', span_id: 'span-2' },
			{ id: 'row-3', trace_id: 'trace-3', span_id: 'span-3' },
		];
		let requestedTraceIds: string[];

		beforeEach(() => {
			requestedTraceIds = [];
			server.use(
				rest.get('*/api/v1/traces/:traceID/summary', (req, res, ctx) => {
					requestedTraceIds.push(String(req.params.traceID));
					return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
				}),
			);
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('fetches the summaries of the traces ↑/↓ lead to', async () => {
			const { result } = renderHook(() => useSpanDrawer(threeTraces), {
				wrapper: AllTheProviders,
			});

			act(() => result.current.tableProps.onRowClick?.(threeTraces[1]));

			await waitFor(() =>
				expect([...requestedTraceIds].sort()).toStrictEqual(['trace-1', 'trace-3']),
			);
		});

		it('fetches the summary of the row the pointer rests on', async () => {
			jest.useFakeTimers();
			const { result } = renderHook(() => useSpanDrawer(threeTraces), {
				wrapper: AllTheProviders,
			});

			act(() => {
				result.current.tableProps.onRowHover?.(threeTraces[0]);
				jest.advanceTimersByTime(50);
				result.current.tableProps.onRowHover?.(threeTraces[2]);
				jest.advanceTimersByTime(200);
			});
			jest.useRealTimers();

			await waitFor(() => expect(requestedTraceIds).toStrictEqual(['trace-3']));
		});
	});
});
