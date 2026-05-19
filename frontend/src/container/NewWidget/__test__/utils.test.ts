import {
	initialAutocompleteData,
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { cloneDeep } from 'lodash-es';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { MetricAggregation } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import type { PartialPanelTypes } from '../utils';
import { getIsQueryModified, handleQueryChange } from '../utils';

const buildSupersetQuery = (extras?: Record<string, unknown>): Query => ({
	queryType: EQueryType.QUERY_BUILDER,
	promql: [],
	clickhouse_sql: [],
	id: '1',
	unit: '1',
	builder: {
		queryFormulas: [],
		queryData: [
			{
				...initialQueryBuilderFormValuesMap[DataSource.LOGS],
				queryName: 'A',
				orderBy: [{ columnName: 'x', order: 'asc' }],
				limit: 10,
				...(extras || {}),
			},
			{
				...initialQueryBuilderFormValuesMap[DataSource.LOGS],
				queryName: 'B',
				orderBy: [{ columnName: 'x', order: 'desc' }],
				limit: 20,
				...(extras || {}),
			},
		],
		queryTraceOperator: [],
	},
});

const buildMetricsQuery = (
	overrides?: Partial<{
		metricName: string;
		aggregateAttributeKey: string;
		legend: string;
		groupByKey: string;
	}>,
): Query => ({
	queryType: EQueryType.QUERY_BUILDER,
	promql: [],
	clickhouse_sql: [],
	id: 'query-id',
	unit: '',
	builder: {
		queryFormulas: [],
		queryData: [
			{
				...initialQueryBuilderFormValuesMap[DataSource.METRICS],
				queryName: 'A',
				aggregateAttribute: overrides?.aggregateAttributeKey
					? {
							...initialAutocompleteData,
							key: overrides.aggregateAttributeKey,
							type: 'tag',
							dataType: DataTypes.Float64,
						}
					: cloneDeep(initialAutocompleteData),
				aggregations: [
					{
						metricName: overrides?.metricName ?? 'system.cpu.load',
						temporality: '',
						timeAggregation: 'rate',
						spaceAggregation: 'sum',
						reduceTo: 'avg',
					} as MetricAggregation,
				],
				legend: overrides?.legend ?? '',
				groupBy: overrides?.groupByKey
					? [
							{
								...initialAutocompleteData,
								key: overrides.groupByKey,
								type: 'tag',
								dataType: DataTypes.String,
							},
						]
					: [],
			},
		],
		queryTraceOperator: [],
	},
});

describe('getIsQueryModified', () => {
	it('returns false when baseline is null (new unsaved panel with no edits anchor)', () => {
		const current = buildMetricsQuery();
		expect(getIsQueryModified(current, null)).toBe(false);
	});

	it('returns false when baseline is undefined', () => {
		const current = buildMetricsQuery();
		expect(getIsQueryModified(current, undefined)).toBe(false);
	});

	it('returns false when current only differs by auto-backfilled aggregateAttribute', () => {
		// saved widget query: aggregateAttribute is the v5-style empty initial value
		// (stripped from persisted spec; spread back in as initialAutocompleteData on load)
		const savedQuery = buildMetricsQuery({ metricName: 'system.cpu.load' });
		// after MetricNameSelector edit-mode backfill, currentQuery has the populated
		// aggregateAttribute while the rest of the query is identical
		const currentQuery = buildMetricsQuery({
			metricName: 'system.cpu.load',
			aggregateAttributeKey: 'system.cpu.load',
		});
		expect(getIsQueryModified(currentQuery, savedQuery)).toBe(false);
	});

	it('returns true when the user edits the legend', () => {
		const baseline = buildMetricsQuery({ metricName: 'system.cpu.load' });
		const edited = buildMetricsQuery({
			metricName: 'system.cpu.load',
			legend: 'cpu-load',
		});
		expect(getIsQueryModified(edited, baseline)).toBe(true);
	});

	it('returns true when the user picks a different metric (aggregations diverges)', () => {
		const baseline = buildMetricsQuery({ metricName: 'system.cpu.load' });
		const edited = buildMetricsQuery({ metricName: 'system.memory.usage' });
		expect(getIsQueryModified(edited, baseline)).toBe(true);
	});

	it('returns true when the user adds a groupBy', () => {
		const baseline = buildMetricsQuery({ metricName: 'system.cpu.load' });
		const edited = buildMetricsQuery({
			metricName: 'system.cpu.load',
			groupByKey: 'host.name',
		});
		expect(getIsQueryModified(edited, baseline)).toBe(true);
	});

	it('returns true on existing widget when current diverges from saved (Stage-and-Run silent-loss flow)', () => {
		// After Edit → Stage and Run, stagedQuery is reset to match currentQuery.
		// The dirty check must compare against the SAVED widget query, not stagedQuery.
		const savedQuery = buildMetricsQuery({ metricName: 'system.cpu.load' });
		const currentQuery = buildMetricsQuery({ metricName: 'system.memory.usage' });
		expect(getIsQueryModified(currentQuery, savedQuery)).toBe(true);
	});

	it('returns false for a new panel where currentQuery still matches stagedQuery baseline', () => {
		const stagedQuery = buildMetricsQuery();
		const currentQuery = buildMetricsQuery();
		expect(getIsQueryModified(currentQuery, stagedQuery)).toBe(false);
	});

	it('returns true for a new panel where currentQuery has been edited away from stagedQuery', () => {
		const stagedQuery = buildMetricsQuery();
		const currentQuery = buildMetricsQuery({ legend: 'custom' });
		expect(getIsQueryModified(currentQuery, stagedQuery)).toBe(true);
	});
});

describe('handleQueryChange', () => {
	it('sets list-specific fields when switching to LIST', () => {
		const superset = buildSupersetQuery();
		const output = handleQueryChange(
			PANEL_TYPES.LIST as keyof PartialPanelTypes,
			superset as Query,
			PANEL_TYPES.TABLE,
		);
		const firstQuery = output.builder.queryData[0];
		expect(firstQuery.aggregateOperator).toBe('noop');
		expect(firstQuery.offset).toBe(0);
		expect(firstQuery.pageSize).toBe(10);
		expect(firstQuery.orderBy).toBeUndefined();
		expect(firstQuery.queryName).toBe('A');

		const secondQuery = output.builder.queryData[1];
		expect(secondQuery.aggregateOperator).toBe('noop');
		expect(secondQuery.offset).toBe(0);
		expect(secondQuery.pageSize).toBe(10);
		expect(secondQuery.orderBy).toBeUndefined();
		expect(secondQuery.queryName).toBe('B');
	});

	it('resets noop and pagination when leaving LIST', () => {
		const superset = buildSupersetQuery({
			aggregateOperator: 'noop',
			offset: 5,
			pageSize: 50,
		});
		const output = handleQueryChange(
			PANEL_TYPES.TABLE as keyof PartialPanelTypes,
			superset as Query,
			PANEL_TYPES.LIST,
		);
		const q = output.builder.queryData[0];
		expect(q.aggregateOperator).not.toBe('noop');
		expect(q.offset).toBeUndefined();
		expect(q.pageSize).toBeUndefined();
		expect(q.orderBy).toBeUndefined();
		expect(q.queryName).toBe('A');
	});
});
