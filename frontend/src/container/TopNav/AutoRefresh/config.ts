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
		label: '5s',
		key: '5s',
		value: 5000,
	},
	{
		label: '10s',
		key: '10s',
		value: 10000,
	},
	{
		label: '30s',
		key: '30s',
		value: 30000,
	},
	{
		label: '1m',
		key: '1m',
		value: 60000,
	},
	{
		label: '5m',
		key: '5m',
		value: 300000,
	},
	{
		label: '10m',
		key: '10m',
		value: 600000,
	},
	{
		label: '30m',
		key: '30m',
		value: 1800000,
	},
	{
		label: '1h',
		key: '1h',
		value: 3600000,
	},
	{
		label: '2h',
		key: '2h',
		value: 7200000,
	},
	{
		label: '1d',
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
