import {
	DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind as GridKind,
	DashboardtypesPanelKindDTO as PanelKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind as BarChartKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind as NumberKind,
	DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind as BuilderQueryKind,
	DashboardtypesSourceDTO,
	DashboardtypesTimePreferenceDTO,
	MetrictypesSpaceAggregationDTO,
	MetrictypesTimeAggregationDTO,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal as MetricSignal,
	Querybuildertypesv5ReduceToDTO,
	Querybuildertypesv5RequestTypeDTO as RequestType,
	TelemetrytypesSourceDTO,
	type DashboardtypesGettableDashboardV2DTO,
	type DashboardtypesLayoutDTO,
	type DashboardtypesPanelDTO,
	type DashboardtypesQueryDTO,
} from 'api/generated/services/sigNoz.schemas';

/** Namespaced: persisted per-dashboard state keys on it, so it must never match a server id. */
export const COST_METER_DASHBOARD_ID = 'signoz-app:cost-meter-breakdown';

interface MeterPanel {
	id: string;
	name: string;
	metric: string;
	unit: 'bytes' | 'short';
}

interface MeterSection {
	title: string;
	/** Window totals as numbers; otherwise hourly bars. */
	total?: boolean;
	panels: MeterPanel[];
}

export const SECTIONS: MeterSection[] = [
	{
		title: 'Total',
		total: true,
		panels: [
			{
				id: 'total-log-size',
				name: 'Total size of log records ingested',
				metric: 'signoz.meter.log.size',
				unit: 'bytes',
			},
			{
				id: 'total-span-size',
				name: 'Total size of spans ingested',
				metric: 'signoz.meter.span.size',
				unit: 'bytes',
			},
			{
				id: 'total-metric-datapoints',
				name: 'Total metric datapoints ingested',
				metric: 'signoz.meter.metric.datapoint.count',
				unit: 'short',
			},
		],
	},
	{
		title: 'Logs',
		panels: [
			{
				id: 'log-count',
				name: 'Count of log records ingested',
				metric: 'signoz.meter.log.count',
				unit: 'short',
			},
			{
				id: 'log-size',
				name: 'Size of log records ingested',
				metric: 'signoz.meter.log.size',
				unit: 'bytes',
			},
		],
	},
	{
		title: 'Traces',
		panels: [
			{
				id: 'span-count',
				name: 'Count of spans ingested',
				metric: 'signoz.meter.span.count',
				unit: 'short',
			},
			{
				id: 'span-size',
				name: 'Size of spans ingested',
				metric: 'signoz.meter.span.size',
				unit: 'bytes',
			},
		],
	},
	{
		title: 'Metrics',
		panels: [
			{
				id: 'metric-datapoints',
				name: 'Count of metric datapoints ingested',
				metric: 'signoz.meter.metric.datapoint.count',
				unit: 'short',
			},
		],
	},
];

const meterQuery = (
	{ metric, unit }: MeterPanel,
	kind: RequestType,
): DashboardtypesQueryDTO => ({
	kind,
	spec: {
		plugin: {
			kind: BuilderQueryKind['signoz/BuilderQuery'],
			spec: {
				name: 'A',
				signal: MetricSignal.metrics,
				source: TelemetrytypesSourceDTO.meter,
				aggregations: [
					{
						metricName: metric,
						timeAggregation: MetrictypesTimeAggregationDTO.increase,
						spaceAggregation: MetrictypesSpaceAggregationDTO.sum,
						reduceTo: Querybuildertypesv5ReduceToDTO.sum,
					},
				],
				legend: unit === 'bytes' ? 'size' : 'count',
			},
		},
	},
});

const meterPanel = (
	panel: MeterPanel,
	total: boolean,
): DashboardtypesPanelDTO => ({
	kind: PanelKind.Panel,
	spec: {
		display: { name: panel.name },
		plugin: total
			? {
					kind: NumberKind['signoz/NumberPanel'],
					spec: {
						formatting: { unit: panel.unit },
						visualization: {
							timePreference: DashboardtypesTimePreferenceDTO.global_time,
						},
					},
				}
			: {
					kind: BarChartKind['signoz/BarChartPanel'],
					spec: {
						formatting: { unit: panel.unit },
						visualization: { stackedBarChart: false },
					},
				},
		queries: [
			meterQuery(panel, total ? RequestType.scalar : RequestType.time_series),
		],
	},
});

const grid = ({
	title,
	total,
	panels,
}: MeterSection): DashboardtypesLayoutDTO => {
	const width = total ? 4 : 6;
	const height = total ? 3 : 6;
	const perRow = 12 / width;

	return {
		kind: GridKind.Grid,
		spec: {
			display: { title },
			items: panels.map((panel, index) => ({
				x: (index % perRow) * width,
				y: Math.floor(index / perRow) * height,
				width,
				height,
				content: { $ref: `#/spec/panels/${panel.id}` },
			})),
		},
	};
};

export const COST_METER_DASHBOARD: DashboardtypesGettableDashboardV2DTO = {
	id: COST_METER_DASHBOARD_ID,
	orgId: '',
	name: 'cost-meter-breakdown',
	schemaVersion: 'v6',
	source: DashboardtypesSourceDTO.system,
	locked: true,
	tags: [],
	spec: {
		display: {
			name: 'Cost Meter Breakdown',
			description:
				'Logs, spans and metric datapoints ingested, from the signoz.meter.* metrics. Aggregated hourly; billing is calculated in UTC.',
		},
		variables: [],
		layouts: SECTIONS.map(grid),
		panels: Object.fromEntries(
			SECTIONS.flatMap(({ total = false, panels }) =>
				panels.map((panel) => [panel.id, meterPanel(panel, total)]),
			),
		),
	},
};
