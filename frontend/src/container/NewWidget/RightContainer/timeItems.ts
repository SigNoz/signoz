/* eslint-disable @typescript-eslint/naming-convention */
export const timeItems: timePreferance[] = [
	{
		name: 'Global Time',
		enum: 'GLOBAL_TIME',
	},
	{
		name: 'Last 5 min',
		enum: 'LAST_5_MIN',
	},
	{
		name: 'Last 15 min',
		enum: 'LAST_15_MIN',
	},
	{
		name: 'Last 30 min',
		enum: 'LAST_30_MIN',
	},
	{
		name: 'Last 1 hr',
		enum: 'LAST_1_HR',
	},
	{
		name: 'Last 6 hr',
		enum: 'LAST_6_HR',
	},
	{
		name: 'Last 1 day',
		enum: 'LAST_1_DAY',
	},
	{
		name: 'Last 3 days',
		enum: 'LAST_3_DAYS',
	},
	{
		name: 'Last 1 week',
		enum: 'LAST_1_WEEK',
	},
	{
		name: 'Last 1 month',
		enum: 'LAST_1_MONTH',
	},
];

export interface timePreferance {
	name: string;
	enum: timePreferenceType;
}

export type timePreferenceType =
	| GLOBAL_TIME
	| LAST_5_MIN
	| LAST_15_MIN
	| LAST_30_MIN
	| LAST_1_HR
	| LAST_6_HR
	| LAST_1_DAY
	| LAST_3_DAYS
	| LAST_1_WEEK
	| LAST_1_MONTH;

type GLOBAL_TIME = 'GLOBAL_TIME';
type LAST_5_MIN = 'LAST_5_MIN';
type LAST_15_MIN = 'LAST_15_MIN';
type LAST_30_MIN = 'LAST_30_MIN';
type LAST_1_HR = 'LAST_1_HR';
type LAST_6_HR = 'LAST_6_HR';
type LAST_1_DAY = 'LAST_1_DAY';
type LAST_3_DAYS = 'LAST_3_DAYS';
type LAST_1_WEEK = 'LAST_1_WEEK';
type LAST_1_MONTH = 'LAST_1_MONTH';

export default timeItems;
