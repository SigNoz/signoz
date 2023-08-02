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
	const legendFormulas = [legend];
	const expressions = [FORMULA.ERROR_PERCENTAGE];
	const disabled = [true, true];
	const autocompleteData = [autocompleteDataA, autocompleteDataB];

	const additionalItems = [additionalItemsA, additionalItemsB];

	const aggregateOperators = [
		MetricAggregateOperator.SUM,
		MetricAggregateOperator.SUM,
	];
	const legends = [legend, legend];
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		groupBy,
		disabled,
		expressions,
		legendFormulas,
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
	const expressions = [FORMULA.DATABASE_CALLS_AVG_DURATION];
	const legendFormulas = ['Average Duration'];
	const legend = '';
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

	const autocompleteData = [autocompleteDataA, autocompleteDataB];

	const additionalItems = [additionalItemsA, additionalItemsA];
	const legends = [legend, legend];
	const aggregateOperators = [
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
		aggregateOperators,
		dataSource,
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
	const expressions = [FORMULA.DATABASE_CALLS_AVG_DURATION];
	const legendFormulas = [legend];
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

	const autocompleteData = [autocompleteDataA, autocompleteDataB];
	const additionalItems = [additionalItemsA, additionalItemsA];
	const legends = [legend, legend];
	const aggregateOperators = [
		MetricAggregateOperator.SUM,
		MetricAggregateOperator.SUM,
	];
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legends,
		groupBy,
		disabled,
		expressions,
		legendFormulas,
		aggregateOperators,
		dataSource,
	});
};
