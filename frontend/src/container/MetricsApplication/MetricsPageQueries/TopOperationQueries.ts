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
	GraphTitle,
	KeyOperationTableHeader,
	MetricsType,
	WidgetKeys,
} from '../constant';
import { TopOperationQueryFactoryProps } from '../Tabs/types';
import { getQueryBuilderQuerieswithFormula } from './MetricsPageQueriesFactory';

export const topOperationQueries = ({
	servicename,
}: TopOperationQueryFactoryProps): QueryBuilderData => {
	const latencyAutoCompleteData: BaseAutocompleteData = {
		key: WidgetKeys.Signoz_latency_bucket,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: null,
	};

	const errorRateAutoCompleteData: BaseAutocompleteData = {
		key: WidgetKeys.SignozCallsTotal,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: null,
	};

	const numOfCallAutoCompleteData: BaseAutocompleteData = {
		key: WidgetKeys.SignozLatencyCount,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: null,
	};

	const latencyAndNumberOfCallAdditionalItems: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.Service_name,
				dataType: DataType.STRING,
				isColumn: false,
				type: MetricsType.Resource,
			},
			value: [servicename],
			op: OPERATORS.IN,
		},
	];

	const errorRateAdditionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: DataType.STRING,
				isColumn: false,
				key: WidgetKeys.Service_name,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [servicename],
		},
		{
			id: '',
			key: {
				dataType: DataType.INT64,
				isColumn: false,
				key: WidgetKeys.StatusCode,
				type: MetricsType.Tag,
			},
			op: OPERATORS.IN,
			value: ['STATUS_CODE_ERROR'],
		},
	];

	const errorRateAdditionalItemsB = latencyAndNumberOfCallAdditionalItems;

	const groupBy: BaseAutocompleteData[] = [
		{
			dataType: DataType.STRING,
			isColumn: false,
			key: WidgetKeys.Operation,
			type: MetricsType.Tag,
		},
	];

	const autocompleteData = [
		latencyAutoCompleteData,
		latencyAutoCompleteData,
		latencyAutoCompleteData,
		errorRateAutoCompleteData,
		errorRateAutoCompleteData,
		numOfCallAutoCompleteData,
	];
	const additionalItems = [
		latencyAndNumberOfCallAdditionalItems,
		latencyAndNumberOfCallAdditionalItems,
		latencyAndNumberOfCallAdditionalItems,
		errorRateAdditionalItemsA,
		errorRateAdditionalItemsB,
		latencyAndNumberOfCallAdditionalItems,
	];
	const disabled = [false, false, false, true, true, false];
	const legends = [
		KeyOperationTableHeader.P50,
		KeyOperationTableHeader.P90,
		KeyOperationTableHeader.P99,
		KeyOperationTableHeader.ERROR_RATE,
		KeyOperationTableHeader.ERROR_RATE,
		KeyOperationTableHeader.NUM_OF_CALLS,
	];
	const aggregateOperators = [
		MetricAggregateOperator.HIST_QUANTILE_50,
		MetricAggregateOperator.HIST_QUANTILE_90,
		MetricAggregateOperator.HIST_QUANTILE_99,
		MetricAggregateOperator.SUM_RATE,
		MetricAggregateOperator.SUM_RATE,
		MetricAggregateOperator.SUM_RATE,
	];
	const expression = 'D*100/E';
	const legendFormula = GraphTitle.ERROR_PERCENTAGE;
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		disabled,
		legends,
		aggregateOperators,
		expression,
		legendFormula,
		dataSource,
		groupBy,
	});
};
