import {
	initialQueriesMap,
	initialQueryBuilderFormValues,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { noop } from 'lodash-es';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const optionMenuReturn = {
	options: {
		selectColumns: [
			{
				key: 'serviceName',
				dataType: 'string',
				type: 'tag',
				id: 'serviceName--string--tag--true',
			},
			{
				key: 'name',
				dataType: 'string',
				type: 'tag',
				id: 'name--string--tag--true',
			},
			{
				key: 'durationNano',
				dataType: 'float64',
				type: 'tag',
				id: 'durationNano--float64--tag--true',
			},
			{
				key: 'httpMethod',
				dataType: 'string',
				type: 'tag',
				id: 'httpMethod--string--tag--true',
			},
			{
				key: 'responseStatusCode',
				dataType: 'string',
				type: 'tag',
				id: 'responseStatusCode--string--tag--true',
			},
			{
				key: 'statusCode',
				dataType: 'float64',
				type: 'tag',
				id: 'statusCode--float64--tag--true',
			},
			{
				key: 'dbName',
				dataType: 'string',
				type: 'tag',
				id: 'dbName--string--tag--true',
			},
		],
		maxLines: 1,
		format: 'list',
	},
	handleOptionsChange: jest.fn(),
	config: {
		addColumn: {
			isFetching: false,
			value: [
				{
					key: 'serviceName',
					dataType: 'string',
					type: 'tag',
					id: 'serviceName--string--tag--true',
				},
				{
					key: 'name',
					dataType: 'string',
					type: 'tag',
					id: 'name--string--tag--true',
				},
				{
					key: 'durationNano',
					dataType: 'float64',
					type: 'tag',
					id: 'durationNano--float64--tag--true',
				},
				{
					key: 'httpMethod',
					dataType: 'string',
					type: 'tag',
					id: 'httpMethod--string--tag--true',
				},
				{
					key: 'responseStatusCode',
					dataType: 'string',
					type: 'tag',
					id: 'responseStatusCode--string--tag--true',
				},
				{
					key: 'statusCode',
					dataType: 'float64',
					type: 'tag',
					id: 'statusCode--float64--tag--true',
				},
				{
					key: 'dbName',
					dataType: 'string',
					type: 'tag',
					id: 'dbName--string--tag--true',
				},
			],
			options: [],
		},
		format: {
			value: 'list',
		},
		maxLines: {
			value: 2,
		},
	},
};

export const compositeQuery: Query = {
	...initialQueriesMap.traces,
	builder: {
		...initialQueriesMap.traces.builder,
		queryData: [
			{
				...initialQueryBuilderFormValues,
				filters: {
					items: [
						{
							id: '95564eb1',
							key: {
								key: 'name',
								dataType: DataTypes.String,
								type: 'tag',
								id: 'name--string--tag--true',
							},
							op: 'in',
							value: ['HTTP GET /customer'],
						},
						{
							id: '3337951c',
							key: {
								key: 'serviceName',
								dataType: DataTypes.String,
								type: 'tag',
								id: 'serviceName--string--tag--true',
							},
							op: 'in',
							value: ['demo-app'],
						},
					],
					op: 'AND',
				},
			},
		],
	},
};

export const redirectWithQueryBuilderData = jest.fn();

export const qbProviderValue = {
	isDefaultQuery: jest.fn(() => false),
	currentQuery: {
		...initialQueriesMap.traces,
		builder: {
			...initialQueriesMap.traces.builder,
			queryData: [initialQueryBuilderFormValues],
		},
	},
	redirectWithQueryBuilderData,
	panelType: PANEL_TYPES.LIST,
	setSupersetQuery: jest.fn(),
	supersetQuery: initialQueriesMap.traces,
	stagedQuery: initialQueriesMap.traces,
	initialDataSource: null,
	isEnabledQuery: false,
	handleSetQueryData: noop,
	handleSetFormulaData: noop,
	handleSetQueryItemData: noop,
	handleSetConfig: noop,
	removeQueryBuilderEntityByIndex: noop,
	removeQueryTypeItemByIndex: noop,
	addNewBuilderQuery: noop,
	cloneQuery: noop,
	addNewFormula: noop,
	addNewQueryItem: noop,
	handleRunQuery: noop,
	resetQuery: noop,
	updateAllQueriesOperators: (): Query => initialQueriesMap.traces,
	updateQueriesData: (): Query => initialQueriesMap.traces,
	initQueryBuilderData: noop,
	handleOnUnitsChange: noop,
	isStagedQueryUpdated: (): boolean => false,
} as any;
