import { renderHook } from '@testing-library/react';

import {
	useStableTotalCount,
	UseStableTotalCountParams,
} from '../useStableTotalCount';

function renderStableTotalCount(initial: UseStableTotalCountParams): {
	result: { current: number };
	rerender: (next: UseStableTotalCountParams) => void;
} {
	const { result, rerender } = renderHook(
		(params: UseStableTotalCountParams) => useStableTotalCount(params),
		{ initialProps: initial },
	);

	return { result, rerender };
}

describe('useStableTotalCount', () => {
	it('reports the total once the load settles', () => {
		const { result } = renderStableTotalCount({
			total: 100,
			isLoading: false,
			resetKey: 'pods',
		});

		expect(result.current).toBe(100);
	});

	it('keeps the last count while the same list refetches', () => {
		const { result, rerender } = renderStableTotalCount({
			total: 100,
			isLoading: false,
			resetKey: 'pods',
		});

		rerender({ total: 0, isLoading: true, resetKey: 'pods' });

		expect(result.current).toBe(100);
	});

	it('forgets the count when the list changes', () => {
		const { result, rerender } = renderStableTotalCount({
			total: 100,
			isLoading: false,
			resetKey: 'pods',
		});

		rerender({ total: 0, isLoading: true, resetKey: 'nodes' });

		expect(result.current).toBe(0);
	});

	it('reports the new list total once it arrives', () => {
		const { result, rerender } = renderStableTotalCount({
			total: 100,
			isLoading: false,
			resetKey: 'pods',
		});

		rerender({ total: 0, isLoading: true, resetKey: 'nodes' });
		rerender({ total: 25, isLoading: false, resetKey: 'nodes' });

		expect(result.current).toBe(25);
	});

	it('reports zero for a list that is genuinely empty', () => {
		const { result } = renderStableTotalCount({
			total: 0,
			isLoading: false,
			resetKey: 'pods',
		});

		expect(result.current).toBe(0);
	});

	it('holds nothing back when no reset key is given', () => {
		const { result, rerender } = renderStableTotalCount({
			total: 100,
			isLoading: false,
			resetKey: undefined,
		});

		// Without a key there is no context to compare, so the cache behaves as it
		// always did: it survives the refetch.
		rerender({ total: 0, isLoading: true, resetKey: undefined });

		expect(result.current).toBe(100);
	});
});
