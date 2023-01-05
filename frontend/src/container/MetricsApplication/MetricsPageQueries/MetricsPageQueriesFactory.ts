import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IQueryBuilderTagFilterItems,
} from 'types/api/dashboard/getAll';

import { ExternalCallProps } from './ExternalQueries';

export const getQueryBuilderQueries = ({
	metricName,
	groupBy,
	servicename,
	legend,
	tagFilterItems,
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
				items: [
					{
						id: '',
						key: 'service_name',
						op: 'IN',
						value: [`${servicename}`],
					},
					...tagFilterItems,
				],
				op: 'AND',
			},
		},
	],
});

export const getQueryBuilderQuerieswithFormula = ({
	servicename,
	legend,
	disabled,
	tagFilterItems,
	metricNameA,
	metricNameB,
	groupBy,
	expression,
	legendFormula,
}: BuilderQuerieswithFormulaProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	return {
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
					items: [
						{
							id: '',
							key: 'service_name',
							op: 'IN',
							value: [`${servicename}`],
						},
						...tagFilterItems,
					],

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
					items: [
						{
							id: '',
							key: 'service_name',
							op: 'IN',
							value: [`${servicename}`],
						},
						...tagFilterItems,
					],
					op: 'AND',
				},
			},
		],
	};
};

export const getQueryBuilderQuerieswithAdditionalItems = ({
	servicename,
	legend,
	disabled,
	tagFilterItems,
	metricNameA,
	metricNameB,
	groupBy,
	expression,
	legendFormula,
	additionalItems,
}: BuilderQuerieswithAdditionalItems): {
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
				items: [
					{
						id: '',
						key: 'service_name',
						op: 'IN',
						value: [`${servicename}`],
					},
					additionalItems,
					...tagFilterItems,
				],

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
				items: [
					{
						id: '',
						key: 'service_name',
						op: 'IN',
						value: [`${servicename}`],
					},
					...tagFilterItems,
				],
				op: 'AND',
			},
		},
	],
});

export const getQueryBuilderQueriesOperation = ({
	metricName,
	servicename,
	tagFilterItems,
	legend,
	topLevelOperations,
}: BuilderQueriesOperationProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => ({
	formulas: [],
	queryBuilder: [
		{
			aggregateOperator: 18,
			disabled: false,
			legend,
			metricName,
			name: 'A',
			reduceTo: 1,
			tagFilters: {
				items: [
					{
						id: '',
						key: 'service_name',
						op: 'IN',
						value: [`${servicename}`],
					},
					{
						id: '',
						key: 'operation',
						op: 'MATCH',
						value: topLevelOperations,
					},
					...tagFilterItems,
				],
				op: 'AND',
			},
		},
	],
});
export const getQueryBuilderQueriesOperationWithFormula = ({
	servicename,
	legend,
	legendFormula,
	disabled,
	tagFilterItems,
	topLevelOperations,
	metricNameA,
	metricNameB,
	groupBy,
	expression,
	additionalItems,
}: BuilderQueriesOperationWithFormulaProps): {
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
				items: [
					{
						id: '',
						key: 'service_name',
						op: 'IN',
						value: [`${servicename}`],
					},
					{
						id: '',
						key: 'operation',
						op: 'MATCH',
						value: topLevelOperations,
					},
					additionalItems,
					...tagFilterItems,
				],

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
				items: [
					{
						id: '',
						key: 'service_name',
						op: 'IN',
						value: [`${servicename}`],
					},
					{
						id: '',
						key: 'operation',
						op: 'MATCH',
						value: topLevelOperations,
					},
					...tagFilterItems,
				],
				op: 'AND',
			},
		},
	],
});

interface BuilderQueriesProps extends ExternalCallProps {
	metricName: string;
	groupBy?: string[];
	legend: string;
}

interface BuilderQueriesOperationProps extends BuilderQueriesProps {
	topLevelOperations: string[];
}

interface BuilderQuerieswithFormulaProps extends ExternalCallProps {
	metricNameA: string;
	metricNameB: string;
	legend: string;
	disabled: boolean;
	groupBy?: string[];
	expression: string;
	legendFormula: string;
}

interface BuilderQuerieswithAdditionalItems
	extends BuilderQuerieswithFormulaProps {
	additionalItems: IQueryBuilderTagFilterItems;
}

interface BuilderQueriesOperationWithFormulaProps
	extends BuilderQuerieswithAdditionalItems {
	topLevelOperations: string[];
}
