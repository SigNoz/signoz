import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IQueryBuilderTagFilterItems,
} from 'types/api/dashboard/getAll';

export const getQueryBuilderQueries = ({
	metricName,
	groupBy,
	legend,
	itemsA,
}: BuilderQueriesProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => ({
	formulas: [],
	queryBuilder: [
		{
			aggregateOperator: 18,
			disabled: false,
			groupBy,
			legend,
			metricName,
			name: 'A',
			reduceTo: 1,
			tagFilters: {
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
	groupBy,
	disabled,
	expression,
	legendFormula,
}: BuilderQuerieswithFormulaProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => ({
	formulas: [
		{
			disabled: false,
			expression,
			name: 'F1',
			legend: legendFormula,
		},
	],
	queryBuilder: [
		{
			aggregateOperator: 18,
			disabled,
			groupBy,
			legend,
			metricName: metricNameA,
			name: 'A',
			reduceTo: 1,
			tagFilters: {
				items: additionalItemsA,
				op: 'AND',
			},
		},
		{
			aggregateOperator: 18,
			disabled,
			groupBy,
			legend,
			metricName: metricNameB,
			name: 'B',
			reduceTo: 1,
			tagFilters: {
				items: additionalItemsB,
				op: 'AND',
			},
		},
	],
});

interface BuilderQueriesProps {
	metricName: string;
	groupBy?: string[];
	legend: string;
	itemsA: IQueryBuilderTagFilterItems[];
}

interface BuilderQuerieswithFormulaProps {
	metricNameA: string;
	metricNameB: string;
	legend: string;
	disabled: boolean;
	groupBy?: string[];
	expression: string;
	legendFormula: string;
	additionalItemsA: IQueryBuilderTagFilterItems[];
	additionalItemsB: IQueryBuilderTagFilterItems[];
}
