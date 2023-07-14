import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, QueryBuilderData } from 'types/common/queryBuilder';

import {
	DataType,
	ERROR_PERCENTAGE_FORMULA,
	GraphTitle,
	LETENCY_LEGENDS_AGGREGATEOPERATOR,
	MetricsType,
	OPERATION_LEGENDS,
	OPERATOR,
	QUERYNAME_AND_EXPRESSION,
	WidgetKeys,
} from '../constant';
import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

export const letency = ({
	servicename,
	tagFilterItems,
}: LetencyProps): QueryBuilderData => {
	const metricNames: BaseAutocompleteData[] = [
		{
			key: WidgetKeys.DurationNano,
			dataType: DataType.FLOAT64,
			isColumn: true,
			type: MetricsType.Tag,
		},
		{
			key: WidgetKeys.DurationNano,
			dataType: DataType.FLOAT64,
			isColumn: true,
			type: MetricsType.Tag,
		},
		{
			key: WidgetKeys.DurationNano,
			dataType: DataType.FLOAT64,
			isColumn: true,
			type: MetricsType.Tag,
		},
	];

	const filterItems: TagFilterItem[][] = [
		[
			{
				id: '',
				key: {
					key: WidgetKeys.ServiceName,
					dataType: DataType.STRING,
					type: MetricsType.Tag,
					isColumn: true,
				},
				op: OPERATOR.EQUAL,
				value: `${servicename}`,
			},
			...tagFilterItems,
		],
		[
			{
				id: '',
				key: {
					key: WidgetKeys.ServiceName,
					dataType: DataType.STRING,
					type: MetricsType.Tag,
					isColumn: true,
				},
				op: OPERATOR.EQUAL,
				value: `${servicename}`,
			},
			...tagFilterItems,
		],
		[
			{
				id: '',
				key: {
					key: WidgetKeys.ServiceName,
					dataType: DataType.STRING,
					type: MetricsType.Tag,
					isColumn: true,
				},
				op: OPERATOR.EQUAL,
				value: `${servicename}`,
			},
			...tagFilterItems,
		],
	];

	return getQueryBuilderQueries({
		metricNames,
		legends: LETENCY_LEGENDS_AGGREGATEOPERATOR,
		filterItems,
		aggregateOperator: LETENCY_LEGENDS_AGGREGATEOPERATOR,
		dataSource: DataSource.TRACES,
		queryNameAndExpression: QUERYNAME_AND_EXPRESSION,
	});
};

export const operationPerSec = ({
	servicename,
	tagFilterItems,
	topLevelOperations,
}: OperationPerSecProps): QueryBuilderData => {
	const metricNames: BaseAutocompleteData[] = [
		{
			key: WidgetKeys.SignozLatencyCount,
			dataType: DataType.FLOAT64,
			isColumn: true,
			type: null,
		},
	];

	const filterItems: TagFilterItem[][] = [
		[
			{
				id: '',
				key: {
					key: WidgetKeys.Service_name,
					dataType: DataType.STRING,
					isColumn: false,
					type: MetricsType.Resource,
				},
				op: OPERATOR.IN,
				value: [`${servicename}`],
			},
			{
				id: '',
				key: {
					key: WidgetKeys.Operation,
					dataType: DataType.STRING,
					isColumn: false,
					type: MetricsType.Tag,
				},
				op: OPERATOR.IN,
				value: topLevelOperations,
			},
			...tagFilterItems,
		],
	];

	return getQueryBuilderQueries({
		metricNames,
		legends: OPERATION_LEGENDS,
		filterItems,
		dataSource: DataSource.METRICS,
	});
};

export const errorPercentage = ({
	servicename,
	tagFilterItems,
	topLevelOperations,
}: OperationPerSecProps): QueryBuilderData => {
	const metricNameA: BaseAutocompleteData = {
		key: WidgetKeys.SignozCallsTotal,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: null,
	};
	const metricNameB: BaseAutocompleteData = {
		key: WidgetKeys.SignozCallsTotal,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: null,
	};
	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.Service_name,
				dataType: DataType.STRING,
				isColumn: false,
				type: MetricsType.Resource,
			},
			op: OPERATOR.IN,
			value: [`${servicename}`],
		},
		{
			id: '',
			key: {
				key: WidgetKeys.Operation,
				dataType: DataType.STRING,
				isColumn: false,
				type: MetricsType.Tag,
			},
			op: OPERATOR.IN,
			value: topLevelOperations,
		},
		{
			id: '',
			key: {
				key: WidgetKeys.StatusCode,
				dataType: DataType.INT64,
				isColumn: false,
				type: MetricsType.Tag,
			},
			op: OPERATOR.IN,
			value: ['STATUS_CODE_ERROR'],
		},
		...tagFilterItems,
	];

	const additionalItemsB: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.Service_name,
				dataType: DataType.STRING,
				isColumn: false,
				type: MetricsType.Resource,
			},
			op: OPERATOR.IN,
			value: [`${servicename}`],
		},
		{
			id: '',
			key: {
				key: WidgetKeys.Operation,
				dataType: DataType.STRING,
				isColumn: false,
				type: MetricsType.Tag,
			},
			op: OPERATOR.IN,
			value: topLevelOperations,
		},
		...tagFilterItems,
	];

	return getQueryBuilderQuerieswithFormula({
		metricNameA,
		metricNameB,
		additionalItemsA,
		additionalItemsB,
		legend: GraphTitle.ERROR_PERCENTAGE,
		disabled: true,
		expression: ERROR_PERCENTAGE_FORMULA,
		legendFormula: GraphTitle.ERROR_PERCENTAGE,
	});
};

export interface OperationPerSecProps {
	servicename: string | undefined;
	tagFilterItems: TagFilterItem[];
	topLevelOperations: string[];
}

export interface LetencyProps {
	servicename: string | undefined;
	tagFilterItems: TagFilterItem[];
}
