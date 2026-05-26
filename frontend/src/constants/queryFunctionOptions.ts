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
		value: QueryFunctionsTypes.FILL_ZERO,
		label: 'Fill Zero',
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
		selectOptions?: SelectOption<string, string>[];
	};
}

export const TIME_SHIFT_OPTIONS: SelectOption<string, string>[] = [
	{ label: '1 hour ago', value: '3600' },
	{ label: '6 hours ago', value: '21600' },
	{ label: '12 hours ago', value: '43200' },
	{ label: '1 day ago', value: '86400' },
	{ label: '2 days ago', value: '172800' },
	{ label: '1 week ago', value: '604800' },
	{ label: 'Custom', value: 'custom' },
];

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
		inputType: 'select',
		selectOptions: TIME_SHIFT_OPTIONS,
	},
	fillZero: {
		showInput: false,
	},
};
