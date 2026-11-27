/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	type GetFieldsKeys200,
	type GetFieldsValues200,
	type GetQuickFilters200,
	type ListDashboardsForUserV2200,
	QuickfiltertypesSourceDTO,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap } from 'constants/queryBuilder';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import type { OptionsQuery } from 'container/OptionsMenu/types';
import { STORAGE_VERSION } from 'lib/recentQueries/constants';
import type { RecentQueriesStoreShape } from 'lib/recentQueries/types';
import { makeId, storageKeyFor } from 'lib/recentQueries/utils';
import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { quickFiltersListResponse } from 'mocks-server/__mockdata__/customQuickFilters';
import type { AppState } from 'store/reducers';
import type { Warning } from 'types/api';
import type { ILogBody } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type {
	Query,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import type {
	BaseBuilderQuery,
	MetricRangePayloadV5,
	QueryRangeRequestV5,
	TelemetryFieldKey,
	TimeSeries,
} from 'types/api/v5/queryRange';

import { dashboardsForUserResponse } from '@/storybook/msw/__story_mockdata__/dashboards';
import { quickFiltersResponse } from '@/storybook/msw/__story_mockdata__/quickFilters';
import {
	queryRangeV5RawResponse,
	queryRangeV5ScalarResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

export const RELATIVE_TIME: Time = '30m';

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

const NANOSECONDS_IN_MS = 1_000_000;

/**
 * `globalTime` defaults its window from `window.location.pathname`, which in a
 * story is the preview's rather than the page's, so the time picker (reading the
 * route) and the queries (reading the store) would ask for different ranges and
 * a chart would draw a range narrower than its own axis.
 */
export const timeRangeState = (): Partial<AppState> => {
	const now = Date.now();

	return {
		globalTime: {
			minTime: (now - THIRTY_MINUTES_IN_MS) * NANOSECONDS_IN_MS,
			maxTime: now * NANOSECONDS_IN_MS,
			loading: false,
			selectedTime: RELATIVE_TIME,
			isAutoRefreshDisabled: false,
			selectedAutoRefreshInterval: '',
		},
	};
};

export const LOG_SEVERITIES = [
	'TRACE',
	'DEBUG',
	'INFO',
	'WARN',
	'ERROR',
	'FATAL',
] as const;

export type LogSeverity = (typeof LOG_SEVERITIES)[number];

/** OpenTelemetry severity numbers, which the list falls back to for colour. */
const SEVERITY_NUMBERS: Record<LogSeverity, number> = {
	TRACE: 1,
	DEBUG: 5,
	INFO: 9,
	WARN: 13,
	ERROR: 17,
	FATAL: 21,
};

const MESSAGES: Record<LogSeverity, string> = {
	TRACE: 'entering handler CheckoutService/PlaceOrder',
	DEBUG: 'cache lookup for cart:8412 took 1.4ms',
	INFO: 'order 8412 placed, 3 items, total 129.90 USD',
	WARN: 'retrying payment authorization, attempt 2 of 3',
	ERROR: 'payment authorization failed: gateway timeout after 5s',
	FATAL: 'connection pool exhausted, shutting down worker',
};

const SERVICES = ['frontend', 'checkout', 'payments', 'cart', 'auth'];

const PODS = ['checkout-7b9f4d', 'payments-5c8a12', 'frontend-9d3e77'];

const NODES = ['ip-10-0-1-14.ec2.internal', 'ip-10-0-2-31.ec2.internal'];

/**
 * The resource the log detail's Metrics tab charts: a pod opens on the pod's
 * charts, a node opens on the node's with the pod one toggle away, and none
 * leaves the tab empty.
 */
export const INFRA_RESOURCES = ['pod', 'node', 'none'] as const;

export type InfraResource = (typeof INFRA_RESOURCES)[number];

const infraResourceAttributes = (
	infraResource: InfraResource,
	index: number,
): Record<string, string> => {
	if (infraResource === 'none') {
		return {};
	}

	const pod = { 'k8s.pod.name': PODS[index % PODS.length] };

	if (infraResource === 'pod') {
		return pod;
	}

	return {
		...pod,
		'k8s.cluster.name': 'us-east-1',
		'k8s.node.name': NODES[index % NODES.length],
		'host.name': NODES[index % NODES.length],
	};
};

interface LogRowData {
	id: string;
	body: string | ILogBody;
	severity_text: LogSeverity;
	severity_number: number;
	trace_id: string;
	span_id: string;
	trace_flags: number;
	attributes_string: Record<string, string>;
	resources_string: Record<string, string>;
	scope_string: Record<string, string>;
}

const hex = (index: number, length: number): string =>
	index.toString(16).padStart(length, '0');

/**
 * What a JSON-logging service sends, which the backend hands over pre-parsed
 * once `use_json_body` is on: an object rather than a line.
 */
const jsonBodyFor = (
	severity: LogSeverity,
	service: string,
	index: number,
): ILogBody => ({
	message: MESSAGES[severity],
	level: severity.toLowerCase(),
	service,
	order: {
		id: 8412 - index,
		items: 3,
		total: 129.9,
		currency: 'USD',
		coupons: ['WELCOME10', 'FREESHIP'],
	},
	http: { method: 'POST', route: '/api/v1/checkout', status_code: 200 },
});

/**
 * Every fourth JSON-body log is what the collector makes of a plain line on a
 * `use_json_body` tenant: an object holding only `message`.
 */
const jsonBodyAt = (
	severity: LogSeverity,
	service: string,
	index: number,
): ILogBody =>
	index % 4 === 3
		? { message: MESSAGES[severity] }
		: jsonBodyFor(severity, service, index);

export interface LogsResponseOptions {
	/** `use_json_body`: the body arrives as an object instead of a line. */
	jsonBody?: boolean;
	infraResource?: InfraResource;
	warning?: Warning;
}

export interface LogRow {
	timestamp: string;
	data: LogRowData;
}

/**
 * Newest first and one second apart, which is the order the list requests
 * (`timestamp:desc`) and the order pagination assumes.
 */
export const logRows = (
	count: number,
	severities: readonly LogSeverity[],
	endMilli: number,
	jsonBody: boolean,
	infraResource: InfraResource = 'pod',
): LogRow[] =>
	Array.from({ length: severities.length ? count : 0 }, (_unused, index) => {
		const severity = severities[index % severities.length];
		const service = SERVICES[index % SERVICES.length];
		const timestamp = new Date(endMilli - index * 1000).toISOString();

		return {
			timestamp,
			data: {
				id: `01JBQ${hex(index, 8).toUpperCase()}`,
				body: jsonBody
					? jsonBodyAt(severity, service, index)
					: `${timestamp} ${severity} ${service} ${MESSAGES[severity]}`,
				severity_text: severity,
				severity_number: SEVERITY_NUMBERS[severity],
				trace_id: hex(index + 1, 32),
				span_id: hex(index + 1, 16),
				trace_flags: 1,
				attributes_string: {
					'code.function': 'PlaceOrder',
					'http.method': 'POST',
					'http.route': '/api/v1/checkout',
					'order.id': String(8412 - index),
				},
				resources_string: {
					'service.name': service,
					'deployment.environment': 'production',
					...infraResourceAttributes(infraResource, index),
				},
				scope_string: {},
			},
		};
	});

export const logRowsResponse = (
	count: number,
	severities: readonly LogSeverity[],
	endMilli: number,
	{ jsonBody = false, infraResource, warning }: LogsResponseOptions = {},
): MetricRangePayloadV5 =>
	queryRangeV5RawResponse<LogRowData>(
		logRows(count, severities, endMilli, jsonBody, infraResource),
		{ warning },
	);

/** Counts per severity, which the frequency chart stacks and the legend names. */
export const logHistogramResponse = (
	severities: readonly LogSeverity[],
	window: { start: number; end: number },
	{ warning }: Pick<LogsResponseOptions, 'warning'> = {},
): MetricRangePayloadV5 => {
	const series: TimeSeries[] = severities.map((severity, index) => ({
		labels: [{ key: { name: 'severity_text' }, value: severity }],
		values: timeSeriesPoints({
			...window,
			base: 120 / (index + 1),
			amplitude: 40 / (index + 1),
			seed: index * 3,
		}),
	}));

	return queryRangeV5TimeSeriesResponse([{ queryName: 'A', series }], {
		warning,
	});
};

/**
 * The timeseries view aggregates without a group by, so it draws one line, or
 * none when no log matches.
 */
export const logTimeseriesResponse = (
	window: { start: number; end: number },
	{
		warning,
		empty = false,
	}: Pick<LogsResponseOptions, 'warning'> & {
		empty?: boolean;
	} = {},
): MetricRangePayloadV5 =>
	queryRangeV5TimeSeriesResponse(
		[
			{
				queryName: 'A',
				series: empty
					? []
					: [{ values: timeSeriesPoints({ ...window, base: 420, amplitude: 90 }) }],
			},
		],
		{ warning },
	);

/**
 * The log detail's infra charts: one line per query and formula, named the way
 * the request names them, since each chart reads its own.
 */
export const infraMetricsResponse = (
	body: QueryRangeRequestV5,
): MetricRangePayloadV5 =>
	queryRangeV5TimeSeriesResponse(
		(body.compositeQuery?.queries ?? []).map((query, index) => ({
			queryName: (query.spec as BaseBuilderQuery).name ?? 'A',
			series: [
				{
					values: timeSeriesPoints({
						start: body.start,
						end: body.end,
						base: 40 + index * 15,
						amplitude: 12,
						seed: index * 2,
					}),
				},
			],
		})),
	);

/**
 * A filter the explorer opens on from a link rather than the search box, such as
 * a saved view or a span's "View logs", which is the only way it arrives as
 * filter items.
 */
export const URL_FILTERS = ['none', 'service', 'trace'] as const;

export type UrlFilter = (typeof URL_FILTERS)[number];

const URL_FILTER_ITEMS: Record<Exclude<UrlFilter, 'none'>, TagFilterItem> = {
	service: {
		id: 'service-name-filter',
		key: { key: 'service.name', dataType: DataTypes.String, type: 'resource' },
		op: '=',
		value: 'checkout',
	},
	trace: {
		id: 'trace-id-filter',
		key: { key: 'trace_id', dataType: DataTypes.String, type: '' },
		op: '=',
		value: hex(1, 32),
	},
};

export const urlFilterQuery = (filter: UrlFilter): Query | undefined => {
	if (filter === 'none') {
		return undefined;
	}

	const { builder } = initialQueriesMap.logs;

	return {
		...initialQueriesMap.logs,
		builder: {
			...builder,
			queryData: [
				{
					...builder.queryData[0],
					filters: { items: [URL_FILTER_ITEMS[filter]], op: 'AND' },
				},
			],
		},
	};
};

export const logCountResponse = (
	severities: readonly LogSeverity[],
): MetricRangePayloadV5 => queryRangeV5ScalarResponse(severities.length * 1284);

export const QUICK_FILTER_MAX = quickFiltersListResponse.data.filters.length;

export const logsQuickFiltersResponse = (count: number): GetQuickFilters200 =>
	quickFiltersResponse(
		QuickfiltertypesSourceDTO.logs,
		quickFiltersListResponse.data.filters.slice(
			0,
			count,
		) as TelemetrytypesTelemetryFieldKeyDTO[],
	);

const { log, resource, attribute } = TelemetrytypesFieldContextDTO;
const { string: stringType, int64 } = TelemetrytypesFieldDataTypeDTO;

const LOG_FIELDS: TelemetrytypesTelemetryFieldKeyDTO[] = [
	{ name: 'body', fieldContext: log, fieldDataType: stringType },
	{ name: 'severity_text', fieldContext: log, fieldDataType: stringType },
	{ name: 'service.name', fieldContext: resource, fieldDataType: stringType },
	{
		name: 'deployment.environment',
		fieldContext: resource,
		fieldDataType: stringType,
	},
	{
		name: 'k8s.namespace.name',
		fieldContext: resource,
		fieldDataType: stringType,
	},
	{ name: 'k8s.pod.name', fieldContext: resource, fieldDataType: stringType },
	{ name: 'http.route', fieldContext: attribute, fieldDataType: stringType },
	{ name: 'http.status_code', fieldContext: attribute, fieldDataType: int64 },
];

/**
 * With `use_json_body` on, the keys inside the body are queryable in their own
 * right, so the query builder offers them alongside the log's own fields.
 */
const BODY_JSON_FIELDS: TelemetrytypesTelemetryFieldKeyDTO[] = [
	{ name: 'body.level', fieldContext: log, fieldDataType: stringType },
	{ name: 'body.service', fieldContext: log, fieldDataType: stringType },
	{ name: 'body.order.id', fieldContext: log, fieldDataType: int64 },
	{ name: 'body.http.method', fieldContext: log, fieldDataType: stringType },
	{
		name: 'body.http.status_code',
		fieldContext: log,
		fieldDataType: int64,
	},
];

export const logFieldKeysResponse = (
	searchText: string,
	{ jsonBody = false }: Pick<LogsResponseOptions, 'jsonBody'> = {},
): GetFieldsKeys200 => {
	const fields = jsonBody ? [...LOG_FIELDS, ...BODY_JSON_FIELDS] : LOG_FIELDS;
	const matches = fields.filter((field) =>
		field.name.includes(searchText.toLowerCase()),
	);

	return {
		status: 'success',
		data: {
			complete: true,
			keys: Object.fromEntries(matches.map((field) => [field.name, [field]])),
		},
	};
};

/** A route longer than the query builder's suggestion list is wide. */
export const LONG_HTTP_ROUTE =
	'/api/v1/checkout/orders/{order_id}/payments/{payment_id}/authorisations/{authorisation_id}/retries/{retry_id}/events/{event_id}/acknowledgements/{acknowledgement_id}';

/** Keyed by the fields the quick filters and the query builder ask about. */
const STRING_VALUES: Record<string, string[]> = {
	severity_text: [...LOG_SEVERITIES],
	'service.name': SERVICES,
	'service.namespace': ['checkout', 'platform'],
	'service.instance.id': ['checkout-0', 'checkout-1', 'payments-0'],
	'deployment.environment': ['production', 'staging', 'development'],
	'k8s.namespace.name': ['default', 'checkout', 'observability'],
	'k8s.pod.name': PODS,
	'k8s.cluster.name': ['us-east-1', 'eu-west-1'],
	'k8s.deployment.name': ['checkout', 'payments', 'frontend'],
	'host.name': ['ip-10-0-1-14', 'ip-10-0-2-31'],
	'os.description': ['Linux 6.8.0 x86_64', 'Darwin 23.5.0 arm64'],
	'process.owner': ['root', 'app'],
	'http.route': [
		'/api/v1/checkout',
		'/api/v1/cart',
		'/api/v1/auth/token',
		LONG_HTTP_ROUTE,
	],
	'body.level': LOG_SEVERITIES.map((severity) => severity.toLowerCase()),
	'body.service': SERVICES,
	'body.http.method': ['POST', 'GET', 'DELETE'],
};

const NUMBER_VALUES: Record<string, number[]> = {
	duration_nano: [1_200_000, 8_400_000, 32_000_000],
	quantity: [1, 3, 12],
	'http.status_code': [200, 404, 500],
	'body.order.id': [8412, 8411, 8410],
	'body.http.status_code': [200, 404, 500],
};

const matching = <TValue>(values: TValue[], searchText: string): TValue[] =>
	searchText
		? values.filter((value) =>
				String(value).toLowerCase().includes(searchText.toLowerCase()),
			)
		: values;

export const logFieldValuesResponse = (
	name: string,
	searchText: string,
): GetFieldsValues200 => ({
	status: 'success',
	data: {
		complete: true,
		values: {
			stringValues: matching(STRING_VALUES[name] ?? [], searchText),
			numberValues: matching(NUMBER_VALUES[name] ?? [], searchText),
			relatedValues: [],
		},
	},
});

/**
 * The list's own options: the loader reads localStorage ahead of the URL, so
 * this is what decides the format, and the columns have to be in it or the list
 * loses `body` and `timestamp`.
 */
export const logsListOptions = ({
	bodyColumns = false,
	...options
}: Pick<OptionsQuery, 'format' | 'maxLines' | 'fontSize'> & {
	bodyColumns?: boolean;
}): OptionsQuery => ({
	selectColumns: bodyColumns
		? [...defaultLogsSelectedColumns, ...BODY_FIELD_COLUMNS]
		: defaultLogsSelectedColumns,
	version: 1,
	...options,
});

/**
 * Keys of the JSON body picked as columns: a nested object, an array and a
 * leaf, which is what tells a list format apart on how it renders a non-string
 * field value.
 */
const BODY_FIELD_COLUMNS: TelemetryFieldKey[] = [
	'order',
	'order.coupons',
	'http.status_code',
].map((name) => ({
	name,
	signal: 'logs',
	fieldContext: 'log',
	fieldDataType: '',
	isIndexed: false,
}));

const DASHBOARD_NAMES = [
	'Logs overview',
	'Checkout health',
	'Kubernetes workloads',
	'Ingestion volume',
];

export const dashboardsResponse = (): ListDashboardsForUserV2200 =>
	dashboardsForUserResponse(DASHBOARD_NAMES);

const RECENT_FILTERS = [
	"service.name = 'checkout' AND severity_text = 'ERROR'",
	"k8s.namespace.name = 'observability'",
	"body CONTAINS 'timeout'",
	'http.status_code >= 500',
	"deployment.environment IN ['production', 'staging']",
];

/** The filter lists this many recent entries at most. */
export const RECENT_FILTER_MAX = RECENT_FILTERS.length;

/**
 * The explorer's recent filters as the store keeps them in localStorage,
 * newest first, five minutes apart. Dated off `new Date()`, which the story
 * clock freezes, so the "5 minutes ago" labels hold still.
 */
export const recentFiltersStorage = (count: number): [string, string] => {
	const store: RecentQueriesStoreShape = {
		version: STORAGE_VERSION,
		entries: RECENT_FILTERS.slice(0, count).map((expression, index) => ({
			id: makeId('logs', '', expression),
			signal: 'logs',
			source: '',
			filter: { expression },
			lastUsedAt: new Date().getTime() - (index + 1) * 5 * 60_000,
		})),
	};

	return [storageKeyFor('logs', ''), JSON.stringify(store)];
};
