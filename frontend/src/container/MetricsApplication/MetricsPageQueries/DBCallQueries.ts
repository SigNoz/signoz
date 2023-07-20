import { OPERATORS } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	MetricAggregateOperator,
	QueryBuilderData,
} from 'types/common/queryBuilder';

import { DataType, FORMULA, MetricsType, WidgetKeys } from '../constant';
import { IServiceName } from '../Tabs/types';
import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

export const databaseCallsRPS = ({
	servicename,
	legend,
	tagFilterItems,
}: DatabaseCallsRPSProps): QueryBuilderData => {
	const autocompleteData: BaseAutocompleteData[] = [
		{
			key: WidgetKeys.SignozDBLatencyCount,
			dataType: DataType.FLOAT64,
			isColumn: true,
			type: null,
		},
	];
	const groupBy: BaseAutocompleteData[] = [
		{ dataType: DataType.STRING, isColumn: false, key: 'db_system', type: 'tag' },
	];
	const filterItems: TagFilterItem[][] = [
		[
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
		],
	];

	const legends = [legend];

	return getQueryBuilderQueries({
		autocompleteData,
		groupBy,
		legends,
		filterItems,
		dataSource: DataSource.METRICS,
	});
};

export const databaseCallsAvgDuration = ({
	servicename,
	tagFilterItems,
}: DatabaseCallProps): QueryBuilderData => {
	const autocompleteDataA: BaseAutocompleteData = {
		key: WidgetKeys.SignozDbLatencySum,
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: null,
	};
	const autocompleteDataB: BaseAutocompleteData = {
		key: WidgetKeys.SignozDBLatencyCount,
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
		...tagFilterItems,
	];
	const additionalItemsB = additionalItemsA;

	const autocompleteData: BaseAutocompleteData[] = [
		autocompleteDataA,
		autocompleteDataB,
	];

	const additionalItems: TagFilterItem[][] = [
		additionalItemsA,
		additionalItemsB,
	];

	return getQueryBuilderQuerieswithFormula({
		autocompleteData,
		additionalItems,
		legend: '',
		disabled: true,
		expression: FORMULA.DATABASE_CALLS_AVG_DURATION,
		legendFormula: 'Average Duration',
		aggregateOperators: [
			MetricAggregateOperator.SUM,
			MetricAggregateOperator.SUM,
		],
		dataSource: DataSource.METRICS,
	});
};

interface DatabaseCallsRPSProps extends DatabaseCallProps {
	legend: '{{db_system}}';
}

interface DatabaseCallProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
}
