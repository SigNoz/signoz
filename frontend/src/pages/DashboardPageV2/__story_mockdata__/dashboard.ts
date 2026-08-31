/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesDynamicVariableSignalDTO as DynamicSignal,
	DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind as GridKind,
	DashboardtypesPanelKindDTO as PanelKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind as BarChartKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTOKind as ListKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind as NumberKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind as PieChartKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind as TableKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind as TimeSeriesKind,
	DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind as BuilderQueryKind,
	DashboardtypesSourceDTO,
	DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTOKind as ListVariableKind,
	DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind as TextVariableKind,
	DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTOKind as CustomVariableKind,
	DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTOKind as DynamicVariableKind,
	DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTOKind as QueryVariableKind,
	MetrictypesSpaceAggregationDTO as SpaceAggregation,
	MetrictypesTimeAggregationDTO as TimeAggregation,
	Querybuildertypesv5OrderDirectionDTO as OrderDirection,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal as LogSignal,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal as MetricSignal,
	Querybuildertypesv5RequestTypeDTO as RequestType,
	type DashboardtypesDashboardSpecDTOPanels,
	type DashboardtypesLayoutDTO,
	type DashboardtypesPanelDTO,
	type DashboardtypesGettableDashboardV2DTO,
	type DashboardtypesJSONPatchOperationDTO,
	type DashboardtypesQueryDTO,
	type DashboardtypesVariableDTO,
	type GetDashboardV2200,
	type Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO as LogBuilderQuery,
	type Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO as MetricBuilderQuery,
} from 'api/generated/services/sigNoz.schemas';

import { applyJsonPatch } from '../DashboardContainer/optimistic/applyJsonPatch';

export const STORY_DASHBOARD_ID = 'storybook-dashboard-1';

interface MetricQueryArgs {
	metricName: string;
	requestType: RequestType;
	groupBy?: string;
	/** Only the plotted kinds label their series; a table would show it as a column header. */
	legend?: string;
}

const QUERY_NAME = 'A';

const metricQuery = ({
	metricName,
	requestType,
	groupBy,
	legend,
}: MetricQueryArgs): DashboardtypesQueryDTO[] => {
	const spec: MetricBuilderQuery = {
		name: QUERY_NAME,
		signal: MetricSignal.metrics,
		aggregations: [
			{
				metricName,
				spaceAggregation: SpaceAggregation.sum,
				timeAggregation: TimeAggregation.rate,
			},
		],
		groupBy: groupBy ? [{ name: groupBy }] : undefined,
		legend,
		filter: { expression: 'deployment.environment = $environment' },
	};

	return [
		{
			kind: requestType,
			spec: {
				name: QUERY_NAME,
				plugin: { kind: BuilderQueryKind['signoz/BuilderQuery'], spec },
			},
		},
	];
};

const logQuery = (): DashboardtypesQueryDTO[] => {
	const spec: LogBuilderQuery = {
		name: QUERY_NAME,
		signal: LogSignal.logs,
		selectFields: [{ name: 'body' }, { name: 'service.name' }],
		order: [{ key: { name: 'timestamp' }, direction: OrderDirection.desc }],
	};

	return [
		{
			kind: RequestType.raw,
			spec: {
				name: QUERY_NAME,
				plugin: { kind: BuilderQueryKind['signoz/BuilderQuery'], spec },
			},
		},
	];
};

/**
 * The panels the dashboard holds, in the order the sections lay them out. Each
 * one names the query the handler answers for, so a panel's shape and its data
 * stay declared together.
 */
export const PANEL_IDS = [
	'request-rate',
	'error-rate',
	'p99-latency',
	'apdex',
	'top-endpoints',
	'errors-by-status',
	'traffic-share',
	'recent-logs',
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

const PANELS: Record<PanelId, DashboardtypesPanelDTO> = {
	'request-rate': {
		kind: PanelKind.Panel,
		spec: {
			display: { name: 'Request rate by service' },
			plugin: { kind: TimeSeriesKind['signoz/TimeSeriesPanel'], spec: {} },
			queries: metricQuery({
				metricName: 'signoz_calls_total',
				requestType: RequestType.time_series,
				groupBy: 'service.name',
				legend: '{{service.name}}',
			}),
		},
	},
	'error-rate': {
		kind: PanelKind.Panel,
		spec: {
			display: {
				name: 'Error rate',
				description: 'Share of 5xx responses over the selected window.',
			},
			plugin: { kind: TimeSeriesKind['signoz/TimeSeriesPanel'], spec: {} },
			queries: metricQuery({
				metricName: 'signoz_errors_total',
				requestType: RequestType.time_series,
				legend: 'errors / sec',
			}),
		},
	},
	'p99-latency': {
		kind: PanelKind.Panel,
		spec: {
			display: { name: 'p99 latency' },
			plugin: { kind: NumberKind['signoz/NumberPanel'], spec: {} },
			queries: metricQuery({
				metricName: 'signoz_latency_bucket',
				requestType: RequestType.scalar,
			}),
		},
	},
	apdex: {
		kind: PanelKind.Panel,
		spec: {
			display: { name: 'Apdex' },
			plugin: { kind: NumberKind['signoz/NumberPanel'], spec: {} },
			queries: metricQuery({
				metricName: 'signoz_apdex',
				requestType: RequestType.scalar,
			}),
		},
	},
	'top-endpoints': {
		kind: PanelKind.Panel,
		spec: {
			display: { name: 'Top endpoints' },
			plugin: { kind: TableKind['signoz/TablePanel'], spec: {} },
			queries: metricQuery({
				metricName: 'signoz_calls_total',
				requestType: RequestType.scalar,
				groupBy: 'http.route',
			}),
		},
	},
	'errors-by-status': {
		kind: PanelKind.Panel,
		spec: {
			display: { name: 'Errors by status code' },
			plugin: { kind: BarChartKind['signoz/BarChartPanel'], spec: {} },
			queries: metricQuery({
				metricName: 'signoz_errors_total',
				requestType: RequestType.time_series,
				groupBy: 'http.status_code',
				legend: '{{http.status_code}}',
			}),
		},
	},
	'traffic-share': {
		kind: PanelKind.Panel,
		spec: {
			display: { name: 'Traffic share' },
			plugin: { kind: PieChartKind['signoz/PieChartPanel'], spec: {} },
			queries: metricQuery({
				metricName: 'signoz_calls_total',
				requestType: RequestType.scalar,
				groupBy: 'service.name',
			}),
		},
	},
	'recent-logs': {
		kind: PanelKind.Panel,
		spec: {
			display: { name: 'Recent logs' },
			plugin: { kind: ListKind['signoz/ListPanel'], spec: {} },
			queries: logQuery(),
		},
	},
};

interface SectionSeed {
	title: string;
	panels: PanelId[];
}

const SECTIONS: SectionSeed[] = [
	{
		title: 'Golden signals',
		panels: ['p99-latency', 'apdex', 'error-rate', 'request-rate'],
	},
	{
		title: 'Breakdown',
		panels: ['top-endpoints', 'errors-by-status', 'traffic-share', 'recent-logs'],
	},
];

/** Half-width for the charts, quarter-width for the two single numbers. */
const PANEL_WIDTH: Partial<Record<PanelId, number>> = {
	'p99-latency': 3,
	apdex: 3,
	'request-rate': 12,
};

const gridItems = (
	panels: PanelId[],
): NonNullable<DashboardtypesLayoutDTO['spec']['items']> => {
	let x = 0;
	let y = 0;

	return panels.map((id) => {
		const width = PANEL_WIDTH[id] ?? 6;

		if (x + width > 12) {
			x = 0;
			y += 6;
		}

		const item = {
			x,
			y,
			width,
			height: 6,
			content: { $ref: `#/spec/panels/${id}` },
		};

		x += width;

		return item;
	});
};

export const VARIABLE_KINDS = ['custom', 'query', 'dynamic', 'text'] as const;

export type VariableKind = (typeof VARIABLE_KINDS)[number];

export const QUERY_VARIABLE_NAME = 'service';

export const DYNAMIC_VARIABLE_ATTRIBUTE = 'k8s.namespace.name';

const VARIABLES: Record<VariableKind, DashboardtypesVariableDTO> = {
	custom: {
		kind: ListVariableKind.ListVariable,
		spec: {
			name: 'environment',
			display: { name: 'environment' },
			allowMultiple: false,
			allowAllValue: false,
			defaultValue: 'production',
			plugin: {
				kind: CustomVariableKind['signoz/CustomVariable'],
				spec: { customValue: 'production,staging,development' },
			},
		},
	},
	query: {
		kind: ListVariableKind.ListVariable,
		spec: {
			name: QUERY_VARIABLE_NAME,
			display: { name: QUERY_VARIABLE_NAME },
			allowMultiple: true,
			allowAllValue: true,
			plugin: {
				kind: QueryVariableKind['signoz/QueryVariable'],
				spec: {
					queryValue:
						"SELECT DISTINCT service_name FROM signoz_metrics WHERE env = '$environment'",
				},
			},
		},
	},
	dynamic: {
		kind: ListVariableKind.ListVariable,
		spec: {
			name: 'namespace',
			display: { name: 'namespace' },
			allowMultiple: true,
			allowAllValue: true,
			plugin: {
				kind: DynamicVariableKind['signoz/DynamicVariable'],
				spec: {
					name: DYNAMIC_VARIABLE_ATTRIBUTE,
					signal: DynamicSignal.metrics,
				},
			},
		},
	},
	text: {
		kind: TextVariableKind.TextVariable,
		spec: {
			name: 'owner',
			display: { name: 'owner' },
			value: 'platform-team',
			constant: false,
		},
	},
};

export interface PanelQueryShape {
	requestType: string;
	metricName?: string;
	groupBy?: string;
}

/**
 * What a panel asks `query_range` for, read back off the panel itself. The
 * public viewer addresses a panel by key rather than by request body, so it
 * needs the same answer without a request to inspect.
 */
export const panelQueryShape = (id: PanelId): PanelQueryShape => {
	const query = PANELS[id].spec.queries[0];
	const spec = query.spec.plugin.spec as {
		aggregations?: { metricName?: string }[];
		groupBy?: { name?: string }[];
	};

	return {
		requestType: query.kind,
		metricName: spec.aggregations?.[0]?.metricName,
		groupBy: spec.groupBy?.[0]?.name,
	};
};

export interface DashboardArgs {
	/** Panels kept, taken off the front of `PANEL_IDS`. Zero is a blank dashboard. */
	panels: number;
	/** Titled sections, or the untitled single grid a dashboard without them renders. */
	sectioned: boolean;
	variables: readonly VariableKind[];
	locked: boolean;
}

export const dashboardResponse = ({
	panels,
	sectioned,
	variables,
	locked,
}: DashboardArgs): GetDashboardV2200 => {
	const kept = PANEL_IDS.slice(0, panels);

	const layouts: DashboardtypesLayoutDTO[] = sectioned
		? SECTIONS.map((section) => ({
				kind: GridKind.Grid,
				spec: {
					display: { title: section.title, collapse: { open: true } },
					items: gridItems(section.panels.filter((id) => kept.includes(id))),
				},
			}))
		: [{ kind: GridKind.Grid, spec: { items: gridItems([...kept]) } }];

	return {
		status: 'success',
		data: {
			id: STORY_DASHBOARD_ID,
			orgId: 'storybook-org',
			name: 'Checkout service overview',
			image: '/assets/Icons/circus-tent',
			schemaVersion: 'v6',
			source: DashboardtypesSourceDTO.user,
			locked,
			createdBy: 'ada@signoz.io',
			updatedBy: 'ada@signoz.io',
			createdAt: '2026-05-04T09:12:00Z',
			updatedAt: '2026-08-21T16:40:00Z',
			tags: [
				{ key: 'env', value: 'prod' },
				{ key: 'team', value: 'platform' },
			],
			spec: {
				display: {
					name: 'Checkout service overview',
					description:
						'Traffic, errors and latency for the checkout path, broken down by service.',
				},
				layouts,
				panels: Object.fromEntries(
					kept.map((id) => [id, PANELS[id]]),
				) as DashboardtypesDashboardSpecDTOPanels,
				variables: variables.map((kind) => VARIABLES[kind]),
			},
		},
	};
};

/**
 * The document the page is editing. Every spec edit (a panel moved, a section
 * renamed, a variable added) travels as a JSON Patch whose response replaces
 * the cache, so the story keeps the document where the handler can apply the ops
 * to it. Reseeded whenever a control changes, which is also when the story
 * remounts.
 */
let document: DashboardtypesGettableDashboardV2DTO | undefined;

export const seedDashboardDocument = (args: DashboardArgs): void => {
	document = dashboardResponse(args).data;
};

const envelope = (
	data: DashboardtypesGettableDashboardV2DTO,
): GetDashboardV2200 => ({ status: 'success', data });

export const currentDashboardDocument = (
	args: DashboardArgs,
): GetDashboardV2200 => envelope(document ?? dashboardResponse(args).data);

export const patchDashboardDocument = (
	args: DashboardArgs,
	ops: DashboardtypesJSONPatchOperationDTO[],
): GetDashboardV2200 => {
	document = applyJsonPatch(document ?? dashboardResponse(args).data, ops);

	return envelope(document);
};
