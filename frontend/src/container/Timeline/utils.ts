import { ITraceMetaData } from 'container/GantChart';
import {
	IIntervalUnit,
	resolveTimeFromInterval,
} from 'container/TraceDetail/utils';
import { isEqual } from 'lodash-es';
import { toFixed } from 'utils/toFixed';

import { Interval } from './types';

export const getIntervalSpread = ({
	localTraceMetaData,
	globalTraceMetadata,
}: {
	localTraceMetaData: ITraceMetaData;
	globalTraceMetadata: ITraceMetaData;
}): {
	baseInterval: number;
	baseSpread: number;
	intervalSpreadNormalized: number;
} => {
	const { globalStart: localStart, spread: localSpread } = localTraceMetaData;
	const { globalStart } = globalTraceMetadata;

	let baseInterval = 0;

	if (!isEqual(localTraceMetaData, globalTraceMetadata)) {
		baseInterval = localStart - globalStart;
	}

	const MIN_INTERVALS = 5;
	const baseSpread = localSpread;
	const intervalSpread = (baseSpread / MIN_INTERVALS) * 1.0;
	const integerPartString = intervalSpread.toString().split('.')[0];
	const integerPartLength = integerPartString.length;
	const intervalSpreadNormalized =
		intervalSpread < 1.0
			? intervalSpread
			: Math.floor(Number(integerPartString) / 10 ** (integerPartLength - 1)) *
			  10 ** (integerPartLength - 1);
	return {
		baseInterval,
		baseSpread,
		intervalSpreadNormalized,
	};
};

export const getIntervals = ({
	baseInterval,
	baseSpread,
	intervalSpreadNormalized,
	intervalUnit,
}: {
	baseInterval: number;
	baseSpread: number;
	intervalSpreadNormalized: number;
	intervalUnit: IIntervalUnit;
}): Interval[] => {
	const intervals: Interval[] = [
		{
			label: `${toFixed(resolveTimeFromInterval(baseInterval, intervalUnit), 2)}${
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
			label: `${toFixed(
				resolveTimeFromInterval(intervalTime + baseInterval, intervalUnit),
				2,
			)}${intervalUnit.name}`,
			percentage: (intervalTime / baseSpread) * 100,
		};
		intervals.push(interval);
	}

	return intervals;
};
