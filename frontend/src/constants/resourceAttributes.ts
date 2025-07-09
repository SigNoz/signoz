import { OperatorValues } from 'types/reducer/trace';

export const OperatorConversions: Array<{
	label: string;
	metricValue: string;
	traceValue: OperatorValues;
}> = [
	{
		label: 'IN',
		metricValue: '=~',
		traceValue: 'In',
	},
	{
		label: 'Not IN',
		metricValue: '!~',
		traceValue: 'NotIn',
	},
];

// mapping from qb to exceptions
export const CompositeQueryOperatorsConfig: Array<{
	label: string;
	metricValue: string;
	traceValue: OperatorValues;
}> = [
	{
		label: 'in',
		metricValue: '=~',
		traceValue: 'In',
	},
	{
		label: 'not in',
		metricValue: '!~',
		traceValue: 'NotIn',
	},
	{
		label: '=',
		metricValue: '=',
		traceValue: 'Equals',
	},
	{
		label: '!=',
		metricValue: '!=',
		traceValue: 'NotEquals',
	},
	{
		label: 'exists',
		metricValue: '=~',
		traceValue: 'Exists',
	},
	{
		label: 'not exists',
		metricValue: '!~',
		traceValue: 'NotExists',
	},
	{
		label: 'contains',
		metricValue: '=~',
		traceValue: 'Contains',
	},
	{
		label: 'not contains',
		metricValue: '!~',
		traceValue: 'NotContains',
	},
];
