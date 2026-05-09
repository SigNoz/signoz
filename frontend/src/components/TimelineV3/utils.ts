import {
	IIntervalUnit,
	Interval,
	INTERVAL_UNITS,
	resolveTimeFromInterval,
} from 'components/TimelineV2/utils';
import { toFixed } from 'utils/toFixed';

export type { Interval };

/**
 * Select the interval unit matching the timeline's logic.
 * Exported so crosshair labels use the same unit as timeline ticks.
 */
export function getIntervalUnit(
	spread: number,
	offsetTimestamp: number,
): IIntervalUnit {
	const minIntervals = 6;
	const intervalSpread = spread / minIntervals;
	const valueForUnitSelection = Math.max(offsetTimestamp, intervalSpread);
	let unit: IIntervalUnit = INTERVAL_UNITS[0];
	for (let idx = INTERVAL_UNITS.length - 1; idx >= 0; idx -= 1) {
		if (valueForUnitSelection * INTERVAL_UNITS[idx].multiplier >= 1) {
			unit = INTERVAL_UNITS[idx];
			break;
		}
	}
	return unit;
}

/** Fewer intervals than TimelineV2 for a cleaner flamegraph ruler. */
export function getMinimumIntervalsBasedOnWidth(width: number): number {
	if (width < 640) {
		return 3;
	}
	if (width < 768) {
		return 4;
	}
	if (width < 1024) {
		return 5;
	}
	return 6;
}

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

	// Unit must suit both: (1) tick granularity (intervalSpread) and (2) label magnitude
	// (offsetTimestamp). When zoomed deep into a trace, labels show offsetTimestamp + elapsed,
	// so we must pick a unit where that value is readable (e.g. "500.00s" not "500000.00ms").
	const valueForUnitSelection = Math.max(offsetTimestamp, intervalSpread);
	let intervalUnit: IIntervalUnit = INTERVAL_UNITS[0];
	for (let idx = INTERVAL_UNITS.length - 1; idx >= 0; idx -= 1) {
		const standardInterval = INTERVAL_UNITS[idx];
		if (valueForUnitSelection * standardInterval.multiplier >= 1) {
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

	// Only show even-interval ticks — skip the trailing partial tick at the edge.
	// The last even tick sits before the full width, so it doesn't conflict with
	// span duration labels that may have sub-millisecond precision.
	let elapsedIntervals = 0;

	while (
		elapsedIntervals + intervalSpreadNormalized <= baseSpread &&
		intervals.length < 20
	) {
		elapsedIntervals += intervalSpreadNormalized;
		const labelTime = offsetTimestamp + elapsedIntervals;

		intervals.push({
			label: `${toFixed(resolveTimeFromInterval(labelTime, intervalUnit), 2)}${
				intervalUnit.name
			}`,
			percentage: (elapsedIntervals / baseSpread) * 100,
		});
	}

	return intervals;
}
