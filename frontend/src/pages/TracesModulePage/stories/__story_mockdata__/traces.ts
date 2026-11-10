/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal as TracesSignal,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
	Querybuildertypesv5RequestTypeDTO,
	QuickfiltertypesSourceDTO,
	SavedviewtypesPanelTypeDTO,
	SavedviewtypesSchemaVersionDTO,
	SavedviewtypesSourceDTO,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	GetQuickFilters200,
	GetTraceSummary200,
	ListSavedViews200,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import type { IAttributeValuesResponse } from 'types/api/queryBuilder/getAttributesValues';
import type { FunnelData } from 'types/api/traceFunnels';
import type { RawRow } from 'types/api/v5/queryRange';

import { fieldKeysResponse } from '@/storybook/msw/__story_mockdata__/fields';
import { quickFiltersResponse } from '@/storybook/msw/__story_mockdata__/quickFilters';

export const TRACES_TABS = ['explorer', 'funnels'] as const;

export type TracesTab = (typeof TRACES_TABS)[number];

export const TRACES_EXPLORER_VIEWS = [
	ExplorerViews.LIST,
	ExplorerViews.TRACE,
	ExplorerViews.TIMESERIES,
	ExplorerViews.TABLE,
] as const;

interface SpanShape {
	service: string;
	operation: string;
	method: string;
	durationMs: number;
	failing: boolean;
}

/** Ordered so any slice keeps a spread of services, methods and durations. */
const SPANS: SpanShape[] = [
	{
		service: 'frontend',
		operation: 'HTTP GET /checkout',
		method: 'GET',
		durationMs: 1840,
		failing: false,
	},
	{
		service: 'checkout',
		operation: 'POST /api/orders',
		method: 'POST',
		durationMs: 1215,
		failing: true,
	},
	{
		service: 'payments',
		operation: 'charge.authorize',
		method: 'POST',
		durationMs: 964,
		failing: false,
	},
	{
		service: 'cart',
		operation: 'HTTP GET /cart/items',
		method: 'GET',
		durationMs: 612,
		failing: false,
	},
	{
		service: 'inventory',
		operation: 'reserve.stock',
		method: 'POST',
		durationMs: 488,
		failing: true,
	},
	{
		service: 'shipping',
		operation: 'HTTP GET /rates',
		method: 'GET',
		durationMs: 331,
		failing: false,
	},
	{
		service: 'notifications',
		operation: 'email.send',
		method: 'POST',
		durationMs: 214,
		failing: false,
	},
	{
		service: 'auth',
		operation: 'HTTP POST /token',
		method: 'POST',
		durationMs: 96,
		failing: false,
	},
];

const TRACE_SERVICE_NAMES = SPANS.map(({ service }) => service);

const hex = (prefix: string, index: number): string =>
	`${prefix}${index.toString(16).padStart(4, '0')}`;

const traceIdAt = (index: number): string => hex('4f2a6cbb9d3e17', index);

const spanIdAt = (index: number): string => hex('a71c3e', index);

interface SpanRowsOptions {
	/** Rows the endpoint has, which pagination walks through. */
	count: number;
	offset: number;
	limit: number;
	/** Request window in epoch milliseconds. */
	start: number;
	end: number;
	errors: boolean;
}

const rowWindow = ({
	count,
	offset,
	limit,
}: Pick<SpanRowsOptions, 'count' | 'offset' | 'limit'>): number[] => {
	const first = Math.min(offset, count);
	const last = Math.min(offset + limit, count);

	return Array.from({ length: Math.max(last - first, 0) }, (_, i) => first + i);
};

/** Newest first, which is the order the list asks for. */
const timestampAt = (index: number, start: number, end: number): string => {
	const step = (end - start) / 64;

	return new Date(end - index * step).toISOString();
};

const flatSpanRows = ({
	count,
	offset,
	limit,
	start,
	end,
	errors,
}: SpanRowsOptions): RawRow[] =>
	rowWindow({ count, offset, limit }).map((index) => {
		const span = SPANS[index % SPANS.length];
		const hasError = errors && span.failing;

		return {
			timestamp: timestampAt(index, start, end),
			data: {
				'service.name': span.service,
				name: span.operation,
				duration_nano: span.durationMs * 1_000_000,
				http_method: span.method,
				response_status_code: hasError ? '503' : '200',
				status_code_string: hasError ? 'Error' : 'Ok',
				has_error: hasError,
				trace_id: traceIdAt(index),
				span_id: spanIdAt(index),
			},
		};
	});

/** The list API's event shape: `attributes`, where the trace API says `attributeMap`. */
const exceptionEvent = (
	timestamp: string,
): {
	name: string;
	timeUnixNano: number;
	attributes: Record<string, string>;
} => ({
	name: 'exception',
	timeUnixNano: new Date(timestamp).getTime() * 1_000_000,
	attributes: {
		'exception.type': 'UpstreamTimeoutError',
		'exception.message': 'upstream did not answer within 1s',
	},
});

/** The List view returns every span field, with resource and attribute fields nested in maps. */
export const traceSpanRows = (options: SpanRowsOptions): RawRow[] =>
	flatSpanRows(options).map(
		({ timestamp, data: { 'service.name': serviceName, ...data } }) => ({
			timestamp,
			data: {
				...data,
				attributes: {},
				resource: { 'service.name': serviceName },
				events: data.has_error ? [exceptionEvent(timestamp)] : [],
				links: data.has_error
					? [{ traceId: traceIdAt(0), spanId: spanIdAt(0) }]
					: [],
			},
		}),
	);

/** The Trace view lists root spans, with the span count of the whole trace. */
export const traceRootSpanRows = (options: SpanRowsOptions): RawRow[] =>
	flatSpanRows(options).map((row, index) => ({
		...row,
		data: {
			...row.data,
			span_count: 6 + ((index * 7) % 34),
		},
	}));

export const TRACE_SUMMARY_STATES = ['found', 'not found', 'loading'] as const;

export type TraceSummaryState = (typeof TRACE_SUMMARY_STATES)[number];

const TRACE_PADDING_MS = 250;

/** Null for a trace the list never showed. */
export const traceSummaryResponse = ({
	traceId,
	count,
	start,
	end,
}: Pick<SpanRowsOptions, 'count' | 'start' | 'end'> & {
	traceId: string;
}): GetTraceSummary200 | null => {
	const index = rowWindow({ count, offset: 0, limit: count }).find(
		(i) => traceIdAt(i) === traceId,
	);
	if (index === undefined) {
		return null;
	}
	const spanStart = new Date(timestampAt(index, start, end)).getTime();
	const span = SPANS[index % SPANS.length];

	return {
		status: 'success',
		data: {
			startTimestampMillis: spanStart - TRACE_PADDING_MS,
			endTimestampMillis: spanStart + span.durationMs + TRACE_PADDING_MS,
			rootServiceName: SPANS[0].service,
			rootServiceEntryPoint: SPANS[0].operation,
			rootSpanStatusCode: '200',
			totalSpansCount: SPANS.length,
			totalErrorSpansCount: SPANS.filter(({ failing }) => failing).length,
			hasMissingSpans: false,
		},
	};
};

export const SPAN_LOGS_STATES = [
	'span',
	'trace only',
	'none',
	'loading',
	'error',
] as const;

export type SpanLogsState = (typeof SPAN_LOGS_STATES)[number];

/**
 * Which of the drawer's log queries is asking: the span's own logs, the context
 * either side of them, or the whole trace when the span has none.
 */
export type SpanLogScope = 'span' | 'before' | 'after' | 'trace';

export const spanLogScopeOf = (expression: string): SpanLogScope => {
	if (expression.includes('span_id')) {
		return 'span';
	}
	if (expression.includes('id <')) {
		return 'before';
	}
	return expression.includes('id >') ? 'after' : 'trace';
};

const SPAN_LOG_BODIES = [
	'request received',
	'cache miss, querying orders',
	'payment provider timed out',
	'response sent',
];

const CONTEXT_OFFSET_MS: Record<SpanLogScope, number> = {
	before: -60_000,
	span: 0,
	after: 60_000,
	trace: 0,
};

/**
 * Log rows for one of the drawer's queries, placed in the middle of the window
 * it asked for. The span-log queries send that window in microseconds.
 */
export const spanLogRows = ({
	scope,
	expression,
	startMicros,
	endMicros,
}: {
	scope: SpanLogScope;
	expression: string;
	startMicros: number;
	endMicros: number;
}): RawRow[] => {
	const traceId = expression.match(/trace_id = '([^']+)'/)?.[1] ?? '';
	const spanId = expression.match(/span_id = '([^']+)'/)?.[1] ?? '';
	const middle = (startMicros + endMicros) / 2 / 1e3;

	return SPAN_LOG_BODIES.map((body, index) => ({
		timestamp: new Date(
			middle + CONTEXT_OFFSET_MS[scope] + index * 100,
		).toISOString(),
		data: {
			body,
			id: `storybook-${scope}-log-${index + 1}`,
			trace_id: traceId,
			span_id: scope === 'span' ? spanId : '',
			severity_text: index === 2 ? 'ERROR' : 'INFO',
			severity_number: index === 2 ? 17 : 9,
			attributes_string: {},
			resources_string: { 'service.name': SPANS[0].service },
			scope_name: '',
		},
	}));
};

const { resource, attribute } = TelemetrytypesFieldContextDTO;
const { string: stringType, bool } = TelemetrytypesFieldDataTypeDTO;

const QUICK_FILTERS: TelemetrytypesTelemetryFieldKeyDTO[] = [
	{ name: 'service.name', fieldDataType: stringType, fieldContext: resource },
	{ name: 'name', fieldDataType: stringType, fieldContext: attribute },
	{ name: 'has_error', fieldDataType: bool, fieldContext: attribute },
	{ name: 'http_method', fieldDataType: stringType, fieldContext: attribute },
	{
		name: 'response_status_code',
		fieldDataType: stringType,
		fieldContext: attribute,
	},
	{
		name: 'deployment.environment',
		fieldDataType: stringType,
		fieldContext: resource,
	},
	{ name: 'kind_string', fieldDataType: stringType, fieldContext: attribute },
	{ name: 'rpc.method', fieldDataType: stringType, fieldContext: attribute },
];

export const traceQuickFiltersResponse = (count: number): GetQuickFilters200 =>
	quickFiltersResponse(
		QuickfiltertypesSourceDTO.traces,
		QUICK_FILTERS.slice(0, count),
	);

const FIELD_KEYS = [
	'service.name',
	'name',
	'duration_nano',
	'http_method',
	'http_url',
	'response_status_code',
	'status_code_string',
	'kind_string',
	'has_error',
	'timestamp',
	'deployment.environment',
	'rpc.method',
	'db.system',
];

/**
 * `/fields/keys` is asked once per column the options menu resolves and once
 * per keystroke in the query builder, both with a `searchText`, so the answer
 * filters the catalogue rather than always returning it whole.
 */
export const traceFieldKeys = (searchText: string | null): string[] => {
	const search = (searchText ?? '').toLowerCase();

	return search
		? FIELD_KEYS.filter((key) => key.toLowerCase().includes(search))
		: FIELD_KEYS;
};

const RESOURCE_KEYS = ['service.name', 'deployment.environment'];

/**
 * Resource and span keys come back from one call, each under its own context,
 * so the query builder groups the suggestions the way it does against a real
 * backend.
 */
export const traceFieldKeysResponse = (
	searchText: string | null,
): ReturnType<typeof fieldKeysResponse> => {
	const names = traceFieldKeys(searchText);
	const context = (name: string): TelemetrytypesFieldContextDTO =>
		RESOURCE_KEYS.includes(name)
			? TelemetrytypesFieldContextDTO.resource
			: TelemetrytypesFieldContextDTO.span;

	const byContext = [
		TelemetrytypesFieldContextDTO.resource,
		TelemetrytypesFieldContextDTO.span,
	].map((fieldContext) =>
		fieldKeysResponse(
			names.filter((name) => context(name) === fieldContext),
			{ signal: TelemetrytypesSignalDTO.traces, fieldContext },
		),
	);

	return {
		status: 'success',
		data: {
			complete: true,
			keys: Object.assign({}, ...byContext.map(({ data }) => data?.keys)),
		},
	};
};

const FIELD_VALUES: Record<string, string[]> = {
	'service.name': TRACE_SERVICE_NAMES,
	name: SPANS.map(({ operation }) => operation),
	http_method: ['GET', 'POST', 'PUT', 'DELETE'],
	response_status_code: ['200', '201', '400', '404', '500', '503'],
	status_code_string: ['Ok', 'Error', 'Unset'],
	kind_string: ['Server', 'Client', 'Internal', 'Producer', 'Consumer'],
	has_error: ['true', 'false'],
	'deployment.environment': ['production', 'staging'],
	'rpc.method': ['ListOrders', 'GetOrder', 'CreateOrder'],
	'db.system': ['postgresql', 'redis', 'mysql'],
};

export const traceFieldValues = (name: string | null): string[] =>
	FIELD_VALUES[name ?? ''] ?? [];

/**
 * The quick-filter checkboxes read values off the v3 autocomplete endpoint
 * rather than `/fields/values`, so both answer from the same catalogue.
 */
export const traceAttributeValuesResponse = (
	attributeKey: string | null,
): { status: string; data: IAttributeValuesResponse } => ({
	status: 'success',
	data: {
		stringAttributeValues: traceFieldValues(attributeKey),
		numberAttributeValues: null,
		boolAttributeValues: null,
	},
});

const VIEW_NAMES = [
	'Failing checkouts',
	'Slow payment spans',
	'Cart p99 over 1s',
	'gRPC errors by env',
	'Redis calls over 200ms',
	'Auth token latency',
	'Shipping rate lookups',
	'Notification retries',
];

export const savedTraceViewsResponse = (count: number): ListSavedViews200 => ({
	status: 'success',
	data: VIEW_NAMES.slice(0, count).map((displayName, index) => ({
		id: `storybook-traces-view-${index + 1}`,
		name: `storybook-traces-view-${index + 1}`,
		source: SavedviewtypesSourceDTO.traces,
		schemaVersion: SavedviewtypesSchemaVersionDTO.v2,
		createdAt: '2026-08-20T09:00:00Z',
		createdBy: 'ada@signoz.io',
		updatedAt: '2026-08-20T09:00:00Z',
		updatedBy: 'ada@signoz.io',
		spec: {
			displayName,
			panelType: SavedviewtypesPanelTypeDTO.list,
			requestType: Querybuildertypesv5RequestTypeDTO.raw,
			queries: [
				{
					type: Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
					spec: { name: 'A', signal: TracesSignal.traces },
				},
			],
		},
	})),
});

const FUNNEL_NAMES = [
	'Checkout conversion',
	'Signup to first order',
	'Cart abandonment',
	'Payment retry path',
	'Search to product view',
	'Refund request',
];

/** `updated_at` descends because that is the order the funnels list sorts on. */
export const traceFunnelsResponse = (
	count: number,
): { status: string; data: FunnelData[] } => ({
	status: 'success',
	data: Array.from(
		{ length: Math.min(count, FUNNEL_NAMES.length) },
		(_, index) => ({
			funnel_id: `storybook-funnel-${index + 1}`,
			funnel_name: FUNNEL_NAMES[index],
			created_at: Date.UTC(2026, 6, 4 + index),
			updated_at: Date.UTC(2026, 7, 20 - index),
			user_email: 'storybook@signoz.io',
			description: '',
			steps: [],
		}),
	),
});

const DASHBOARD_NAMES = [
	'Traces overview',
	'Checkout funnel health',
	'Service latency',
	'Error budget',
];

export const exportDashboardsResponse = (): Record<string, unknown> => ({
	status: 'success',
	data: {
		dashboards: DASHBOARD_NAMES.map((name, index) => ({
			id: `storybook-dashboard-${index + 1}`,
			name,
			spec: { display: { name } },
			tags: ['traces'],
		})),
	},
});
