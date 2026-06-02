import { TelemetryFieldKey } from 'types/api/v5/queryRange';

export type TraceAggregationType =
	| 'span_count'
	| 'execution_time_percentage'
	| 'duration';

export interface TraceAggregationRequest {
	field: TelemetryFieldKey;
	aggregation: TraceAggregationType;
}

export interface TraceAggregationResponse extends TraceAggregationRequest {
	value: Record<string, number>;
}
