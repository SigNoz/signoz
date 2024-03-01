import { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { OPERATORS } from 'constants/queryBuilder';
import {
	KeyOperationTableHeader,
	MetricsType,
	WidgetKeys,
} from 'container/MetricsApplication/constant';
import { getQueryBuilderQuerieswithFormula } from 'container/MetricsApplication/MetricsPageQueries/MetricsPageQueriesFactory';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	MetricAggregateOperator,
	QueryBuilderData,
} from 'types/common/queryBuilder';

export const serviceMetricsQuery = (
	topLevelOperation: [keyof ServiceDataProps, string[]],
): QueryBuilderData => {
	const p99AutoCompleteData: BaseAutocompleteData = {
		dataType: DataTypes.Float64,
		isColumn: true,
		key: WidgetKeys.Signoz_latency_bucket,
		type: '',
	};

	const errorRateAutoCompleteData: BaseAutocompleteData = {
		dataType: DataTypes.Float64,
		isColumn: true,
		key: WidgetKeys.SignozCallsTotal,
		type: '',
	};

	const operationPrSecondAutoCompleteData: BaseAutocompleteData = {
		dataType: DataTypes.Float64,
		isColumn: true,
		key: WidgetKeys.SignozCallsTotal,
		type: '',
	};

	const autocompleteData = [
		p99AutoCompleteData,
		errorRateAutoCompleteData,
		errorRateAutoCompleteData,
		operationPrSecondAutoCompleteData,
	];

	const p99AdditionalItems: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: DataTypes.String,
				isColumn: false,
				key: WidgetKeys.Service_name,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [topLevelOperation[0].toString()],
		},
		{
			id: '',
			key: {
				dataType: DataTypes.String,
				isColumn: false,
				key: WidgetKeys.Operation,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: [...topLevelOperation[1]],
		},
	];

	const errorRateAdditionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: DataTypes.String,
				isColumn: false,
				key: WidgetKeys.Service_name,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [topLevelOperation[0].toString()],
		},
		{
			id: '',
			key: {
				dataType: DataTypes.Int64,
				isColumn: false,
				key: WidgetKeys.StatusCode,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: ['STATUS_CODE_ERROR'],
		},
		{
			id: '',
			key: {
				dataType: DataTypes.String,
				isColumn: false,
				key: WidgetKeys.Operation,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: [...topLevelOperation[1]],
		},
	];

	const errorRateAdditionalItemsB: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: DataTypes.String,
				isColumn: false,
				key: WidgetKeys.Service_name,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [topLevelOperation[0].toString()],
		},
		{
			id: '',
			key: {
				dataType: DataTypes.String,
				isColumn: false,
				key: WidgetKeys.Operation,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: [...topLevelOperation[1]],
		},
	];

	const operationPrSecondAdditionalItems: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: DataTypes.String,
				isColumn: false,
				key: WidgetKeys.Service_name,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [topLevelOperation[0].toString()],
		},
		{
			id: '',
			key: {
				dataType: DataTypes.String,
				isColumn: false,
				key: WidgetKeys.Operation,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: [...topLevelOperation[1]],
		},
	];

	const additionalItems = [
		p99AdditionalItems,
		errorRateAdditionalItemsA,
		errorRateAdditionalItemsB,
		operationPrSecondAdditionalItems,
	];

	const timeAggregateOperators = [
		MetricAggregateOperator.EMPTY,
		MetricAggregateOperator.RATE,
		MetricAggregateOperator.RATE,
		MetricAggregateOperator.RATE,
	];
	const spaceAggregateOperators = [
		MetricAggregateOperator.P99,
		MetricAggregateOperator.SUM,
		MetricAggregateOperator.SUM,
		MetricAggregateOperator.SUM,
	];

	const disabled = [false, true, true, false];
	const legends = [
		KeyOperationTableHeader.P99,
		KeyOperationTableHeader.ERROR_RATE,
		KeyOperationTableHeader.ERROR_RATE,
		KeyOperationTableHeader.OPERATION_PR_SECOND,
	];

	const expressions = ['B*100/C'];

	const legendFormulas = ['Error Rate'];

	const groupBy: BaseAutocompleteData[] = [
		{
			dataType: DataTypes.String,
			isColumn: false,
			key: WidgetKeys.Service_name,
			type: MetricsType.Tag,
		},
	];

	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		disabled,
		legends,
		timeAggregateOperators,
		spaceAggregateOperators,
		expressions,
		legendFormulas,
		groupBy,
		dataSource,
	});
};
