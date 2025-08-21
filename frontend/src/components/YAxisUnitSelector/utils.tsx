import { UniversalYAxisUnitMappings, Y_AXIS_UNIT_NAMES } from './constants';
import { UniversalYAxisUnit, YAxisUnit } from './types';

export const mapMetricUnitToUniversalUnit = (
	unit: string | undefined,
): UniversalYAxisUnit | null => {
	if (!unit) {
		return null;
	}

	const universalUnit = Object.values(UniversalYAxisUnit).find(
		(u) => UniversalYAxisUnitMappings[u].has(unit as YAxisUnit) || unit === u,
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
