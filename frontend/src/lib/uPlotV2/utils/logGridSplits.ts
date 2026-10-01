import type uPlot from 'uplot';

const DECADE_TOLERANCE = 1e-9;

function isDecade(value: number): boolean {
	if (value === 0) {
		return true;
	}
	const exponent = Math.log10(Math.abs(value));
	return Math.abs(exponent - Math.round(exponent)) < DECADE_TOLERANCE;
}

/**
 * A log axis splits at every 1–9 × 10ⁿ; a line on each buries the data under
 * a mesh. Keeps the powers of ten (and 0, which a symmetric log can include).
 */
export const keepDecadeSplits: uPlot.Axis.Filter = (_u, splits) =>
	splits.map((split) => (split != null && isDecade(split) ? split : null));

const LOG_SPLIT_MULTIPLES = [1, 2, 5];

/**
 * Splits at 1, 2 and 5 × 10ⁿ inside the scale. uPlot's own log splits step
 * from the scale's minimum, so a range not snapped to a power of ten would
 * label 10.79, 21.58, … instead.
 */
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
			// Rounded through toPrecision so 0.1 × 3 noise can't fall outside [min, max].
			const split = Number((multiple * 10 ** exponent).toPrecision(12));
			if (split >= min && split <= max) {
				splits.push(split);
			}
		});
	}
	return splits;
};

/**
 * Labels for `logScaleSplits`: every power of ten, then any 2 or 5 that sits
 * at least `space` px from the labels already kept, so a range spanning under
 * one decade still reads at both ends.
 */
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
