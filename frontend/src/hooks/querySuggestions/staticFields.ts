import { TelemetryFieldKey } from 'types/api/v5/queryRange';

export type StaticFieldsSource = 'ai_o11y';

/** Display-only: ordering or filtering on one is an error, so the keys endpoint omits them. */
export const AI_O11Y_DISPLAY_ONLY_FIELDS: TelemetryFieldKey[] = [
	{ name: 'service.name', fieldContext: 'resource' },
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
export const AI_O11Y_SELECTABLE_FIELDS_QUERY_KEY = [
	'aiObservabilitySelectableFields',
];

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
