import {
	alphabet,
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import getStep from 'lib/getStep';
import store from 'store';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import {
	MetricAggregateOperator,
	QueryBuilderData,
	Temporality,
} from 'types/common/queryBuilder';

import {
	BuilderQueriesProps,
	BuilderQuerieswithFormulaProps,
} from '../Tabs/types';

export const getQueryBuilderQueries = ({
	autocompleteData,
	groupBy = [],
	legends,
	filterItems,
	aggregateOperator,
	dataSource,
	queryNameAndExpression,
	timeAggregateOperators,
	spaceAggregateOperators,
}: BuilderQueriesProps): QueryBuilderData => ({
	queryFormulas: [],
	queryData: autocompleteData.map((item, index) => {
		const newQueryData: IBuilderQuery = {
			...initialQueryBuilderFormValuesMap.metrics,
			aggregateOperator: ((): string => {
				if (aggregateOperator) {
					return aggregateOperator[index];
				}
				return MetricAggregateOperator.SUM_RATE;
			})(),
			disabled: false,
			groupBy,
			aggregateAttribute: item,
			legend: legends[index],
			stepInterval: getStep({
				end: store.getState().globalTime.maxTime,
				inputFormat: 'ns',
				start: store.getState().globalTime.minTime,
			}),
			filters: {
				items: filterItems[index],
				op: 'AND',
			},
			reduceTo: 'avg',
			spaceAggregation: spaceAggregateOperators[index],
			timeAggregation: timeAggregateOperators[index],
			dataSource,
		};

		if (queryNameAndExpression) {
			newQueryData.queryName = queryNameAndExpression[index];
			newQueryData.expression = queryNameAndExpression[index];
		}

		return newQueryData;
	}),
});

export const getQueryBuilderQuerieswithFormula = ({
	autocompleteData,
	additionalItems,
	legends,
	groupBy = [],
	disabled,
	expressions,
	legendFormulas,
	timeAggregateOperators,
	spaceAggregateOperators,
	dataSource,
}: BuilderQuerieswithFormulaProps): QueryBuilderData => ({
	queryFormulas: expressions.map((expression, index) => ({
		...initialFormulaBuilderFormValues,
		expression,
		legend: legendFormulas[index],
	})),
	queryData: autocompleteData.map((_, index) => ({
		...initialQueryBuilderFormValuesMap.metrics,
		timeAggregation: timeAggregateOperators[index],
		spaceAggregation: spaceAggregateOperators[index],
		temporality: Temporality.Delta,
		disabled: disabled[index],
		groupBy,
		legend: legends[index],
		aggregateAttribute: autocompleteData[index],
		queryName: alphabet[index],
		expression: alphabet[index],
		reduceTo: 'avg',
		filters: {
			items: additionalItems[index],
			op: 'AND',
		},
		stepInterval: getStep({
			end: store.getState().globalTime.maxTime,
			inputFormat: 'ns',
			start: store.getState().globalTime.minTime,
		}),
		dataSource,
	})),
});
