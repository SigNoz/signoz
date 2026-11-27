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
		type: '',
	};
	const autocompleteDataB: BaseAutocompleteData = {
		key: WidgetKeys.SignozExternalCallLatencyCount,
		dataType: DataTypes.Float64,
		type: '',
	};

	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				key: WidgetKeys.OTelServiceName,
				dataType: DataTypes.String,
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
			value: [servicename],
		},
		...tagFilterItems,
	];
	const legendFormulas = [legend];
	const expressions = [FORMULA.ERROR_PERCENTAGE];
	const disabled = [true, true];
	const autocompleteData = [autocompleteDataA, autocompleteDataB];

	const additionalItems = [additionalItemsA, additionalItemsB];

	const timeAggregateOperators: MetrictypesTimeAggregationDTO[] = [
		MetrictypesTimeAggregationDTO.rate,
		MetrictypesTimeAggregationDTO.rate,
	];
	const spaceAggregateOperators: MetrictypesSpaceAggregationDTO[] = [
		MetrictypesSpaceAggregationDTO.sum,
		MetrictypesSpaceAggregationDTO.sum,
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
		key: WidgetKeys.SignozExternalCallLatencySum,
		type: '',
	};
	const autocompleteDataB: BaseAutocompleteData = {
		dataType: DataTypes.Float64,
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
				key: WidgetKeys.OTelServiceName,
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

export const externalCallRpsByAddress = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): QueryBuilderData => {
	const autocompleteData: BaseAutocompleteData[] = [
		{
			dataType: DataTypes.Float64,
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
					key: WidgetKeys.OTelServiceName,
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

	const timeAggregateOperators: MetrictypesTimeAggregationDTO[] = [
		MetrictypesTimeAggregationDTO.rate,
	];
	const spaceAggregateOperators: MetrictypesSpaceAggregationDTO[] = [
		MetrictypesSpaceAggregationDTO.sum,
	];

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
		key: WidgetKeys.SignozExternalCallLatencySum,
		type: '',
	};
	const autocompleteDataB: BaseAutocompleteData = {
		dataType: DataTypes.Float64,
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
				key: WidgetKeys.OTelServiceName,
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
		groupBy,
		disabled,
		expressions,
		legendFormulas,
		timeAggregateOperators,
		spaceAggregateOperators,
		dataSource,
	});
};
