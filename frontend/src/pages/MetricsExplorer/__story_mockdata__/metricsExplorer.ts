/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	GetMetricAlerts200,
	GetMetricAttributes200,
	GetMetricDashboardsV2200,
	GetMetricHighlights200,
	GetMetricMetadata200,
	GetMetricReductionRuleStats200,
	GetMetricReductionRuleTimeseries200,
	GetMetricsStats200,
	GetMetricsTreemap200,
	InspectMetrics200,
	ListMetricReductionRules200,
	ListMetrics200,
	MetricreductionruletypesGettableReductionRuleDTO,
	MetricsexplorertypesStatDTO,
	MetricsexplorertypesTreemapEntryDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	MetricreductionruletypesMatchTypeDTO,
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
	Querybuildertypesv5RequestTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { explorerView } from 'mocks-server/__mockdata__/explorer_views';
import type { AllViewsProps, ViewProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';

interface MetricSeed {
	metricName: string;
	description: string;
	type: MetrictypesTypeDTO;
	temporality: MetrictypesTemporalityDTO;
	unit: string;
	samples: number;
	timeseries: number;
}

/**
 * Ordered by samples descending, which is the order the table asks for by
 * default, so the first page reads the way the backend would answer it.
 */
const METRICS: MetricSeed[] = [
	{
		metricName: 'http.server.duration',
		description: 'Duration of inbound HTTP requests',
		type: MetrictypesTypeDTO.histogram,
		temporality: MetrictypesTemporalityDTO.delta,
		unit: 'ms',
		samples: 48_120_400,
		timeseries: 32_480,
	},
	{
		metricName: 'signoz_latency_bucket',
		description: 'Span latency histogram written by the collector',
		type: MetrictypesTypeDTO.histogram,
		temporality: MetrictypesTemporalityDTO.cumulative,
		unit: 'ms',
		samples: 31_880_100,
		timeseries: 24_960,
	},
	{
		metricName: 'container_cpu_utilization',
		description: 'CPU utilization of a container, as a ratio of its limit',
		type: MetrictypesTypeDTO.gauge,
		temporality: MetrictypesTemporalityDTO.unspecified,
		unit: 'percentunit',
		samples: 18_402_900,
		timeseries: 12_240,
	},
	{
		metricName: 'k8s.pod.memory.usage',
		description: 'Memory currently in use by a pod',
		type: MetrictypesTypeDTO.gauge,
		temporality: MetrictypesTemporalityDTO.unspecified,
		unit: 'bytes',
		samples: 14_760_320,
		timeseries: 9_820,
	},
	{
		metricName: 'http.server.request.count',
		description: 'Inbound HTTP requests, counted per route and status',
		type: MetrictypesTypeDTO.sum,
		temporality: MetrictypesTemporalityDTO.delta,
		unit: '',
		samples: 9_430_650,
		timeseries: 7_410,
	},
	{
		metricName: 'system.cpu.time',
		description: 'Seconds the CPU spent in each state',
		type: MetrictypesTypeDTO.sum,
		temporality: MetrictypesTemporalityDTO.cumulative,
		unit: 's',
		samples: 6_120_480,
		timeseries: 5_260,
	},
	{
		metricName: 'kafka.consumer.lag',
		description: 'Messages a consumer group is behind the partition head',
		type: MetrictypesTypeDTO.gauge,
		temporality: MetrictypesTemporalityDTO.unspecified,
		unit: '',
		samples: 4_890_210,
		timeseries: 3_180,
	},
	{
		metricName: 'runtime.jvm.gc.duration',
		description: 'Time spent in garbage collection',
		type: MetrictypesTypeDTO.sum,
		temporality: MetrictypesTemporalityDTO.cumulative,
		unit: 'ms',
		samples: 3_204_770,
		timeseries: 2_640,
	},
	{
		metricName: 'db.client.connections.usage',
		description: 'Connections held by the client pool',
		type: MetrictypesTypeDTO.gauge,
		temporality: MetrictypesTemporalityDTO.unspecified,
		unit: '',
		samples: 2_640_190,
		timeseries: 1_980,
	},
	{
		metricName: 'redis.command.duration',
		description: 'Latency quantiles reported by the Redis client',
		type: MetrictypesTypeDTO.summary,
		temporality: MetrictypesTemporalityDTO.unspecified,
		unit: 'ms',
		samples: 1_980_540,
		timeseries: 1_420,
	},
	{
		metricName: 'payment.transaction.amount',
		description: 'Distribution of settled payment amounts',
		type: MetrictypesTypeDTO.exponentialhistogram,
		temporality: MetrictypesTemporalityDTO.delta,
		unit: '',
		samples: 1_412_300,
		timeseries: 940,
	},
	{
		metricName: 'otelcol_receiver_accepted_metric_points',
		description: 'Metric points the collector accepted',
		type: MetrictypesTypeDTO.sum,
		temporality: MetrictypesTemporalityDTO.cumulative,
		unit: '',
		samples: 980_640,
		timeseries: 720,
	},
	{
		metricName: 'queue.depth',
		description: 'Jobs waiting in the worker queue',
		type: MetrictypesTypeDTO.gauge,
		temporality: MetrictypesTemporalityDTO.unspecified,
		unit: '',
		samples: 612_480,
		timeseries: 410,
	},
	{
		metricName: 'nginx.requests',
		description: 'Requests served by the ingress',
		type: MetrictypesTypeDTO.sum,
		temporality: MetrictypesTemporalityDTO.delta,
		unit: '',
		samples: 420_310,
		timeseries: 260,
	},
	{
		metricName: 'service.availability',
		description: 'Share of successful probes over the window',
		type: MetrictypesTypeDTO.gauge,
		temporality: MetrictypesTemporalityDTO.unspecified,
		unit: 'percent',
		samples: 210_900,
		timeseries: 120,
	},
	{
		metricName: 'checkout.cart.items',
		description: 'Items per cart at checkout',
		type: MetrictypesTypeDTO.histogram,
		temporality: MetrictypesTemporalityDTO.delta,
		unit: '',
		samples: 96_240,
		timeseries: 60,
	},
];

export const METRIC_MAX = METRICS.length;

const seedOf = (metricName: string): MetricSeed =>
	METRICS.find((metric) => metric.metricName === metricName) ?? METRICS[0];

/** Sums are monotonic unless the metric is a non-monotonic cumulative gauge. */
const isMonotonic = ({ type }: MetricSeed): boolean =>
	type === MetrictypesTypeDTO.sum ||
	type === MetrictypesTypeDTO.histogram ||
	type === MetrictypesTypeDTO.exponentialhistogram;

/**
 * What the drawer opens on, one per branch it has: only a gauge offers Inspect,
 * and only a sum carries a temporality worth showing.
 */
export const DRAWER_METRIC_TYPES = ['gauge', 'sum', 'histogram'] as const;

export type DrawerMetricType = (typeof DRAWER_METRIC_TYPES)[number];

const DRAWER_METRICS: Record<DrawerMetricType, string> = {
	gauge: 'container_cpu_utilization',
	sum: 'http.server.request.count',
	histogram: 'http.server.duration',
};

export const drawerMetricName = (type: DrawerMetricType): string =>
	DRAWER_METRICS[type];

/**
 * The metrics the explorer plots, in the order the query builder adds them.
 * Their units differ, which is what makes the page force one chart per query.
 */
export const EXPLORER_METRICS = [
	'container_cpu_utilization',
	'k8s.pod.memory.usage',
	'http.server.request.count',
] as const;

export const explorerMetricNames = (count: number): string[] => [
	...EXPLORER_METRICS.slice(0, count),
];

export const metricTypeOf = (metricName: string): MetrictypesTypeDTO =>
	seedOf(metricName).type;

export const metricTemporalityOf = (
	metricName: string,
): MetrictypesTemporalityDTO => seedOf(metricName).temporality;

export const metricIsMonotonic = (metricName: string): boolean =>
	isMonotonic(seedOf(metricName));

const statOf = ({
	metricName,
	description,
	type,
	unit,
	samples,
	timeseries,
}: MetricSeed): MetricsexplorertypesStatDTO => ({
	metricName,
	description,
	type,
	unit,
	samples,
	timeseries,
});

interface Page {
	offset: number;
	limit: number;
}

/**
 * `total` is what the table paginates on, so it answers the control's count
 * while `metrics` only carries the page that was asked for.
 */
export const metricsStatsResponse = (
	count: number,
	{ offset, limit }: Page,
): GetMetricsStats200 => ({
	status: 'success',
	data: {
		total: count,
		metrics: METRICS.slice(0, count)
			.slice(offset, offset + limit)
			.map(statOf),
	},
});

const treemapEntries = (
	count: number,
	value: (seed: MetricSeed) => number,
): MetricsexplorertypesTreemapEntryDTO[] => {
	const seeds = METRICS.slice(0, count);
	const total = seeds.reduce((sum, seed) => sum + value(seed), 0);

	return seeds.map((seed) => ({
		metricName: seed.metricName,
		totalValue: value(seed),
		percentage: total > 0 ? (value(seed) / total) * 100 : 0,
	}));
};

/** Both modes come back on one response; the tile switcher picks between them. */
export const metricsTreemapResponse = (
	count: number,
): GetMetricsTreemap200 => ({
	status: 'success',
	data: {
		samples: treemapEntries(count, (seed) => seed.samples),
		timeseries: treemapEntries(count, (seed) => seed.timeseries),
	},
});

export const listMetricsResponse = (searchText: string): ListMetrics200 => {
	const search = searchText.toLowerCase();

	return {
		status: 'success',
		data: {
			metrics: METRICS.filter((metric) =>
				metric.metricName.toLowerCase().includes(search),
			).map(({ metricName, description, type, unit, temporality }) => ({
				metricName,
				description,
				type,
				unit,
				temporality,
				isMonotonic: isMonotonic(seedOf(metricName)),
			})),
		},
	};
};

export const metricMetadataResponse = (
	metricName: string,
): GetMetricMetadata200 => {
	const seed = seedOf(metricName);

	return {
		status: 'success',
		data: {
			description: seed.description,
			type: seed.type,
			unit: seed.unit,
			temporality: seed.temporality,
			isMonotonic: isMonotonic(seed),
		},
	};
};

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export const metricHighlightsResponse = (
	metricName: string,
	now: number,
): GetMetricHighlights200 => {
	const seed = seedOf(metricName);

	return {
		status: 'success',
		data: {
			activeTimeSeries: Math.round(seed.timeseries * 0.82),
			totalTimeSeries: seed.timeseries,
			dataPoints: seed.samples,
			lastReceived: now - FIVE_MINUTES_IN_MS,
		},
	};
};

const ATTRIBUTES: { key: string; values: string[] }[] = [
	{
		key: 'service.name',
		values: ['frontend', 'checkout', 'payments', 'cart', 'auth'],
	},
	{
		key: 'deployment.environment',
		values: ['production', 'staging'],
	},
	{
		key: 'k8s.cluster.name',
		values: ['us-east-1-prod', 'eu-west-1-prod'],
	},
	{
		key: 'k8s.namespace.name',
		values: ['default', 'checkout', 'observability'],
	},
	{
		key: 'http.route',
		values: ['/api/orders', '/api/cart', '/api/checkout', '/healthz'],
	},
	{ key: 'http.method', values: ['GET', 'POST', 'PUT', 'DELETE'] },
	{ key: 'http.status_code', values: ['200', '201', '404', '500', '503'] },
	{ key: 'host.name', values: ['ip-10-0-1-42', 'ip-10-0-2-17'] },
	{ key: 'container.name', values: ['app', 'sidecar'] },
	{ key: 'telemetry.sdk.language', values: ['go', 'java', 'nodejs', 'python'] },
];

export const ATTRIBUTE_MAX = ATTRIBUTES.length;

/**
 * `valueCount` is the cardinality of the key, which the drawer shows next to the
 * values it actually returns, so it stays above the length of the sample.
 */
export const metricAttributesResponse = (
	count: number,
): GetMetricAttributes200 => {
	const attributes = ATTRIBUTES.slice(0, count);

	return {
		status: 'success',
		data: {
			totalKeys: attributes.length,
			attributes: attributes.map(({ key, values }, index) => ({
				key,
				values,
				valueCount: values.length + index * 3,
			})),
		},
	};
};

const DASHBOARD_PANELS: { dashboard: string; panel: string }[] = [
	{ dashboard: 'API latency overview', panel: 'p99 by route' },
	{ dashboard: 'Kubernetes capacity', panel: 'CPU utilization by pod' },
	{ dashboard: 'Checkout funnel', panel: 'Requests per minute' },
	{ dashboard: 'Ingress health', panel: 'Error rate' },
	{ dashboard: 'Cost overview', panel: 'Series per metric' },
	{ dashboard: 'On-call board', panel: 'Saturation' },
];

const ALERT_NAMES = [
	'High p99 latency',
	'Pod memory above limit',
	'Error rate over 5%',
	'Queue backing up',
	'Availability under SLO',
	'Kafka consumer falling behind',
];

export const RELATED_ASSET_MAX = DASHBOARD_PANELS.length;

export const metricDashboardsResponse = (
	count: number,
): GetMetricDashboardsV2200 => ({
	status: 'success',
	data: {
		dashboards: DASHBOARD_PANELS.slice(0, count).map(
			({ dashboard, panel }, index) => ({
				dashboardId: `storybook-dashboard-${index + 1}`,
				dashboardName: dashboard,
				panelId: `storybook-panel-${index + 1}`,
				panelName: panel,
			}),
		),
	},
});

export const metricAlertsResponse = (count: number): GetMetricAlerts200 => ({
	status: 'success',
	data: {
		alerts: ALERT_NAMES.slice(0, count).map((alertName, index) => ({
			alertId: `storybook-alert-${index + 1}`,
			alertName,
		})),
	},
});

interface Window {
	start: number;
	end: number;
}

const INSPECT_LABELS: { service: string; pod: string }[] = [
	{ service: 'frontend', pod: 'frontend-9d3e77' },
	{ service: 'checkout', pod: 'checkout-7b9f4d' },
	{ service: 'payments', pod: 'payments-5c8a12' },
	{ service: 'cart', pod: 'cart-2f7b31' },
	{ service: 'auth', pod: 'auth-84cd09' },
	{ service: 'notifications', pod: 'notify-61ba55' },
	{ service: 'search', pod: 'search-3ac902' },
	{ service: 'recommendations', pod: 'recs-77de41' },
];

export const INSPECT_SERIES_MAX = INSPECT_LABELS.length;

const POINTS_PER_SERIES = 40;

/**
 * The inspect graph reads one point per series per timestamp, so every series
 * carries the same timestamps and only the values differ.
 */
export const inspectMetricsResponse = (
	count: number,
	{ start, end }: Window,
): InspectMetrics200 => {
	const step = (end - start) / Math.max(POINTS_PER_SERIES - 1, 1);

	return {
		status: 'success',
		data: {
			series: INSPECT_LABELS.slice(0, count).map(({ service, pod }, index) => ({
				labels: [
					{ key: { name: 'service.name' }, value: service },
					{ key: { name: 'k8s.pod.name' }, value: pod },
				],
				values: Array.from({ length: POINTS_PER_SERIES }, (_unused, point) => ({
					timestamp: Math.round(start + point * step),
					value:
						0.42 +
						0.18 * Math.sin((point + index * 4) / 5) +
						0.06 * Math.cos((point + index) / 3),
				})),
			})),
		},
	};
};

interface ReductionRuleSeed {
	metricName: string;
	matchType: MetricreductionruletypesMatchTypeDTO;
	labels: string[];
	reduction: number;
}

const REDUCTION_RULES: ReductionRuleSeed[] = [
	{
		metricName: 'http.server.duration',
		matchType: MetricreductionruletypesMatchTypeDTO.drop,
		labels: ['http.url', 'http.user_agent'],
		reduction: 0.68,
	},
	{
		metricName: 'signoz_latency_bucket',
		matchType: MetricreductionruletypesMatchTypeDTO.keep,
		labels: ['service.name', 'operation'],
		reduction: 0.54,
	},
	{
		metricName: 'container_cpu_utilization',
		matchType: MetricreductionruletypesMatchTypeDTO.drop,
		labels: ['container.id'],
		reduction: 0.47,
	},
	{
		metricName: 'k8s.pod.memory.usage',
		matchType: MetricreductionruletypesMatchTypeDTO.keep,
		labels: ['k8s.namespace.name', 'k8s.pod.name'],
		reduction: 0.41,
	},
	{
		metricName: 'http.server.request.count',
		matchType: MetricreductionruletypesMatchTypeDTO.drop,
		labels: ['http.target'],
		reduction: 0.36,
	},
	{
		metricName: 'system.cpu.time',
		matchType: MetricreductionruletypesMatchTypeDTO.drop,
		labels: ['cpu', 'state'],
		reduction: 0.32,
	},
	{
		metricName: 'kafka.consumer.lag',
		matchType: MetricreductionruletypesMatchTypeDTO.keep,
		labels: ['topic', 'consumer_group'],
		reduction: 0.28,
	},
	{
		metricName: 'runtime.jvm.gc.duration',
		matchType: MetricreductionruletypesMatchTypeDTO.drop,
		labels: ['gc.name'],
		reduction: 0.24,
	},
	{
		metricName: 'db.client.connections.usage',
		matchType: MetricreductionruletypesMatchTypeDTO.keep,
		labels: ['pool.name'],
		reduction: 0.19,
	},
	{
		metricName: 'redis.command.duration',
		matchType: MetricreductionruletypesMatchTypeDTO.drop,
		labels: ['command'],
		reduction: 0.15,
	},
	{
		metricName: 'otelcol_receiver_accepted_metric_points',
		matchType: MetricreductionruletypesMatchTypeDTO.drop,
		labels: ['receiver'],
		reduction: 0.12,
	},
	{
		metricName: 'queue.depth',
		matchType: MetricreductionruletypesMatchTypeDTO.keep,
		labels: ['queue.name'],
		reduction: 0.08,
	},
	{
		metricName: 'nginx.requests',
		matchType: MetricreductionruletypesMatchTypeDTO.drop,
		labels: ['upstream'],
		reduction: 0.06,
	},
	{
		metricName: 'checkout.cart.items',
		matchType: MetricreductionruletypesMatchTypeDTO.keep,
		labels: ['store.id'],
		reduction: 0.04,
	},
];

export const REDUCTION_RULE_MAX = REDUCTION_RULES.length;

const RULE_UPDATED_AT = '2026-08-20T09:24:00Z';

const RULE_EFFECTIVE_FROM = '2026-08-20T09:29:00Z';

const ruleOf = (
	seed: ReductionRuleSeed,
	index: number,
	pending: boolean,
): MetricreductionruletypesGettableReductionRuleDTO => {
	const { samples, timeseries } = seedOf(seed.metricName);

	return {
		id: `storybook-reduction-rule-${index + 1}`,
		metricName: seed.metricName,
		matchType: seed.matchType,
		labels: seed.labels,
		// A rule takes about five minutes to take effect; until then the table
		// badges it as pending.
		active: !(pending && index % 4 === 0),
		effectiveFrom: RULE_EFFECTIVE_FROM,
		ingestedSeries: timeseries,
		retainedSeries: Math.round(timeseries * (1 - seed.reduction)),
		ingestedSamples: samples,
		retainedSamples: Math.round(samples * (1 - seed.reduction)),
		updatedAt: RULE_UPDATED_AT,
		updatedBy: 'ada@signoz.io',
		createdAt: RULE_UPDATED_AT,
		createdBy: 'ada@signoz.io',
	};
};

/**
 * The metric details drawer asks for one metric's rule, the tab asks for a page
 * of all of them, and both read `rules[0]` off the same response.
 */
export const reductionRulesResponse = (
	count: number,
	{ offset, limit }: Page,
	pending: boolean,
	metricName?: string | null,
): ListMetricReductionRules200 => {
	const configured = REDUCTION_RULES.slice(0, count)
		.map((seed, index) => ({ seed, index }))
		.filter(({ seed }) => !metricName || seed.metricName === metricName);

	const page = metricName
		? configured
		: configured.slice(offset, offset + limit);

	return {
		status: 'success',
		data: {
			total: configured.length,
			rules: page.map(({ seed, index }) => ruleOf(seed, index, pending)),
		},
	};
};

const DOLLARS_PER_SERIES_PER_MONTH = 0.006;

/**
 * The stat tiles compare ingested against retained across every rule, so the
 * totals are the sum over the rules the list answers with.
 */
export const reductionRuleStatsResponse = (
	count: number,
): GetMetricReductionRuleStats200 => {
	const seeds = REDUCTION_RULES.slice(0, count);

	const totals = seeds.reduce(
		(sum, seed) => {
			const { samples, timeseries } = seedOf(seed.metricName);

			return {
				ingestedSeries: sum.ingestedSeries + timeseries,
				retainedSeries:
					sum.retainedSeries + Math.round(timeseries * (1 - seed.reduction)),
				ingestedSamples: sum.ingestedSamples + samples,
				retainedSamples:
					sum.retainedSamples + Math.round(samples * (1 - seed.reduction)),
			};
		},
		{
			ingestedSeries: 0,
			retainedSeries: 0,
			ingestedSamples: 0,
			retainedSamples: 0,
		},
	);

	return {
		status: 'success',
		data: {
			...totals,
			estimatedMonthlySavingsUsd:
				(totals.ingestedSeries - totals.retainedSeries) *
				DOLLARS_PER_SERIES_PER_MONTH,
		},
	};
};

const VOLUME_BUCKETS = 24;

/**
 * The bar chart looks the two series up by label value, so `ingested` and
 * `retained` are the labels the response has to carry.
 */
export const reductionRuleTimeseriesResponse = (
	count: number,
	{ start, end }: Window,
): GetMetricReductionRuleTimeseries200 => {
	const step = (end - start) / Math.max(VOLUME_BUCKETS - 1, 1);
	const { data } = reductionRuleStatsResponse(count);

	const bucketValues = (total: number): { timestamp: number; value: number }[] =>
		Array.from({ length: VOLUME_BUCKETS }, (_unused, index) => ({
			timestamp: Math.round(start + index * step),
			value: Math.round(
				(total / VOLUME_BUCKETS) * (1 + 0.18 * Math.sin(index / 3)),
			),
		}));

	return {
		status: 'success',
		data: {
			type: Querybuildertypesv5RequestTypeDTO.time_series,
			data: {
				results: [
					{
						queryName: 'volume',
						aggregations: [
							{
								index: 0,
								series: [
									{
										labels: [{ key: { name: 'kind' }, value: 'ingested' }],
										values: bucketValues(data.ingestedSeries),
									},
									{
										labels: [{ key: { name: 'kind' }, value: 'retained' }],
										values: bucketValues(data.retainedSeries),
									},
								],
							},
						],
					},
				],
			},
		},
	};
};

const VIEW_NAMES = [
	'Container CPU by namespace',
	'Pod memory saturation',
	'Kafka lag by topic',
	'JVM GC pressure',
	'Ingress request rate',
	'Payment latency p99',
];

export const SAVED_VIEW_MAX = VIEW_NAMES.length;

/** The jest fixture is the shape of a view; only what the list shows changes. */
const [baseView] = explorerView.data as unknown as ViewProps[];

export const metricsSavedViewsResponse = (count: number): AllViewsProps => ({
	status: 'success',
	data: VIEW_NAMES.slice(0, count).map((name, index) => ({
		...baseView,
		id: `storybook-metrics-view-${index + 1}`,
		name,
		sourcePage: DataSource.METRICS,
		tags: ['metrics'],
		createdBy: 'ada@signoz.io',
		extraData: '{"color":"#7cd4fd"}',
	})),
});

const FIELD_KEYS = [
	'service.name',
	'deployment.environment',
	'k8s.cluster.name',
	'k8s.namespace.name',
	'k8s.pod.name',
	'host.name',
	'http.route',
	'http.method',
	'http.status_code',
	'container.name',
];

const FIELD_VALUES: Record<string, string[]> = Object.fromEntries(
	ATTRIBUTES.map(({ key, values }) => [key, values]),
);

const matching = (values: readonly string[], searchText: string): string[] => {
	const search = searchText.toLowerCase();

	return values.filter((value) => value.toLowerCase().includes(search));
};

export const metricFieldKeys = (searchText: string | null): string[] =>
	matching(FIELD_KEYS, searchText ?? '');

export const metricFieldValues = (
	name: string | null,
	searchText: string | null,
): string[] => matching(FIELD_VALUES[name ?? ''] ?? [], searchText ?? '');
