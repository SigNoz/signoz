import {
	MetrictypesComparisonSpaceAggregationParamDTO,
	MetrictypesSpaceAggregationDTO,
	MetrictypesTimeAggregationDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	alphabet,
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import getStep from 'lib/getStep';
import store from 'store';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	MetricAggregateOperator,
	QueryBuilderData,
	ReduceOperators,
	Temporality,
} from 'types/common/queryBuilder';

import {
	BuilderQueriesProps,
	BuilderQuerieswithFormulaProps,
} from '../Tabs/types';

// The query spreads in default `aggregations` (avg / sum, or count() for traces),
// and v5 reads those before the top-level time / space fields, so set them here.
const getAggregations = ({
	dataSource,
	key,
	aggregateOperator,
	timeAggregation,
	spaceAggregation,
	comparisonSpaceAggregationParam,
}: {
	dataSource: DataSource;
	key: string;
	aggregateOperator: string;
	timeAggregation: MetrictypesTimeAggregationDTO;
	spaceAggregation: MetrictypesSpaceAggregationDTO;
	comparisonSpaceAggregationParam?: MetrictypesComparisonSpaceAggregationParamDTO;
}): IBuilderQuery['aggregations'] =>
	dataSource === DataSource.TRACES
		? [{ expression: `${aggregateOperator}(${key})` }]
		: [
				{
					metricName: key,
					temporality: '',
					timeAggregation,
					spaceAggregation,
					reduceTo: ReduceOperators.AVG,
					...(comparisonSpaceAggregationParam && {
						comparisonSpaceAggregationParam,
					}),
				},
			];

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
		const operator = aggregateOperator
			? aggregateOperator[index]
			: MetricAggregateOperator.SUM_RATE;
		const newQueryData: IBuilderQuery = {
			...initialQueryBuilderFormValuesMap.metrics,
			aggregateOperator: operator,
			aggregations: getAggregations({
				dataSource,
				key: item.key,
				aggregateOperator: operator,
				timeAggregation: timeAggregateOperators[index],
				spaceAggregation: spaceAggregateOperators[index],
			}),
			disabled: false,
			groupBy,
			aggregateAttribute: item,
			legend: legends[index],
			// v5 sets the metrics step (multiples of 300s from 1 day up); its traces
			// default is ~300 points, far denser than these cards
			stepInterval:
				dataSource === DataSource.METRICS
					? null
					: getStep({
							end: store.getState().globalTime.maxTime,
							inputFormat: 'ns',
							start: store.getState().globalTime.minTime,
						}),
			filters: {
				items: filterItems[index],
				op: 'AND',
			},
			reduceTo: ReduceOperators.AVG,
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
	queryTraceOperator: [],
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
	comparisonSpaceAggregationParams = [],
	dataSource,
}: BuilderQuerieswithFormulaProps): QueryBuilderData => ({
	queryFormulas: expressions.map((expression, index) => ({
		...initialFormulaBuilderFormValues,
		expression,
		legend: legendFormulas[index],
	})),
	queryData: autocompleteData.map((_, index) => ({
		...initialQueryBuilderFormValuesMap.metrics,
		aggregations: getAggregations({
			dataSource,
			key: autocompleteData[index].key,
			aggregateOperator: timeAggregateOperators[index],
			timeAggregation: timeAggregateOperators[index],
			spaceAggregation: spaceAggregateOperators[index],
			comparisonSpaceAggregationParam: comparisonSpaceAggregationParams[index],
		}),
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
		stepInterval: null,
		dataSource,
	})),
	queryTraceOperator: [],
});
