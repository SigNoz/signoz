import { AggregateData } from 'container/QueryTable/Drilldown/useAggregateDrilldown';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export const getDataLinks = (
	query: Query,
	aggregateData: AggregateData | null,
): {
	id: string;
	label: string;
	url: string;
}[] => {
	const dataLinks: {
		id: string;
		label: string;
		url: string;
	}[] = [];

	// View Trace Details
	const traceId = aggregateData?.filters.find(
		(filter) => filter.filterKey === 'trace_id',
	)?.filterValue;
	if (traceId) {
		dataLinks.push({
			id: uuid(),
			label: 'View Trace Details',
			url: `/trace/${traceId}`,
		});
	}

	return dataLinks;
};
