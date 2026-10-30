import type {
	DashboardtypesPanelSpecDTO,
	DashboardtypesScatterPlotDimensionsDTO,
	DashboardtypesScatterPlotPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

import { pruneStaleDimensions } from '../pruneStaleDimensions';

function panelSpec(
	envelopes: unknown[],
	dimensions: DashboardtypesScatterPlotDimensionsDTO,
	kind = 'signoz/ScatterPlotPanel',
): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'p' },
		plugin: { kind, spec: { dimensions } },
		queries: [
			{
				spec: {
					plugin: { kind: 'signoz/CompositeQuery', spec: { queries: envelopes } },
				},
			},
		],
	} as unknown as DashboardtypesPanelSpecDTO;
}

const builderQuery = (
	name: string,
	expressions: string[],
	groupBy: string[] = [],
): unknown => ({
	type: 'builder_query',
	spec: {
		name,
		signal: 'logs',
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
			{
				x: 'A.count()',
				y: 'B',
				sizeBy: 'A.avg(duration)',
				colorBy: ['service.name'],
			},
		);
		expect(pruneStaleDimensions(spec)).toBe(spec);
	});

	it('clears value bindings and drops color labels the queries no longer produce', () => {
		const spec = panelSpec([builderQuery('A', ['count()'], ['host.name'])], {
			x: 'A.count()',
			y: 'A',
			sizeBy: 'B',
			colorBy: ['service.name', 'host.name'],
		});
		expect(dimensionsOf(pruneStaleDimensions(spec))).toStrictEqual({
			x: '',
			y: 'A',
			sizeBy: '',
			colorBy: ['host.name'],
		});
	});

	it('keeps bindings when a query has columns known only at run time', () => {
		const spec = panelSpec(
			[{ type: 'clickhouse_sql', spec: { name: 'A', query: 'SELECT 1' } }],
			{ x: 'value', y: 'other' },
		);
		expect(pruneStaleDimensions(spec)).toBe(spec);
	});

	it('leaves other panel kinds untouched', () => {
		const spec = panelSpec(
			[builderQuery('A', ['count()'])],
			{ x: 'B' },
			'signoz/TablePanel',
		);
		expect(pruneStaleDimensions(spec)).toBe(spec);
	});
});
