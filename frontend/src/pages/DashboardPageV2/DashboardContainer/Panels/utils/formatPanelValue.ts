import type { PrecisionOption } from 'components/Graph/types';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';

/**
 * Formats a scalar for display in a V2 panel, honoring the configured decimal
 * precision. The shared, unit-aware `getYAxisFormattedValue` is the single
 * formatting helper across V2 panels (number/table/list/pie); this wrapper is
 * the only seam through which panels touch it.
 *
 * Precision is applied REGARDLESS of whether a unit is set. When no unit is
 * configured we format through the `'none'` unit, which still respects
 * precision — this is the fix for decimal precision being silently dropped on
 * unitless panels (the old `unit ? format() : value.toString()` gate threw the
 * precision away whenever the unit was empty).
 */
export function formatPanelValue(
	value: number,
	unit?: string,
	precision?: PrecisionOption,
): string {
	return getYAxisFormattedValue(String(value), unit || 'none', precision);
}
