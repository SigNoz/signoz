import type { PrecisionOption } from 'components/Graph/types';

import type { PanelThreshold } from '../../types/threshold';
import { resolveActiveThreshold } from '../../utils/evaluateThresholds';
import { formatPanelValue } from '../../utils/formatPanelValue';

import {
	DEFAULT_ROW_HEIGHT,
	LIST_PADDING_Y,
	ROW_GAP,
	ROW_HEIGHTS,
} from './constants';
import type { TopListRow } from './types';

export const ACCENT_COLOR = 'var(--bg-robin-500)';

const NO_VALUE = '—';

export interface RowColors {
	barColor?: string;
	valueColor?: string;
}

/** A matching threshold recolours the bar (`background` format) or the value (`text`). */
export function resolveRowColors(
	value: number | null,
	thresholds: PanelThreshold[],
	unit?: string,
): RowColors {
	if (value === null || thresholds.length === 0) {
		return {};
	}
	const { threshold } = resolveActiveThreshold(thresholds, value, unit);
	if (!threshold) {
		return {};
	}
	return threshold.format === 'background'
		? { barColor: threshold.color }
		: { valueColor: threshold.color };
}

/** Non-numeric cells ("NaN", "n/a") are shown as the server sent them. */
export function formatRowValue(
	row: TopListRow,
	unit?: string,
	precision?: PrecisionOption,
): string {
	if (row.value !== null) {
		return formatPanelValue(row.value, unit, precision);
	}
	if (typeof row.rawValue === 'string' && row.rawValue !== '') {
		return row.rawValue;
	}
	return NO_VALUE;
}

/** The row a navigation key moves focus to, or null when the key isn't one or the move leaves the list. */
export function getNavigationTarget(
	index: number,
	key: string,
	count: number,
): number | null {
	const targets: Record<string, number> = {
		ArrowDown: index + 1,
		ArrowUp: index - 1,
		Home: 0,
		End: count - 1,
	};
	const target = targets[key];
	return target === undefined || target < 0 || target >= count ? null : target;
}

/**
 * The widest formatted value across all rows. The list renders only the rows in view,
 * so a hidden row carrying it keeps the value column from resizing as rows scroll in
 * and out.
 */
export function getWidestValue(
	rows: TopListRow[],
	unit?: string,
	precision?: PrecisionOption,
): string {
	return rows
		.map((row) => formatRowValue(row, unit, precision))
		.reduce(
			(widest, value) => (value.length > widest.length ? value : widest),
			'',
		);
}

/** The roomiest row height at which every row fits; compact when none does. */
export function getRowHeight(count: number, availableHeight: number): number {
	if (availableHeight <= 0) {
		return DEFAULT_ROW_HEIGHT;
	}
	const fits = (rowHeight: number): boolean =>
		count * rowHeight + Math.max(count - 1, 0) * ROW_GAP + LIST_PADDING_Y <=
		availableHeight;
	return ROW_HEIGHTS.find(fits) ?? ROW_HEIGHTS[ROW_HEIGHTS.length - 1];
}
