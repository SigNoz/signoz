import { OPERATORS } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, QueryBuilderData } from 'types/common/queryBuilder';

import { DataType, FORMULA, MetricsType, WidgetKeys } from '../constant';
import { IServiceName } from '../Tabs/types';
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
			value: [`${servicename}`],
		},
		...tagFilterItems,
	];
	const legendFormula = legend;
	const expression = FORMULA.ERROR_PERCENTAGE;
	const disabled = true;
	return getQueryBuilderQuerieswithFormula({
		autocompleteDataA,
		autocompleteDataB,
		additionalItemsA,
		additionalItemsB,
		legend,
		groupBy,
		disabled,
		expression,
		legendFormula,
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
	const disabled = true;
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
	const additionalItemsB = additionalItemsA;

	return getQueryBuilderQuerieswithFormula({
		autocompleteDataA,
		autocompleteDataB,
		additionalItemsA,
		additionalItemsB,
		legend,
		disabled,
		expression,
		legendFormula,
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

	const legends: string[] = [legend];
	return getQueryBuilderQueries({
		autocompleteData,
		groupBy,
		legends,
		filterItems,
		dataSource: DataSource.METRICS,
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
	const disabled = true;
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
	const additionalItemsB = additionalItemsA;

	return getQueryBuilderQuerieswithFormula({
		autocompleteDataA,
		autocompleteDataB,
		additionalItemsA,
		additionalItemsB,
		legend,
		groupBy,
		disabled,
		expression,
		legendFormula,
	});
};

interface ExternalCallDurationByAddressProps extends ExternalCallProps {
	legend: string;
}

export interface ExternalCallProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
}
