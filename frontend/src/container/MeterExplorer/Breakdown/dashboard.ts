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

export enum MeterUnit {
	Bytes = 'bytes',
	Short = 'short',
}

interface MeterPanel {
	id: string;
	name: string;
	metric: string;
	unit: MeterUnit;
}

interface MeterSection {
	title: string;
	/** Window totals as numbers; otherwise hourly bars. */
	isTotal?: boolean;
	panels: MeterPanel[];
}

export const SECTIONS: MeterSection[] = [
	{
		title: 'Total',
		isTotal: true,
		panels: [
			{
				id: 'total-log-size',
				name: 'Total size of log records ingested',
				metric: 'signoz.meter.log.size',
				unit: MeterUnit.Bytes,
			},
			{
				id: 'total-span-size',
				name: 'Total size of spans ingested',
				metric: 'signoz.meter.span.size',
				unit: MeterUnit.Bytes,
			},
			{
				id: 'total-metric-datapoints',
				name: 'Total metric datapoints ingested',
				metric: 'signoz.meter.metric.datapoint.count',
				unit: MeterUnit.Short,
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
				unit: MeterUnit.Short,
			},
			{
				id: 'log-size',
				name: 'Size of log records ingested',
				metric: 'signoz.meter.log.size',
				unit: MeterUnit.Bytes,
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
				unit: MeterUnit.Short,
			},
			{
				id: 'span-size',
				name: 'Size of spans ingested',
				metric: 'signoz.meter.span.size',
				unit: MeterUnit.Bytes,
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
				unit: MeterUnit.Short,
			},
		],
	},
];

const buildMeterQuery = (
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
				legend: unit === MeterUnit.Bytes ? 'size' : 'count',
			},
		},
	},
});

const buildMeterPanel = (
	panel: MeterPanel,
	isTotal: boolean,
): DashboardtypesPanelDTO => ({
	kind: PanelKind.Panel,
	spec: {
		display: { name: panel.name },
		plugin: isTotal
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
			buildMeterQuery(
				panel,
				isTotal ? RequestType.scalar : RequestType.time_series,
			),
		],
	},
});

const buildGridLayout = ({
	title,
	isTotal,
	panels,
}: MeterSection): DashboardtypesLayoutDTO => {
	const width = isTotal ? 4 : 6;
	const height = isTotal ? 3 : 6;
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
		layouts: SECTIONS.map(buildGridLayout),
		panels: Object.fromEntries(
			SECTIONS.flatMap(({ isTotal = false, panels }) =>
				panels.map((panel) => [panel.id, buildMeterPanel(panel, isTotal)]),
			),
		),
	},
};
