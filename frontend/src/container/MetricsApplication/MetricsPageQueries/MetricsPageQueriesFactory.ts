import {
	alphabet,
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import getStep from 'lib/getStep';
import store from 'store';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	MetricAggregateOperator,
	QueryBuilderData,
} from 'types/common/queryBuilder';

export const getQueryBuilderQueries = ({
	autocompleteData,
	groupBy = [],
	legends,
	filterItems,
	aggregateOperator,
	dataSource,
	queryNameAndExpression,
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
			reduceTo: 'sum',
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
	aggregateOperators,
	dataSource,
}: BuilderQuerieswithFormulaProps): QueryBuilderData => ({
	queryFormulas: expressions.map((expression, index) => ({
		...initialFormulaBuilderFormValues,
		expression,
		legend: legendFormulas[index],
	})),
	queryData: autocompleteData.map((_, index) => ({
		...initialQueryBuilderFormValuesMap.metrics,
		aggregateOperator: aggregateOperators[index],
		disabled: disabled[index],
		groupBy,
		legend: legends[index],
		aggregateAttribute: autocompleteData[index],
		queryName: alphabet[index],
		expression: alphabet[index],
		reduceTo: 'sum',
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

interface BuilderQueriesProps {
	autocompleteData: BaseAutocompleteData[];
	groupBy?: BaseAutocompleteData[];
	legends: string[];
	filterItems: TagFilterItem[][];
	aggregateOperator?: string[];
	dataSource: DataSource;
	queryNameAndExpression?: string[];
}

interface BuilderQuerieswithFormulaProps {
	autocompleteData: BaseAutocompleteData[];
	legends: string[];
	disabled: boolean[];
	groupBy?: BaseAutocompleteData[];
	expressions: string[];
	legendFormulas: string[];
	additionalItems: TagFilterItem[][];
	aggregateOperators: MetricAggregateOperator[];
	dataSource: DataSource;
}
