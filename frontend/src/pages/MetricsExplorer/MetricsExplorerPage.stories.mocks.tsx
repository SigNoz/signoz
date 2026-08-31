/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import setLocalStorage from 'api/browser/localstorage/set';
import type {
	MetricsexplorertypesInspectMetricsRequestDTO,
	MetricsexplorertypesStatsRequestDTO,
} from 'api/generated/services/sigNoz.schemas';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { getMetricDetailsQuery } from 'container/MetricsExplorer/MetricDetails/utils';
import {
	IS_INSPECT_MODAL_OPEN_KEY,
	IS_METRIC_DETAILS_OPEN_KEY,
	METRICS_TABLE_PAGE_SIZE,
	SELECTED_METRIC_NAME_KEY,
} from 'container/MetricsExplorer/Summary/constants';
import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { rest } from 'msw';
import type { AppState } from 'store/reducers';
import { defaultFeatureFlags } from 'tests/fixtures/appContextMock';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryRangeRequestV5, TimeSeries } from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import { dashboardsForUserResponse } from '@/storybook/msw/__story_mockdata__/dashboards';
import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';
import {
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	ATTRIBUTE_MAX,
	DRAWER_METRIC_TYPES,
	type DrawerMetricType,
	drawerMetricName,
	explorerMetricNames,
	INSPECT_SERIES_MAX,
	inspectMetricsResponse,
	listMetricsResponse,
	METRIC_MAX,
	metricAlertsResponse,
	metricAttributesResponse,
	metricDashboardsResponse,
	metricFieldKeys,
	metricFieldValues,
	metricHighlightsResponse,
	metricIsMonotonic,
	metricMetadataResponse,
	metricTemporalityOf,
	metricTypeOf,
	metricsSavedViewsResponse,
	metricsStatsResponse,
	metricsTreemapResponse,
	REDUCTION_RULE_MAX,
	RELATED_ASSET_MAX,
	reductionRuleStatsResponse,
	reductionRuleTimeseriesResponse,
	reductionRulesResponse,
	SAVED_VIEW_MAX,
} from './__story_mockdata__/metricsExplorer';

const VIEW = 'Metrics · view';
const SUMMARY = 'Metrics · summary';
const EXPLORER = 'Metrics · explorer';
const VOLUME = 'Metrics · volume control';

const METRICS_TABS = [
	'summary',
	'volume-control',
	'explorer',
	'views',
] as const;

type MetricsTab = (typeof METRICS_TABS)[number];

const DRAWER_STATES = ['closed', 'details', 'inspect'] as const;

type DrawerState = (typeof DRAWER_STATES)[number];

const RELATIVE_TIME: Time = '30m';

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

const NANOSECONDS_IN_MS = 1_000_000;

/** The volume chart has no time range of its own: it labels itself last 6 hours. */
const SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;

/**
 * `globalTime` defaults its window from `window.location.pathname`, which in a
 * story is the preview's rather than the page's, so the time picker (reading the
 * route) and the queries (reading the store) would ask for different ranges and
 * the treemap would size tiles against a window the table never asked for.
 */
const timeRange = (): Partial<AppState> => {
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

const QUERY_NAMES = ['A', 'B', 'C'];

/**
 * The staged query the explorer plots, one builder query per metric. The
 * explorer reads the metric names off it, and without one it only offers its
 * "select a metric" placeholder.
 */
const explorerQuery = (count: number): Query => {
	const names = explorerMetricNames(count);

	const queryFor = (metricName: string): Query =>
		getMetricDetailsQuery(
			metricName,
			metricTypeOf(metricName),
			undefined,
			undefined,
			undefined,
			metricIsMonotonic(metricName),
			metricTemporalityOf(metricName),
		);

	const base = queryFor(names[0]);

	return {
		...base,
		id: 'storybook-metrics-explorer-query',
		builder: {
			...base.builder,
			queryData: names.map((metricName, index) => ({
				...queryFor(metricName).builder.queryData[0],
				queryName: QUERY_NAMES[index],
				expression: QUERY_NAMES[index],
			})),
		},
	};
};

interface RouteValues {
	tab: MetricsTab;
	drawer: DrawerState;
	drawerMetric: DrawerMetricType;
	explorerMetrics: number;
}

const metricsRoute = ({
	tab,
	drawer,
	drawerMetric,
	explorerMetrics,
}: RouteValues): string => {
	if (tab === 'views') {
		return ROUTES.METRICS_EXPLORER_VIEWS;
	}

	if (tab === 'volume-control') {
		return ROUTES.METRICS_EXPLORER_VOLUME_CONTROL;
	}

	const params = new URLSearchParams({
		[QueryParams.relativeTime]: RELATIVE_TIME,
	});

	if (tab === 'explorer') {
		params.set(
			QueryParams.compositeQuery,
			JSON.stringify(explorerQuery(explorerMetrics)),
		);
		params.set(QueryParams.panelTypes, JSON.stringify(PANEL_TYPES.TIME_SERIES));

		return `${ROUTES.METRICS_EXPLORER_EXPLORER}?${params.toString()}`;
	}

	if (drawer !== 'closed') {
		params.set(SELECTED_METRIC_NAME_KEY, drawerMetricName(drawerMetric));
		params.set(
			drawer === 'inspect'
				? IS_INSPECT_MODAL_OPEN_KEY
				: IS_METRIC_DETAILS_OPEN_KEY,
			'true',
		);
	}

	return `${ROUTES.METRICS_EXPLORER}?${params.toString()}`;
};

interface MetricScale {
	base: number;
	amplitude: number;
}

const METRIC_SCALES: Record<string, MetricScale> = {
	container_cpu_utilization: { base: 0.42, amplitude: 0.16 },
	'k8s.pod.memory.usage': { base: 620_000_000, amplitude: 140_000_000 },
	'http.server.request.count': { base: 1_840, amplitude: 460 },
};

const DEFAULT_SCALE: MetricScale = { base: 120, amplitude: 40 };

const EXPORT_DASHBOARDS = [
	'API latency overview',
	'Kubernetes capacity',
	'Checkout funnel',
	'Ingress health',
];

const SERIES_SERVICES = [
	'frontend',
	'checkout',
	'payments',
	'cart',
	'auth',
	'search',
];

const metricNameOf = (
	spec: QueryRangeRequestV5['compositeQuery']['queries'][number]['spec'],
): string | undefined => {
	if (!('aggregations' in spec)) {
		return undefined;
	}

	const [aggregation] = spec.aggregations ?? [];

	return aggregation && 'metricName' in aggregation
		? aggregation.metricName
		: undefined;
};

const chartSeries = (
	metricName: string | undefined,
	count: number,
	{ start, end }: { start: number; end: number },
): TimeSeries[] => {
	const scale = METRIC_SCALES[metricName ?? ''] ?? DEFAULT_SCALE;

	return SERIES_SERVICES.slice(0, count).map((service, index) => ({
		labels: [{ key: { name: 'service.name' }, value: service }],
		values: timeSeriesPoints({ start, end, seed: index * 2, ...scale }),
	}));
};

export const metricsMocks = defineStoryMocks({
	controls: {
		tab: choiceControl<MetricsTab>('Tab', {
			group: VIEW,
			description:
				'The four pathnames the module tabs between. Clicking another tab leaves the story, so switch it here.',
			options: METRICS_TABS,
			value: 'summary',
		}),
		drawer: choiceControl<DrawerState>('Metric drawer', {
			group: VIEW,
			description:
				'What the Summary tab opens over the table: the metric details drawer, or the inspect modal.',
			options: DRAWER_STATES,
			value: 'closed',
		}),
		drawerMetric: choiceControl<DrawerMetricType>('Drawer metric', {
			group: VIEW,
			description:
				'Which metric the drawer opens, by type. Only a gauge offers Inspect, so the other two drop that action.',
			options: DRAWER_METRIC_TYPES,
			value: 'gauge',
		}),
		metrics: countControl('Metrics', {
			group: SUMMARY,
			description:
				'Metrics the stats endpoint has. The table asks for ten at a time, so a higher count paginates.',
			value: METRIC_MAX,
			max: METRIC_MAX,
		}),
		treemap: countControl('Treemap tiles', {
			group: SUMMARY,
			description:
				'Metrics the proportion view plots. At 0 it shows its own empty state above a populated table.',
			value: 12,
			max: METRIC_MAX,
		}),
		attributes: countControl('Drawer attributes', {
			group: SUMMARY,
			description: 'Attribute keys the metric details drawer lists.',
			value: 8,
			max: ATTRIBUTE_MAX,
		}),
		relatedAssets: countControl('Dashboards and alerts', {
			group: SUMMARY,
			description:
				'Panels and alert rules the drawer reports the metric is used in. At 0 the popover is gone.',
			value: 4,
			max: RELATED_ASSET_MAX,
		}),
		inspectSeries: countControl('Inspect series', {
			group: SUMMARY,
			description: 'Time series the inspect modal plots for the metric.',
			value: 5,
			max: INSPECT_SERIES_MAX,
		}),
		explorerMetrics: countControl('Explorer metrics', {
			group: EXPLORER,
			description:
				'Metrics in the explorer query. Their units differ, so past one the page forces one chart per query.',
			value: 1,
			max: 3,
		}),
		chartSeries: countControl('Chart series', {
			group: EXPLORER,
			description: 'Series each explorer chart draws.',
			value: 4,
			max: SERIES_SERVICES.length,
		}),
		savedViews: countControl('Saved views', {
			group: EXPLORER,
			description: 'Fills the explorer views dropdown and the Views tab.',
			value: 4,
			max: SAVED_VIEW_MAX,
		}),
		volumeControl: toggleControl('Volume control', {
			group: VOLUME,
			description:
				'The metrics-reduction feature flag the tab hangs off. Off, the module has no Volume Control tab at all.',
			value: true,
		}),
		rules: countControl('Reduction rules', {
			group: VOLUME,
			description:
				'Rules the workspace has configured. The table pages ten at a time and the stat tiles sum all of them.',
			value: REDUCTION_RULE_MAX,
			max: REDUCTION_RULE_MAX,
		}),
		pendingRules: toggleControl('Pending rules', {
			group: VOLUME,
			description:
				'Leaves every fourth rule inactive, which the table badges as pending until it takes effect.',
			value: true,
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v2/metrics/stats',
			response.json(async (req) => {
				const { limit, offset } =
					(await req.json()) as MetricsexplorertypesStatsRequestDTO;

				return metricsStatsResponse(values.metrics, {
					limit: limit ?? METRICS_TABLE_PAGE_SIZE,
					offset: offset ?? 0,
				});
			}),
		),

		rest.post(
			'http://localhost/api/v2/metrics/treemap',
			response.json(() => metricsTreemapResponse(values.treemap)),
		),

		rest.get(
			'http://localhost/api/v2/metrics',
			response.json((req) =>
				listMetricsResponse(req.url.searchParams.get('searchText') ?? ''),
			),
		),

		rest.get(
			'http://localhost/api/v2/metrics/metadata',
			response.json((req) =>
				metricMetadataResponse(req.url.searchParams.get('metricName') ?? ''),
			),
		),

		// The drawer writes description, unit and type back. The metadata a story
		// answers with comes from the catalogue, so the save succeeds and the
		// refetch reads the metric as it was.
		rest.post('http://localhost/api/v2/metrics/metadata', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.get(
			'http://localhost/api/v2/metrics/highlights',
			response.json((req) =>
				metricHighlightsResponse(
					req.url.searchParams.get('metricName') ?? '',
					Date.now(),
				),
			),
		),

		rest.get(
			'http://localhost/api/v2/metrics/attributes',
			response.json(() => metricAttributesResponse(values.attributes)),
		),

		rest.get(
			'http://localhost/api/v3/metrics/dashboards',
			response.json(() => metricDashboardsResponse(values.relatedAssets)),
		),

		rest.get(
			'http://localhost/api/v2/metrics/alerts',
			response.json(() => metricAlertsResponse(values.relatedAssets)),
		),

		rest.post(
			'http://localhost/api/v2/metrics/inspect',
			response.json(async (req) => {
				const { start, end } =
					(await req.json()) as MetricsexplorertypesInspectMetricsRequestDTO;

				return inspectMetricsResponse(values.inspectSeries, { start, end });
			}),
		),

		rest.get(
			'http://localhost/api/v2/metric_reduction_rules',
			response.json((req) => {
				const { searchParams } = req.url;

				return reductionRulesResponse(
					values.rules,
					{
						limit: Number(searchParams.get('limit') ?? METRICS_TABLE_PAGE_SIZE),
						offset: Number(searchParams.get('offset') ?? 0),
					},
					values.pendingRules,
					searchParams.get('metricName'),
				);
			}),
		),

		rest.get(
			'http://localhost/api/v2/metric_reduction_rules/stats',
			response.json(() => reductionRuleStatsResponse(values.rules)),
		),

		rest.get(
			'http://localhost/api/v2/metric_reduction_rules/timeseries',
			response.json(() => {
				const now = Date.now();

				return reductionRuleTimeseriesResponse(values.rules, {
					start: now - SIX_HOURS_IN_MS,
					end: now,
				});
			}),
		),

		rest.get(
			'http://localhost/api/v1/fields/keys',
			response.json((req) =>
				fieldKeysResponse(metricFieldKeys(req.url.searchParams.get('searchText'))),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) =>
				fieldValuesResponse(
					metricFieldValues(
						req.url.searchParams.get('name'),
						req.url.searchParams.get('searchText'),
					),
				),
			),
		),

		rest.get(
			'http://localhost/api/v2/users/me/dashboards',
			response.json(() => dashboardsForUserResponse(EXPORT_DASHBOARDS)),
		),

		rest.get(
			'http://localhost/api/v1/explorer/views',
			response.json(() => metricsSavedViewsResponse(values.savedViews)),
		),

		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) => {
				const body = (await req.json()) as QueryRangeRequestV5;
				const { start, end } = body;
				const queries = body.compositeQuery?.queries ?? [];

				return queryRangeV5TimeSeriesResponse(
					queries.map(({ spec }) => ({
						queryName: 'name' in spec ? (spec.name ?? 'A') : 'A',
						series: chartSeries(metricNameOf(spec), values.chartSeries, {
							start,
							end,
						}),
					})),
				);
			}),
		),
	],
	config: (values) => ({
		route: metricsRoute(values),
		reduxState: timeRange(),
		appContext: {
			featureFlags: [
				...defaultFeatureFlags,
				{
					name: FeatureKeys.ENABLE_METRICS_REDUCTION,
					active: values.volumeControl,
					usage: 0,
					usage_limit: -1,
					route: '',
				},
			],
		},
	}),
	// The table's page size is persisted, so a size picked in a real dev session
	// would decide how many rows the story's first request asks for.
	effect: () => {
		setLocalStorage(
			'k8s-metricsExplorer-page-size',
			String(METRICS_TABLE_PAGE_SIZE),
		);
	},
});
