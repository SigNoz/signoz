/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ListMetrics200 } from 'api/generated/services/sigNoz.schemas';
import {
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import {
	getLogCountWidgetData,
	getLogSizeWidgetData,
	getMetricCountWidgetData,
	getSpanCountWidgetData,
	getSpanSizeWidgetData,
} from 'container/MeterExplorer/Breakdown/graphs';
import { explorerView } from 'mocks-server/__mockdata__/explorer_views';
import type { Widgets } from 'types/api/dashboard/getAll';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { Filter } from 'types/api/quickFilters/getCustomFilters';
import type { TimeSeries } from 'types/api/v5/queryRange';

import { timeSeriesPoints } from '@/storybook/msw/__story_mockdata__/queryRange';

export const METER_TABS = ['meter', 'explorer', 'views'] as const;

export type MeterTab = (typeof METER_TABS)[number];

export const METER_SIGNALS = ['logs', 'traces', 'metrics'] as const;

export type MeterSignal = (typeof METER_SIGNALS)[number];

/** The metrics the meter module emits, as the widgets and the explorer ask for them. */
export const METER_METRICS = [
	'signoz.meter.log.count',
	'signoz.meter.log.size',
	'signoz.meter.span.count',
	'signoz.meter.span.size',
	'signoz.meter.metric.datapoint.count',
] as const;

export type MeterMetric = (typeof METER_METRICS)[number];

/**
 * The metrics as a control names them. Storybook drops URL args containing
 * dots, so a story cannot be linked at a raw metric name.
 */
export const METER_VOLUMES = [
	'log-count',
	'log-size',
	'span-count',
	'span-size',
	'metric-datapoints',
] as const;

export type MeterVolume = (typeof METER_VOLUMES)[number];

const VOLUME_METRICS: Record<MeterVolume, MeterMetric> = {
	'log-count': 'signoz.meter.log.count',
	'log-size': 'signoz.meter.log.size',
	'span-count': 'signoz.meter.span.count',
	'span-size': 'signoz.meter.span.size',
	'metric-datapoints': 'signoz.meter.metric.datapoint.count',
};

export const meterVolumeMetric = (volume: MeterVolume): MeterMetric =>
	VOLUME_METRICS[volume];

interface MeterMetricShape {
	signal: MeterSignal;
	/** Volume of one hourly bucket, which is what the meter aggregates over. */
	perHour: number;
	/** The unit the panels read, as `yAxisUnit`. */
	unit: string;
	description: string;
	/** OpenTelemetry unit, which is what the metric catalogue reports. */
	otelUnit: string;
}

const METRICS: Record<MeterMetric, MeterMetricShape> = {
	'signoz.meter.log.count': {
		signal: 'logs',
		perHour: 52_400_000,
		unit: 'short',
		description: 'Log records ingested',
		otelUnit: '1',
	},
	'signoz.meter.log.size': {
		signal: 'logs',
		perHour: 36_800_000_000,
		unit: 'bytes',
		description: 'Uncompressed size of the log records ingested',
		otelUnit: 'By',
	},
	'signoz.meter.span.count': {
		signal: 'traces',
		perHour: 18_600_000,
		unit: 'short',
		description: 'Spans ingested',
		otelUnit: '1',
	},
	'signoz.meter.span.size': {
		signal: 'traces',
		perHour: 12_400_000_000,
		unit: 'bytes',
		description: 'Uncompressed size of the spans ingested',
		otelUnit: 'By',
	},
	'signoz.meter.metric.datapoint.count': {
		signal: 'metrics',
		perHour: 194_000_000,
		unit: 'short',
		description: 'Metric datapoints ingested',
		otelUnit: '1',
	},
};

const HOUR_IN_MS = 60 * 60 * 1000;

const isMeterMetric = (name: string): name is MeterMetric => name in METRICS;

export const meterMetricSignal = (name: string): MeterSignal | undefined =>
	isMeterMetric(name) ? METRICS[name].signal : undefined;

export const meterVolumeUnit = (volume: MeterVolume): string =>
	METRICS[VOLUME_METRICS[volume]].unit;

interface MeterWindowRequest {
	/** Request window in epoch milliseconds, as `query_range` sends it. */
	start: number;
	end: number;
}

/**
 * One bar per hour of the requested window, capped at a week's worth so a long
 * range stays a chart rather than a wall of bars.
 */
const bucketCount = ({ start, end }: MeterWindowRequest): number =>
	Math.min(Math.max(Math.round((end - start) / HOUR_IN_MS), 1), 168);

export const meterSeries = (
	name: string,
	window: MeterWindowRequest,
): TimeSeries[] => {
	if (!isMeterMetric(name)) {
		return [];
	}

	const { perHour } = METRICS[name];

	return [
		{
			labels: [],
			values: timeSeriesPoints({
				...window,
				points: bucketCount(window),
				base: perHour,
				amplitude: perHour * 0.18,
				seed: METER_METRICS.indexOf(name),
			}),
		},
	];
};

/** The totals row, which sums what the bars of the same window show. */
export const meterTotal = (
	name: string,
	window: MeterWindowRequest,
): number => {
	const values = meterSeries(name, window)[0]?.values ?? [];

	return values.reduce((total, { value }) => total + Number(value), 0);
};

export const METER_TIME_RANGES = [
	'last-1-day',
	'last-30-minutes',
	'august-2025',
] as const;

export type MeterTimeRange = (typeof METER_TIME_RANGES)[number];

export interface MeterTimeWindow {
	/** Epoch nanoseconds, the unit `globalTime` holds. */
	minTime: number;
	maxTime: number;
	selectedTime: Time;
	/** What the time picker reads back off the URL. */
	search: Record<string, string>;
}

const relativeWindow = (
	spanInMs: number,
	selectedTime: Time,
): MeterTimeWindow => {
	const end = Date.now();

	return {
		minTime: (end - spanInMs) * 1e6,
		maxTime: end * 1e6,
		selectedTime,
		search: { relativeTime: selectedTime },
	};
};

/**
 * A day inside the meter's beta phase, which is what the cloud-only accuracy
 * warning reads: the module only vouches for data from 22 August 2025 onwards.
 */
const BETA_PHASE_DAY = {
	start: Date.UTC(2025, 7, 10),
	end: Date.UTC(2025, 7, 11),
};

export const meterTimeWindow = (range: MeterTimeRange): MeterTimeWindow => {
	if (range === 'last-30-minutes') {
		return relativeWindow(30 * 60 * 1000, '30m');
	}

	if (range === 'august-2025') {
		return {
			minTime: BETA_PHASE_DAY.start * 1e6,
			maxTime: BETA_PHASE_DAY.end * 1e6,
			selectedTime: 'custom',
			search: {
				startTime: String(BETA_PHASE_DAY.start),
				endTime: String(BETA_PHASE_DAY.end),
			},
		};
	}

	return relativeWindow(24 * HOUR_IN_MS, '1d');
};

const EXPLORER_WIDGETS: Record<MeterVolume, () => Widgets> = {
	'log-count': getLogCountWidgetData,
	'log-size': getLogSizeWidgetData,
	'span-count': getSpanCountWidgetData,
	'span-size': getSpanSizeWidgetData,
	'metric-datapoints': getMetricCountWidgetData,
};

/**
 * The query the explorer starts on, taken from the breakdown widget for the
 * same metric so the story asks for what the page itself would build.
 */
export const meterExplorerQuery = (volume: MeterVolume): Query =>
	EXPLORER_WIDGETS[volume]().query;

/** The metric picker in the query builder lists what the meter reports. */
export const meterMetricsListResponse = (
	searchText: string,
): ListMetrics200 => {
	const search = searchText.toLowerCase();

	return {
		status: 'success',
		data: {
			metrics: METER_METRICS.filter((name) =>
				name.toLowerCase().includes(search),
			).map((name) => ({
				metricName: name,
				description: METRICS[name].description,
				unit: METRICS[name].otelUnit,
				type: MetrictypesTypeDTO.sum,
				temporality: MetrictypesTemporalityDTO.delta,
				isMonotonic: true,
			})),
		},
	};
};

const QUICK_FILTERS: Filter[] = [
	{ key: 'service.name', dataType: 'string', type: 'resource' },
	{ key: 'deployment.environment', dataType: 'string', type: 'resource' },
	{ key: 'k8s.cluster.name', dataType: 'string', type: 'resource' },
	{ key: 'k8s.namespace.name', dataType: 'string', type: 'resource' },
	{ key: 'host.name', dataType: 'string', type: 'resource' },
	{ key: 'telemetry.sdk.language', dataType: 'string', type: 'resource' },
	{ key: 'cloud.region', dataType: 'string', type: 'resource' },
	{ key: 'signoz.collector.id', dataType: 'string', type: 'resource' },
];

export const meterQuickFiltersResponse = (
	count: number,
): { status: string; data: { filters: Filter[]; signal: string } } => ({
	status: 'success',
	data: { filters: QUICK_FILTERS.slice(0, count), signal: 'meter' },
});

const FIELD_VALUES: Record<string, string[]> = {
	'service.name': [
		'frontend',
		'checkout',
		'payments',
		'cart',
		'inventory',
		'shipping',
	],
	'deployment.environment': ['production', 'staging'],
	'k8s.cluster.name': ['prod-us-east-1', 'prod-eu-west-1', 'staging'],
	'k8s.namespace.name': ['default', 'checkout', 'observability'],
	'host.name': ['ip-10-0-3-14', 'ip-10-0-3-22', 'ip-10-0-4-8'],
	'telemetry.sdk.language': ['go', 'nodejs', 'java', 'python'],
	'cloud.region': ['us-east-1', 'eu-west-1', 'ap-south-1'],
	'signoz.collector.id': ['collector-a1b2', 'collector-c3d4'],
};

export const meterAttributeKeys = [
	...METER_METRICS,
	...Object.keys(FIELD_VALUES),
];

/**
 * `/fields/keys` is asked once per keystroke in the query builder and once per
 * quick filter the panel resolves, both with a `searchText`, so the answer
 * filters the catalogue rather than always returning it whole.
 */
export const meterFieldKeys = (searchText: string | null): string[] => {
	const search = (searchText ?? '').toLowerCase();

	return search
		? meterAttributeKeys.filter((key) => key.toLowerCase().includes(search))
		: meterAttributeKeys;
};

export const meterFieldValues = (name: string | null): string[] =>
	FIELD_VALUES[name ?? ''] ?? [];

const VIEW_NAMES = [
	'Log volume by service',
	'Span size by environment',
	'Datapoints by cluster',
	'Staging spend',
	'Top ingesting namespaces',
	'Collector breakdown',
];

export const savedMeterViewsResponse = (
	count: number,
): { status: string; data: unknown[] } => ({
	status: 'success',
	data: Array.from(
		{ length: Math.min(count, VIEW_NAMES.length) },
		(_unused, index) => ({
			...explorerView.data[0],
			id: `storybook-meter-view-${index + 1}`,
			name: VIEW_NAMES[index],
			sourcePage: 'meter',
			tags: ['meter'],
		}),
	),
});

const DASHBOARD_NAMES = [
	'Cost overview',
	'Ingestion by team',
	'Log volume trend',
	'Telemetry spend',
];

export const exportDashboardsResponse = (): Record<string, unknown> => ({
	status: 'success',
	data: {
		dashboards: DASHBOARD_NAMES.map((name, index) => ({
			id: `storybook-dashboard-${index + 1}`,
			name,
			spec: { display: { name } },
			tags: ['meter'],
		})),
	},
});
