import {
	TraceAggregationResponse,
	TraceAggregationType,
} from 'types/api/trace/getTraceAggregations';

export const AGGREGATIONS = {
	EXEC_TIME_PCT: 'execution_time_percentage',
	SPAN_COUNT: 'span_count',
	DURATION: 'duration',
} as const satisfies Record<string, TraceAggregationType>;

export function getAggregationMap(
	aggregations: TraceAggregationResponse[] | undefined,
	type: TraceAggregationType,
	fieldName: string,
): Record<string, number> | undefined {
	return aggregations?.find(
		(a) => a.aggregation === type && a.field.name === fieldName,
	)?.value;
}
