import {
	DashboardtypesPanelKindDTO,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTOKind as TopListPluginKind,
	Querybuildertypesv5ColumnTypeDTO,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal as MetricSignal,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal as TraceSignal,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
	Querybuildertypesv5QueryEnvelopeFormulaDTOType,
	Querybuildertypesv5RequestTypeDTO,
	type DashboardtypesTopListAppearanceDTO,
	type DashboardtypesTopListPanelSpecDTO,
	type Querybuildertypesv5ColumnDescriptorDTO,
	type Querybuildertypesv5MetricAggregationDTO,
	type Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO as TraceQuerySpec,
	type Querybuildertypesv5QueryEnvelopeBuilderDTO,
	type Querybuildertypesv5QueryEnvelopeDTO,
	type Querybuildertypesv5QueryEnvelopeFormulaDTO,
	type Querybuildertypesv5QueryRangeRequestDTO,
	type Querybuildertypesv5ScalarDataDTO,
	type Querybuildertypesv5TraceAggregationDTO,
	type QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';

import type { PanelOfKind } from '../../../types/rendererProps';

export function topListPanel(
	spec: DashboardtypesTopListPanelSpecDTO = {},
): PanelOfKind<'signoz/TopListPanel'> {
	return {
		kind: DashboardtypesPanelKindDTO.Panel,
		spec: {
			display: { name: 'Top services' },
			plugin: { kind: TopListPluginKind['signoz/TopListPanel'], spec },
			queries: [],
		},
	};
}

export const appearance = (
	overrides: Partial<DashboardtypesTopListAppearanceDTO> = {},
): DashboardtypesTopListAppearanceDTO => ({
	barColor: '#4E74F8',
	...overrides,
});

export const groupColumn = (
	name: string,
	queryName = 'A',
): Querybuildertypesv5ColumnDescriptorDTO => ({
	name,
	queryName,
	columnType: Querybuildertypesv5ColumnTypeDTO.group,
});

export const valueColumn = (
	name = '__result',
	aggregationIndex = 0,
	queryName = 'A',
): Querybuildertypesv5ColumnDescriptorDTO => ({
	name,
	queryName,
	columnType: Querybuildertypesv5ColumnTypeDTO.aggregation,
	aggregationIndex,
});

export function scalarResponse(
	results: Querybuildertypesv5ScalarDataDTO[],
): QueryRangeV5200 {
	return {
		status: 'success',
		data: {
			type: Querybuildertypesv5RequestTypeDTO.scalar,
			data: { results },
		},
	};
}

export const requestWith = (
	queries: Querybuildertypesv5QueryEnvelopeDTO[],
): Querybuildertypesv5QueryRangeRequestDTO => ({
	compositeQuery: { queries },
});

export const builderQuery = (
	spec: Omit<TraceQuerySpec, 'signal'>,
): Querybuildertypesv5QueryEnvelopeBuilderDTO => ({
	type: Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
	spec: { signal: TraceSignal.traces, ...spec },
});

export const traceQuery = (
	aggregation: Querybuildertypesv5TraceAggregationDTO,
): Querybuildertypesv5QueryEnvelopeBuilderDTO =>
	builderQuery({ name: 'A', aggregations: [aggregation] });

export const metricQuery = (
	aggregation: Querybuildertypesv5MetricAggregationDTO,
): Querybuildertypesv5QueryEnvelopeBuilderDTO => ({
	type: Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
	spec: { name: 'A', signal: MetricSignal.metrics, aggregations: [aggregation] },
});

export const formulaQuery = (
	name: string,
	expression: string,
): Querybuildertypesv5QueryEnvelopeFormulaDTO => ({
	type: Querybuildertypesv5QueryEnvelopeFormulaDTOType.builder_formula,
	spec: { name, expression },
});
