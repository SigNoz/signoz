import {
	WaterfallAggregationResponse,
	WaterfallAggregationType,
} from 'types/api/trace/getTraceV3';

export const AGGREGATIONS = {
	EXEC_TIME_PCT: 'execution_time_percentage',
	SPAN_COUNT: 'span_count',
	DURATION: 'duration',
} as const satisfies Record<string, WaterfallAggregationType>;

export function getAggregationMap(
	aggregations: WaterfallAggregationResponse[] | undefined,
	type: WaterfallAggregationType,
	fieldName: string,
): Record<string, number> | undefined {
	return aggregations?.find(
		(a) => a.aggregation === type && a.field.name === fieldName,
	)?.value;
}
