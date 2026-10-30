/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
export const EXPLORER = {
	logs: '/logs/logs-explorer',
	traces: '/traces-explorer',
	metrics: '/metrics-explorer/explorer',
} as const;

/** A monotonic Sum in the golden dataset. */
export const SUM_METRIC = 'signoz_calls_total';
/** Another golden Sum, for switching between metrics of one type. */
export const OTHER_SUM_METRIC = 'signoz_latency_count';

/** Inside the golden dataset's window. */
export const RELATIVE_TIME = '6h';
