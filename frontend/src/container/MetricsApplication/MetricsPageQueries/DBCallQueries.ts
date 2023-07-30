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
	const dataSource = DataSource.METRICS;

	return getQueryBuilderQueries({
		autocompleteData,
		groupBy,
		legends,
		filterItems,
		dataSource,
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

	const autocompleteData: BaseAutocompleteData[] = [
		autocompleteDataA,
		autocompleteDataB,
	];

	const additionalItems: TagFilterItem[][] = [
		additionalItemsA,
		additionalItemsA,
	];

	const legends = ['', ''];
	const disabled = [true, true];
	const legendFormula = 'Average Duration';
	const expression = FORMULA.DATABASE_CALLS_AVG_DURATION;
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
		expression,
		legendFormula,
		aggregateOperators,
		dataSource,
	});
};

interface DatabaseCallsRPSProps extends DatabaseCallProps {
	legend: '{{db_system}}';
}

interface DatabaseCallProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
}
