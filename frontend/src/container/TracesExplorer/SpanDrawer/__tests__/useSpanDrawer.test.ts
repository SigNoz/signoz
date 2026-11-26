import { act, renderHook } from 'tests/test-utils';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';

import { useSpanDrawer } from '../useSpanDrawer';

let mockQueryId = 'query-1';
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({ stagedQuery: { id: mockQueryId } }),
}));

const rows: TracesTableRow[] = [{ id: 'span-a' }, { id: 'span-b' }];

describe('useSpanDrawer', () => {
	beforeEach(() => {
		mockQueryId = 'query-1';
	});

	it('does not reopen a span that a refetch dropped and a later one brings back', () => {
		const { result, rerender } = renderHook(
			({ current }: { current: TracesTableRow[] }) => useSpanDrawer(current),
			{ initialProps: { current: rows } },
		);

		act(() => result.current.tableProps.onRowClick?.(rows[1]));
		expect(result.current.drawerProps?.row).toBe(rows[1]);

		rerender({ current: [rows[0]] });
		expect(result.current.drawerProps?.row).toBeNull();

		rerender({ current: rows });
		expect(result.current.drawerProps?.row).toBeNull();
	});

	it('closes on a new query while the old rows are still shown', () => {
		const { result, rerender } = renderHook(() => useSpanDrawer(rows));

		act(() => result.current.tableProps.onRowClick?.(rows[1]));
		expect(result.current.drawerProps?.row).toBe(rows[1]);

		mockQueryId = 'query-2';
		rerender();
		expect(result.current.drawerProps?.row).toBeNull();
	});
});
