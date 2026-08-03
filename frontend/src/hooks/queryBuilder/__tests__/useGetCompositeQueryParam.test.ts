import { renderHook } from '@testing-library/react';
import { initialQueriesMap } from 'constants/queryBuilder';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';

let mockUrlQuery = new URLSearchParams();

jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): URLSearchParams => mockUrlQuery,
}));

describe('useGetCompositeQueryParam', () => {
	it('decodes a legacy compositeQuery param', () => {
		mockUrlQuery = new URLSearchParams({
			compositeQuery: encodeURIComponent(JSON.stringify(initialQueriesMap.logs)),
		});
		const { result } = renderHook(() => useGetCompositeQueryParam());
		expect(result.current?.builder.queryData[0].dataSource).toBe('logs');
	});

	it('returns null when the param is absent', () => {
		mockUrlQuery = new URLSearchParams();
		const { result } = renderHook(() => useGetCompositeQueryParam());
		expect(result.current).toBeNull();
	});
});
