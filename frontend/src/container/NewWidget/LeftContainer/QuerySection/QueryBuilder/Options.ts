import { IOption } from './MetricTagKeyFilter/types';

export const AggregateFunctions = [
	{ label: 'COUNT', value: 0 },
	{ label: 'COUNT_DISTINCT', value: 1 },
	{ label: 'SUM', value: 2 },
	{ label: 'AVG', value: 3 },
	{ label: 'MAX', value: 4 },
	{ label: 'MIN', value: 5 },
	{ label: 'P05', value: 6 },
	{ label: 'P10', value: 7 },
	{ label: 'P20', value: 8 },
	{ label: 'P25', value: 9 },
	{ label: 'P50', value: 10 },
	{ label: 'P75', value: 11 },
	{ label: 'P90', value: 12 },
	{ label: 'P95', value: 13 },
	{ label: 'P99', value: 14 },
	{ label: 'RATE_SUM', value: 15 },
	{ label: 'RATE_AVG', value: 16 },
	{ label: 'RATE_MAX', value: 17 },
	{ label: 'RATE_MIN', value: 18 },
];

export const TagKeyOperator = [
	{ label: 'REGEX', value: 'REGEX' },
	{ label: 'Equal', value: 'EQ' },
	{ label: 'Not Equal', value: 'NEQ' },
	{ label: 'In', value: 'IN' },
	{ label: 'Not In', value: 'NIN' },
	{ label: 'Like', value: 'LIKE' },
];
