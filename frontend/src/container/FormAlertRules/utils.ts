import { SelectProps } from 'antd';
import {
	IBuilderFormula,
	IBuilderQuery,
	IBuilderTraceOperator,
	IClickHouseQuery,
	IPromQLQuery,
} from 'types/api/queryBuilder/queryBuilderData';

export const getSelectedQueryOptions = (
	queries:
		| Array<
				| IBuilderQuery
				| IBuilderTraceOperator
				| IBuilderFormula
				| IClickHouseQuery
				| IPromQLQuery
		  >
		| undefined
		| null,
): SelectProps['options'] => {
	if (!queries) {
		return [];
	}
	return queries
		.filter((query) => !query.disabled)
		.map((query) => ({
			label: 'queryName' in query ? query.queryName : query.name,
			value: 'queryName' in query ? query.queryName : query.name,
		}));
};
