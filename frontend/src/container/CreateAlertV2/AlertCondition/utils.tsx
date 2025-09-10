import { BaseOptionType, SelectProps } from 'antd/es/select';
import { getInvolvedQueriesInTraceOperator } from 'components/QueryBuilderV2/QueryV2/TraceOperator/utils/utils';
import { getSelectedQueryOptions } from 'container/FormAlertRules/utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

export function getQueryNames(currentQuery: Query): BaseOptionType[] {
	const involvedQueriesInTraceOperator = getInvolvedQueriesInTraceOperator(
		currentQuery.builder.queryTraceOperator,
	);
	const queryConfig: Record<EQueryType, () => SelectProps['options']> = {
		[EQueryType.QUERY_BUILDER]: () => [
			...(getSelectedQueryOptions(currentQuery.builder.queryData)?.filter(
				(option) =>
					!involvedQueriesInTraceOperator.includes(option.value as string),
			) || []),
			...(getSelectedQueryOptions(currentQuery.builder.queryFormulas) || []),
			...(getSelectedQueryOptions(currentQuery.builder.queryTraceOperator) || []),
		],
		[EQueryType.PROM]: () => getSelectedQueryOptions(currentQuery.promql),
		[EQueryType.CLICKHOUSE]: () =>
			getSelectedQueryOptions(currentQuery.clickhouse_sql),
	};

	return queryConfig[currentQuery.queryType]?.() || [];
}
