import {
	MetrictypesSpaceAggregationDTO,
	MetrictypesTimeAggregationDTO,
} from 'api/generated/services/sigNoz.schemas';
import { OPERATORS } from 'constants/queryBuilder';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, QueryBuilderData } from 'types/common/queryBuilder';

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
import {
	ApDexMetricsQueryBuilderQueriesProps,
	LatencyProps,
	OperationPerSecProps,
} from '../Tabs/types';
import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';
import { getLatencyCountAtOrBelow } from './utils';

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
			: WidgetKeys.DurationNano,
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

	const timeAggregateOperators: MetrictypesTimeAggregationDTO[] = [
		MetrictypesTimeAggregationDTO[''],
		MetrictypesTimeAggregationDTO[''],
		MetrictypesTimeAggregationDTO[''],
	];
	const spaceAggregateOperators: MetrictypesSpaceAggregationDTO[] = [
		MetrictypesSpaceAggregationDTO.p50,
		MetrictypesSpaceAggregationDTO.p90,
		MetrictypesSpaceAggregationDTO.p99,
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
	metricsBuckets,
}: ApDexMetricsQueryBuilderQueriesProps): QueryBuilderData => {
	const satisfied = getLatencyCountAtOrBelow(threashold * 1000, metricsBuckets);
	const tolerating = getLatencyCountAtOrBelow(
		threashold * 1000 * 4,
		metricsBuckets,
	);

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
	const expressions = [FORMULA.APDEX];
	const legendFormulas = [GraphTitle.APDEX];
	// v5 forces increase on histograms, so the total matches it
	const timeAggregateOperators: MetrictypesTimeAggregationDTO[] = [
		MetrictypesTimeAggregationDTO.increase,
		MetrictypesTimeAggregationDTO.increase,
		MetrictypesTimeAggregationDTO.increase,
	];

	// a plain sum keeps the le label on B and C, and the formula then cannot join them
	const spaceAggregateOperators: MetrictypesSpaceAggregationDTO[] = [
		MetrictypesSpaceAggregationDTO.sum,
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

	const timeAggregateOperators: MetrictypesTimeAggregationDTO[] = [
		MetrictypesTimeAggregationDTO.rate,
	];
	const spaceAggregateOperators: MetrictypesSpaceAggregationDTO[] = [
		MetrictypesSpaceAggregationDTO.sum,
	];

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
	const timeAggregateOperators: MetrictypesTimeAggregationDTO[] = [
		MetrictypesTimeAggregationDTO.rate,
		MetrictypesTimeAggregationDTO.rate,
	];
	const spaceAggregateOperators: MetrictypesSpaceAggregationDTO[] = [
		MetrictypesSpaceAggregationDTO.sum,
		MetrictypesSpaceAggregationDTO.sum,
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
