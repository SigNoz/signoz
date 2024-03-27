import { defaultStyles } from '@visx/tooltip';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const tooltipStyles = {
	...defaultStyles,
	minWidth: 60,
	backgroundColor: 'rgba(0,0,0,0.9)',
	color: 'white',
	zIndex: 9999,
};

export const getLabel = (
	label: string,
	query: Query,
	queryName: string,
	isQueryContentMultipleResult = false, // If there are more than one aggregation return by the query, this should be set to true. Default is false.
): string => {
	let finalQuery;
	if (!isQueryContentMultipleResult) {
		finalQuery = query.builder.queryData.find((q) => q.queryName === queryName);
		if (!finalQuery) {
			// If the query is not found in queryData, then check in queryFormulas
			finalQuery = query.builder.queryFormulas.find(
				(q) => q.queryName === queryName,
			);
		}
	}
	if (finalQuery) {
		if (finalQuery.legend !== '') {
			return finalQuery.legend;
		}
		if (label !== undefined) {
			return label;
		}
		return queryName;
	}
	return label;
};
