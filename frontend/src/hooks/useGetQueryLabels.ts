import { getQueryLabelWithAggregation } from 'components/QueryBuilderV2/utils';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

export const useGetQueryLabels = (
	currentQuery: Query,
): { label: string; value: string }[] =>
	useMemo(() => {
		if (currentQuery?.queryType === EQueryType.QUERY_BUILDER) {
			const queryLabels = getQueryLabelWithAggregation(
				currentQuery?.builder?.queryData || [],
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
	}, [currentQuery]);
