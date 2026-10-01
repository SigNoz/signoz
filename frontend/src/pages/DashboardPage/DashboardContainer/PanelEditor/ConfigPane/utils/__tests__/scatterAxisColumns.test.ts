import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import { getScatterAxisColumnNames } from '../scatterAxisColumns';

const COLUMNS = [
	{ key: 'A', label: 'A.Request rate', name: 'Request rate' },
	{ key: 'B', label: 'B.p99 latency', name: 'p99 latency' },
	{ key: 'C', label: 'C.Errors', name: 'Errors' },
];

const scatterSpec = (dimensions: {
	x?: string;
	y?: string;
}): DashboardtypesPanelSpecDTO =>
	({
		plugin: { kind: 'signoz/ScatterPlotPanel', spec: { dimensions } },
		queries: [],
	}) as unknown as DashboardtypesPanelSpecDTO;

describe('getScatterAxisColumnNames', () => {
	it('names the first two value columns when nothing is bound', () => {
		expect(getScatterAxisColumnNames(scatterSpec({}), COLUMNS)).toStrictEqual({
			x: 'Request rate',
			y: 'p99 latency',
		});
	});

	it('follows the bound columns, with Y avoiding the column X took', () => {
		expect(
			getScatterAxisColumnNames(scatterSpec({ x: 'A', y: 'C' }), COLUMNS),
		).toStrictEqual({ x: 'Request rate', y: 'Errors' });
		expect(
			getScatterAxisColumnNames(scatterSpec({ x: 'B' }), COLUMNS),
		).toStrictEqual({ x: 'p99 latency', y: 'Request rate' });
	});

	it('is empty before results load and for other kinds', () => {
		expect(getScatterAxisColumnNames(scatterSpec({}), [])).toStrictEqual({
			x: undefined,
			y: undefined,
		});
		expect(
			getScatterAxisColumnNames(
				{
					plugin: { kind: 'signoz/TablePanel', spec: {} },
					queries: [],
				} as unknown as DashboardtypesPanelSpecDTO,
				COLUMNS,
			),
		).toStrictEqual({});
	});
});
