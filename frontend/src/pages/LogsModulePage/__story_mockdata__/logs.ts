/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	type GetFieldsKeys200,
	type GetFieldsValues200,
	type ListDashboardsForUserV2200,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import type { OptionsQuery } from 'container/OptionsMenu/types';
import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { quickFiltersListResponse } from 'mocks-server/__mockdata__/customQuickFilters';
import type { AppState } from 'store/reducers';
import type { Warning } from 'types/api';
import type { ILogBody } from 'types/api/logs/log';
import type { MetricRangePayloadV3 } from 'types/api/metrics/getQueryRange';
import type { IGetAttributeSuggestionsSuccessResponse } from 'types/api/queryBuilder/getAttributeSuggestions';
import type { IAttributeValuesResponse } from 'types/api/queryBuilder/getAttributesValues';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { PayloadProps as QuickFiltersPayload } from 'types/api/quickFilters/getCustomFilters';
import type { MetricRangePayloadV5, TimeSeries } from 'types/api/v5/queryRange';
import type { ListItem } from 'types/api/widgets/getQuery';

import { dashboardsForUserResponse } from '@/storybook/msw/__story_mockdata__/dashboards';
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

export interface LogsResponseOptions {
	/** `use_json_body`: the body arrives as an object instead of a line. */
	jsonBody?: boolean;
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
					? jsonBodyFor(severity, service, index)
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
					'k8s.pod.name': PODS[index % PODS.length],
				},
				scope_string: {},
			},
		};
	});

export const logRowsResponse = (
	count: number,
	severities: readonly LogSeverity[],
	endMilli: number,
	{ jsonBody = false, warning }: LogsResponseOptions = {},
): MetricRangePayloadV5 =>
	queryRangeV5RawResponse<LogRowData>(
		logRows(count, severities, endMilli, jsonBody),
		{ warning },
	);

/**
 * The pipeline preview queries on `DEFAULT_ENTITY_VERSION`, so it reads its
 * sample logs off v3, where rows arrive as `list` and a count as a series.
 */
export const logRowsV3Response = (
	count: number,
	severities: readonly LogSeverity[],
	endMilli: number,
): { status: string } & MetricRangePayloadV3 => ({
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				queryName: 'A',
				series: null,
				// `ListItem['data']` is the frontend's `ILog`, which carries fields the
				// backend never sends.
				list: logRows(count, severities, endMilli, false) as unknown as ListItem[],
			},
		],
	},
});

export const logCountV3Response = (
	value: number,
	endMilli: number,
): { status: string } & MetricRangePayloadV3 => ({
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				queryName: 'A',
				list: null,
				series: [
					{
						labels: {},
						labelsArray: [],
						values: [{ timestamp: endMilli, value: String(value) }],
					},
				],
			},
		],
	},
});

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

/** The timeseries view aggregates without a group by, so it draws one line. */
export const logTimeseriesResponse = (
	window: { start: number; end: number },
	{ warning }: Pick<LogsResponseOptions, 'warning'> = {},
): MetricRangePayloadV5 =>
	queryRangeV5TimeSeriesResponse(
		[
			{
				queryName: 'A',
				series: [
					{ values: timeSeriesPoints({ ...window, base: 420, amplitude: 90 }) },
				],
			},
		],
		{ warning },
	);

export const logCountResponse = (
	severities: readonly LogSeverity[],
): MetricRangePayloadV5 => queryRangeV5ScalarResponse(severities.length * 1284);

export const QUICK_FILTER_MAX = quickFiltersListResponse.data.filters.length;

export const quickFiltersResponse = (
	count: number,
): { status: string; data: QuickFiltersPayload } => ({
	status: 'success',
	data: {
		signal: 'logs',
		filters: quickFiltersListResponse.data.filters.slice(0, count),
	},
});

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
	'http.route': ['/api/v1/checkout', '/api/v1/cart', '/api/v1/auth/token'],
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
 * The quick filters read values off the v3 autocomplete endpoint rather than
 * `/fields/values`, and it answers numbers as strings.
 */
export const attributeValuesResponse = (
	attributeKey: string,
	searchText: string,
): { status: string; data: IAttributeValuesResponse } => ({
	status: 'success',
	data: {
		stringAttributeValues: matching(
			STRING_VALUES[attributeKey] ?? [],
			searchText,
		),
		numberAttributeValues: matching(
			NUMBER_VALUES[attributeKey] ?? [],
			searchText,
		).map(String),
		boolAttributeValues: null,
	},
});

/**
 * What the query builder's search box offers while a filter is being typed. The
 * types are the v3 spelling of the same fields the v5 endpoints answer with.
 */
export const filterSuggestionsResponse = (
	searchText: string,
): { status: string; data: IGetAttributeSuggestionsSuccessResponse } => ({
	status: 'success',
	data: {
		attributes: LOG_FIELDS.filter((field) =>
			field.name.includes(searchText.toLowerCase()),
		).map((field) => ({
			key: field.name,
			dataType: field.fieldDataType === int64 ? DataTypes.Int64 : DataTypes.String,
			type: field.fieldContext === resource ? 'resource' : 'tag',
		})),
		example_queries: [],
	},
});

/**
 * The list's own options: the loader reads localStorage ahead of the URL, so
 * this is what decides the format, and the columns have to be in it or the list
 * loses `body` and `timestamp`.
 */
export const logsListOptions = (
	options: Pick<OptionsQuery, 'format' | 'maxLines' | 'fontSize'>,
): OptionsQuery => ({
	selectColumns: defaultLogsSelectedColumns,
	version: 1,
	...options,
});

const DASHBOARD_NAMES = [
	'Logs overview',
	'Checkout health',
	'Kubernetes workloads',
	'Ingestion volume',
];

export const dashboardsResponse = (): ListDashboardsForUserV2200 =>
	dashboardsForUserResponse(DASHBOARD_NAMES);
