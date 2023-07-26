import { OPERATORS } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	MetricAggregateOperator,
	QueryBuilderData,
} from 'types/common/queryBuilder';

import { DataType, FORMULA, MetricsType, WidgetKeys } from '../constant';
import {
	ExternalCallDurationByAddressProps,
	ExternalCallProps,
} from '../Tabs/types';
import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

const groupBy: BaseAutocompleteData[] = [
	{
		dataType: DataType.STRING,
		isColumn: false,
		key: WidgetKeys.Address,
		type: MetricsType.Tag,
	},
];

export const externalCallErrorPercent = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): QueryBuilderData => {
	const autocompleteDataA: BaseAutocompleteData = {
		key: WidgetKeys.SignozExternalCallLatencyCount,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: null,
	};
	const autocompleteDataB: BaseAutocompleteData = {
		key: WidgetKeys.SignozExternalCallLatencyCount,
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
			value: [servicename],
		},
		...tagFilterItems,
	];

	const legendFormula = legend;
	const expression = FORMULA.ERROR_PERCENTAGE;
	const autocompleteData: BaseAutocompleteData[] = [
		autocompleteDataA,
		autocompleteDataB,
	];

	const additionalItems: TagFilterItem[][] = [
		additionalItemsA,
		additionalItemsB,
	];

	const legends = Array(2).fill(legend);
	const aggregateOperators = Array(2).fill(MetricAggregateOperator.SUM);
	const disabled = Array(2).fill(true);
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		groupBy,
		disabled,
		expression,
		legendFormula,
		aggregateOperators,
		dataSource,
	});
};

export const externalCallDuration = ({
	servicename,
	tagFilterItems,
}: ExternalCallProps): QueryBuilderData => {
	const autocompleteDataA: BaseAutocompleteData = {
		dataType: DataType.FLOAT64,
		isColumn: true,
		key: WidgetKeys.SignozExternalCallLatencySum,
		type: null,
	};
	const autocompleteDataB: BaseAutocompleteData = {
		dataType: DataType.FLOAT64,
		isColumn: true,
		key: WidgetKeys.SignozExternalCallLatencyCount,
		type: null,
	};

	const expression = FORMULA.DATABASE_CALLS_AVG_DURATION;
	const legendFormula = 'Average Duration';
	const legend = '';
	const disabled = Array(2).fill(true);
	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: DataType.STRING,
				isColumn: false,
				key: WidgetKeys.Service_name,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [`${servicename}`],
		},
		...tagFilterItems,
	];

	const autocompleteData: BaseAutocompleteData[] = [
		autocompleteDataA,
		autocompleteDataB,
	];

	const additionalItems: TagFilterItem[][] = [
		additionalItemsA,
		additionalItemsA,
	];

	const legends = Array(2).fill(legend);
	const aggregateOperators = Array(2).fill(MetricAggregateOperator.SUM);

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		disabled,
		expression,
		legendFormula,
		aggregateOperators,
		dataSource: DataSource.METRICS,
	});
};

export const externalCallRpsByAddress = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): QueryBuilderData => {
	const autocompleteData: BaseAutocompleteData[] = [
		{
			dataType: DataType.FLOAT64,
			isColumn: true,
			key: WidgetKeys.SignozExternalCallLatencyCount,
			type: null,
		},
	];
	const filterItems: TagFilterItem[][] = [
		[
			{
				id: '',
				key: {
					dataType: DataType.STRING,
					isColumn: false,
					key: WidgetKeys.Service_name,
					type: MetricsType.Resource,
				},
				op: OPERATORS.IN,
				value: [`${servicename}`],
			},
			...tagFilterItems,
		],
	];

	const legends = [legend];
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQueries({
		autocompleteData,
		groupBy,
		legends,
		filterItems,
		dataSource,
	});
};

export const externalCallDurationByAddress = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): QueryBuilderData => {
	const autocompleteDataA: BaseAutocompleteData = {
		dataType: DataType.FLOAT64,
		isColumn: true,
		key: WidgetKeys.SignozExternalCallLatencySum,
		type: null,
	};
	const autocompleteDataB: BaseAutocompleteData = {
		dataType: DataType.FLOAT64,
		isColumn: true,
		key: WidgetKeys.SignozExternalCallLatencyCount,
		type: null,
	};
	const expression = FORMULA.DATABASE_CALLS_AVG_DURATION;
	const legendFormula = legend;
	const disabled = [true, true];
	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: DataType.STRING,
				isColumn: false,
				key: WidgetKeys.Service_name,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [`${servicename}`],
		},
		...tagFilterItems,
	];

	const autocompleteData: BaseAutocompleteData[] = [
		autocompleteDataA,
		autocompleteDataB,
	];

	const additionalItems: TagFilterItem[][] = [
		additionalItemsA,
		additionalItemsA,
	];

	const legends = Array(2).fill(legend);
	const aggregateOperators = Array(2).fill(MetricAggregateOperator.SUM_RATE);
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		groupBy,
		disabled,
		expression,
		legendFormula,
		aggregateOperators,
		dataSource,
	});
};
