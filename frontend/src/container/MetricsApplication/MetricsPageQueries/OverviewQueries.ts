import { OPERATORS } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, QueryBuilderData } from 'types/common/queryBuilder';

import {
	DataType,
	FORMULA,
	GraphTitle,
	LETENCY_LEGENDS_AGGREGATEOPERATOR,
	LETENCY_LEGENDS_AGGREGATEOPERATOR_SPAN_METRICS,
	MetricsType,
	OPERATION_LEGENDS,
	QUERYNAME_AND_EXPRESSION,
	RequestMethods,
	WidgetKeys,
} from '../constant';
import { IServiceName } from '../Tabs/types';
import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

export const latency = ({
	servicename,
	tagFilterItems,
	spanMetricFlg = false,
}: LatencyProps): QueryBuilderData => {
	const newAutoCompleteData: BaseAutocompleteData = {
		key: spanMetricFlg
			? WidgetKeys.Signoz_latency_bucket
			: WidgetKeys.DurationNano,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: spanMetricFlg ? null : MetricsType.Tag,
	};

	const autocompleteData: BaseAutocompleteData[] = Array(3).fill(
		newAutoCompleteData,
	);

	const filterItem: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: spanMetricFlg ? WidgetKeys.Service_name : WidgetKeys.ServiceName,
				dataType: DataType.STRING,
				type: spanMetricFlg ? MetricsType.Resource : MetricsType.Tag,
				isColumn: !spanMetricFlg,
			},
			op: spanMetricFlg ? OPERATORS.IN : OPERATORS['='],
			value: spanMetricFlg ? [servicename] : servicename,
		},
		...tagFilterItems,
	];

	if (spanMetricFlg) {
		filterItem.push({
			id: '',
			key: {
				dataType: DataType.STRING,
				isColumn: false,
				key: WidgetKeys.Operation,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: [RequestMethods.GETDISPATCHER],
		});
	}

	const filterItems: TagFilterItem[][] = Array(3).fill([...filterItem]);

	console.log('SpanMEtricFlg', filterItems);

	return getQueryBuilderQueries({
		autocompleteData,
		legends: LETENCY_LEGENDS_AGGREGATEOPERATOR,
		filterItems,
		aggregateOperator: spanMetricFlg
			? LETENCY_LEGENDS_AGGREGATEOPERATOR_SPAN_METRICS
			: LETENCY_LEGENDS_AGGREGATEOPERATOR,
		dataSource: spanMetricFlg ? DataSource.METRICS : DataSource.TRACES,
		queryNameAndExpression: QUERYNAME_AND_EXPRESSION,
	});
};

export const operationPerSec = ({
	servicename,
	tagFilterItems,
	topLevelOperations,
}: OperationPerSecProps): QueryBuilderData => {
	const autocompleteData: BaseAutocompleteData[] = [
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
				op: OPERATORS.IN,
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
				op: OPERATORS.IN,
				value: topLevelOperations,
			},
			...tagFilterItems,
		],
	];

	return getQueryBuilderQueries({
		autocompleteData,
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
	const autocompleteDataA: BaseAutocompleteData = {
		key: WidgetKeys.SignozCallsTotal,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: null,
	};
	const autocompleteDataB: BaseAutocompleteData = {
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
			op: OPERATORS.IN,
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
			op: OPERATORS.IN,
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
			op: OPERATORS.IN,
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
			op: OPERATORS.IN,
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
			op: OPERATORS.IN,
			value: topLevelOperations,
		},
		...tagFilterItems,
	];

	return getQueryBuilderQuerieswithFormula({
		autocompleteDataA,
		autocompleteDataB,
		additionalItemsA,
		additionalItemsB,
		legend: GraphTitle.ERROR_PERCENTAGE,
		disabled: true,
		expression: FORMULA.ERROR_PERCENTAGE,
		legendFormula: GraphTitle.ERROR_PERCENTAGE,
	});
};

export interface OperationPerSecProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
	topLevelOperations: string[];
}

export interface LatencyProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
	spanMetricFlg?: boolean;
}
