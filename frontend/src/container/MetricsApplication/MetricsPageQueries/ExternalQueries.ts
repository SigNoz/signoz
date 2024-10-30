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

import { FORMULA, MetricsType, WidgetKeys } from '../constant';
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
		dataType: DataTypes.String,
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
		dataType: DataTypes.Float64,
		isColumn: true,
		type: '',
	};
	const autocompleteDataB: BaseAutocompleteData = {
		key: WidgetKeys.SignozExternalCallLatencyCount,
		dataType: DataTypes.Float64,
		isColumn: true,
		type: '',
	};

	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.Service_name,
				dataType: DataTypes.String,
				isColumn: false,
				type: MetricsType.Resource,
			},
			op: OPERATORS.IN,
			value: [servicename],
		},
		{
			id: '',
			key: {
				key: WidgetKeys.StatusCode,
				dataType: DataTypes.Int64,
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
				dataType: DataTypes.String,
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

	const timeAggregateOperators = [
		MetricAggregateOperator.RATE,
		MetricAggregateOperator.RATE,
	];
	const spaceAggregateOperators = [
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
		timeAggregateOperators,
		spaceAggregateOperators,
		dataSource,
	});
};

export const externalCallDuration = ({
	servicename,
	tagFilterItems,
}: ExternalCallProps): QueryBuilderData => {
	const autocompleteDataA: BaseAutocompleteData = {
		dataType: DataTypes.Float64,
		isColumn: true,
		key: WidgetKeys.SignozExternalCallLatencySum,
		type: '',
	};
	const autocompleteDataB: BaseAutocompleteData = {
		dataType: DataTypes.Float64,
		isColumn: true,
		key: WidgetKeys.SignozExternalCallLatencyCount,
		type: '',
	};
	const expressions = [FORMULA.DATABASE_CALLS_AVG_DURATION];
	const legendFormulas = ['Average Duration'];
	const legend = '';
	const disabled = [true, true];
	const additionalItemsA: TagFilterItem[] = [
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
		...tagFilterItems,
	];

	const autocompleteData = [autocompleteDataA, autocompleteDataB];

	const additionalItems = [additionalItemsA, additionalItemsA];
	const legends = [legend, legend];
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

export const externalCallRpsByAddress = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): QueryBuilderData => {
	const autocompleteData: BaseAutocompleteData[] = [
		{
			dataType: DataTypes.Float64,
			isColumn: true,
			key: WidgetKeys.SignozExternalCallLatencyCount,
			type: '',
		},
	];
	const filterItems: TagFilterItem[][] = [
		[
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
			...tagFilterItems,
		],
	];

	const legends = [legend];
	const dataSource = DataSource.METRICS;

	const timeAggregateOperators = [MetricAggregateOperator.RATE];
	const spaceAggregateOperators = [MetricAggregateOperator.SUM];

	return getQueryBuilderQueries({
		autocompleteData,
		groupBy,
		legends,
		filterItems,
		dataSource,
		timeAggregateOperators,
		spaceAggregateOperators,
	});
};

export const externalCallDurationByAddress = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): QueryBuilderData => {
	const autocompleteDataA: BaseAutocompleteData = {
		dataType: DataTypes.Float64,
		isColumn: true,
		key: WidgetKeys.SignozExternalCallLatencySum,
		type: '',
	};
	const autocompleteDataB: BaseAutocompleteData = {
		dataType: DataTypes.Float64,
		isColumn: true,
		key: WidgetKeys.SignozExternalCallLatencyCount,
		type: '',
	};
	const expressions = [FORMULA.DATABASE_CALLS_AVG_DURATION];
	const legendFormulas = [legend];
	const disabled = [true, true];
	const additionalItemsA: TagFilterItem[] = [
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
		...tagFilterItems,
	];

	const autocompleteData = [autocompleteDataA, autocompleteDataB];
	const additionalItems = [additionalItemsA, additionalItemsA];
	const legends = [legend, legend];
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
		groupBy,
		disabled,
		expressions,
		legendFormulas,
		timeAggregateOperators,
		spaceAggregateOperators,
		dataSource,
	});
};
