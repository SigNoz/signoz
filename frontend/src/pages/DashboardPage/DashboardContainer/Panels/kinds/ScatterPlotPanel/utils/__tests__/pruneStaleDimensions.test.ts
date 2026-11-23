import type { DashboardtypesPanelPluginDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginDTO';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesScatterPlotPanelSpecDTOKind as ScatterPlotKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesScatterPlotPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind as TableKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelSpecDTO';
import { DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind as CompositeQueryKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind';
import type { DashboardtypesScatterPlotDimensionsDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesScatterPlotDimensionsDTO';
import type { DashboardtypesScatterPlotPanelSpecDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesScatterPlotPanelSpecDTO';
import { Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal as LogsSignal } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal';
import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeDTO';
import { Querybuildertypesv5QueryEnvelopeBuilderDTOType } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeBuilderDTOType';
import { Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';

import { pruneStaleDimensions } from '../pruneStaleDimensions';

const scatterPlugin = (
	dimensions: DashboardtypesScatterPlotDimensionsDTO,
): DashboardtypesPanelPluginDTO => ({
	kind: ScatterPlotKind['signoz/ScatterPlotPanel'],
	spec: { dimensions },
});

function panelSpec(
	envelopes: Querybuildertypesv5QueryEnvelopeDTO[],
	plugin: DashboardtypesPanelPluginDTO,
): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'p' },
		plugin,
		queries: [
			{
				kind: Querybuildertypesv5RequestTypeDTO.scalar,
				spec: {
					plugin: {
						kind: CompositeQueryKind['signoz/CompositeQuery'],
						spec: { queries: envelopes },
					},
				},
			},
		],
	};
}

const builderQuery = (
	name: string,
	expressions: string[],
	groupBy: string[] = [],
): Querybuildertypesv5QueryEnvelopeDTO => ({
	type: Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
	spec: {
		name,
		signal: LogsSignal.logs,
		aggregations: expressions.map((expression) => ({ expression })),
		groupBy: groupBy.map((label) => ({ name: label })),
	},
});

const dimensionsOf = (
	spec: DashboardtypesPanelSpecDTO,
): DashboardtypesScatterPlotDimensionsDTO | undefined =>
	(spec.plugin.spec as DashboardtypesScatterPlotPanelSpecDTO).dimensions;

describe('pruneStaleDimensions', () => {
	it('keeps the spec when every binding is a column of the queries', () => {
		const spec = panelSpec(
			[
				builderQuery('A', ['count()', 'avg(duration)'], ['service.name']),
				builderQuery('B', ['count()'], ['service.name']),
			],
			scatterPlugin({
				x: 'A.count()',
				y: 'B',
				sizeBy: 'A.avg(duration)',
				colorBy: ['service.name'],
			}),
		);
		expect(pruneStaleDimensions(spec)).toBe(spec);
	});

	it('clears value bindings and drops color labels the queries no longer produce', () => {
		const spec = panelSpec(
			[builderQuery('A', ['count()'], ['host.name'])],
			scatterPlugin({
				x: 'A.count()',
				y: 'A',
				sizeBy: 'B',
				colorBy: ['service.name', 'host.name'],
			}),
		);
		expect(dimensionsOf(pruneStaleDimensions(spec))).toStrictEqual({
			x: '',
			y: 'A',
			sizeBy: '',
			colorBy: ['host.name'],
		});
	});

	it('keeps bindings when a query has columns known only at run time', () => {
		const spec = panelSpec(
			[
				{
					type: Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType.clickhouse_sql,
					spec: { name: 'A', query: 'SELECT 1' },
				},
			],
			scatterPlugin({ x: 'value', y: 'other' }),
		);
		expect(pruneStaleDimensions(spec)).toBe(spec);
	});

	it('leaves other panel kinds untouched', () => {
		const spec = panelSpec([builderQuery('A', ['count()'])], {
			kind: TableKind['signoz/TablePanel'],
			spec: {},
		});
		expect(pruneStaleDimensions(spec)).toBe(spec);
	});
});
