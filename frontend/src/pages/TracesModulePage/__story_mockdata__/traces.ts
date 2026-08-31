/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { explorerView } from 'mocks-server/__mockdata__/explorer_views';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import type { IAttributeValuesResponse } from 'types/api/queryBuilder/getAttributesValues';
import type { Filter } from 'types/api/quickFilters/getCustomFilters';
import type { FunnelData } from 'types/api/traceFunnels';
import type { RawRow } from 'types/api/v5/queryRange';

export const TRACES_TABS = ['explorer', 'funnels', 'views'] as const;

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

export const traceSpanRows = ({
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

/** The Trace view lists root spans, with the span count of the whole trace. */
export const traceRootSpanRows = (options: SpanRowsOptions): RawRow[] =>
	traceSpanRows(options).map((row, index) => ({
		...row,
		data: {
			...row.data,
			span_count: 6 + ((index * 7) % 34),
		},
	}));

const QUICK_FILTERS: Filter[] = [
	{ key: 'service.name', dataType: 'string', type: 'resource' },
	{ key: 'name', dataType: 'string', type: 'tag' },
	{ key: 'has_error', dataType: 'bool', type: 'tag' },
	{ key: 'http_method', dataType: 'string', type: 'tag' },
	{ key: 'response_status_code', dataType: 'string', type: 'tag' },
	{ key: 'deployment.environment', dataType: 'string', type: 'resource' },
	{ key: 'kind_string', dataType: 'string', type: 'tag' },
	{ key: 'rpc.method', dataType: 'string', type: 'tag' },
];

export const traceQuickFiltersResponse = (
	count: number,
): { status: string; data: { filters: Filter[]; signal: string } } => ({
	status: 'success',
	data: { filters: QUICK_FILTERS.slice(0, count), signal: 'traces' },
});

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

export const savedTraceViewsResponse = (
	count: number,
): { status: string; data: unknown[] } => ({
	status: 'success',
	data: Array.from(
		{ length: Math.min(count, VIEW_NAMES.length) },
		(_, index) => ({
			...explorerView.data[0],
			id: `storybook-traces-view-${index + 1}`,
			name: VIEW_NAMES[index],
			sourcePage: 'traces',
			tags: ['traces'],
		}),
	),
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
