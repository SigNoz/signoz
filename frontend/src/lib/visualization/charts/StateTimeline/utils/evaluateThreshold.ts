import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas';

export interface ThresholdEvalResult {
	color: string;
	label?: string;
}

/**
 * Band semantics for label thresholds (no operator): a value takes the color of
 * the highest threshold whose `value` is `<= value`. Thresholds are sorted
 * ascending by `value` and scanned from the top, so the first threshold at or
 * below the point wins. This mirrors how discrete state timelines colour
 * segments (e.g. `{0: red "Fail"}`, `{1: green "Pass"}` → 0 → red, 1 → green).
 *
 * `null`/`NaN` values (gaps) fall back to `defaultColor` with no label.
 */
export function evaluateThreshold(
	value: number | null,
	thresholds: DashboardtypesThresholdWithLabelDTO[],
	defaultColor: string,
): ThresholdEvalResult {
	if (value === null || Number.isNaN(value)) {
		return { color: defaultColor };
	}

	// Ascending by value; scanning from the highest threshold at or below the
	// point gives "largest threshold <= value wins" without mutating the input.
	const sorted = [...thresholds].sort((a, b) => a.value - b.value);

	for (let i = sorted.length - 1; i >= 0; i--) {
		const threshold = sorted[i];
		if (value >= threshold.value) {
			return {
				color: threshold.color,
				label: threshold.label,
			};
		}
	}

	return { color: defaultColor };
}
