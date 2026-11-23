import { DashboardtypesPanelKindDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelKindDTO';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTOKind as TopListPluginKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTOKind';
import { Querybuildertypesv5ColumnTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5ColumnTypeDTO';
import { Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal as MetricSignal } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal';
import { Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal as TraceSignal } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal';
import { Querybuildertypesv5QueryEnvelopeBuilderDTOType } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeBuilderDTOType';
import { Querybuildertypesv5QueryEnvelopeFormulaDTOType } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeFormulaDTOType';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import type { DashboardtypesTopListAppearanceDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesTopListAppearanceDTO';
import type { DashboardtypesTopListPanelSpecDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesTopListPanelSpecDTO';
import type { Querybuildertypesv5ColumnDescriptorDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5ColumnDescriptorDTO';
import type { Querybuildertypesv5MetricAggregationDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5MetricAggregationDTO';
import type { Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO as TraceQuerySpec } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO';
import type { Querybuildertypesv5QueryEnvelopeBuilderDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeBuilderDTO';
import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeDTO';
import type { Querybuildertypesv5QueryEnvelopeFormulaDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeFormulaDTO';
import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryRangeRequestDTO';
import type { Querybuildertypesv5ScalarDataDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5ScalarDataDTO';
import type { Querybuildertypesv5TraceAggregationDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5TraceAggregationDTO';
import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas/queryRangeV5200';

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
