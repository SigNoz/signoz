/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { domainNameKey } from 'container/ApiMonitoring/constants';
import { SPAN_ATTRIBUTES } from 'container/ApiMonitoring/Explorer/Domains/DomainDetails/constants';
import type { APIMonitoringResponseColumn } from 'container/ApiMonitoring/types';
import type { PayloadProps as ListOverviewResponse } from 'types/api/thirdPartyApis/listOverview';
import type { MetricRangePayloadV5 } from 'types/api/v5/queryRange';

import {
	queryRangeV5ScalarTableResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

interface Domain {
	name: string;
	/** Endpoints in use, which is also how many the drawer can list. */
	endpoints: number;
	rate: number;
	errorRate: number;
	latencyMs: number;
	lastSeenMinutesAgo: number;
	/** A bare address, which the Show IP addresses filter drops. */
	isIp?: boolean;
	/** Prefix its endpoint URLs carry, which is where the Port pill reads from. */
	origin?: string;
}

const DOMAINS: Domain[] = [
	{
		name: 'api.stripe.com',
		endpoints: 10,
		rate: 8.42,
		errorRate: 1.24,
		latencyMs: 241,
		lastSeenMinutesAgo: 2,
	},
	{
		name: 'api.github.com',
		endpoints: 7,
		rate: 3.16,
		errorRate: 0.42,
		latencyMs: 187,
		lastSeenMinutesAgo: 5,
	},
	{
		name: 's3.us-east-1.amazonaws.com',
		endpoints: 5,
		rate: 21.68,
		errorRate: 0.08,
		latencyMs: 96,
		lastSeenMinutesAgo: 1,
	},
	{
		name: 'api.segment.io',
		endpoints: 4,
		rate: 12.94,
		errorRate: 4.71,
		latencyMs: 318,
		lastSeenMinutesAgo: 11,
	},
	{
		name: 'hooks.slack.com',
		endpoints: 3,
		rate: 0.82,
		errorRate: 12.5,
		latencyMs: 642,
		lastSeenMinutesAgo: 46,
	},
	{
		name: 'api.twilio.com',
		endpoints: 4,
		rate: 1.64,
		errorRate: 61.9,
		latencyMs: 1184,
		lastSeenMinutesAgo: 184,
	},
	{
		name: '34.120.155.12',
		endpoints: 2,
		rate: 0.41,
		errorRate: 91.3,
		latencyMs: 2410,
		lastSeenMinutesAgo: 1620,
		isIp: true,
		origin: 'http://34.120.155.12:8080',
	},
	{
		name: 'api.sendgrid.com',
		endpoints: 3,
		rate: 2.27,
		errorRate: 0,
		latencyMs: 152,
		lastSeenMinutesAgo: 8,
	},
];

export const DOMAIN_MAX = DOMAINS.length;

const MS_IN_MINUTE = 60 * 1000;
const NS_IN_MS = 1_000_000;

const lastSeenIso = (minutesAgo: number, now: number): string =>
	new Date(now - minutesAgo * MS_IN_MINUTE).toISOString();

const listOverviewColumns: APIMonitoringResponseColumn[] = [
	{
		name: domainNameKey,
		signal: 'traces',
		fieldContext: '',
		fieldDataType: 'string',
		queryName: '',
		aggregationIndex: 0,
		meta: {},
		columnType: 'attribute',
	},
	...['endpoints', 'rps', 'error_rate', 'p99', 'lastseen'].map((name) => ({
		name,
		signal: 'traces',
		fieldContext: '',
		fieldDataType: 'number',
		queryName: name,
		aggregationIndex: 0,
		meta: {},
		columnType: 'metric',
	})),
];

const domainsIn = (count: number, showIp: boolean): Domain[] =>
	DOMAINS.filter((domain) => showIp || !domain.isIp).slice(0, count);

export const domainNames = (count: number, showIp = true): string[] =>
	domainsIn(count, showIp).map((domain) => domain.name);

export const DRAWER_DOMAINS = ['healthy', 'failing', 'ip-address'] as const;

export type DrawerDomain = (typeof DRAWER_DOMAINS)[number];

const DRAWER_DOMAIN_OF: Record<DrawerDomain, string> = {
	healthy: 'api.stripe.com',
	failing: 'api.twilio.com',
	'ip-address': '34.120.155.12',
};

/** Falls back to the first row when the chosen domain is past the list's count. */
export const drawerDomainName = (
	kind: DrawerDomain,
	count: number,
): string | undefined => {
	const available = domainNames(count);
	const target = DRAWER_DOMAIN_OF[kind];

	return available.includes(target) ? target : available[0];
};

export const domainListResponse = (
	count: number,
	showIp: boolean,
	now: number,
): ListOverviewResponse => ({
	status: 'success',
	data: {
		type: 'scalar',
		meta: { rowsScanned: count, bytesScanned: 0, durationMs: 0 },
		data: {
			results: [
				{
					columns: listOverviewColumns,
					// Typed as strings, but the error column calls `toFixed` on the cell
					// and the last-used column parses it with `new Date`, so the metrics
					// go out as numbers and the timestamp as a date string.
					data: domainsIn(count, showIp).map((domain) => [
						domain.name,
						domain.endpoints,
						domain.rate,
						domain.errorRate,
						domain.latencyMs * NS_IN_MS,
						lastSeenIso(domain.lastSeenMinutesAgo, now),
					]) as unknown as string[][],
				},
			],
		},
	},
});

const domainOf = (name: string): Domain =>
	DOMAINS.find((domain) => domain.name === name) ?? DOMAINS[0];

const ENDPOINT_PATHS = [
	'/v1/charges',
	'/v1/customers',
	'/v1/payment_intents',
	'/v1/refunds',
	'/v1/invoices',
	'/v1/subscriptions',
	'/v1/events',
	'/v1/payouts',
	'/v1/balance',
	'/v1/tokens',
];

export const ENDPOINT_MAX = ENDPOINT_PATHS.length;

/** Full URLs, port included, which is what the drawer splits into endpoint and port. */
export const endpointUrls = (domainName: string, count: number): string[] => {
	const { origin = `https://${domainName}` } = domainOf(domainName);

	return ENDPOINT_PATHS.slice(0, count).map((path) => `${origin}${path}`);
};

export const endpointUrl = (domainName: string, index = 0): string =>
	endpointUrls(domainName, ENDPOINT_MAX)[index];

const endpointScale = (domain: Domain, index: number): number =>
	1 + ((index * 7) % 5) / 4;

export const domainMetricsResponse = (
	domainName: string,
	now: number,
): MetricRangePayloadV5 => {
	const domain = domainOf(domainName);

	return queryRangeV5ScalarTableResponse({
		aggregations: ['A', 'B', 'D', 'F1'],
		rows: [
			[
				domain.endpoints,
				domain.latencyMs * NS_IN_MS,
				lastSeenIso(domain.lastSeenMinutesAgo, now),
				domain.errorRate,
			],
		],
	});
};

export const endpointMetricsResponse = (
	domainName: string,
	endPointName: string,
	now: number,
): MetricRangePayloadV5 => {
	const domain = domainOf(domainName);
	const index = Math.max(
		endpointUrls(domainName, ENDPOINT_MAX).indexOf(endPointName),
		0,
	);
	const scale = endpointScale(domain, index);

	return queryRangeV5ScalarTableResponse({
		aggregations: ['A', 'B', 'D', 'F1'],
		rows: [
			[
				Number((domain.rate * scale).toFixed(2)),
				Math.round(domain.latencyMs * scale) * NS_IN_MS,
				lastSeenIso(domain.lastSeenMinutesAgo, now),
				Number((domain.errorRate * scale).toFixed(2)),
			],
		],
	});
};

/**
 * The Endpoint Overview table. Extra group-by columns come from the request, so
 * a group-by picked in the panel widens the table instead of dropping its rows.
 */
export const allEndpointsResponse = (
	domainName: string,
	count: number,
	groupBy: string[],
	now: number,
): MetricRangePayloadV5 => {
	const domain = domainOf(domainName);
	const extraGroupBy = groupBy.filter(
		(name) => name !== SPAN_ATTRIBUTES.HTTP_URL,
	);

	return queryRangeV5ScalarTableResponse({
		groupBy: [SPAN_ATTRIBUTES.HTTP_URL, ...extraGroupBy],
		aggregations: ['A', 'B', 'C', 'F1'],
		rows: endpointUrls(domainName, count).map((url, index) => {
			const scale = endpointScale(domain, index);

			return [
				url,
				...extraGroupBy.map((name) => groupByValue(name, index)),
				Math.round(domain.rate * scale * 600),
				Math.round(domain.latencyMs * scale) * NS_IN_MS,
				lastSeenIso(domain.lastSeenMinutesAgo + index, now),
				Number((domain.errorRate * scale).toFixed(2)),
			];
		}),
	});
};

const GROUP_BY_VALUES: Record<string, string[]> = {
	'service.name': ['checkout', 'payments', 'cart'],
	'deployment.environment': ['production', 'staging'],
	'rpc.method': ['POST', 'GET'],
};

function groupByValue(name: string, index: number): string {
	const values = GROUP_BY_VALUES[name] ?? ['value-a', 'value-b'];

	return values[index % values.length];
}

export const endpointDropdownResponse = (
	domainName: string,
	count: number,
): MetricRangePayloadV5 =>
	queryRangeV5ScalarTableResponse({
		groupBy: [SPAN_ATTRIBUTES.HTTP_URL],
		aggregations: ['A'],
		rows: endpointUrls(domainName, count).map((url, index) => [
			url,
			1200 - index * 90,
		]),
	});

const STATUS_CODES = ['200', '201', '304', '400', '404', '500'];

export const STATUS_CODE_MAX = STATUS_CODES.length;

const statusCodeCalls = (index: number): number =>
	[4820, 1960, 640, 210, 96, 41][index];

export const statusCodeTableResponse = (
	domainName: string,
	count: number,
): MetricRangePayloadV5 => {
	const domain = domainOf(domainName);

	return queryRangeV5ScalarTableResponse({
		groupBy: [SPAN_ATTRIBUTES.RESPONSE_STATUS_CODE],
		aggregations: ['A', 'B', 'C'],
		rows: STATUS_CODES.slice(0, count).map((statusCode, index) => [
			statusCode,
			statusCodeCalls(index),
			Math.round(domain.latencyMs * (1 + index / 3)) * NS_IN_MS,
			Number((domain.rate / (index + 1)).toFixed(2)),
		]),
	});
};

const DEPENDENT_SERVICES = [
	'checkout',
	'payments',
	'cart',
	'auth',
	'notifications',
	'search',
	'orders',
	'shipping',
];

export const DEPENDENT_SERVICE_MAX = DEPENDENT_SERVICES.length;

export const dependentServicesResponse = (
	domainName: string,
	count: number,
): MetricRangePayloadV5 => {
	const domain = domainOf(domainName);

	return queryRangeV5ScalarTableResponse({
		groupBy: ['service.name'],
		aggregations: ['A', 'B', 'C', 'F1'],
		rows: DEPENDENT_SERVICES.slice(0, count).map((service, index) => {
			const calls = Math.round(3800 / (index + 1));

			return [
				service,
				calls,
				Math.round(domain.latencyMs * (1 + index / 5)) * NS_IN_MS,
				Number((domain.rate / (index + 1)).toFixed(2)),
				Number((domain.errorRate * (1 + index / 4)).toFixed(2)),
			];
		}),
	});
};

interface TopError {
	statusCode: string;
	message: string;
	count: number;
}

const TOP_ERRORS: TopError[] = [
	{ statusCode: '500', message: 'upstream connect error', count: 412 },
	{ statusCode: '429', message: 'rate limit exceeded', count: 318 },
	{ statusCode: '503', message: 'upstream timeout', count: 244 },
	{ statusCode: '502', message: 'connection reset by peer', count: 187 },
	{ statusCode: '400', message: 'invalid request payload', count: 143 },
	{ statusCode: '401', message: 'expired api key', count: 118 },
	{ statusCode: '404', message: 'no such customer', count: 96 },
	{ statusCode: '409', message: 'idempotency key reused', count: 71 },
	{ statusCode: '422', message: 'card declined', count: 54 },
	{ statusCode: '500', message: 'internal server error', count: 32 },
];

export const TOP_ERROR_MAX = TOP_ERRORS.length;

/**
 * The Top 10 Errors table, which reads the scalar result itself rather than the
 * legacy conversion, so its cells are keyed by column name.
 */
export const topErrorsResponse = (
	domainName: string,
	count: number,
	withStatusMessage: boolean,
	endPointName?: string,
): MetricRangePayloadV5 => {
	const urls = endpointUrls(domainName, ENDPOINT_MAX);

	return {
		data: {
			type: 'scalar',
			data: {
				results: [
					{
						columns: [
							{
								name: SPAN_ATTRIBUTES.HTTP_URL,
								queryName: '',
								aggregationIndex: 0,
								columnType: 'group',
							},
							{
								name: SPAN_ATTRIBUTES.RESPONSE_STATUS_CODE,
								queryName: '',
								aggregationIndex: 0,
								columnType: 'group',
							},
							{
								name: 'status_message',
								queryName: '',
								aggregationIndex: 0,
								columnType: 'group',
							},
							{
								name: '__result_0',
								queryName: 'A',
								aggregationIndex: 0,
								columnType: 'aggregation',
							},
						],
						data: TOP_ERRORS.slice(0, count).map((error, index) => [
							endPointName ?? urls[index % urls.length],
							error.statusCode,
							withStatusMessage ? error.message : 'n/a',
							error.count,
						]),
					},
				],
			},
			meta: {
				rowsScanned: count,
				bytesScanned: 0,
				durationMs: 0,
				stepIntervals: {},
			},
		},
	};
};

interface Window {
	start: number;
	end: number;
}

/**
 * Call response status, both the count and the latency the card switches to.
 * The chart buckets the codes into 2xx–5xx, so the per-code weights are the
 * ones the status code table shows and the buckets keep their relative size.
 */
export const statusCodeChartResponse = (
	domainName: string,
	count: number,
	window: Window,
	metric: 'calls' | 'latency',
): MetricRangePayloadV5 => {
	const domain = domainOf(domainName);

	return queryRangeV5TimeSeriesResponse([
		{
			queryName: 'A',
			series: STATUS_CODES.slice(0, count).map((statusCode, index) => {
				const base =
					metric === 'calls'
						? statusCodeCalls(index) / 12
						: Math.round(domain.latencyMs * (1 + index / 3)) * NS_IN_MS;

				return {
					labels: [
						{
							key: { name: SPAN_ATTRIBUTES.RESPONSE_STATUS_CODE },
							value: statusCode,
						},
					],
					values: timeSeriesPoints({
						...window,
						seed: index * 3,
						base,
						amplitude: base / 5,
					}),
				};
			}),
		},
	]);
};

/** The rate and latency charts at the bottom of the endpoint stats view. */
export const overTimeChartResponse = (
	domainName: string,
	window: Window,
	metric: 'rate' | 'latency',
): MetricRangePayloadV5 => {
	const domain = domainOf(domainName);
	const base = metric === 'rate' ? domain.rate : domain.latencyMs * NS_IN_MS;

	return queryRangeV5TimeSeriesResponse([
		{
			queryName: 'A',
			series: [
				{
					values: timeSeriesPoints({
						...window,
						base,
						amplitude: base / 5,
					}),
				},
			],
		},
	]);
};

const GROUP_BY_KEYS = [
	'service.name',
	'deployment.environment',
	'rpc.method',
	'http.request.method',
	'net.peer.name',
];

export const groupByAttributeKeys = (
	searchText: string,
): Array<{ key: string; dataType: string; type: string; isColumn: boolean }> =>
	GROUP_BY_KEYS.filter((key) =>
		key.toLowerCase().includes(searchText.toLowerCase()),
	).map((key) => ({
		key,
		dataType: 'string',
		type: 'tag',
		isColumn: false,
	}));
