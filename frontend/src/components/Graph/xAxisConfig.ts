import { Chart, TimeUnit } from 'chart.js';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

interface IAxisTimeUint {
	unitName: TimeUnit;
	multiplier: number;
}

interface IAxisTimeConfig {
	unitName: TimeUnit;
	stepSize: number;
}

export interface ITimeRange {
	minTime: number | null;
	maxTime: number | null;
}

const TIME_UNITS: IAxisTimeUint[] = [
	{
		unitName: 'millisecond',
		multiplier: 1,
	},
	{
		unitName: 'second',
		multiplier: 1 / 1e3,
	},
	{
		unitName: 'minute',
		multiplier: 1 / (1e3 * 60),
	},
	{
		unitName: 'hour',
		multiplier: 1 / (1e3 * 60 * 60),
	},
	{
		unitName: 'day',
		multiplier: 1 / (1e3 * 60 * 60 * 24),
	},
	{
		unitName: 'week',
		multiplier: 1 / (1e3 * 60 * 60 * 24 * 7),
	},
	{
		unitName: 'month',
		multiplier: 1 / (1e3 * 60 * 60 * 24 * 30),
	},
	{
		unitName: 'year',
		multiplier: 1 / (1e3 * 60 * 60 * 24 * 365),
	},
];

export const useXAxisTimeUnit = (data: Chart['data']): IAxisTimeConfig => {
	let localTime: ITimeRange;
	{
		let minTime = Number.POSITIVE_INFINITY;
		let maxTime = Number.NEGATIVE_INFINITY;
		data?.labels?.forEach((timeStamp: any) => {
			timeStamp = Date.parse(timeStamp);
			minTime = Math.min(timeStamp, minTime);
			maxTime = Math.max(timeStamp, maxTime);
		});

		localTime = {
			minTime: minTime === Number.POSITIVE_INFINITY ? null : minTime,
			maxTime: maxTime === Number.NEGATIVE_INFINITY ? null : maxTime,
		};
	}
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { maxTime, minTime } = useMemo(() => {
		if (localTime && localTime.maxTime && localTime.minTime) {
			return {
				minTime: localTime.minTime,
				maxTime: localTime.maxTime,
			};
		} else {
			return {
				minTime: globalTime.minTime / 1e6,
				maxTime: globalTime.maxTime / 1e6,
			};
		}
	}, [globalTime, localTime]);
	// debugger;
	return convertTimeRange(minTime, maxTime);
};

const convertTimeRange = (start: number, end: number): IAxisTimeConfig => {
	const MIN_INTERVALS = 6;
	const range = end - start;
	let relevantTimeUnit = TIME_UNITS[1];
	let stepSize = 1;
	for (let idx = TIME_UNITS.length - 1; idx >= 0; idx--) {
		const timeUnit = TIME_UNITS[idx];
		const units = range * timeUnit.multiplier;
		const steps = units / MIN_INTERVALS;
		if (steps >= 1) {
			relevantTimeUnit = timeUnit;
			stepSize = steps;
			break;
		}
	}
	return {
		unitName: relevantTimeUnit.unitName,
		stepSize: Math.floor(stepSize) || 1,
	};
};
