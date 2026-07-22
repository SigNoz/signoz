import type { PrecisionOption } from 'components/Graph/types';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';

/**
 * Formats a scalar for display in a V2 panel, honoring decimal precision. The
 * single seam through which panels touch `getYAxisFormattedValue`. Unitless
 * values format through the `'none'` unit, which still respects precision — so
 * precision isn't silently dropped when no unit is set.
 */
export function formatPanelValue(
	value: number,
	unit?: string,
	precision?: PrecisionOption,
): string {
	return getYAxisFormattedValue(String(value), unit || 'none', precision);
}
