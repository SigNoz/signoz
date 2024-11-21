/* eslint-disable sonarjs/no-duplicate-string */
import { QueryFunctionsTypes } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

export const metricQueryFunctionOptions: SelectOption<string, string>[] = [
	{
		value: QueryFunctionsTypes.CUTOFF_MIN,
		label: 'Cut Off Min',
	},
	{
		value: QueryFunctionsTypes.CUTOFF_MAX,
		label: 'Cut Off Max',
	},
	{
		value: QueryFunctionsTypes.CLAMP_MIN,
		label: 'Clamp Min',
	},
	{
		value: QueryFunctionsTypes.CLAMP_MAX,
		label: 'Clamp Max',
	},
	{
		value: QueryFunctionsTypes.ABSOLUTE,
		label: 'Absolute',
	},
	{
		value: QueryFunctionsTypes.RUNNING_DIFF,
		label: 'Running Diff',
	},
	{
		value: QueryFunctionsTypes.LOG_2,
		label: 'Log2',
	},
	{
		value: QueryFunctionsTypes.LOG_10,
		label: 'Log10',
	},
	{
		value: QueryFunctionsTypes.CUMULATIVE_SUM,
		label: 'Cumulative Sum',
	},
	{
		value: QueryFunctionsTypes.EWMA_3,
		label: 'EWMA 3',
	},
	{
		value: QueryFunctionsTypes.EWMA_5,
		label: 'EWMA 5',
	},
	{
		value: QueryFunctionsTypes.EWMA_7,
		label: 'EWMA 7',
	},
	{
		value: QueryFunctionsTypes.MEDIAN_3,
		label: 'Median 3',
	},
	{
		value: QueryFunctionsTypes.MEDIAN_5,
		label: 'Median 5',
	},
	{
		value: QueryFunctionsTypes.MEDIAN_7,
		label: 'Median 7',
	},
	{
		value: QueryFunctionsTypes.TIME_SHIFT,
		label: 'Time Shift',
	},
	{
		value: QueryFunctionsTypes.TIME_SHIFT,
		label: 'Time Shift',
	},
];

export const logsQueryFunctionOptions: SelectOption<string, string>[] = [
	{
		value: QueryFunctionsTypes.TIME_SHIFT,
		label: 'Time Shift',
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
	cumSum: {
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
