import {
	INTERVAL_UNITS,
	resolveTimeFromInterval,
} from 'container/TraceDetail/utils';
import { isEqual } from 'lodash-es';
import { toFixed } from 'utils/toFixed';

import { Interval } from './types';

export const getIntervalSpread = ({
	localTraceMetaData,
	globalTraceMetadata,
}) => {
	const {
		globalStart: localStart,
		globalEnd: localEnd,
		spread: localSpread,
	} = localTraceMetaData;
	const { globalStart, globalEnd, globalSpread } = globalTraceMetadata;

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
			: Math.floor(
					Number(integerPartString) / Math.pow(10, integerPartLength - 1),
			  ) * Math.pow(10, integerPartLength - 1);
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
}) => {
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
		let interval_time;
		if (tempBaseSpread <= 1.5 * intervalSpreadNormalized) {
			interval_time = elapsedIntervals + tempBaseSpread;
			tempBaseSpread = 0;
		} else {
			interval_time = elapsedIntervals + intervalSpreadNormalized;
			tempBaseSpread -= intervalSpreadNormalized;
		}
		elapsedIntervals = interval_time;
		const interval: Interval = {
			label: `${toFixed(
				resolveTimeFromInterval(interval_time + baseInterval, intervalUnit),
				2,
			)}${intervalUnit.name}`,
			percentage: (interval_time / baseSpread) * 100,
		};
		intervals.push(interval);
	}

	return intervals;
};
