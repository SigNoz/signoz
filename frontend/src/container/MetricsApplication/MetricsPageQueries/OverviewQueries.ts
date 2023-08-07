import { OPERATORS } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	MetricAggregateOperator,
	QueryBuilderData,
} from 'types/common/queryBuilder';

import {
	DataType,
	FORMULA,
	GraphTitle,
	LATENCY_AGGREGATEOPERATOR,
	LATENCY_AGGREGATEOPERATOR_SPAN_METRICS,
	MetricsType,
	OPERATION_LEGENDS,
	QUERYNAME_AND_EXPRESSION,
	WidgetKeys,
} from '../constant';
import {
	ApDexMetricsQueryBuilderQueriesProps,
	ApDexProps,
	LatencyProps,
	OperationPerSecProps,
} from '../Tabs/types';
import { getNearestHighestBucketValue } from '../utils';
import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

export const latency = ({
	servicename,
	tagFilterItems,
	isSpanMetricEnable = false,
	topLevelOperationsRoute,
}: LatencyProps): QueryBuilderData => {
	const newAutoCompleteData: BaseAutocompleteData = {
		key: isSpanMetricEnable
			? WidgetKeys.Signoz_latency_bucket
			: WidgetKeys.DurationNano,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: isSpanMetricEnable ? null : MetricsType.Tag,
	};

	const autocompleteData = Array(3).fill(newAutoCompleteData);

	const filterItem: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: isSpanMetricEnable ? WidgetKeys.Service_name : WidgetKeys.ServiceName,
				dataType: DataType.STRING,
				type: isSpanMetricEnable ? MetricsType.Resource : MetricsType.Tag,
				isColumn: !isSpanMetricEnable,
			},
			op: isSpanMetricEnable ? OPERATORS.IN : OPERATORS['='],
			value: isSpanMetricEnable ? [servicename] : servicename,
		},
		{
			id: '',
			key: {
				dataType: DataType.STRING,
				isColumn: !isSpanMetricEnable,
				key: isSpanMetricEnable ? WidgetKeys.Operation : WidgetKeys.Name,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN.toLowerCase(), // TODO: need to remove toLowerCase() this once backend is changed
			value: [...topLevelOperationsRoute],
		},
		...tagFilterItems,
	];

	const filterItems = Array(3).fill([...filterItem]);
	const legends = LATENCY_AGGREGATEOPERATOR;
	const aggregateOperator = isSpanMetricEnable
		? LATENCY_AGGREGATEOPERATOR_SPAN_METRICS
		: LATENCY_AGGREGATEOPERATOR;
	const dataSource = isSpanMetricEnable ? DataSource.METRICS : DataSource.TRACES;
	const queryNameAndExpression = QUERYNAME_AND_EXPRESSION;

	return getQueryBuilderQueries({
		autocompleteData,
		legends,
		filterItems,
		aggregateOperator,
		dataSource,
		queryNameAndExpression,
	});
};

export const apDexTracesQueryBuilderQueries = ({
	servicename,
	tagFilterItems,
	topLevelOperationsRoute,
	threashold,
}: ApDexProps): QueryBuilderData => {
	const autoCompleteDataA: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: '',
		type: null,
	};

	const autoCompleteDataB: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: '',
		type: null,
	};

	const autoCompleteDataC: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: '',
		type: null,
	};

	const filterItemA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: true,
				key: 'serviceName',
				type: 'tag',
			},
			op: '=',
			value: servicename,
		},
		{
			id: '',
			key: {
				key: 'name',
				dataType: 'string',
				isColumn: true,
				type: 'tag',
			},
			op: 'in',
			value: [...topLevelOperationsRoute],
		},
		...tagFilterItems,
	];

	const filterItemB: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'bool',
				isColumn: true,
				key: 'hasError',
				type: 'tag',
			},
			op: '=',
			value: false,
		},
		{
			id: '',
			key: {
				dataType: 'float64',
				isColumn: true,
				key: 'durationNano',
				type: 'tag',
			},
			op: '<=',
			value: threashold * 1000000000,
		},
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: true,
				key: 'serviceName',
				type: 'tag',
			},
			op: '=',
			value: servicename,
		},
		{
			id: '',
			key: {
				key: 'name',
				dataType: 'string',
				isColumn: true,
				type: 'tag',
			},
			op: 'in',
			value: [...topLevelOperationsRoute],
		},
	];

	const filterItemC: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'float64',
				isColumn: true,
				key: 'durationNano',
				type: 'tag',
			},
			op: '<=',
			value: threashold * 4 * 1000000000,
		},
		{
			id: '',
			key: {
				dataType: 'bool',
				isColumn: true,
				key: 'hasError',
				type: 'tag',
			},
			op: '=',
			value: false,
		},
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: true,
				key: 'serviceName',
				type: 'tag',
			},
			op: '=',
			value: servicename,
		},
		{
			id: '',
			key: {
				key: 'name',
				dataType: 'string',
				isColumn: true,
				type: 'tag',
			},
			op: 'in',
			value: [...topLevelOperationsRoute],
		},
	];

	const autocompleteData = [
		autoCompleteDataA,
		autoCompleteDataB,
		autoCompleteDataC,
	];
	const additionalItems = [filterItemA, filterItemB, filterItemC];
	const legends = [GraphTitle.APDEX];
	const disabled = Array(3).fill(true);
	const expressions = [FORMULA.APDEX_TRACES];
	const legendFormulas = [GraphTitle.APDEX];
	const aggregateOperators = [
		MetricAggregateOperator.COUNT,
		MetricAggregateOperator.COUNT,
		MetricAggregateOperator.COUNT,
	];
	const dataSource = DataSource.TRACES;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		disabled,
		expressions,
		legendFormulas,
		aggregateOperators,
		dataSource,
	});
};

export const apDexMetricsQueryBuilderQueries = ({
	servicename,
	tagFilterItems,
	topLevelOperationsRoute,
	threashold,
	delta,
	le,
}: ApDexMetricsQueryBuilderQueriesProps): QueryBuilderData => {
	const autoCompleteDataA: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_latency_count',
		type: null,
	};

	const autoCompleteDataB: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_latency_bucket',
		type: null,
	};

	const autoCompleteDataC: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_latency_bucket',
		type: null,
	};

	const filterItemA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'tag',
			},
			op: '=',
			value: servicename,
		},
		{
			id: '',
			key: {
				key: 'operation',
				dataType: 'string',
				isColumn: false,
				type: 'tag',
			},
			op: 'IN',
			value: [...topLevelOperationsRoute],
		},
		...tagFilterItems,
	];

	const filterItemB: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'status_code',
				type: 'tag',
			},
			op: '=',
			value: 'STATUS_CODE_UNSET',
		},
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'le',
				type: 'tag',
			},
			op: '=',
			value: getNearestHighestBucketValue(threashold, le).toString(),
		},
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'tag',
			},
			op: '=',
			value: servicename,
		},
		{
			id: '',
			key: {
				key: 'operation',
				dataType: 'string',
				isColumn: false,
				type: 'tag',
			},
			op: 'IN',
			value: [...topLevelOperationsRoute],
		},
		...tagFilterItems,
	];

	const filterItemC: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'le',
				type: 'tag',
			},
			op: '=',
			value: getNearestHighestBucketValue(threashold * 4, le).toString(),
		},
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'status_code',
				type: 'tag',
			},
			op: '=',
			value: 'STATUS_CODE_UNSET',
		},
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'tag',
			},
			op: '=',
			value: servicename,
		},
		{
			id: '',
			key: {
				key: 'operation',
				dataType: 'string',
				isColumn: false,
				type: 'tag',
			},
			op: 'IN',
			value: [...topLevelOperationsRoute],
		},
		...tagFilterItems,
	];

	const autocompleteData = [
		autoCompleteDataA,
		autoCompleteDataB,
		autoCompleteDataC,
	];

	const additionalItems = [filterItemA, filterItemB, filterItemC];
	const legends = [GraphTitle.APDEX];
	const disabled = Array(3).fill(true);
	const expressions = delta
		? [FORMULA.APDEX_DELTA_SPAN_METRICS]
		: [FORMULA.APDEX_CUMULATIVE_SPAN_METRICS];
	const legendFormulas = [GraphTitle.APDEX];
	const aggregateOperators = [
		MetricAggregateOperator.SUM_RATE,
		MetricAggregateOperator.SUM_RATE,
		MetricAggregateOperator.SUM_RATE,
	];
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		disabled,
		expressions,
		legendFormulas,
		aggregateOperators,
		dataSource,
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

	const legends = OPERATION_LEGENDS;
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQueries({
		autocompleteData,
		legends,
		filterItems,
		dataSource,
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

	const autocompleteData = [autocompleteDataA, autocompleteDataB];

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

	const additionalItems = [additionalItemsA, additionalItemsB];
	const legends = [GraphTitle.ERROR_PERCENTAGE];
	const disabled = [true, true];
	const expressions = [FORMULA.ERROR_PERCENTAGE];
	const legendFormulas = [GraphTitle.ERROR_PERCENTAGE];
	const aggregateOperators = [
		MetricAggregateOperator.SUM_RATE,
		MetricAggregateOperator.SUM_RATE,
	];
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		disabled,
		expressions,
		legendFormulas,
		aggregateOperators,
		dataSource,
	});
};
