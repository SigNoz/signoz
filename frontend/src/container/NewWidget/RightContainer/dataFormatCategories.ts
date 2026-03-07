import {
	UniversalUnitToGrafanaUnit,
	YAxisCategoryNames,
} from 'components/YAxisUnitSelector/constants';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { getYAxisCategories } from 'components/YAxisUnitSelector/utils';
import { convertValue } from 'lib/getConvertedValue';

// Function to get the category name for a given unit ID (Grafana or universal)
export const getCategoryName = (unitId: string): YAxisCategoryNames | null => {
	const categories = getYAxisCategories(YAxisSource.DASHBOARDS);

	const foundCategory = categories.find((category) =>
		category.units.some((unit) => {
			// Units in Y-axis categories use universal unit IDs.
			// Thresholds / column units often use Grafana-style IDs.
			// Treat a unit as matching if either:
			// - it is already the universal ID, or
			// - it matches the mapped Grafana ID for that universal unit.
			if (unit.id === unitId) {
				return true;
			}

			const grafanaId = UniversalUnitToGrafanaUnit[unit.id];
			return grafanaId === unitId;
		}),
	);

	return foundCategory ? foundCategory.name : null;
};

// Function to convert a value from one unit to another
export function convertUnit(
	value: number,
	fromUnitId?: string,
	toUnitId?: string,
): number | null {
	if (!fromUnitId || !toUnitId) {
		return null;
	}

	const fromCategory = getCategoryName(fromUnitId);
	const toCategory = getCategoryName(toUnitId);

	// If either unit is unknown or the categories don't match, the conversion is invalid
	if (!fromCategory || !toCategory || fromCategory !== toCategory) {
		return null;
	}

	// Delegate the actual numeric conversion (or identity) to the shared helper,
	// which understands both Grafana-style and universal unit IDs.
	return convertValue(value, fromUnitId, toUnitId);
}
