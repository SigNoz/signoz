import type uPlot from 'uplot';

const DECADE_TOLERANCE = 1e-9;

function isDecade(value: number): boolean {
	if (value === 0) {
		return true;
	}
	const exponent = Math.log10(Math.abs(value));
	return Math.abs(exponent - Math.round(exponent)) < DECADE_TOLERANCE;
}

const LOG_SPLIT_MULTIPLES = [1, 2, 5];

/** Decades finer than the range's own span that the fallback steps through. */
const FALLBACK_STEP_DECADES = 3;

/** Rounded through toPrecision so 0.1 × 3 noise can't fall outside [min, max]. */
function roundSplit(value: number): number {
	return Number(value.toPrecision(12));
}

/** Evenly stepped splits for a range too narrow to hold two 1/2/5 splits. */
function narrowRangeSplits(min: number, max: number): number[] {
	const coarsest = Math.floor(Math.log10(max - min));
	for (
		let exponent = coarsest;
		exponent > coarsest - FALLBACK_STEP_DECADES;
		exponent--
	) {
		const step = 10 ** exponent;
		const first = Math.ceil(roundSplit(min / step));
		const last = Math.floor(roundSplit(max / step));
		if (last > first) {
			return Array.from({ length: last - first + 1 }, (_, index) =>
				roundSplit((first + index) * step),
			);
		}
	}
	return [];
}

/** 1, 2, 5 × 10ⁿ in range; uPlot's log splits step from an unsnapped min (10.79, 21.58…). */
export const logScaleSplits: uPlot.Axis.Splits = (_u, _axisIdx, min, max) => {
	if (!(min > 0) || !(max > min)) {
		return [];
	}
	const splits: number[] = [];
	for (
		let exponent = Math.floor(Math.log10(min));
		exponent <= Math.ceil(Math.log10(max));
		exponent++
	) {
		LOG_SPLIT_MULTIPLES.forEach((multiple) => {
			const split = roundSplit(multiple * 10 ** exponent);
			if (split >= min && split <= max) {
				splits.push(split);
			}
		});
	}
	if (splits.length >= 2) {
		return splits;
	}
	const narrow = narrowRangeSplits(min, max);
	return narrow.length > splits.length ? narrow : splits;
};

/** Labels every decade, plus any 2 or 5 at least `space` px clear. */
export const spacedLogLabels: uPlot.Axis.Filter = (
	u,
	splits,
	axisIdx,
	space,
) => {
	const scaleKey = u.axes[axisIdx]?.scale ?? 'x';
	const positions = splits.map((split) =>
		split == null ? null : u.valToPos(split, scaleKey),
	);
	const kept = splits.map((split) => split != null && isDecade(split));
	const isClear = (index: number): boolean =>
		kept.every(
			(isKept, other) =>
				!isKept ||
				Math.abs((positions[other] ?? 0) - (positions[index] ?? 0)) >= space,
		);
	splits.forEach((split, index) => {
		if (split != null && !kept[index] && isClear(index)) {
			kept[index] = true;
		}
	});
	return splits.map((split, index) => (kept[index] ? split : null));
};
