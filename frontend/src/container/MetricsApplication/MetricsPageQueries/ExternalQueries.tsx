import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IQueryBuilderTagFilterItems,
} from 'types/api/dashboard/getAll';

export const externalCallErrorPercent = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => ({
	formulas: [
		{
			name: 'F1',
			expression: 'A*100/B',
			disabled: false,
			legend: 'External Call Error Percentage',
		},
	],
	queryBuilder: [
		{
			name: 'A',
			aggregateOperator: 18,
			metricName: 'signoz_external_call_latency_count',
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
						key: 'status_code',
						op: 'IN',
						value: ['STATUS_CODE_ERROR'],
					},
					...tagFilterItems,
				],

				op: 'AND',
			},
			groupBy: ['address'],
			legend,
			disabled: false,
		},
		{
			name: 'B',
			aggregateOperator: 18,
			metricName: 'signoz_external_call_latency_count',
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
			groupBy: ['address'],
			legend,
			disabled: false,
		},
	],
});

export const externalCallDuration = ({
	servicename,
	tagFilterItems,
}: ExternalCallProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => ({
	formulas: [
		{
			disabled: false,
			expression: 'A/B',
			name: 'F1',
			legend: 'Average Duration',
		},
	],
	queryBuilder: [
		{
			aggregateOperator: 18,
			disabled: true,
			groupBy: [],
			legend: '',
			metricName: 'signoz_external_call_latency_sum',
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
			metricName: 'signoz_external_call_latency_count',
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

export const externalCallRpsByAddress = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => ({
	formulas: [],
	queryBuilder: [
		{
			aggregateOperator: 18,
			disabled: false,
			groupBy: ['address'],
			legend,
			metricName: 'signoz_external_call_latency_count',
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

export const externalCallDurationByAddress = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => ({
	formulas: [
		{
			disabled: false,
			expression: 'A/B',
			name: 'F1',
			legend,
		},
	],
	queryBuilder: [
		{
			aggregateOperator: 18,
			disabled: false,
			groupBy: ['address'],
			legend,
			metricName: 'signoz_external_call_latency_sum',
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
			disabled: false,
			groupBy: ['address'],
			legend,
			metricName: 'signoz_external_call_latency_count',
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

interface ExternalCallDurationByAddressProps extends ExternalCallProps {
	legend: '{{address}}';
}

interface ExternalCallProps {
	servicename: string | undefined;
	tagFilterItems: IQueryBuilderTagFilterItems[] | [];
}
