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
/**
 * Determines if a query represents a trace-to-logs navigation
 * by checking for the presence of a trace_id filter.
 */
export const isTraceToLogsQuery = (queryData: IBuilderQuery): boolean => {
	// Check if this is a trace-to-logs query by looking for trace_id filter
	if (!queryData?.filters?.items) return false;

	const traceIdFilter = queryData.filters.items.find(
		(item: TagFilterItem) => item.key?.key === 'trace_id',
	);

	return !!traceIdFilter;
};

type EmptyLogsListConfig = {
	title: string;
	subTitle: string;
	description: string[];
	documentationLinks: {
		text: string;
		url: string;
		description: string;
	}[];
	showClearFiltersButton: boolean;
	onClearFilters: () => void;
};

export const getEmptyLogsListConfig = (
	handleClearFilters: () => void,
): EmptyLogsListConfig => ({
	title: 'No logs found for this trace.',
	subTitle: 'This could be because :',
	description: [
		'Logs are not linked to Traces.',
		'Logs are not being sent to SigNoz.',
		'No logs are associated with this particular trace/span.',
	],
	documentationLinks: [
		{
			text: 'How to link logs and traces',
			url: 'https://signoz.io/docs/userguide/logs/#correlating-logs-with-traces',
			description:
				'Learn how to correlate your logs with traces for better observability',
		},
		{
			text: 'Sending logs to SigNoz',
			url: 'https://signoz.io/docs/userguide/logs/',
			description: 'Set up log collection and forwarding to SigNoz',
		},
		{
			text: 'Trace and log correlation best practices',
			url: 'https://signoz.io/docs/instrumentation/overview/',
			description: 'Best practices for instrumenting your applications',
		},
	],
	showClearFiltersButton: true,
	onClearFilters: handleClearFilters,
});
