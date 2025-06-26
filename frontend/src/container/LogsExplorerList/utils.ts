import { IField } from 'types/api/logs/fields';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

export const convertKeysToColumnFields = (
	keys: BaseAutocompleteData[],
): IField[] =>
	keys.map((item) => ({
		dataType: item.dataType as string,
		name: item.key,
		type: item.type as string,
	}));

export const isTraceToLogsQuery = (queryData: IBuilderQuery): boolean => {
	// Check if this is a trace-to-logs query by looking for trace_id filter
	if (!queryData?.filters?.items) return false;

	const traceIdFilter = queryData.filters.items.find(
		(item: TagFilterItem) => item.key?.key === 'trace_id',
	);

	return !!traceIdFilter;
};
