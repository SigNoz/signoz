import { rest } from 'msw';
import ROUTES from 'constants/routes';
import {
	INFRA_MONITORING_ATTR_KEYS,
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from 'container/InfraMonitoringK8sV2/constants';
import type {
	QueryEnvelope,
	QueryRangeRequestV5,
	RawRow,
} from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
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
	entityForResource,
	entityEventRows,
	entityLogRows,
	entitySelection,
	entityTraceRows,
	GROUP_BY_KEY_BY_ENTITY,
	INFRA_TABS,
	type InfraEntity,
	type InfraTab,
	infraChecksResponse,
	infraFieldKeys,
	infraFieldValues,
	infraListResponse,
	K8S_CATEGORIES,
	type MetricScale,
	metricScale,
	RATIO_SCALE,
	type K8sCategory,
} from './__story_mockdata__/infraMonitoring';

const VIEW = 'Infra · view';
const LIST = 'Infra · list';
const CHECKS = 'Infra · checks';
const DRAWER = 'Infra · drawer';

const EMPTY_REASONS = ['no-results', 'before-retention'] as const;

type EmptyReason = (typeof EMPTY_REASONS)[number];

const DRAWER_TABS = ['metrics', 'logs', 'traces', 'events'] as const;

type DrawerTab = (typeof DRAWER_TABS)[number];

interface InfraListBody {
	filter?: { expression?: string; filterByStatus?: string };
	groupBy?: { name: string }[];
	offset?: number;
	limit?: number;
}

const entityOf = (tab: InfraTab, category: K8sCategory): InfraEntity =>
	tab === 'hosts' ? InfraMonitoringEntity.HOSTS : category;

interface RouteValues {
	tab: InfraTab;
	category: K8sCategory;
	groupRows: boolean;
	drawer: boolean;
	drawerTab: DrawerTab;
}

const infraRoute = ({
	tab,
	category,
	groupRows,
	drawer,
	drawerTab,
}: RouteValues): string => {
	const pathname =
		tab === 'hosts'
			? ROUTES.INFRASTRUCTURE_MONITORING_HOSTS
			: ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES;

	const entity = entityOf(tab, category);
	const params = new URLSearchParams();

	if (tab === 'kubernetes') {
		params.set(INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY, category);
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

const specOf = (
	body: QueryRangeRequestV5,
):
	| QueryRangeRequestV5['compositeQuery']['queries'][number]['spec']
	| undefined => body.compositeQuery?.queries?.[0]?.spec;

const signalOf = (body: QueryRangeRequestV5): string | undefined => {
	const spec = specOf(body);

	return spec && 'signal' in spec ? spec.signal : undefined;
};

type QuerySpec = QueryEnvelope['spec'];

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

export const infraMonitoringMocks = defineStoryMocks({
	controls: {
		tab: choiceControl<InfraTab>('Tab', {
			group: VIEW,
			description:
				'The two pathnames the module tabs between. Clicking the other tab leaves the story, so switch it here.',
			options: INFRA_TABS,
			value: 'hosts',
		}),
		category: choiceControl<K8sCategory>('K8s resource', {
			group: VIEW,
			description:
				'The resource the Kubernetes tab lists; the table, the drawer and the instrumentation checks all follow it. The Hosts tab does not read it.',
			options: K8S_CATEGORIES,
			value: InfraMonitoringEntity.PODS,
		}),
		rows: countControl('Rows', {
			group: LIST,
			description:
				'Rows the endpoint has. The table asks for as many as fit its height, so a higher count paginates.',
			value: 20,
			max: 40,
		}),
		groupRows: toggleControl('Group rows', {
			group: LIST,
			description:
				'Answers with a grouped_list: one expandable row per value of os.type on Hosts, of namespace or cluster on Kubernetes.',
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
		drawerTab: choiceControl<DrawerTab>('Drawer tab', {
			group: DRAWER,
			description: 'Hosts has no events tab, so there it falls back to metrics.',
			options: DRAWER_TABS,
			value: 'metrics',
		}),
		telemetryRows: countControl('Drawer log and trace rows', {
			group: DRAWER,
			value: 12,
			max: 20,
		}),
	},
	handlers: (values, response) => {
		const entity = entityOf(values.tab, values.category);

		return [
			rest.get(
				'http://localhost/api/v2/infra_monitoring/checks',
				response.json(() => infraChecksResponse(entity, values.checks)),
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

					const plotted = plottedQueries(body);

					if (requestType === 'scalar') {
						return queryRangeV5ScalarResponse(scaleOf(plotted[0]).base);
					}

					return queryRangeV5TimeSeriesResponse(
						plotted.map((query, index) => ({
							queryName: 'name' in query.spec ? (query.spec.name ?? 'A') : 'A',
							series: [
								{
									labels: [],
									values: timeSeriesPoints({
										start,
										end,
										seed: index,
										...scaleOf(query),
									}),
								},
							],
						})),
					);
				}),
			),
		];
	},
	config: (values) => ({ route: infraRoute(values) }),
});
