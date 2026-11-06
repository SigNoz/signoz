import { useMemo } from 'react';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getActiveBuilder } from 'lib/query/builderSlot';
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { QuickFilterCheckboxUseFieldApis } from 'components/QuickFilters/types';

interface UseExistingQueryParams {
	useFieldApis: QuickFilterCheckboxUseFieldApis;
	activeQueryIndex: number;
}

interface UseExistingQueryResult {
	existingQuery: string | undefined;
	hasExistingQuery: boolean;
}

export function useExistingQuery({
	useFieldApis,
	activeQueryIndex,
}: UseExistingQueryParams): UseExistingQueryResult {
	const { stagedQuery } = useQueryBuilder();
	const stagedQueryData = stagedQuery
		? getActiveBuilder(stagedQuery).queryData
		: undefined;

	const existingQuery = useMemo(() => {
		if (useFieldApis.existingQuery === null) {
			return undefined;
		}

		if (useFieldApis.existingQuery) {
			return useFieldApis.existingQuery;
		}

		const queryData = stagedQueryData?.[activeQueryIndex];

		// Prefer V5 filter.expression
		if (queryData?.filter?.expression) {
			return queryData.filter.expression;
		}

		// Fall back to V3 filters.items
		if (queryData?.filters?.items?.length) {
			return convertFiltersToExpression(queryData.filters).expression;
		}

		return undefined;
	}, [useFieldApis.existingQuery, stagedQueryData, activeQueryIndex]);

	// Check if ANY filters exist in query (V3 items or V5 expression)
	// This is separate from existingQuery because existingQuery can be explicitly
	// disabled (null) while filters still exist in the query for UI purposes
	const hasExistingQuery = useMemo(() => {
		const queryData = stagedQueryData?.[activeQueryIndex];
		const hasV3Items = (queryData?.filters?.items?.length ?? 0) > 0;
		const hasV5Expression = !!queryData?.filter?.expression;
		return hasV3Items || hasV5Expression || !!existingQuery;
	}, [stagedQueryData, activeQueryIndex, existingQuery]);

	return { existingQuery, hasExistingQuery };
}
