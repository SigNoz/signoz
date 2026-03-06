import {
	getMinimumIntervalsBasedOnWidth,
	IIntervalUnit,
	Interval,
	INTERVAL_UNITS,
	resolveTimeFromInterval,
} from 'components/TimelineV2/utils';
import { toFixed } from 'utils/toFixed';

export type { Interval };

export { getMinimumIntervalsBasedOnWidth };

/**
 * Computes timeline intervals with offset-aware labels.
 * Labels reflect absolute time from trace start (offsetTimestamp + elapsed),
 * so when zoomed into a window, the first tick shows e.g. "50ms" not "0ms".
 */
export function getIntervals(
	intervalSpread: number,
	baseSpread: number,
	offsetTimestamp: number,
): Interval[] {
	const integerPartString = intervalSpread.toString().split('.')[0];
	const integerPartLength = integerPartString.length;

	const intervalSpreadNormalized =
		intervalSpread < 1.0
			? intervalSpread
			: Math.floor(Number(integerPartString) / 10 ** (integerPartLength - 1)) *
			  10 ** (integerPartLength - 1);

	let intervalUnit: IIntervalUnit = INTERVAL_UNITS[0];
	const maxLabelTimeMagnitude = Math.max(
		intervalSpread,
		Math.abs(offsetTimestamp),
		Math.abs(offsetTimestamp + baseSpread),
	);
	for (let idx = INTERVAL_UNITS.length - 1; idx >= 0; idx -= 1) {
		const standardInterval = INTERVAL_UNITS[idx];
		if (maxLabelTimeMagnitude * standardInterval.multiplier >= 1) {
			intervalUnit = INTERVAL_UNITS[idx];
			break;
		}
	}

	const intervals: Interval[] = [
		{
			label: `${toFixed(
				resolveTimeFromInterval(offsetTimestamp, intervalUnit),
				2,
			)}${intervalUnit.name}`,
			percentage: 0,
		},
	];

	let tempBaseSpread = baseSpread;
	let elapsedIntervals = 0;

	while (tempBaseSpread && intervals.length < 20) {
		let intervalTime: number;

		if (tempBaseSpread <= 1.5 * intervalSpreadNormalized) {
			intervalTime = elapsedIntervals + tempBaseSpread;
			tempBaseSpread = 0;
		} else {
			intervalTime = elapsedIntervals + intervalSpreadNormalized;
			tempBaseSpread -= intervalSpreadNormalized;
		}

		elapsedIntervals = intervalTime;
		const labelTime = offsetTimestamp + intervalTime;

		intervals.push({
			label: `${toFixed(resolveTimeFromInterval(labelTime, intervalUnit), 2)}${
				intervalUnit.name
			}`,
			percentage: (intervalTime / baseSpread) * 100,
		});
	}

	return intervals;
}
