import {
	initialFormulaBuilderFormValues,
	initialQueryBuilderFormValues,
} from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import {
	MetricAggregateOperator,
	QueryBuilderData,
} from 'types/common/queryBuilder';

export const getQueryBuilderQueries = ({
	metricName,
	groupBy = [],
	legend,
	itemsA,
}: BuilderQueriesProps): QueryBuilderData => ({
	queryFormulas: [],
	queryData: [
		{
			...initialQueryBuilderFormValues,
			aggregateOperator: MetricAggregateOperator.SUM_RATE,
			disabled: false,
			groupBy,
			aggregateAttribute: metricName,
			legend,
			reduceTo: 'sum',
			filters: {
				items: itemsA,
				op: 'AND',
			},
		},
	],
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
			...initialQueryBuilderFormValues,
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
		},
		{
			...initialQueryBuilderFormValues,
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
		},
	],
});

interface BuilderQueriesProps {
	metricName: BaseAutocompleteData;
	groupBy?: BaseAutocompleteData[];
	legend: string;
	itemsA: TagFilterItem[];
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
