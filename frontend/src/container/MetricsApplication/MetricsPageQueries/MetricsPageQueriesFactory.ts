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
	metricNames,
	groupBy = [],
	legends,
	filterItems,
	aggregateOperator,
	dataSource,
	queryName,
	expression,
}: BuilderQueriesProps): QueryBuilderData => ({
	queryFormulas: [],
	queryData: metricNames.map((item, index) => {
		const obj = {
			...initialQueryBuilderFormValuesMap.metrics,
			aggregateOperator: (function (): string {
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
			reduceTo: 'sum',
			filters: {
				items: filterItems[index],
				op: 'AND',
			},
			dataSource,
		} as IBuilderQuery;

		if (queryName) {
			obj.queryName = queryName[index];
		}

		if (expression) {
			obj.expression = expression[index];
		}

		return obj;
	}),
});

export const getQueryBuilderQuerieswithFormula = ({
	metricNameA,
	metricNameB,
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
			aggregateAttribute: metricNameA,
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
			aggregateAttribute: metricNameB,
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
	metricNames: BaseAutocompleteData[];
	groupBy?: BaseAutocompleteData[];
	legends: string[];
	filterItems: TagFilterItem[][];
	aggregateOperator?: string[];
	dataSource: DataSource;
	queryName?: string[];
	expression?: string[];
}

interface BuilderQuerieswithFormulaProps {
	metricNameA: BaseAutocompleteData;
	metricNameB: BaseAutocompleteData;
	legend: string;
	disabled: boolean;
	groupBy?: BaseAutocompleteData[];
	expression: string;
	legendFormula: string;
	additionalItemsA: TagFilterItem[];
	additionalItemsB: TagFilterItem[];
}
