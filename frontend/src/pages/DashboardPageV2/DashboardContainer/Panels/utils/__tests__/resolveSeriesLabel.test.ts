import type { PanelSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import { resolveSeriesLabelV5 } from '../resolveSeriesLabel';

// Fixtures cast at the boundary; the v5 BuilderQuery union is too verbose to
// construct field-typed inline.

function builderQuery(spec: Record<string, unknown>): BuilderQuery {
	return spec as unknown as BuilderQuery;
}

function panelSeries(overrides: Partial<PanelSeries> = {}): PanelSeries {
	return {
		queryName: 'A',
		legend: '',
		labels: { host: 'h1' },
		kind: 'series',
		values: [],
		aggregation: { index: 0, alias: '' },
		...overrides,
	};
}

describe('resolveSeriesLabelV5', () => {
	it('returns baseLabel for panels without builder queries (promql/clickhouse)', () => {
		expect(resolveSeriesLabelV5(panelSeries(), [], 'base')).toBe('base');
	});

	it('returns baseLabel when no query matches the series queryName', () => {
		expect(
			resolveSeriesLabelV5(
				panelSeries({ queryName: 'Z' }),
				[builderQuery({ name: 'A' })],
				'base',
			),
		).toBe('base');
	});

	it('falls back to baseLabel || queryName when the aggregation has no alias/expression (metrics)', () => {
		const queries = [
			builderQuery({ name: 'A', aggregations: [{ metricName: 'cpu' }] }),
		];
		expect(resolveSeriesLabelV5(panelSeries(), queries, 'base')).toBe('base');
		expect(resolveSeriesLabelV5(panelSeries(), queries, '')).toBe('A');
	});

	it('single query + groupBy + single aggregation → baseLabel', () => {
		const queries = [
			builderQuery({
				name: 'A',
				groupBy: [{ name: 'host' }],
				aggregations: [{ expression: 'count()', alias: '' }],
			}),
		];
		expect(resolveSeriesLabelV5(panelSeries(), queries, 'h1')).toBe('h1');
	});

	it('single query + groupBy + multiple aggregations → "alias-or-expression"-baseLabel', () => {
		const queries = [
			builderQuery({
				name: 'A',
				groupBy: [{ name: 'host' }],
				aggregations: [
					{ expression: 'count()', alias: '' },
					{ expression: 'avg(x)', alias: 'mean' },
				],
			}),
		];
		expect(
			resolveSeriesLabelV5(
				panelSeries({ aggregation: { index: 1, alias: 'mean' } }),
				queries,
				'h1',
			),
		).toBe('mean-h1');
	});

	it('single query, no groupBy, single aggregation → alias || legend || expression', () => {
		const queries = [
			builderQuery({
				name: 'A',
				legend: 'My legend',
				aggregations: [{ expression: 'count()', alias: '' }],
			}),
		];
		expect(resolveSeriesLabelV5(panelSeries({ labels: {} }), queries, 'A')).toBe(
			'My legend',
		);
	});

	it('multiple queries, no groupBy, single aggregation → alias || baseLabel', () => {
		const queries = [
			builderQuery({ name: 'A', aggregations: [{ expression: 'count()' }] }),
			builderQuery({ name: 'B', aggregations: [{ expression: 'sum(y)' }] }),
		];
		expect(
			resolveSeriesLabelV5(panelSeries({ labels: {} }), queries, 'base'),
		).toBe('base');
	});

	it('resolves via the aggregation index carried on the series', () => {
		const queries = [
			builderQuery({
				name: 'A',
				aggregations: [
					{ expression: 'count()', alias: 'hits' },
					{ expression: 'avg(x)', alias: 'mean' },
				],
			}),
		];
		expect(
			resolveSeriesLabelV5(
				panelSeries({ labels: {}, aggregation: { index: 1, alias: 'mean' } }),
				queries,
				'',
			),
		).toBe('mean');
	});
});
