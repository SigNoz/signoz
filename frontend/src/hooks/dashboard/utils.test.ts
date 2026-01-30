/* eslint-disable sonarjs/no-duplicate-string */
import {
	initialClickHouseData,
	initialQueryBuilderFormValuesMap,
	initialQueryPromQLData,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { IDashboardVariable, Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { createDynamicVariableToWidgetsMap } from './utils';

const createMockDynamicVariable = (
	overrides: Partial<IDashboardVariable> = {},
): IDashboardVariable => ({
	id: 'var-1',
	name: 'testVar',
	description: '',
	type: 'DYNAMIC',
	sort: 'DISABLED',
	multiSelect: false,
	showALLOption: false,
	dynamicVariablesAttribute: 'service.name',
	...overrides,
});

const createBaseWidget = (id: string, query: Query): Widgets => ({
	id,
	title: 'Test Widget',
	description: '',
	panelTypes: PANEL_TYPES.TIME_SERIES,
	opacity: '1',
	nullZeroValues: '',
	timePreferance: 'GLOBAL_TIME',
	softMin: null,
	softMax: null,
	selectedLogFields: null,
	selectedTracesFields: null,
	query,
});

const createMockPromQLWidget = (
	id: string,
	queries: {
		query: string;
		name?: string;
		legend?: string;
		disabled?: boolean;
	}[],
): Widgets => {
	const promqlQueries = queries.map((q) => ({
		...initialQueryPromQLData,
		query: q.query,
		name: q.name || 'A',
		legend: q.legend || '',
		disabled: q.disabled ?? false,
	}));

	const query: Query = {
		queryType: EQueryType.PROM,
		promql: promqlQueries,
		builder: {
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		clickhouse_sql: [],
		id: 'query-1',
	};

	return createBaseWidget(id, query);
};

const createMockClickHouseWidget = (
	id: string,
	queries: {
		query: string;
		name?: string;
		legend?: string;
		disabled?: boolean;
	}[],
): Widgets => {
	const clickhouseQueries = queries.map((q) => ({
		...initialClickHouseData,
		query: q.query,
		name: q.name || 'A',
		legend: q.legend || '',
		disabled: q.disabled ?? false,
	}));

	const query: Query = {
		queryType: EQueryType.CLICKHOUSE,
		promql: [],
		builder: {
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		clickhouse_sql: clickhouseQueries,
		id: 'query-1',
	};

	return createBaseWidget(id, query);
};

const createMockQueryBuilderWidget = (
	id: string,
	filters: { key: string; value: string | string[]; op?: string }[],
): Widgets => {
	const queryData = {
		...initialQueryBuilderFormValuesMap[DataSource.LOGS],
		queryName: 'A',
		filters: {
			items: filters.map((f, index) => ({
				id: `filter-${index}`,
				key: { key: f.key, dataType: DataTypes.String, type: '', id: f.key },
				op: f.op || '=',
				value: f.value,
			})),
			op: 'AND',
		},
	};

	const query: Query = {
		queryType: EQueryType.QUERY_BUILDER,
		promql: [],
		builder: {
			queryData: [queryData],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		clickhouse_sql: [],
		id: 'query-1',
	};

	return createBaseWidget(id, query);
};

describe('createDynamicVariableToWidgetsMap', () => {
	it('should handle widgets with different query types', () => {
		const dynamicVariables = [
			createMockDynamicVariable({
				id: 'var-1',
				name: 'service.name123',
				dynamicVariablesAttribute: 'service.name',
			}),
		];

		const widgets = [
			createMockPromQLWidget('widget-promql-pass', [
				{ query: 'up{service="$service.name123"}' },
			]),
			createMockPromQLWidget('widget-promql-fail', [
				{ query: 'up{service="$service.name"}' },
			]),
			createMockClickHouseWidget('widget-clickhouse-pass', [
				{ query: "SELECT * FROM logs WHERE service_name = '$service.name123'" },
			]),
			createMockClickHouseWidget('widget-clickhouse-fail', [
				{ query: "SELECT * FROM logs WHERE service_name = '$service.name'" },
			]),
			createMockQueryBuilderWidget('widget-builder-pass', [
				{ key: 'service.name', value: '$service.name123' },
			]),
			createMockQueryBuilderWidget('widget-builder-fail', [
				{ key: 'service.name', value: '$service.name' },
			]),
		];

		const result = createDynamicVariableToWidgetsMap(dynamicVariables, widgets);

		expect(result['var-1']).toContain('widget-promql-pass');
		expect(result['var-1']).toContain('widget-clickhouse-pass');
		expect(result['var-1']).toContain('widget-builder-pass');

		expect(result['var-1']).not.toContain('widget-promql-fail');
		expect(result['var-1']).not.toContain('widget-clickhouse-fail');
		expect(result['var-1']).not.toContain('widget-builder-fail');
	});
});
