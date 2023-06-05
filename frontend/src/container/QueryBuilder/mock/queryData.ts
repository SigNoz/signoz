import { initialQueryBuilderFormValues } from 'constants/queryBuilder';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export const queryMockData: IBuilderQuery = {
	dataSource: DataSource.METRICS,
	queryName: 'A',
	aggregateOperator: 'noop',
	aggregateAttribute: {
		key: 'signoz_latency_count',
		dataType: 'float64',
		type: 'tag',
		isColumn: true,
	},
	filters: {
		items: [
			{
				id: '8fac746b',
				key: {
					key: 'resource_signoz_collector_id',
					dataType: 'int64',
					isColumn: false,
					type: 'tag',
				},
				op: '=',
				value: ['1a5d3cc2-4b3e-4c7c-ad07-c4cdd739d1b9'],
			},
			{
				id: '8fadtr46b',
				key: {
					key: 'service_name',
					dataType: 'string',
					isColumn: false,
					type: 'tag',
				},
				op: 'IN',
				value: ['frontend', 'operation', 'ser'],
			},
		],
		op: 'AND',
	},
	expression: '',
	disabled: false,
	having: [],
	stepInterval: 30,
	limit: 10,
	orderBy: [],
	groupBy: [],
	legend: '',
	reduceTo: 'sum',
};

export const formulaMockData = {
	queryName: 'C',
	label: 'Formula',
	expression: 'sum(A, B)',
	legend: 'Total',
	disabled: false,
};

export const valueWithAttributeAndOperator: IBuilderQuery = {
	...initialQueryBuilderFormValues,
	dataSource: DataSource.LOGS,
	aggregateOperator: 'SUM',
	aggregateAttribute: {
		isColumn: false,
		key: 'bytes',
		type: 'tag',
		dataType: 'float64',
	},
};

export const querySearchResult = ['frontend', 'operation', 'ser'];
