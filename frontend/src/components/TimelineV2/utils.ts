import { toFixed } from 'utils/toFixed';

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

export const getMinimumIntervalsBasedOnWidth = (width: number): number => {
	// S
	if (width < 640) {
		return 5;
	}
	// M
	if (width < 768) {
		return 6;
	}
	// L
	if (width < 1024) {
		return 8;
	}

	return 10;
};

export const resolveTimeFromInterval = (
	intervalTime: number,
	intervalUnit: IIntervalUnit,
): number => intervalTime * intervalUnit.multiplier;

export function getIntervals(
	intervalSpread: number,
	baseSpread: number,
): Interval[] {
	const integerPartString = intervalSpread.toString().split('.')[0];
	const integerPartLength = integerPartString.length;
	const intervalSpreadNormalized =
		intervalSpread < 1.0
			? intervalSpread
			: Math.floor(Number(integerPartString) / 10 ** (integerPartLength - 1)) *
			  10 ** (integerPartLength - 1);

	let intervalUnit = INTERVAL_UNITS[0];
	for (let idx = INTERVAL_UNITS.length - 1; idx >= 0; idx -= 1) {
		const standardInterval = INTERVAL_UNITS[idx];
		if (intervalSpread * standardInterval.multiplier >= 1) {
			intervalUnit = INTERVAL_UNITS[idx];
			break;
		}
	}
	intervalUnit = intervalUnit || INTERVAL_UNITS[0];

	const intervals: Interval[] = [
		{
			label: `${toFixed(resolveTimeFromInterval(0, intervalUnit), 2)}${
				intervalUnit.name
			}`,
			percentage: 0,
		},
	];

	let tempBaseSpread = baseSpread;
	let elapsedIntervals = 0;

	while (tempBaseSpread && intervals.length < 20) {
		let intervalTime;
		if (tempBaseSpread <= 1.5 * intervalSpreadNormalized) {
			intervalTime = elapsedIntervals + tempBaseSpread;
			tempBaseSpread = 0;
		} else {
			intervalTime = elapsedIntervals + intervalSpreadNormalized;
			tempBaseSpread -= intervalSpreadNormalized;
		}
		elapsedIntervals = intervalTime;
		const interval: Interval = {
			label: `${toFixed(resolveTimeFromInterval(intervalTime, intervalUnit), 2)}${
				intervalUnit.name
			}`,
			percentage: (intervalTime / baseSpread) * 100,
		};
		intervals.push(interval);
	}

	return intervals;
}
