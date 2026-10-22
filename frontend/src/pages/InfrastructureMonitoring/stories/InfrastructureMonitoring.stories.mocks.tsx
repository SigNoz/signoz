/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import ROUTES from 'constants/routes';
import {
	INFRA_MONITORING_ATTR_KEYS,
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
	VIEWS,
} from 'container/InfraMonitoringK8sV2/constants';
import type {
	QueryEnvelope,
	QueryRangeRequestV5,
	RawRow,
	TimeSeries,
} from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { MockControl, StoryMocks } from '@/storybook/controls/types';
import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';
import {
	queryRangeV5RawResponse,
	queryRangeV5ScalarResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	CHECKS_STATES,
	type ChecksState,
	entityForChecksType,
	entityForResource,
	entityEventRows,
	entityLogRows,
	entitySelection,
	entityTraceRows,
	GROUP_BY_KEY_BY_ENTITY,
	type InfraEntity,
	infraChecksResponse,
	infraFieldKeys,
	infraFieldValues,
	infraListResponse,
	type MetricScale,
	metricScale,
	RATIO_SCALE,
} from './__story_mockdata__/infraMonitoring';

const LIST = 'Infra · list';
const CHECKS = 'Infra · checks';
const DRAWER = 'Infra · drawer';

const EMPTY_REASONS = ['no-results', 'before-retention'] as const;

type EmptyReason = (typeof EMPTY_REASONS)[number];

/**
 * The drawer tabs each entity ends up with: `K8sBaseDetailsContent` starts from
 * all four signals, Hosts turns events off, Volumes hides the strip entirely,
 * and the workload entities add the by-pod metrics tab.
 */
const DRAWER_TABS_BY_ENTITY: Record<InfraEntity, readonly VIEWS[]> = {
	[InfraMonitoringEntity.HOSTS]: [VIEWS.METRICS, VIEWS.LOGS, VIEWS.TRACES],
	[InfraMonitoringEntity.PODS]: [
		VIEWS.METRICS,
		VIEWS.LOGS,
		VIEWS.TRACES,
		VIEWS.EVENTS,
	],
	[InfraMonitoringEntity.NODES]: [
		VIEWS.METRICS,
		VIEWS.LOGS,
		VIEWS.TRACES,
		VIEWS.EVENTS,
	],
	[InfraMonitoringEntity.CLUSTERS]: [
		VIEWS.METRICS,
		VIEWS.LOGS,
		VIEWS.TRACES,
		VIEWS.EVENTS,
	],
	[InfraMonitoringEntity.NAMESPACES]: [
		VIEWS.METRICS,
		VIEWS.LOGS,
		VIEWS.TRACES,
		VIEWS.EVENTS,
		VIEWS.POD_METRICS,
	],
	[InfraMonitoringEntity.DEPLOYMENTS]: [
		VIEWS.METRICS,
		VIEWS.LOGS,
		VIEWS.TRACES,
		VIEWS.EVENTS,
		VIEWS.POD_METRICS,
	],
	[InfraMonitoringEntity.JOBS]: [
		VIEWS.METRICS,
		VIEWS.LOGS,
		VIEWS.TRACES,
		VIEWS.EVENTS,
		VIEWS.POD_METRICS,
	],
	[InfraMonitoringEntity.DAEMONSETS]: [
		VIEWS.METRICS,
		VIEWS.LOGS,
		VIEWS.TRACES,
		VIEWS.EVENTS,
		VIEWS.POD_METRICS,
	],
	[InfraMonitoringEntity.STATEFULSETS]: [
		VIEWS.METRICS,
		VIEWS.LOGS,
		VIEWS.TRACES,
		VIEWS.EVENTS,
		VIEWS.POD_METRICS,
	],
	[InfraMonitoringEntity.VOLUMES]: [VIEWS.METRICS],
};

interface InfraListBody {
	filter?: { expression?: string; filterByStatus?: string };
	groupBy?: { name: string }[];
	offset?: number;
	limit?: number;
}

interface RouteValues {
	groupRows: boolean;
	drawer: boolean;
	drawerTab: VIEWS;
}

const infraRoute = (
	entity: InfraEntity,
	{ groupRows, drawer, drawerTab }: RouteValues,
): string => {
	const isHosts = entity === InfraMonitoringEntity.HOSTS;

	const pathname = isHosts
		? ROUTES.INFRASTRUCTURE_MONITORING_HOSTS
		: ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES;

	const params = new URLSearchParams();

	if (!isHosts) {
		params.set(INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY, entity);
	}

	if (groupRows) {
		params.set(
			INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY,
			JSON.stringify([GROUP_BY_KEY_BY_ENTITY[entity]]),
		);
	}

	if (drawer) {
		const selection = entitySelection(entity);

		params.set(
			INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM,
			selection.selectedItem,
		);
		params.set(INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW, drawerTab);

		if (selection.clusterName) {
			params.set(
				INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_CLUSTER_NAME,
				selection.clusterName,
			);
		}

		if (selection.namespaceName) {
			params.set(
				INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_NAMESPACE_NAME,
				selection.namespaceName,
			);
		}
	}

	const search = params.toString();

	return search ? `${pathname}?${search}` : pathname;
};

type QuerySpec = QueryEnvelope['spec'];

const specOf = (body: QueryRangeRequestV5): QuerySpec | undefined =>
	body.compositeQuery?.queries?.[0]?.spec;

const signalOf = (body: QueryRangeRequestV5): string | undefined => {
	const spec = specOf(body);

	return spec && 'signal' in spec ? spec.signal : undefined;
};

const metricNameOf = (spec: QuerySpec): string | undefined => {
	if (!('aggregations' in spec)) {
		return undefined;
	}

	const [aggregation] = spec.aggregations ?? [];

	return aggregation && 'metricName' in aggregation
		? aggregation.metricName
		: undefined;
};

/**
 * The percentage widgets disable their operand queries and plot a `A/B` formula
 * over them, so a response has to answer per query name: the formula reads as a
 * ratio, the raw queries in the unit of the metric they ask for.
 */
const plottedQueries = (body: QueryRangeRequestV5): QueryEnvelope[] => {
	const queries = body.compositeQuery?.queries ?? [];

	const plotted = queries.filter(
		({ spec }) => !('disabled' in spec && spec.disabled),
	);

	return plotted.length > 0 ? plotted : queries;
};

const scaleOf = ({ type, spec }: QueryEnvelope): MetricScale =>
	type === 'builder_formula' ? RATIO_SCALE : metricScale(metricNameOf(spec));

const groupByKeysOf = (spec: QuerySpec): string[] =>
	'groupBy' in spec ? (spec.groupBy ?? []).map(({ name }) => name) : [];

/**
 * A formula carries no group-by of its own: it is grouped by whatever the
 * queries it combines were, and those are the disabled ones, so its keys come
 * off every query in the request.
 */
const groupByKeysFor = (
	query: QueryEnvelope,
	queries: QueryEnvelope[],
): string[] => {
	const own = groupByKeysOf(query.spec);

	if (own.length > 0 || query.type !== 'builder_formula') {
		return own;
	}

	return [...new Set(queries.flatMap(({ spec }) => groupByKeysOf(spec)))];
};

/** Series a grouped widget draws, which is how many the by-pod charts legend. */
const GROUPED_SERIES = 4;

const labelValue = (key: string, index: number): string => {
	const pool = infraFieldValues(key);

	return pool.length > 0 ? pool[index % pool.length] : `${key}-${index + 1}`;
};

const seriesFor = (
	query: QueryEnvelope,
	queries: QueryEnvelope[],
	{ start, end }: Pick<QueryRangeRequestV5, 'start' | 'end'>,
	seed: number,
): TimeSeries[] => {
	const scale = scaleOf(query);
	const keys = groupByKeysFor(query, queries);

	if (keys.length === 0) {
		return [
			{ labels: [], values: timeSeriesPoints({ start, end, seed, ...scale }) },
		];
	}

	return Array.from({ length: GROUPED_SERIES }, (_unused, index) => ({
		labels: keys.map((name) => ({
			key: { name },
			value: labelValue(name, index),
		})),
		values: timeSeriesPoints({ start, end, seed: seed + index * 3, ...scale }),
	}));
};

/**
 * Events and logs are the same signal on the same endpoint; the events tab is
 * the one that filters on `k8s.object.kind`.
 */
const isEventsQuery = (body: QueryRangeRequestV5): boolean => {
	const spec = specOf(body);
	const expression =
		spec && 'filter' in spec ? spec.filter?.expression : undefined;

	return Boolean(
		expression?.includes(INFRA_MONITORING_ATTR_KEYS.K8S_OBJECT_KIND),
	);
};

/** A type alias, not an interface: `MockControlMap` needs an index signature. */
export type InfraControls = {
	rows: MockControl<number>;
	groupRows: MockControl<boolean>;
	warning: MockControl<boolean>;
	emptyReason: MockControl<EmptyReason>;
	checks: MockControl<ChecksState>;
	drawer: MockControl<boolean>;
	drawerTab: MockControl<VIEWS>;
	telemetryRows: MockControl<number>;
};

const infraControls = (entity: InfraEntity): InfraControls => ({
	rows: countControl('Rows', {
		group: LIST,
		description:
			'Rows the endpoint has. The table asks for as many as fit its height, so a higher count paginates.',
		value: 20,
		max: 40,
	}),
	groupRows: toggleControl('Group rows', {
		group: LIST,
		description: `Answers with a grouped_list: one expandable row per value of ${GROUP_BY_KEY_BY_ENTITY[entity]}.`,
		value: false,
	}),
	warning: toggleControl('Query warning', {
		group: LIST,
		description: 'Attaches a warning to the response, next to the pagination.',
		value: false,
	}),
	emptyReason: choiceControl<EmptyReason>('Empty state', {
		group: LIST,
		description: 'Which empty state the table shows when Rows is 0.',
		options: EMPTY_REASONS,
		value: 'no-results',
	}),
	checks: choiceControl<ChecksState>('Instrumentation checks', {
		group: CHECKS,
		description:
			'The callout above the table. `ready` and `no-checks` both hide it, which is what a fully instrumented cluster shows.',
		options: CHECKS_STATES,
		value: 'missing',
	}),
	drawer: toggleControl('Details drawer', {
		group: DRAWER,
		description: 'Opens the drawer on the first row.',
		value: false,
	}),
	drawerTab: choiceControl<VIEWS>('Drawer tab', {
		group: DRAWER,
		description:
			'The tabs this entity has. Volumes hides its tab strip, so there the drawer only ever shows metrics.',
		options: DRAWER_TABS_BY_ENTITY[entity],
		value: VIEWS.METRICS,
	}),
	telemetryRows: countControl('Drawer log and trace rows', {
		group: DRAWER,
		value: 12,
		max: 20,
	}),
});

/**
 * The mocks both module tabs run on: the list endpoint of one entity, its
 * instrumentation checks, the attribute keys its filters offer, and the drawer's
 * metrics, logs, traces and events. The entity decides the route the story
 * starts on, so the Kubernetes tab passes its category and the Hosts tab does
 * not pass one at all.
 */
export const infraStoryMocks = (
	entity: InfraEntity,
): StoryMocks<InfraControls> =>
	defineStoryMocks({
		controls: infraControls(entity),
		handlers: (values, response) => [
			rest.get(
				'http://localhost/api/v2/infra_monitoring/checks',
				response.json((req) =>
					infraChecksResponse(
						entityForChecksType(req.url.searchParams.get('type')) ?? entity,
						values.checks,
					),
				),
			),

			rest.post(
				'http://localhost/api/v2/infra_monitoring/:resource',
				response.json(async (req) => {
					const requested = entityForResource(String(req.params.resource));
					const body = (await req.json()) as InfraListBody;

					// The drawer asks the same endpoint for one record; everything else is
					// the table, its grouped rows or an expanded group.
					const isDetailsFetch = body.limit === 1;

					return infraListResponse({
						entity: requested ?? entity,
						count: isDetailsFetch ? Math.max(values.rows, 1) : values.rows,
						offset: body.offset ?? 0,
						limit: body.limit ?? 10,
						groupBy: body.groupBy?.map(({ name }) => name),
						status: body.filter?.filterByStatus,
						warning: values.warning && !isDetailsFetch,
						endTimeBeforeRetention:
							values.rows === 0 && values.emptyReason === 'before-retention',
					});
				}),
			),

			rest.get(
				'http://localhost/api/v1/fields/keys',
				response.json(() => fieldKeysResponse(infraFieldKeys(entity))),
			),

			rest.get(
				'http://localhost/api/v1/fields/values',
				response.json((req) =>
					fieldValuesResponse(infraFieldValues(req.url.searchParams.get('name'))),
				),
			),

			rest.post(
				'http://localhost/api/v5/query_range',
				response.json(async (req) => {
					const body = (await req.json()) as QueryRangeRequestV5;
					const { start, end, requestType } = body;

					if (requestType === 'raw') {
						const rows = ((): RawRow[] => {
							if (signalOf(body) === 'traces') {
								return entityTraceRows(start, end, values.telemetryRows);
							}

							return isEventsQuery(body)
								? entityEventRows(start, end, values.telemetryRows)
								: entityLogRows(start, end, values.telemetryRows);
						})();

						return queryRangeV5RawResponse(rows);
					}

					const queries = body.compositeQuery?.queries ?? [];
					const plotted = plottedQueries(body);

					if (requestType === 'scalar') {
						return queryRangeV5ScalarResponse(scaleOf(plotted[0]).base);
					}

					return queryRangeV5TimeSeriesResponse(
						plotted.map((query, index) => ({
							queryName: 'name' in query.spec ? (query.spec.name ?? 'A') : 'A',
							series: seriesFor(query, queries, { start, end }, index),
						})),
					);
				}),
			),
		],
		config: (values) => ({ route: infraRoute(entity, values) }),
	});

export const infraMonitoringMocks = infraStoryMocks(
	InfraMonitoringEntity.HOSTS,
);
