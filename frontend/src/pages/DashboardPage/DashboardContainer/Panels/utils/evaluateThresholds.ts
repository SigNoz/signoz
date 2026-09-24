import {
	UniversalUnitToGrafanaUnit,
	YAxisCategoryNames,
} from 'components/YAxisUnitSelector/constants';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { getYAxisCategories } from 'components/YAxisUnitSelector/utils';
import { convertValue } from 'lib/getConvertedValue';

import type {
	PanelThreshold,
	ThresholdComparisonOperator,
} from '../types/threshold';

/**
 * Threshold evaluation for V2 panels — a self-contained port of the V1
 * `GridTableComponent`/`ValueGraph` logic, depending only on non-V1 primitives
 * (`convertValue`, the Y-axis unit catalog) so it never imports V1 surfaces.
 */

/** Resolves which unit category a unit id belongs to, or null if unknown. */
function getCategoryName(unitId: string): YAxisCategoryNames | null {
	const categories = getYAxisCategories(YAxisSource.DASHBOARDS);

	const foundCategory = categories.find((category) =>
		category.units.some((unit) => {
			// Category units use universal ids; panel/threshold units may use
			// Grafana-style ids. Match the universal id or its mapped Grafana id.
			if (unit.id === unitId) {
				return true;
			}
			return UniversalUnitToGrafanaUnit[unit.id] === unitId;
		}),
	);

	return foundCategory ? foundCategory.name : null;
}

/** Converts `value` between units; null when invalid (unknown, or different categories). */
function convertUnit(
	value: number,
	fromUnit?: string,
	toUnit?: string,
): number | null {
	if (!fromUnit || !toUnit) {
		return null;
	}

	const fromCategory = getCategoryName(fromUnit);
	const toCategory = getCategoryName(toUnit);

	if (!fromCategory || !toCategory || fromCategory !== toCategory) {
		return null;
	}

	return convertValue(value, fromUnit, toUnit);
}

function evaluateCondition(
	operator: ThresholdComparisonOperator | undefined,
	value: number,
	thresholdValue: number,
): boolean {
	switch (operator) {
		case '>':
			return value > thresholdValue;
		case '<':
			return value < thresholdValue;
		case '>=':
			return value >= thresholdValue;
		case '<=':
			return value <= thresholdValue;
		case '=':
			return value === thresholdValue;
		case '!=':
			return value !== thresholdValue;
		default:
			return false;
	}
}

/**
 * Whether `value` (in `panelUnit`) satisfies `threshold`. Converts into the
 * threshold's unit before comparing; falls back to the raw value if invalid.
 */
export function doesValueMatchThreshold(
	value: number,
	threshold: PanelThreshold,
	panelUnit?: string,
): boolean {
	if (threshold.operator === undefined) {
		return false;
	}

	const convertedValue = convertUnit(value, panelUnit, threshold.unit);
	const comparable = convertedValue ?? value;

	return evaluateCondition(threshold.operator, comparable, threshold.value);
}

export interface ActiveThreshold {
	/** The matched threshold to apply, or null when none match. */
	threshold: PanelThreshold | null;
	/** True when more than one threshold matched the value. */
	isConflicting: boolean;
}

/**
 * Resolves the threshold to apply for `value`. Earliest-declared match wins
 * (V1 precedence); more than one match flags a conflict.
 */
export function resolveActiveThreshold(
	thresholds: PanelThreshold[],
	value: number,
	panelUnit?: string,
): ActiveThreshold {
	const matching = thresholds.filter((threshold) =>
		doesValueMatchThreshold(value, threshold, panelUnit),
	);

	if (matching.length === 0) {
		return { threshold: null, isConflicting: false };
	}

	const highestPrecedence = matching.reduce((winner, candidate) =>
		thresholds.indexOf(candidate) < thresholds.indexOf(winner)
			? candidate
			: winner,
	);

	return { threshold: highestPrecedence, isConflicting: matching.length > 1 };
}
