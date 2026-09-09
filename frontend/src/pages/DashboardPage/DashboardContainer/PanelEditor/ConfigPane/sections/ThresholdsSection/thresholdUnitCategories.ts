import {
	type YAxisCategory,
	YAxisSource,
} from 'components/YAxisUnitSelector/types';
import {
	getYAxisCategories,
	mapMetricUnitToUniversalUnit,
} from 'components/YAxisUnitSelector/utils';

// The unit category (Time, Data, …) a unit belongs to, or undefined if unrecognized.
function categoryForUnit(unit: string): YAxisCategory | undefined {
	const universal = mapMetricUnitToUniversalUnit(unit);
	return getYAxisCategories(YAxisSource.DASHBOARDS).find((c) =>
		c.units.some((u) => u.id === universal),
	);
}

/**
 * Restricts the threshold unit picker to the panel's y-axis unit family, mirroring V1:
 * a threshold is only meaningfully comparable to the axis when it shares its category
 * (e.g. an `ms` axis → only Time units). Returns the single matching category, or
 * `undefined` (all categories) when the panel has no unit set or it can't be mapped.
 */
export function thresholdUnitCategories(
	yAxisUnit: string | undefined,
): YAxisCategory[] | undefined {
	if (!yAxisUnit) {
		return undefined;
	}
	const category = categoryForUnit(yAxisUnit);
	return category ? [category] : undefined;
}

/**
 * True when a threshold's unit belongs to a different category than the panel's y-axis
 * unit (so the values can't be compared) — drives the V1-style mismatch message. Only
 * flags when both units are set and resolve to distinct categories (e.g. a stale `ms`
 * threshold left over after the axis unit was changed to bytes).
 */
export function isThresholdUnitIncompatible(
	thresholdUnit: string | undefined,
	yAxisUnit: string | undefined,
): boolean {
	if (!thresholdUnit || !yAxisUnit) {
		return false;
	}
	const thresholdCategory = categoryForUnit(thresholdUnit);
	const axisCategory = categoryForUnit(yAxisUnit);
	return Boolean(
		thresholdCategory &&
		axisCategory &&
		thresholdCategory.name !== axisCategory.name,
	);
}
