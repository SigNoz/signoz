import {
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
	autocompleteDataA,
	autocompleteDataB,
	additionalItemsA,
	additionalItemsB,
	legend,
	groupBy = [],
	disabled,
	expression,
	legendFormula,
}: BuilderQuerieswithFormulaProps): QueryBuilderData => ({
	queryFormulas: [
		{
			...initialFormulaBuilderFormValues,
			expression,
			legend: legendFormula,
		},
	],
	queryData: [
		{
			...initialQueryBuilderFormValuesMap.metrics,
			aggregateOperator: MetricAggregateOperator.SUM_RATE,
			disabled,
			groupBy,
			legend,
			aggregateAttribute: autocompleteDataA,
			reduceTo: 'sum',
			filters: {
				items: additionalItemsA,
				op: 'AND',
			},
			stepInterval: getStep({
				end: store.getState().globalTime.maxTime,
				inputFormat: 'ns',
				start: store.getState().globalTime.minTime,
			}),
		},
		{
			...initialQueryBuilderFormValuesMap.metrics,
			aggregateOperator: MetricAggregateOperator.SUM_RATE,
			disabled,
			groupBy,
			legend,
			aggregateAttribute: autocompleteDataB,
			queryName: 'B',
			expression: 'B',
			reduceTo: 'sum',
			filters: {
				items: additionalItemsB,
				op: 'AND',
			},
			stepInterval: getStep({
				end: store.getState().globalTime.maxTime,
				inputFormat: 'ns',
				start: store.getState().globalTime.minTime,
			}),
		},
	],
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
	autocompleteDataA: BaseAutocompleteData;
	autocompleteDataB: BaseAutocompleteData;
	legend: string;
	disabled: boolean;
	groupBy?: BaseAutocompleteData[];
	expression: string;
	legendFormula: string;
	additionalItemsA: TagFilterItem[];
	additionalItemsB: TagFilterItem[];
}
