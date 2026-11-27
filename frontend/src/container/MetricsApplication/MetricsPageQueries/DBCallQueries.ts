import { OPERATORS } from 'constants/queryBuilder';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { SpaceAggregation, TimeAggregation } from 'types/api/v5/queryRange';
import { DataSource, QueryBuilderData } from 'types/common/queryBuilder';

import { FORMULA, MetricsType, WidgetKeys } from '../constant';
import { DatabaseCallProps, DatabaseCallsRPSProps } from '../types';
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
			dataType: DataTypes.Float64,
			type: '',
		},
	];
	const groupBy: BaseAutocompleteData[] = [
		{
			dataType: DataTypes.String,
			key: WidgetKeys.DbSystem,
			type: 'tag',
		},
	];
	const filterItems: TagFilterItem[][] = [
		[
			{
				id: '',
				key: {
					key: WidgetKeys.OTelServiceName,
					dataType: DataTypes.String,
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

	const timeAggregateOperators: TimeAggregation[] = ['rate'];
	const spaceAggregateOperators: SpaceAggregation[] = ['sum'];

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

export const databaseCallsAvgDuration = ({
	servicename,
	tagFilterItems,
}: DatabaseCallProps): QueryBuilderData => {
	const autocompleteDataA: BaseAutocompleteData = {
		key: WidgetKeys.SignozDbLatencySum,
		dataType: DataTypes.Float64,
		type: '',
	};
	const autocompleteDataB: BaseAutocompleteData = {
		key: WidgetKeys.SignozDBLatencyCount,
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
	const legendFormulas = ['Average Duration'];
	const expressions = [FORMULA.DATABASE_CALLS_AVG_DURATION];
	const timeAggregateOperators: TimeAggregation[] = ['rate', 'rate'];
	const spaceAggregateOperators: SpaceAggregation[] = ['sum', 'sum'];
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
