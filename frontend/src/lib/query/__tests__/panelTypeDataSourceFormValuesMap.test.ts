import {
	panelTypeDataSourceFormValuesMap,
	type PartialPanelTypes,
} from 'lib/query/panelQuery';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';

/**
 * The map is composed from a few shape rules rather than spelled out per panel type
 * and data source. These specs pin the rules themselves — each one fails only when a
 * rule changes, which is the moment to stop and decide, rather than whenever any
 * field moves.
 *
 * The composition it replaced was checked cell by cell against the previous literal
 * table, which is in git history at `main:frontend/src/lib/query/panelQuery.ts`.
 */
function fieldsFor(
	panelType: keyof PartialPanelTypes,
	dataSource: DataSource,
): string[] {
	return panelTypeDataSourceFormValuesMap[panelType][dataSource].builder
		.queryData;
}

/** Fields present in `to` but not in `from`. */
function added(from: string[], to: string[]): string[] {
	return to.filter((field) => !from.includes(field)).sort();
}

/** Panel types built on the aggregating field list. */
const AGGREGATING_TYPES: (keyof PartialPanelTypes)[] = [
	PANEL_TYPES.BAR,
	PANEL_TYPES.HISTOGRAM,
	PANEL_TYPES.TABLE,
	PANEL_TYPES.PIE,
];

/** Panel types that reduce each series to one cell or slice. */
const SCALAR_TYPES: (keyof PartialPanelTypes)[] = [
	PANEL_TYPES.TABLE,
	PANEL_TYPES.PIE,
];

describe('panelTypeDataSourceFormValuesMap', () => {
	const seriesLogs = fieldsFor(PANEL_TYPES.TIME_SERIES, DataSource.LOGS);
	const seriesMetrics = fieldsFor(PANEL_TYPES.TIME_SERIES, DataSource.METRICS);

	it('shares one builder surface between logs and traces', () => {
		Object.values(panelTypeDataSourceFormValuesMap).forEach((sources) => {
			expect(sources[DataSource.LOGS].builder.queryData).toStrictEqual(
				sources[DataSource.TRACES].builder.queryData,
			);
		});
	});

	// The provider pushes onto the list it reads from this map, so two cells backed by
	// one instance would leak fields into each other.
	it('gives every cell its own array instance', () => {
		const arrays = Object.values(panelTypeDataSourceFormValuesMap).flatMap(
			(sources) =>
				Object.values(sources).map((source) => source.builder.queryData),
		);

		expect(new Set(arrays).size).toBe(arrays.length);
	});

	// One consequence of composing: the aggregating types share a single field list, so
	// an edit meant for charts reaches table and pie too.
	it.each(AGGREGATING_TYPES)(
		'gives %s the same non-metrics fields as a time series',
		(panelType) => {
			expect(fieldsFor(panelType, DataSource.LOGS)).toStrictEqual(seriesLogs);
		},
	);

	it('adds both metrics aggregation steps for metrics', () => {
		expect(added(seriesLogs, seriesMetrics)).toStrictEqual([
			'spaceAggregation',
			'timeAggregation',
		]);
	});

	it.each(SCALAR_TYPES)('offers reduceTo to %s on metrics only', (panelType) => {
		expect(
			added(seriesMetrics, fieldsFor(panelType, DataSource.METRICS)),
		).toStrictEqual(['reduceTo']);
		expect(fieldsFor(panelType, DataSource.LOGS)).not.toContain('reduceTo');
	});

	it('drops grouping, paging and ordering for a single value', () => {
		const value = fieldsFor(PANEL_TYPES.VALUE, DataSource.LOGS);

		expect(added(value, seriesLogs)).toStrictEqual([
			'groupBy',
			'limit',
			'orderBy',
		]);
		expect(value).toContain('reduceTo');
	});

	it('offers no aggregation fields to raw rows', () => {
		const rows = fieldsFor(PANEL_TYPES.LIST, DataSource.LOGS);

		expect(rows).not.toContain('aggregateAttribute');
		expect(rows).not.toContain('aggregateOperator');
		expect(rows).not.toContain('groupBy');
		expect(rows).not.toContain('having');
		expect(rows).not.toContain('stepInterval');
	});

	it('drops paging and ordering for metrics rows', () => {
		expect(
			added(
				fieldsFor(PANEL_TYPES.LIST, DataSource.METRICS),
				fieldsFor(PANEL_TYPES.LIST, DataSource.LOGS),
			),
		).toStrictEqual(['functions', 'limit', 'orderBy']);
	});
});
