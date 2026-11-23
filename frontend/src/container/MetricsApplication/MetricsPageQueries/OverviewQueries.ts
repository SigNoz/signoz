import type { MetrictypesComparisonSpaceAggregationParamDTO } from 'api/generated/services/sigNoz.schemas/metrictypesComparisonSpaceAggregationParamDTO';
import { OPERATORS } from 'constants/queryBuilder';
import type { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryBuilderData } from 'types/common/queryBuilder';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';

import {
	FORMULA,
	GraphTitle,
	LATENCY_AGGREGATEOPERATOR,
	LATENCY_AGGREGATEOPERATOR_SPAN_METRICS,
	MetricsType,
	OPERATION_LEGENDS,
	QUERYNAME_AND_EXPRESSION,
	WidgetKeys,
} from '../constant';
import type {
	ApDexMetricsQueryBuilderQueriesProps,
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
	const signozLatencyBucketMetrics = WidgetKeys.SignozLatencyBucket;

	const newAutoCompleteData: BaseAutocompleteData = {
		key: isSpanMetricEnable
			? signozLatencyBucketMetrics
			: WidgetKeys.SpanDurationNano,
		dataType: DataTypes.Float64,
		type: isSpanMetricEnable ? '' : MetricsType.Tag,
	};

	const autocompleteData = Array(3).fill(newAutoCompleteData);

	const filterItem: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.OTelServiceName,
				dataType: DataTypes.String,
				type: isSpanMetricEnable ? MetricsType.Resource : MetricsType.Tag,
			},
			op: isSpanMetricEnable ? OPERATORS.IN : OPERATORS['='],
			value: isSpanMetricEnable ? [servicename] : servicename,
		},
		{
			id: '',
			key: {
				dataType: DataTypes.String,
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

	const timeAggregateOperators = [
		MetricAggregateOperator.EMPTY,
		MetricAggregateOperator.EMPTY,
		MetricAggregateOperator.EMPTY,
	];
	const spaceAggregateOperators = [
		MetricAggregateOperator.P50,
		MetricAggregateOperator.P90,
		MetricAggregateOperator.P99,
	];

	return getQueryBuilderQueries({
		autocompleteData,
		legends,
		filterItems,
		aggregateOperator,
		dataSource,
		queryNameAndExpression,
		timeAggregateOperators,
		spaceAggregateOperators,
	});
};

export const apDexMetricsQueryBuilderQueries = ({
	servicename,
	tagFilterItems,
	topLevelOperationsRoute,
	threashold,
	delta,
	metricsBuckets,
}: ApDexMetricsQueryBuilderQueriesProps): QueryBuilderData => {
	// the comparison count stops at the largest finite bucket, so a threshold past it
	// reads the count metric, which is the +Inf bucket
	const countAtOrBelow = (
		ms: number,
	): {
		key: string;
		spaceAggregation: MetricAggregateOperator;
		param?: MetrictypesComparisonSpaceAggregationParamDTO;
	} => {
		const bucket = getNearestHighestBucketValue(ms, metricsBuckets);
		return bucket === '+Inf'
			? {
					key: WidgetKeys.SignozLatencyCount,
					spaceAggregation: MetricAggregateOperator.SUM,
				}
			: {
					key: WidgetKeys.SignozLatencyBucket,
					spaceAggregation: MetricAggregateOperator.COUNT,
					param: { operator: '<=', threshold: Number(bucket) },
				};
	};
	const satisfied = countAtOrBelow(threashold * 1000);
	const tolerating = countAtOrBelow(threashold * 1000 * 4);

	const autoCompleteDataA: BaseAutocompleteData = {
		key: WidgetKeys.SignozLatencyCount,
		dataType: DataTypes.Float64,
		type: '',
	};

	const autoCompleteDataB: BaseAutocompleteData = {
		key: satisfied.key,
		dataType: DataTypes.Float64,
		type: '',
	};

	const autoCompleteDataC: BaseAutocompleteData = {
		key: tolerating.key,
		dataType: DataTypes.Float64,
		type: '',
	};

	const filterItemA: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.OTelServiceName,
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			},
			op: OPERATORS['='],
			value: servicename,
		},
		{
			id: '',
			key: {
				key: WidgetKeys.Operation,
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: [...topLevelOperationsRoute],
		},
		...tagFilterItems,
	];

	const filterItemB: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.StatusCode,
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			},
			op: OPERATORS['!='],
			value: 'STATUS_CODE_ERROR',
		},
		{
			id: '',
			key: {
				key: WidgetKeys.OTelServiceName,
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			},
			op: OPERATORS['='],
			value: servicename,
		},
		{
			id: '',
			key: {
				key: WidgetKeys.Operation,
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: [...topLevelOperationsRoute],
		},
		...tagFilterItems,
	];

	const filterItemC: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.StatusCode,
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			},
			op: OPERATORS['!='],
			value: 'STATUS_CODE_ERROR',
		},
		{
			id: '',
			key: {
				key: WidgetKeys.OTelServiceName,
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			},
			op: OPERATORS['='],
			value: servicename,
		},
		{
			id: '',
			key: {
				key: WidgetKeys.Operation,
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
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
	// v5 forces increase on histograms, so the total matches it
	const timeAggregateOperators = [
		MetricAggregateOperator.INCREASE,
		MetricAggregateOperator.INCREASE,
		MetricAggregateOperator.INCREASE,
	];

	// a plain sum keeps the le label on B and C, and the formula then cannot join them
	const spaceAggregateOperators = [
		MetricAggregateOperator.SUM,
		satisfied.spaceAggregation,
		tolerating.spaceAggregation,
	];
	const comparisonSpaceAggregationParams = [
		undefined,
		satisfied.param,
		tolerating.param,
	];
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		disabled,
		expressions,
		legendFormulas,
		timeAggregateOperators,
		spaceAggregateOperators,
		comparisonSpaceAggregationParams,
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
			dataType: DataTypes.Float64,
			type: '',
		},
	];

	const filterItems: TagFilterItem[][] = [
		[
			{
				id: '',
				key: {
					key: WidgetKeys.OTelServiceName,
					dataType: DataTypes.String,
					type: MetricsType.Resource,
				},
				op: OPERATORS.IN,
				value: [`${servicename}`],
			},
			{
				id: '',
				key: {
					key: WidgetKeys.Operation,
					dataType: DataTypes.String,
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

	const timeAggregateOperators = [MetricAggregateOperator.RATE];
	const spaceAggregateOperators = [MetricAggregateOperator.SUM];

	return getQueryBuilderQueries({
		autocompleteData,
		legends,
		filterItems,
		dataSource,
		timeAggregateOperators,
		spaceAggregateOperators,
	});
};

export const errorPercentage = ({
	servicename,
	tagFilterItems,
	topLevelOperations,
}: OperationPerSecProps): QueryBuilderData => {
	const autocompleteDataA: BaseAutocompleteData = {
		key: WidgetKeys.SignozCallsTotal,
		dataType: DataTypes.Float64,
		type: '',
	};
	const autocompleteDataB: BaseAutocompleteData = {
		key: WidgetKeys.SignozCallsTotal,
		dataType: DataTypes.Float64,
		type: '',
	};

	const autocompleteData = [autocompleteDataA, autocompleteDataB];

	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.OTelServiceName,
				dataType: DataTypes.String,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [`${servicename}`],
		},
		{
			id: '',
			key: {
				key: WidgetKeys.Operation,
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: topLevelOperations,
		},
		{
			id: '',
			key: {
				key: WidgetKeys.StatusCode,
				dataType: DataTypes.Int64,
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
				key: WidgetKeys.OTelServiceName,
				dataType: DataTypes.String,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [`${servicename}`],
		},
		{
			id: '',
			key: {
				key: WidgetKeys.Operation,
				dataType: DataTypes.String,
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
	const timeAggregateOperators = [
		MetricAggregateOperator.RATE,
		MetricAggregateOperator.RATE,
	];
	const spaceAggregateOperators = [
		MetricAggregateOperator.SUM,
		MetricAggregateOperator.SUM,
	];
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		disabled,
		expressions,
		legendFormulas,
		timeAggregateOperators,
		spaceAggregateOperators,
		dataSource,
	});
};
