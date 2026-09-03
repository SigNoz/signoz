/** Nanosecond durations the per-trace query computes; the shared table only knows span durations. */
export const DURATION_FIELD_NAMES = new Set([
	'trace_duration_nano',
	'max_llm_duration_nano',
]);

/** Datetimes that stay movable and hideable, unlike the shared table's pinned timestamp. */
export const DATETIME_FIELD_NAMES = new Set([
	'start_time',
	'end_time',
	'last_activity_time',
]);
