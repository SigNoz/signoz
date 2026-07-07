type FiveMin = '5m';
type TenMin = '10m';
type FifteenMin = '15m';
type ThirtyMin = '30m';
type FortyFiveMin = '45m';
type OneMin = '1m';
type ThreeHour = '3h';
type SixHour = '6h';
type OneHour = '1h';
type FourHour = '4h';
type TwelveHour = '12h';
type OneDay = '1d';
type ThreeDay = '3d';
type FourDay = '4d';
type TenDay = '10d';
type OneWeek = '1w';
type TwoWeek = '2w';
type SixWeek = '6w';
type OneMonth = '1month';
type TwoMonths = '2months';
type Custom = 'custom';

export type Time =
	| FiveMin
	| TenMin
	| FifteenMin
	| ThirtyMin
	| OneMin
	| ThreeHour
	| FourHour
	| SixHour
	| OneHour
	| Custom
	| OneWeek
	| SixWeek
	| OneDay
	| FourDay
	| ThreeDay
	| FortyFiveMin
	| TwelveHour
	| TenDay
	| TwoWeek
	| OneMonth
	| TwoMonths;

export type TimeUnit = 'm' | 'h' | 'd' | 'w';

export type CustomTimeType = `${string}${TimeUnit}`;

export interface Option {
	value: Time;
	label: string;
}

export type TimeFrame = {
	'5min': string;
	'15min': string;
	'30min': string;
	'1hr': string;
	'6hr': string;
	'1day': string;
	'3days': string;
	'1week': string;
	[key: string]: string; // Index signature to allow any string as index
};

export interface LocalStorageTimeRange {
	localstorageStartTime: string | null;
	localstorageEndTime: string | null;
}

export interface TimeRange {
	startTime: string;
	endTime: string;
}

export enum LexicalContext {
	CUSTOM_DATE_PICKER = 'customDatePicker',
	CUSTOM_DATE_TIME_INPUT = 'customDateTimeInput',
}
