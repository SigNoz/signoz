import { getQueryLabelWithAggregation } from 'components/QueryBuilderV2/utils';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

export const useGetQueryLabels = (
	currentQuery: Query,
): { label: string; value: string }[] => {
	const legendMap = useMemo(() => {
		const newLegendMap: Record<string, string> = {};
		if (currentQuery?.queryType === EQueryType.QUERY_BUILDER) {
			currentQuery?.builder?.queryData?.forEach((q) => {
				if (q.legend) {
					newLegendMap[q.queryName] = q.legend;
				}
			});
			currentQuery?.builder?.queryFormulas?.forEach((f) => {
				if (f.legend) {
					newLegendMap[f.queryName] = f.legend;
				}
			});
		}
		return newLegendMap;
	}, [currentQuery]);

	return useMemo(() => {
		if (currentQuery?.queryType === EQueryType.QUERY_BUILDER) {
			const queryLabels = getQueryLabelWithAggregation(
				currentQuery?.builder?.queryData || [],
				legendMap,
			);
			const formulaLabels = currentQuery?.builder?.queryFormulas?.map(
				(formula) => ({
					label: formula.queryName,
					value: formula.queryName,
				}),
			);
			return [...queryLabels, ...formulaLabels];
		}
		if (currentQuery?.queryType === EQueryType.CLICKHOUSE) {
			return currentQuery?.clickhouse_sql?.map((q) => ({
				label: q.name,
				value: q.name,
			}));
		}
		return currentQuery?.promql?.map((q) => ({ label: q.name, value: q.name }));
	}, [currentQuery, legendMap]);
};
