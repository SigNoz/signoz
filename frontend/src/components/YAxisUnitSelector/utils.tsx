import { UniversalYAxisUnitMappings, Y_AXIS_UNIT_NAMES } from './constants';
import { ADDITIONAL_Y_AXIS_CATEGORIES, BASE_Y_AXIS_CATEGORIES } from './data';
import {
	UniversalYAxisUnit,
	YAxisCategory,
	YAxisSource,
	YAxisUnit,
} from './types';

export const mapMetricUnitToUniversalUnit = (
	unit: string | undefined,
): UniversalYAxisUnit | null => {
	if (!unit) {
		return null;
	}

	const universalUnit = Object.values(UniversalYAxisUnit).find(
		(u) => UniversalYAxisUnitMappings[u]?.has(unit as YAxisUnit) || unit === u,
	);

	return universalUnit || (unit as UniversalYAxisUnit) || null;
};

export const getUniversalNameFromMetricUnit = (
	unit: string | undefined,
): string => {
	if (!unit) {
		return '-';
	}

	const universalUnit = mapMetricUnitToUniversalUnit(unit);
	if (!universalUnit) {
		return unit;
	}

	const universalName = Y_AXIS_UNIT_NAMES[universalUnit];

	return universalName || unit || '-';
};

export function isUniversalUnit(format: string): boolean {
	return Object.values(UniversalYAxisUnit).includes(
		format as UniversalYAxisUnit,
	);
}

export function mergeCategories(
	categories1: YAxisCategory[],
	categories2: YAxisCategory[],
): YAxisCategory[] {
	const mapOfCategories = new Map<string, YAxisCategory>();

	categories1.forEach((category) => {
		mapOfCategories.set(category.name, category);
	});

	categories2.forEach((category) => {
		if (mapOfCategories.has(category.name)) {
			mapOfCategories.set(category.name, {
				name: category.name,
				units: [
					...(mapOfCategories.get(category.name)?.units ?? []),
					...category.units,
				],
			});
		} else {
			mapOfCategories.set(category.name, category);
		}
	});

	return Array.from(mapOfCategories.values());
}

export function getYAxisCategories(source: YAxisSource): YAxisCategory[] {
	if (source !== YAxisSource.DASHBOARDS) {
		return BASE_Y_AXIS_CATEGORIES;
	}

	return mergeCategories(BASE_Y_AXIS_CATEGORIES, ADDITIONAL_Y_AXIS_CATEGORIES);
}
