/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import type { ServicesList } from 'types/api/metrics/getService';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	queryRangeV3TimeSeriesResponse,
	v3Series,
} from '@/storybook/msw/__story_mockdata__/queryRange';

export const SERVICE_MODES = ['traces', 'span-metrics'] as const;

export type ServiceMode = (typeof SERVICE_MODES)[number];

export const SERVICE_HEALTH_STATES = ['healthy', 'mixed', 'degraded'] as const;

export type ServiceHealth = (typeof SERVICE_HEALTH_STATES)[number];

export const SERVICE_TRAFFIC_LEVELS = ['steady', 'over-trial-limit'] as const;

export type ServiceTraffic = (typeof SERVICE_TRAFFIC_LEVELS)[number];

const SERVICE_NAMES = [
	'frontend',
	'checkout',
	'cart',
	'payment',
	'shipping',
	'product-catalog',
	'recommendation',
	'currency',
	'email',
	'ad',
	'quote',
	'accounting',
	'fraud-detection',
	'notification',
] as const;

export const SERVICE_MAX = SERVICE_NAMES.length;

const OPERATIONS = [
	'HTTP GET /',
	'HTTP POST /api/checkout',
	'grpc.Execute',
	'oteldemo.CartService/GetCart',
];

export const DEPLOYMENT_ENVIRONMENTS = ['production', 'staging', 'canary'];

export const RESOURCE_ATTRIBUTE_KEYS = [
	'resource_deployment.environment',
	'resource_k8s.cluster.name',
	'resource_k8s.namespace.name',
	'resource_host.name',
	'resource_cloud.region',
];

const namesFor = (count: number): string[] =>
	SERVICE_NAMES.slice(0, Math.min(count, SERVICE_MAX));

/** Latency in nanoseconds, which is what both the table columns divide down from. */
const p99Of = (index: number, health: ServiceHealth): number => {
	const base = 118_000_000 + index * 11_500_000;

	return health === 'degraded' ? base * 4 : base;
};

const errorRateOf = (index: number, health: ServiceHealth): number => {
	if (health === 'healthy') {
		return 0;
	}

	if (health === 'degraded') {
		return 12.5 + (index % 4) * 3.25;
	}

	return index % 3 === 0 ? 4.75 + (index % 2) * 1.5 : 0;
};

/**
 * `over-trial-limit` spreads more than `MAX_RPS_LIMIT` across however many
 * services are on, so the cloud trial warning above the table shows at any count.
 */
const callRateOf = (
	index: number,
	count: number,
	traffic: ServiceTraffic,
): number => {
	const jitter = (index % 5) * 0.7;

	return traffic === 'over-trial-limit'
		? 110 / Math.max(count, 1) + jitter
		: 2.4 + jitter;
};

interface ServiceMetrics {
	p99: number;
	errorRate: number;
	callRate: number;
}

const metricsOf = (
	index: number,
	count: number,
	health: ServiceHealth,
	traffic: ServiceTraffic,
): ServiceMetrics => ({
	p99: p99Of(index, health),
	errorRate: errorRateOf(index, health),
	callRate: callRateOf(index, count, traffic),
});

export const servicesResponse = (
	count: number,
	health: ServiceHealth,
	traffic: ServiceTraffic,
): { status: string; data: ServicesList[] } => {
	const names = namesFor(count);

	return {
		status: 'success',
		data: names.map((serviceName, index) => {
			const { p99, errorRate, callRate } = metricsOf(
				index,
				names.length,
				health,
				traffic,
			);
			const numCalls = Math.round(callRate * 1800);

			return {
				serviceName,
				p99,
				avgDuration: p99 / 3,
				numCalls,
				callRate,
				numErrors: Math.round((numCalls * errorRate) / 100),
				errorRate,
			};
		}),
	};
};

/** The span-metrics branch lists services by the operations reported for each. */
export const topLevelOperationsResponse = (count: number): ServiceDataProps =>
	Object.fromEntries(
		namesFor(count).map((serviceName, index) => [
			serviceName,
			OPERATIONS.slice(0, 2 + (index % 3)),
		]),
	);

const serviceOf = (
	body: Record<string, unknown>,
	names: string[],
): string | undefined => {
	const composite = body.compositeQuery as
		| { builderQueries?: Record<string, IBuilderQuery> }
		| undefined;
	const item = composite?.builderQueries?.A?.filters?.items?.find(
		(filter) => filter.key?.key === 'service.name',
	);
	const value = Array.isArray(item?.value) ? item?.value[0] : item?.value;

	return names.find((name) => name === value);
};

/**
 * One request per service, so the row a response fills is the one named in its
 * own `service.name` filter. `A` is p99, `D` the call rate and `F1` the error
 * rate formula, which is the only three values the table reads back.
 */
export const serviceMetricsResponse = (
	body: Record<string, unknown>,
	count: number,
	health: ServiceHealth,
	traffic: ServiceTraffic,
	timestamp: number,
): MetricRangePayloadProps => {
	const names = namesFor(count);
	const service = serviceOf(body, names);
	const index = service ? names.indexOf(service) : 0;
	const { p99, errorRate, callRate } = metricsOf(
		index,
		names.length,
		health,
		traffic,
	);

	const point = (value: number): { timestamp: number; value: string } => ({
		timestamp,
		value: String(Number(value.toFixed(4))),
	});

	return {
		data: {
			result: [],
			resultType: '',
			newResult: queryRangeV3TimeSeriesResponse([
				{ queryName: 'A', series: [v3Series({}, [point(p99)])] },
				{ queryName: 'D', series: [v3Series({}, [point(callRate)])] },
				{ queryName: 'F1', series: [v3Series({}, [point(errorRate)])] },
			]),
		},
	};
};
