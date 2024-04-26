import { OPERATORS } from 'constants/queryBuilder';
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

import {
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
		dataType: DataTypes.Float64,
		isColumn: true,
		type: '',
	};

	const errorRateAutoCompleteData: BaseAutocompleteData = {
		key: WidgetKeys.SignozCallsTotal,
		dataType: DataTypes.Float64,
		isColumn: true,
		type: '',
	};

	const numOfCallAutoCompleteData: BaseAutocompleteData = {
		key: WidgetKeys.SignozLatencyCount,
		dataType: DataTypes.Float64,
		isColumn: true,
		type: '',
	};

	const latencyAndNumberOfCallAdditionalItems: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.Service_name,
				dataType: DataTypes.String,
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
				dataType: DataTypes.String,
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
				dataType: DataTypes.Int64,
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
			dataType: DataTypes.String,
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
	const timeAggregateOperators = [
		MetricAggregateOperator.EMPTY,
		MetricAggregateOperator.EMPTY,
		MetricAggregateOperator.EMPTY,
		MetricAggregateOperator.RATE,
		MetricAggregateOperator.RATE,
		MetricAggregateOperator.RATE,
	];
	const spaceAggregateOperators = [
		MetricAggregateOperator.P50,
		MetricAggregateOperator.P90,
		MetricAggregateOperator.P99,
		MetricAggregateOperator.SUM,
		MetricAggregateOperator.SUM,
		MetricAggregateOperator.SUM,
	];
	const expressions = ['D*100/E'];
	const legendFormulas = [GraphTitle.ERROR_PERCENTAGE];
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
		dataSource,
		groupBy,
	});
};
