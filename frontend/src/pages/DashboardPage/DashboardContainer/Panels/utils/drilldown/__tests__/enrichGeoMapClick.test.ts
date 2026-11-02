import type { BuilderQuery } from 'types/api/v5/queryRange';

import { enrichGeoMapClick } from '../enrichGeoMapClick';

const builderQuery = (spec: Record<string, unknown>): BuilderQuery =>
	spec as unknown as BuilderQuery;

const QUERIES = [
	builderQuery({
		name: 'A',
		signal: 'logs',
		groupBy: [{ name: 'geo.country.iso_code' }],
	}),
	builderQuery({
		name: 'B',
		signal: 'traces',
		groupBy: [{ name: 'geo.country.iso_code' }, { name: 'service.name' }],
	}),
];

const click = (
	queryNames: string[],
	builderQueries = QUERIES,
): ReturnType<typeof enrichGeoMapClick> =>
	enrichGeoMapClick({
		labels: { 'geo.country.iso_code': 'DE', 'service.name': 'cart' },
		label: 'DE',
		queryNames,
		builderQueries,
		coordinates: { x: 7, y: 8 },
		timeRange: { startTime: 1, endTime: 2 },
	});

describe('enrichGeoMapClick', () => {
	it("follows the color column's query and filters to the location's row", () => {
		expect(click(['B'])).toStrictEqual({
			coordinates: { x: 7, y: 8 },
			context: {
				queryName: 'B',
				signal: 'traces',
				filters: [
					{ filterKey: 'geo.country.iso_code', filterValue: 'DE', operator: '=' },
					{ filterKey: 'service.name', filterValue: 'cart', operator: '=' },
				],
				timeRange: { startTime: 1, endTime: 2 },
				label: 'DE',
			},
		});
	});

	it("falls back to size's query, then the first, for a formula", () => {
		expect(click(['F1', 'B'])?.context.queryName).toBe('B');
		expect(click(['F1'])?.context).toMatchObject({
			queryName: 'A',
			filters: [
				{ filterKey: 'geo.country.iso_code', filterValue: 'DE', operator: '=' },
			],
		});
	});

	it('returns null without a builder query', () => {
		expect(click(['A'], [])).toBeNull();
	});
});
