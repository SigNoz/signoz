/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { VIEWS } from 'container/ApiMonitoring/Explorer/Domains/DomainDetails/constants';
import { DEFAULT_PARAMS } from 'container/ApiMonitoring/queryParams';
import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { rest } from 'msw';
import type { AppState } from 'store/reducers';
import type { Props as ListOverviewRequest } from 'types/api/thirdPartyApis/listOverview';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	allEndpointsResponse,
	DEPENDENT_SERVICE_MAX,
	dependentServicesResponse,
	DOMAIN_MAX,
	domainListResponse,
	domainMetricsResponse,
	type DrawerDomain,
	DRAWER_DOMAINS,
	drawerDomainName,
	endpointDropdownResponse,
	ENDPOINT_MAX,
	endpointMetricsResponse,
	endpointUrl,
	groupByAttributeKeys,
	overTimeChartResponse,
	STATUS_CODE_MAX,
	statusCodeChartResponse,
	statusCodeTableResponse,
	TOP_ERROR_MAX,
	topErrorsResponse,
} from './__story_mockdata__/apiMonitoring';

const DOMAINS = 'External APIs · domains';
const DRAWER = 'External APIs · drawer';

const DRAWER_STATES = [
	'closed',
	'all-endpoints',
	'endpoint-stats',
	'top-errors',
] as const;

type DrawerState = (typeof DRAWER_STATES)[number];

const VIEW_OF: Record<Exclude<DrawerState, 'closed'>, VIEWS> = {
	'all-endpoints': VIEWS.ALL_ENDPOINTS,
	'endpoint-stats': VIEWS.ENDPOINT_STATS,
	'top-errors': VIEWS.TOP_ERRORS,
};

const RELATIVE_TIME: Time = '30m';

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

const NANOSECONDS_IN_MS = 1_000_000;

/**
 * `globalTime` derives its window from `window.location.pathname`, which in a
 * story is the preview's rather than the page's, so without a seeded range the
 * time picker and the queries would disagree about the window.
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

const serviceFilterItems = {
	op: 'AND',
	items: [
		{
			id: 'storybook-service-filter',
			key: { key: 'service.name', dataType: 'string', type: 'resource' },
			op: '=',
			value: 'checkout',
		},
	],
};

interface RouteValues {
	drawer: DrawerState;
	drawerDomain: DrawerDomain;
	domains: number;
	serviceFilter: boolean;
}

const apiMonitoringRoute = ({
	drawer,
	drawerDomain,
	domains,
	serviceFilter,
}: RouteValues): string => {
	const domainName = drawerDomainName(drawerDomain, domains);

	if (drawer === 'closed' || !domainName) {
		return ROUTES.API_MONITORING;
	}

	const params = {
		...DEFAULT_PARAMS,
		selectedDomain: domainName,
		selectedView: VIEW_OF[drawer],
		selectedEndPointName:
			drawer === 'endpoint-stats' ? endpointUrl(domainName, 0) : '',
		...(serviceFilter ? { endPointDetailsLocalFilters: serviceFilterItems } : {}),
	};

	return `${ROUTES.API_MONITORING}?apiMonitoringParams=${encodeURIComponent(
		JSON.stringify(params),
	)}`;
};

/** The parts of a query spec the handler tells the page's requests apart by. */
interface RequestSpec {
	name?: string;
	aggregations?: Array<{ expression?: string }>;
	groupBy?: Array<{ name: string }>;
	filter?: { expression?: string };
}

interface QueryShape {
	names: string[];
	expressions: string[];
	groupBy: string[];
	filters: string[];
	/** The endpoint the request pinned, when one is selected. */
	endPointName?: string;
}

const shapeOf = (body: QueryRangeRequestV5): QueryShape => {
	const specs = (body.compositeQuery?.queries ?? []).map(
		({ spec }) => spec as RequestSpec,
	);
	const filters = specs.map((spec) => spec.filter?.expression ?? '');

	return {
		names: specs
			.map((spec) => spec.name)
			.filter((name): name is string => Boolean(name)),
		expressions: specs.flatMap((spec) =>
			(spec.aggregations ?? []).map((aggregation) => aggregation.expression ?? ''),
		),
		// Every query in the request repeats the same group-by, so the columns the
		// response answers with are the distinct ones.
		groupBy: [
			...new Set(
				specs.flatMap((spec) => (spec.groupBy ?? []).map(({ name }) => name)),
			),
		],
		filters,
		endPointName: filters
			.map((expression) => /http_url\s*=\s*'([^']+)'/.exec(expression)?.[1])
			.find(Boolean),
	};
};

export const apiMonitoringMocks = defineStoryMocks({
	controls: {
		domains: countControl('Domains', {
			group: DOMAINS,
			description:
				'External hosts the workspace called in the window. At 0 the page shows what to instrument instead of the table.',
			value: DOMAIN_MAX,
			max: DOMAIN_MAX,
		}),
		drawer: choiceControl<DrawerState>('Domain drawer', {
			group: DRAWER,
			description:
				'The drawer a domain row opens, and which of its three views is showing.',
			options: DRAWER_STATES,
			value: 'closed',
		}),
		drawerDomain: choiceControl<DrawerDomain>('Drawer domain', {
			group: DRAWER,
			description:
				'Which row the drawer opens: a healthy host, one failing most calls, or a bare address on a non-standard port.',
			options: DRAWER_DOMAINS,
			value: 'healthy',
		}),
		endpoints: countControl('Endpoints', {
			group: DRAWER,
			description:
				'Endpoints the domain has. Fills the Endpoint Overview table and the endpoint picker.',
			value: ENDPOINT_MAX,
			max: ENDPOINT_MAX,
		}),
		statusCodes: countControl('Status codes', {
			group: DRAWER,
			description:
				'Distinct response codes the endpoint answered with, in the table and in the call response chart.',
			value: STATUS_CODE_MAX,
			max: STATUS_CODE_MAX,
		}),
		dependentServices: countControl('Dependent services', {
			group: DRAWER,
			description:
				'Services calling the endpoint. Past five the list collapses behind Show more.',
			value: DEPENDENT_SERVICE_MAX,
			max: DEPENDENT_SERVICE_MAX,
		}),
		topErrors: countControl('Top errors', {
			group: DRAWER,
			description: 'Rows the Top 10 Errors table has for the domain.',
			value: TOP_ERROR_MAX,
			max: TOP_ERROR_MAX,
		}),
		serviceFilter: toggleControl('Service filter', {
			group: DRAWER,
			description:
				'Puts a service.name filter on the endpoint stats view, which drops the Dependent Services block.',
			value: false,
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v1/third-party-apis/overview/list',
			response.json(async (req) => {
				const { show_ip: showIp } = (await req.json()) as ListOverviewRequest;

				return domainListResponse(values.domains, showIp, Date.now());
			}),
		),

		rest.get(
			'http://localhost/api/v1/orgs/me/filters/:signal',
			response.json((req) => ({
				status: 'success',
				data: { filters: [], signal: req.params.signal },
			})),
		),

		rest.get(
			'http://localhost/api/v3/autocomplete/attribute_keys',
			response.json((req) => ({
				status: 'success',
				data: {
					attributeKeys: groupByAttributeKeys(
						req.url.searchParams.get('searchText') ?? '',
					),
				},
			})),
		),

		// Every widget in the drawer asks the same endpoint, so what a request is
		// for is only in its shape: the panel type, what it groups by, and which
		// aggregations it names.
		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) => {
				const body = (await req.json()) as QueryRangeRequestV5;
				const shape = shapeOf(body);
				const domainName =
					drawerDomainName(values.drawerDomain, values.domains) ?? '';
				const window = { start: body.start, end: body.end };

				if (body.requestType === 'time_series') {
					if (shape.groupBy.includes('response_status_code')) {
						return statusCodeChartResponse(
							domainName,
							values.statusCodes,
							window,
							shape.expressions.includes('count()') ? 'calls' : 'latency',
						);
					}

					return overTimeChartResponse(
						domainName,
						window,
						shape.expressions.includes('rate()') ? 'rate' : 'latency',
					);
				}

				if (shape.groupBy.includes('status_message')) {
					return topErrorsResponse(
						domainName,
						values.topErrors,
						shape.filters.some((expression) =>
							expression.includes('status_message EXISTS'),
						),
						shape.endPointName,
					);
				}

				if (shape.groupBy.includes('response_status_code')) {
					return statusCodeTableResponse(domainName, values.statusCodes);
				}

				if (shape.groupBy.includes('http_url')) {
					if (shape.names.length === 1) {
						return endpointDropdownResponse(domainName, values.endpoints);
					}

					return allEndpointsResponse(
						domainName,
						values.endpoints,
						shape.groupBy,
						Date.now(),
					);
				}

				if (shape.groupBy.includes('service.name')) {
					return dependentServicesResponse(domainName, values.dependentServices);
				}

				if (shape.expressions.includes('rate()')) {
					return endpointMetricsResponse(
						domainName,
						shape.endPointName ?? endpointUrl(domainName, 0),
						Date.now(),
					);
				}

				return domainMetricsResponse(domainName, Date.now());
			}),
		),
	],
	config: (values) => ({
		route: apiMonitoringRoute(values),
		reduxState: timeRange(),
	}),
});
