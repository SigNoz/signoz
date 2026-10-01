import type { BuilderQuery } from 'types/api/v5/queryRange';

import { enrichScatterClick } from '../enrichScatterClick';

const builderQuery = (spec: Record<string, unknown>): BuilderQuery =>
	spec as unknown as BuilderQuery;

const QUERIES = [
	builderQuery({
		name: 'A',
		signal: 'traces',
		groupBy: [{ name: 'service.name' }, { name: 'k8s.namespace.name' }],
	}),
	builderQuery({
		name: 'B',
		signal: 'logs',
		groupBy: [{ name: 'service.name' }],
	}),
];

const LABELS = [
	{ key: 'service.name', value: 'checkout' },
	{ key: 'k8s.namespace.name', value: 'prod' },
];

const click = (
	axisQueries: { x: string; y: string },
	builderQueries = QUERIES,
): ReturnType<typeof enrichScatterClick> =>
	enrichScatterClick({
		labels: LABELS,
		label: 'checkout, prod',
		color: '#4E74F8',
		axisQueries,
		builderQueries,
		coordinates: { x: 7, y: 8 },
		timeRange: { startTime: 1, endTime: 2 },
	});

describe('enrichScatterClick', () => {
	it("follows Y's query and filters to the dot's group", () => {
		expect(click({ x: 'B', y: 'A' })).toStrictEqual({
			coordinates: { x: 7, y: 8 },
			context: {
				queryName: 'A',
				signal: 'traces',
				filters: [
					{ filterKey: 'service.name', filterValue: 'checkout', operator: '=' },
					{ filterKey: 'k8s.namespace.name', filterValue: 'prod', operator: '=' },
				],
				timeRange: { startTime: 1, endTime: 2 },
				label: 'checkout, prod',
				seriesColor: '#4E74F8',
			},
		});
	});

	it('keeps only the labels the followed query groups by', () => {
		expect(click({ x: 'A', y: 'B' })?.context).toMatchObject({
			queryName: 'B',
			signal: 'logs',
			filters: [
				{ filterKey: 'service.name', filterValue: 'checkout', operator: '=' },
			],
		});
	});

	it("falls back to X's query when Y's is not a builder query", () => {
		expect(click({ x: 'A', y: 'F1' })?.context.queryName).toBe('A');
	});

	it('returns null when neither axis has a builder query', () => {
		expect(click({ x: 'F1', y: 'F2' })).toBeNull();
		expect(click({ x: 'A', y: 'A' }, [])).toBeNull();
	});
});
