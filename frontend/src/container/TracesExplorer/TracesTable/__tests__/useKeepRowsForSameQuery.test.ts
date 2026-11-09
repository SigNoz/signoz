import { renderHook } from 'tests/test-utils';

import { useKeepRowsForSameQuery } from '../useKeepRowsForSameQuery';

let mockQueryId = 'query-1';
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({ stagedQuery: { id: mockQueryId } }),
}));

describe('useKeepRowsForSameQuery', () => {
	beforeEach(() => {
		mockQueryId = 'query-1';
	});

	it('keeps the old rows while the same query refetches', () => {
		const { result, rerender } = renderHook(
			({ isPreviousData }: { isPreviousData: boolean }) =>
				useKeepRowsForSameQuery(isPreviousData),
			{ initialProps: { isPreviousData: false } },
		);

		rerender({ isPreviousData: true });
		expect(result.current).toBe(true);
	});

	it('drops the old rows once a new query runs, until its rows land', () => {
		const { result, rerender } = renderHook(
			({ isPreviousData }: { isPreviousData: boolean }) =>
				useKeepRowsForSameQuery(isPreviousData),
			{ initialProps: { isPreviousData: false } },
		);

		mockQueryId = 'query-2';
		rerender({ isPreviousData: true });
		expect(result.current).toBe(false);

		rerender({ isPreviousData: false });
		expect(result.current).toBe(true);

		rerender({ isPreviousData: true });
		expect(result.current).toBe(true);
	});
});
