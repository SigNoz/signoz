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
	haveMultipleResult = false,
): string => {
	let finalQuery;
	if (!haveMultipleResult) {
		finalQuery = query.builder.queryData.find((q) => q.queryName === queryName);
	}
	if (finalQuery) {
		if (finalQuery.legend) {
			return finalQuery.legend;
		}
		return label;
	}
	return label;
};
