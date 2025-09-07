import {
	initialQueriesMap,
	initialQueryBuilderFormValues,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { noop } from 'lodash-es';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const logsQueryRangeSuccessNewFormatResponse = {
	data: {
		result: [],
		resultType: '',
		newResult: {
			status: 'success',
			data: {
				resultType: '',
				result: [
					{
						queryName: 'A',
						series: null,
						list: [
							{
								timestamp: '2024-02-15T21:20:22Z',
								data: {
									attributes_bool: {},
									attributes_float64: {},
									attributes_int64: {},
									attributes_string: {
										container_id: 'container_id',
										container_name: 'container_name',
										driver: 'driver',
										eta: '2m0s',
										location: 'frontend',
										log_level: 'INFO',
										message: 'Dispatch successful',
										service: 'frontend',
										span_id: 'span_id',
										trace_id: 'span_id',
									},
									body:
										'2024-02-15T21:20:22.035Z\tINFO\tfrontend\tDispatch successful\t{"service": "frontend", "trace_id": "span_id", "span_id": "span_id", "driver": "driver", "eta": "2m0s"}',
									id: 'id',
									resources_string: {
										'container.name': 'container_name',
									},
									severity_number: 0,
									severity_text: '',
									span_id: '',
									trace_flags: 0,
									trace_id: '',
								},
							},
						],
					},
				],
			},
		},
	},
};

export const mockQueryBuilderContextValue = {
	isDefaultQuery: (): boolean => false,
	currentQuery: {
		...initialQueriesMap.logs,
		builder: {
			...initialQueriesMap.logs.builder,
			queryData: [
				{
					...initialQueryBuilderFormValues,
					filters: {
						items: [
							{
								id: '1',
								key: {
									key: 'service',
									type: '',
									dataType: DataTypes.String,
								},
								op: OPERATORS['='],
								value: 'frontend',
							},
							{
								id: '2',
								key: {
									key: 'log_level',
									type: '',
									dataType: DataTypes.String,
								},
								op: OPERATORS['='],
								value: 'INFO',
							},
						],
						op: 'AND',
					},
				},
				initialQueryBuilderFormValues,
			],
		},
	},
	setSupersetQuery: jest.fn(),
	supersetQuery: {
		...initialQueriesMap.logs,
		builder: {
			...initialQueriesMap.logs.builder,
			queryData: [
				{
					...initialQueryBuilderFormValues,
					filters: {
						items: [
							{
								id: '1',
								key: {
									key: 'service',
									type: '',
									dataType: DataTypes.String,
								},
								op: OPERATORS['='],
								value: 'frontend',
							},
							{
								id: '2',
								key: {
									key: 'log_level',
									type: '',
									dataType: DataTypes.String,
								},
								op: OPERATORS['='],
								value: 'INFO',
							},
						],
						op: 'AND',
					},
				},
				initialQueryBuilderFormValues,
			],
		},
	},
	stagedQuery: {
		...initialQueriesMap.logs,
		builder: {
			...initialQueriesMap.logs.builder,
			queryData: [
				{
					...initialQueryBuilderFormValues,
					filters: {
						items: [
							{
								id: '1',
								key: {
									key: 'service',
									type: '',
									dataType: DataTypes.String,
								},
								op: OPERATORS['='],
								value: 'frontend',
							},
							{
								id: '2',
								key: {
									key: 'log_level',
									type: '',
									dataType: DataTypes.String,
								},
								op: OPERATORS['='],
								value: 'INFO',
							},
						],
						op: 'AND',
					},
				},
				initialQueryBuilderFormValues,
			],
		},
	},
	initialDataSource: null,
	panelType: PANEL_TYPES.TIME_SERIES,
	isEnabledQuery: false,
	lastUsedQuery: 0,
	handleSetTraceOperatorData: noop,
	removeAllQueryBuilderEntities: noop,
	removeTraceOperator: noop,
	addTraceOperator: noop,
	setLastUsedQuery: noop,
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
	redirectWithQueryBuilderData: noop,
	handleRunQuery: noop,
	resetQuery: noop,
	updateAllQueriesOperators: (): Query => initialQueriesMap.logs,
	updateQueriesData: (): Query => initialQueriesMap.logs,
	initQueryBuilderData: noop,
	handleOnUnitsChange: noop,
	isStagedQueryUpdated: (): boolean => false,
};
