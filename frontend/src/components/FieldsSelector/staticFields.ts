import { TelemetryFieldKey } from 'types/api/v5/queryRange';

/** Named field pools the selector can offer instead of the key suggestions endpoint. */
export type StaticFieldsSource = 'ai_o11y';

/**
 * Display-only columns: the trace list returns them, but the keys endpoint cannot
 * report them because ordering or filtering on one is an error. The orderable
 * aggregates are absent here on purpose — they come from the endpoint.
 */
export const AI_O11Y_DISPLAY_ONLY_FIELDS: TelemetryFieldKey[] = [
	{ name: 'service.name' },
	{ name: 'root_span_name' },
	{ name: 'trace_duration_nano' },
	{ name: 'span_count' },
	{ name: 'trace_id' },
	{ name: 'start_time' },
	{ name: 'end_time' },
	{ name: 'error_count' },
	{ name: 'input' },
	{ name: 'output' },
] as TelemetryFieldKey[];

/** Shared so the selector and the trace view's column hook reuse one fetch. */
export const AI_O11Y_AGGREGATE_KEYS_QUERY_KEY = ['traceViewAggregateKeys'];

export const mergeAIObservabilityStaticFields = (
	aggregates: TelemetryFieldKey[],
): TelemetryFieldKey[] => {
	const displayOnlyNames = new Set(
		AI_O11Y_DISPLAY_ONLY_FIELDS.map(({ name }) => name),
	);

	return [
		...AI_O11Y_DISPLAY_ONLY_FIELDS,
		...aggregates.filter(({ name }) => !displayOnlyNames.has(name)),
	];
};
