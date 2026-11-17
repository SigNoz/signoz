import { initialQueriesMap } from 'constants/queryBuilder';
import { AllTheProviders, renderHook } from 'tests/test-utils';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import type { BuilderQueryType } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';

import { useBuilderQueryType } from '../useBuilderQueryType';

function renderBuilderQueryType(
	queryType: EQueryType,
	query: Pick<IBuilderQuery, 'builderQueryType'>,
): BuilderQueryType | undefined {
	return renderHook(() => useBuilderQueryType(query), {
		wrapper: ({ children }) => (
			<AllTheProviders
				queryBuilderOverrides={{
					currentQuery: { ...initialQueriesMap.traces, queryType },
				}}
			>
				{children}
			</AllTheProviders>
		),
	}).result.current;
}

describe('useBuilderQueryType', () => {
	it('is AI for every query while AI is the query type', () => {
		expect(renderBuilderQueryType(EQueryType.AI_QUERY_BUILDER, {})).toBe(
			'builder_ai_query',
		);
	});

	it("follows the query's own tag otherwise", () => {
		expect(
			renderBuilderQueryType(EQueryType.QUERY_BUILDER, {
				builderQueryType: 'builder_ai_query',
			}),
		).toBe('builder_ai_query');
		expect(renderBuilderQueryType(EQueryType.QUERY_BUILDER, {})).toBeUndefined();
	});
});
