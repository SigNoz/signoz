import GetMinMax, { GetMinMaxPayload } from 'lib/getMinMax';

import { Time } from '../DateTimeSelection/config';
import { CustomTimeType, Time as TimeV2 } from '../DateTimeSelectionV2/config';

export const options: IOptions[] = [
	{
		label: 'off',
		key: 'off',
		value: 0,
	},
	{
		label: '5 seconds',
		key: '5s',
		value: 5000,
	},
	{
		label: '10 seconds',
		key: '10s',
		value: 10000,
	},
	{
		label: '30 seconds',
		key: '30s',
		value: 30000,
	},
	{
		label: '1 minute',
		key: '1m',
		value: 60000,
	},
	{
		label: '5 minutes',
		key: '5m',
		value: 300000,
	},
	{
		label: '10 minutes',
		key: '10m',
		value: 600000,
	},
	{
		label: '30 minutes',
		key: '30m',
		value: 1800000,
	},
	{
		label: '1 hour',
		key: '1h',
		value: 3600000,
	},
	{
		label: '2 hours',
		key: '2h',
		value: 7200000,
	},
	{
		label: '1 day',
		key: '1d',
		value: 86400000,
	},
];

export interface IOptions {
	label: string;
	key: string;
	value: number;
}

export const getMinMax = (
	selectedTime: Time | TimeV2 | CustomTimeType,
	minTime: number,
	maxTime: number,
): GetMinMaxPayload =>
	selectedTime !== 'custom'
		? GetMinMax(selectedTime)
		: GetMinMax(selectedTime, [minTime, maxTime]);
