import { act, renderHook } from '@testing-library/react';
import remove from 'api/browser/localstorage/remove';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';

import { useSpanDrawer } from '../useSpanDrawer';

const rows: TracesTableRow[] = [{ id: 'span-a' }, { id: 'span-b' }];

describe('useSpanDrawer', () => {
	beforeEach(() => {
		set(LOCALSTORAGE.TRACES_SPAN_DRAWER_ENABLED, 'true');
	});

	afterEach(() => {
		remove(LOCALSTORAGE.TRACES_SPAN_DRAWER_ENABLED);
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
});
