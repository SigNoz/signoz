import { renderHook } from '@testing-library/react';

import { useCalculatedPageSize } from '../useCalculatedPageSize';

describe('useCalculatedPageSize', () => {
	it('returns containerRef and null calculatedPageSize initially', () => {
		const { result } = renderHook(() => useCalculatedPageSize());
		expect(result.current.containerRef).toBeDefined();
		expect(result.current.containerRef.current).toBeNull();
		expect(result.current.calculatedPageSize).toBeNull();
	});

	it('accepts custom config', () => {
		const { result } = renderHook(() =>
			useCalculatedPageSize({
				rowHeight: 50,
				headerHeight: 40,
				paginationHeight: 50,
				minPageSize: 3,
				maxPageSize: 20,
			}),
		);
		expect(result.current.containerRef).toBeDefined();
	});
});
