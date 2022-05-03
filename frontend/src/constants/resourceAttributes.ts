import { OperatorValues } from 'types/reducer/trace';

export const OperatorConversions: Array<{
	label: string;
	metricValue: string;
	traceValue: OperatorValues;
}> = [
	{
		label: 'IN',
		metricValue: '=~',
		traceValue: 'in',
	},
	{
		label: 'Not IN',
		metricValue: '!~',
		traceValue: 'not in',
	},
];
