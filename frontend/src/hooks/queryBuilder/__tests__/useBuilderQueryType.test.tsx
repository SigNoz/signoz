import { renderHook } from '@testing-library/react';
import { EQueryType } from 'types/common/dashboard';

import { useBuilderQueryType } from '../useBuilderQueryType';
import { useQueryBuilder } from '../useQueryBuilder';

jest.mock('../useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

const withQueryType = (queryType: EQueryType): void => {
	(useQueryBuilder as jest.Mock).mockReturnValue({
		currentQuery: { queryType },
	});
};

describe('useBuilderQueryType', () => {
	it('is AI for every query while AI is the query type', () => {
		withQueryType(EQueryType.AI_QUERY_BUILDER);

		expect(renderHook(() => useBuilderQueryType({})).result.current).toBe(
			'builder_ai_query',
		);
	});

	it("follows the query's own tag otherwise", () => {
		withQueryType(EQueryType.QUERY_BUILDER);

		expect(
			renderHook(() =>
				useBuilderQueryType({ builderQueryType: 'builder_ai_query' }),
			).result.current,
		).toBe('builder_ai_query');
		expect(
			renderHook(() => useBuilderQueryType({})).result.current,
		).toBeUndefined();
	});
});
