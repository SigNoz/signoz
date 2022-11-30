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

interface BuilderQueriesProps extends ExternalCallProps {
	metricName: string;
	groupBy?: string[];
	legend: string;
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
