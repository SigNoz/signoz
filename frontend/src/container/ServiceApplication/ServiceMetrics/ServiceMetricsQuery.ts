import { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { OPERATORS } from 'constants/queryBuilder';
import {
	DataType,
	KeyOperationTableHeader,
	MetricsType,
	WidgetKeys,
} from 'container/MetricsApplication/constant';
import { getQueryBuilderQuerieswithFormula } from 'container/MetricsApplication/MetricsPageQueries/MetricsPageQueriesFactory';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	QueryBuilderData,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';

export const serviceMetricsQuery = (
	topLevelOperation: [keyof ServiceDataProps, string[]],
): QueryBuilderData => {
	const p99AutoCompleteData: BaseAutocompleteData = {
		dataType: DataType.FLOAT64,
		isColumn: true,
		key: WidgetKeys.Signoz_latency_bucket,
		type: '',
	};

	const errorRateAutoCompleteData: BaseAutocompleteData = {
		dataType: DataType.FLOAT64,
		isColumn: true,
		key: WidgetKeys.SignozCallsTotal,
		type: '',
	};

	const operationPrSecondAutoCompleteData: BaseAutocompleteData = {
		dataType: DataType.FLOAT64,
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
				dataType: DataType.STRING,
				isColumn: true,
				key: WidgetKeys.ServiceName,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: [topLevelOperation[0].toString()],
		},
		{
			id: '',
			key: {
				dataType: DataType.STRING,
				isColumn: true,
				key: WidgetKeys.Name,
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
				dataType: DataType.STRING,
				isColumn: true,
				key: WidgetKeys.ServiceName,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: [topLevelOperation[0].toString()],
		},
		{
			id: '',
			key: {
				dataType: DataType.BOOL,
				isColumn: true,
				key: WidgetKeys.hasError,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: ['true'],
		},
		{
			id: '',
			key: {
				dataType: DataType.STRING,
				isColumn: true,
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
				dataType: DataType.STRING,
				isColumn: true,
				key: WidgetKeys.ServiceName,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [topLevelOperation[0].toString()],
		},
		{
			id: '',
			key: {
				dataType: DataType.STRING,
				isColumn: true,
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
				dataType: DataType.STRING,
				isColumn: true,
				key: WidgetKeys.ServiceName,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [topLevelOperation[0].toString()],
		},
		{
			id: '',
			key: {
				dataType: DataType.STRING,
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

	const aggregateOperators = [
		TracesAggregatorOperator.P99,
		TracesAggregatorOperator.RATE,
		TracesAggregatorOperator.RATE,
		TracesAggregatorOperator.RATE,
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
			dataType: DataType.STRING,
			isColumn: true,
			key: WidgetKeys.ServiceName,
			type: MetricsType.Tag,
		},
	];

	const dataSource = DataSource.TRACES;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		disabled,
		legends,
		aggregateOperators,
		expressions,
		legendFormulas,
		groupBy,
		dataSource,
	});
};
