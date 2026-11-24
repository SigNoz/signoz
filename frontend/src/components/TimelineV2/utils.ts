type TTimeUnitName = 'ms' | 's' | 'm' | 'hr' | 'day' | 'week';

export interface IIntervalUnit {
	name: TTimeUnitName;
	multiplier: number;
}

export interface Interval {
	label: string;
	percentage: number;
}

export const INTERVAL_UNITS: IIntervalUnit[] = [
	{
		name: 'ms',
		multiplier: 1,
	},
	{
		name: 's',
		multiplier: 1 / 1e3,
	},
	{
		name: 'm',
		multiplier: 1 / (1e3 * 60),
	},
	{
		name: 'hr',
		multiplier: 1 / (1e3 * 60 * 60),
	},
	{
		name: 'day',
		multiplier: 1 / (1e3 * 60 * 60 * 24),
	},
	{
		name: 'week',
		multiplier: 1 / (1e3 * 60 * 60 * 24 * 7),
	},
];

export const resolveTimeFromInterval = (
	intervalTime: number,
	intervalUnit: IIntervalUnit,
): number => intervalTime * intervalUnit.multiplier;
