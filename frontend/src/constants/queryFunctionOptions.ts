/* eslint-disable sonarjs/no-duplicate-string */
import { QueryFunctionsTypes } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

export const functionTypes = {
	aggregation: 'aggregation',
	interpolation: 'interpolation',
	timeShift: 'timeShift',
	rate: 'rate',
	smoothing: 'smoothing',
	arithmetic: 'arithmetic',
	recommended: 'recommended',
} as const;

export const defaultFunctionDescription = {
	[functionTypes.smoothing]:
		'Smoothing functions are used to smooth out the data by removing noise and outliers.',
	[functionTypes.arithmetic]:
		'Arithmetic functions are used to perform arithmetic operations on the data.',
	[functionTypes.timeShift]:
		'Time shift functions are used to shift the data in time.',
	[functionTypes.rate]:
		'Rate functions are used to calculate the rate of change of the data.',
	[functionTypes.recommended]:
		'Recommended functions are used to recommend the best functions for the data.',
};

export const metricQueryFunctionOptions: SelectOption<string, string>[] = [
	{
		value: QueryFunctionsTypes.CUTOFF_MIN,
		label: 'Cut Off Min',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.CUTOFF_MAX,
		label: 'Cut Off Max',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.CLAMP_MIN,
		label: 'Clamp Min',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.CLAMP_MAX,
		label: 'Clamp Max',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.ABSOLUTE,
		label: 'Absolute',
		type: functionTypes.arithmetic,
	},
	{
		value: QueryFunctionsTypes.RUNNING_DIFF,
		label: 'Running Diff',
		type: functionTypes.arithmetic,
	},
	{
		value: QueryFunctionsTypes.LOG_2,
		label: 'Log2',
		type: functionTypes.arithmetic,
	},
	{
		value: QueryFunctionsTypes.LOG_10,
		label: 'Log10',
		type: functionTypes.arithmetic,
	},
	{
		value: QueryFunctionsTypes.CUMULATIVE_SUM,
		label: 'Cumulative Sum',
		type: functionTypes.arithmetic,
	},
	{
		value: QueryFunctionsTypes.EWMA_3,
		label: 'EWMA 3',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.EWMA_5,
		label: 'EWMA 5',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.EWMA_7,
		label: 'EWMA 7',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.MEDIAN_3,
		label: 'Median 3',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.MEDIAN_5,
		label: 'Median 5',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.MEDIAN_7,
		label: 'Median 7',
		type: functionTypes.smoothing,
	},
	{
		value: QueryFunctionsTypes.TIME_SHIFT,
		label: 'Time Shift',
		type: functionTypes.timeShift,
	},
];

export const logsQueryFunctionOptions: SelectOption<string, string>[] = [
	{
		value: QueryFunctionsTypes.TIME_SHIFT,
		label: 'Time Shift',
		type: functionTypes.timeShift,
	},
];
interface QueryFunctionConfigType {
	[key: string]: {
		showInput: boolean;
		inputType?: string;
		placeholder?: string;
		disabled?: boolean;
	};
}

export const queryFunctionsTypesConfig: QueryFunctionConfigType = {
	anomaly: {
		showInput: false,
		disabled: true,
	},
	cutOffMin: {
		showInput: true,
		inputType: 'text',
		placeholder: 'Threshold',
	},
	cutOffMax: {
		showInput: true,
		inputType: 'text',
		placeholder: 'Threshold',
	},
	clampMin: {
		showInput: true,
		inputType: 'text',
		placeholder: 'Threshold',
	},
	clampMax: {
		showInput: true,
		inputType: 'text',
		placeholder: 'Threshold',
	},
	absolute: {
		showInput: false,
	},
	runningDiff: {
		showInput: false,
	},
	log2: {
		showInput: false,
	},
	log10: {
		showInput: false,
	},
	cumulativeSum: {
		showInput: false,
	},
	ewma3: {
		showInput: true,
		inputType: 'text',
		placeholder: 'Alpha',
	},
	ewma5: {
		showInput: true,
		inputType: 'text',
		placeholder: 'Alpha',
	},
	ewma7: {
		showInput: true,
		inputType: 'text',
		placeholder: 'Alpha',
	},
	median3: {
		showInput: false,
	},
	median5: {
		showInput: false,
	},
	median7: {
		showInput: false,
	},
	timeShift: {
		showInput: true,
		inputType: 'text',
	},
};
