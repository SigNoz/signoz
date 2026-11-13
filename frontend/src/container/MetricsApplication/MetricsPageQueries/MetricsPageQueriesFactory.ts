import {
	alphabet,
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import getStep from 'lib/getStep';
import store from 'store';
import {
	QueryBuilderData,
	ReduceOperators,
	Temporality,
} from 'types/common/queryBuilder';

import { BuilderQuerieswithFormulaProps } from '../Tabs/types';

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
		reduceTo: ReduceOperators.AVG,
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
	queryTraceOperator: [],
});
