import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IQueryBuilderTagFilterItems,
} from 'types/api/dashboard/getAll';

export const databaseCallsRPS = ({
	servicename,
	legend,
	tagFilterItems,
}: DatabaseCallsRPSProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => ({
	formulas: [],
	queryBuilder: [
		{
			aggregateOperator: 18,
			disabled: false,
			groupBy: ['db_system'],
			legend,
			metricName: 'signoz_db_latency_count',
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

export const databaseCallsAvgDuration = ({
	servicename,
	tagFilterItems,
}: DBCallProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => ({
	formulas: [
		{
			disabled: false,
			expression: 'A/B',
			name: 'F1',
			legend: '',
		},
	],
	queryBuilder: [
		{
			aggregateOperator: 18,
			disabled: true,
			groupBy: [],
			legend: '',
			metricName: 'signoz_db_latency_sum',
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
			disabled: true,
			groupBy: [],
			legend: '',
			metricName: 'signoz_db_latency_count',
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

interface DatabaseCallsRPSProps extends DBCallProps {
	legend: '{{db_system}}';
}

interface DBCallProps {
	servicename: string | undefined;
	tagFilterItems: IQueryBuilderTagFilterItems[] | [];
}
