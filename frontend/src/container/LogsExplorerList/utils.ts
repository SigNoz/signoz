import { TelemetryFieldKey } from 'api/v5/v5';
import { isEmpty } from 'lodash-es';
import { IField } from 'types/api/logs/fields';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

export const convertKeysToColumnFields = (
	keys: TelemetryFieldKey[],
): IField[] =>
	keys
		.filter((item) => !isEmpty(item.name))
		.map((item) => ({
			dataType: item.fieldDataType ?? '',
			name: item.name,
			type: item.fieldContext ?? '',
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

export type EmptyLogsListConfig = {
	title: string;
	subTitle: string;
	description: string | string[];
	documentationLinks?: Array<{
		text: string;
		url: string;
	}>;
	showClearFiltersButton?: boolean;
	onClearFilters?: () => void;
	clearFiltersButtonText?: string;
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
			text: 'Sending logs to SigNoz',
			url: 'https://signoz.io/docs/logs-management/send-logs-to-signoz/',
		},
		{
			text: 'Correlate traces and logs',
			url:
				'https://signoz.io/docs/traces-management/guides/correlate-traces-and-logs/',
		},
	],
	clearFiltersButtonText: 'Clear filters from Trace to view other logs',
	showClearFiltersButton: true,
	onClearFilters: handleClearFilters,
});
