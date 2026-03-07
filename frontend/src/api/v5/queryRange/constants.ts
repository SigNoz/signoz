// V5 Query Range Constants

import { ENTITY_VERSION_V5 } from 'constants/app';
import {
	FunctionName,
	RequestType,
	SignalType,
	Step,
} from 'types/api/v5/queryRange';

// ===================== Schema and Version Constants =====================

export const SCHEMA_VERSION_V5 = ENTITY_VERSION_V5;
export const API_VERSION_V5 = 'v5';

// ===================== Default Values =====================

export const DEFAULT_STEP_INTERVAL: Step = '60s';
export const DEFAULT_LIMIT = 100;
export const DEFAULT_OFFSET = 0;

// ===================== Request Type Constants =====================

export const REQUEST_TYPES: Record<string, RequestType> = {
	SCALAR: 'scalar',
	TIME_SERIES: 'time_series',
	RAW: 'raw',
	DISTRIBUTION: 'distribution',
} as const;

// ===================== Signal Type Constants =====================

export const SIGNAL_TYPES: Record<string, SignalType> = {
	TRACES: 'traces',
	LOGS: 'logs',
	METRICS: 'metrics',
} as const;

// ===================== Common Aggregation Expressions =====================

export const TRACE_AGGREGATIONS = {
	COUNT: 'count()',
	COUNT_DISTINCT_TRACE_ID: 'count_distinct(traceID)',
	AVG_DURATION: 'avg(duration_nano)',
	P50_DURATION: 'p50(duration_nano)',
	P95_DURATION: 'p95(duration_nano)',
	P99_DURATION: 'p99(duration_nano)',
	MAX_DURATION: 'max(duration_nano)',
	MIN_DURATION: 'min(duration_nano)',
	SUM_DURATION: 'sum(duration_nano)',
} as const;

export const LOG_AGGREGATIONS = {
	COUNT: 'count()',
	COUNT_DISTINCT_HOST: 'count_distinct(host.name)',
	COUNT_DISTINCT_SERVICE: 'count_distinct(service.name)',
	COUNT_DISTINCT_CONTAINER: 'count_distinct(container.name)',
} as const;

// ===================== Common Filter Expressions =====================

export const COMMON_FILTERS = {
	// Trace filters
	SERVER_SPANS: "kind_string = 'Server'",
	CLIENT_SPANS: "kind_string = 'Client'",
	INTERNAL_SPANS: "kind_string = 'Internal'",
	ERROR_SPANS: 'http.status_code >= 400',
	SUCCESS_SPANS: 'http.status_code < 400',

	// Common service filters
	EXCLUDE_HEALTH_CHECKS: "http.route != '/health' AND http.route != '/ping'",
	HTTP_REQUESTS: "http.method != ''",

	// Log filters
	ERROR_LOGS: "severity_text = 'ERROR'",
	WARN_LOGS: "severity_text = 'WARN'",
	INFO_LOGS: "severity_text = 'INFO'",
	DEBUG_LOGS: "severity_text = 'DEBUG'",
} as const;

// ===================== Common Group By Fields =====================

export const COMMON_GROUP_BY_FIELDS = {
	SERVICE_NAME: {
		name: 'service.name',
		fieldDataType: 'string' as const,
		fieldContext: 'resource' as const,
	},
	HTTP_METHOD: {
		name: 'http.method',
		fieldDataType: 'string' as const,
		fieldContext: 'attribute' as const,
	},
	HTTP_ROUTE: {
		name: 'http.route',
		fieldDataType: 'string' as const,
		fieldContext: 'attribute' as const,
	},
	HTTP_STATUS_CODE: {
		name: 'http.status_code',
		fieldDataType: 'int64' as const,
		fieldContext: 'attribute' as const,
	},
	HOST_NAME: {
		name: 'host.name',
		fieldDataType: 'string' as const,
		fieldContext: 'resource' as const,
	},
	CONTAINER_NAME: {
		name: 'container.name',
		fieldDataType: 'string' as const,
		fieldContext: 'resource' as const,
	},
} as const;

// ===================== Function Names =====================

export const FUNCTION_NAMES: Record<string, FunctionName> = {
	CUT_OFF_MIN: 'cutOffMin',
	CUT_OFF_MAX: 'cutOffMax',
	CLAMP_MIN: 'clampMin',
	CLAMP_MAX: 'clampMax',
	ABSOLUTE: 'absolute',
	RUNNING_DIFF: 'runningDiff',
	LOG2: 'log2',
	LOG10: 'log10',
	CUM_SUM: 'cumulativeSum',
	EWMA3: 'ewma3',
	EWMA5: 'ewma5',
	EWMA7: 'ewma7',
	MEDIAN3: 'median3',
	MEDIAN5: 'median5',
	MEDIAN7: 'median7',
	TIME_SHIFT: 'timeShift',
	ANOMALY: 'anomaly',
} as const;

// ===================== Common Step Intervals =====================

export const STEP_INTERVALS = {
	FIFTEEN_SECONDS: '15s',
	THIRTY_SECONDS: '30s',
	ONE_MINUTE: '60s',
	FIVE_MINUTES: '300s',
	TEN_MINUTES: '600s',
	FIFTEEN_MINUTES: '900s',
	THIRTY_MINUTES: '1800s',
	ONE_HOUR: '3600s',
	TWO_HOURS: '7200s',
	SIX_HOURS: '21600s',
	TWELVE_HOURS: '43200s',
	ONE_DAY: '86400s',
} as const;

// ===================== Time Range Presets =====================

export const TIME_RANGE_PRESETS = {
	LAST_5_MINUTES: 5 * 60 * 1000,
	LAST_15_MINUTES: 15 * 60 * 1000,
	LAST_30_MINUTES: 30 * 60 * 1000,
	LAST_HOUR: 60 * 60 * 1000,
	LAST_3_HOURS: 3 * 60 * 60 * 1000,
	LAST_6_HOURS: 6 * 60 * 60 * 1000,
	LAST_12_HOURS: 12 * 60 * 60 * 1000,
	LAST_24_HOURS: 24 * 60 * 60 * 1000,
	LAST_3_DAYS: 3 * 24 * 60 * 60 * 1000,
	LAST_7_DAYS: 7 * 24 * 60 * 60 * 1000,
} as const;
