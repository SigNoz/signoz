import type { PrecisionOption } from 'components/Graph/types';

import type { PanelThreshold } from '../../types/threshold';
import { resolveActiveThreshold } from '../../utils/evaluateThresholds';
import { formatPanelValue } from '../../utils/formatPanelValue';

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

export interface SizerContent {
	rank: string;
	label: string;
	value: string;
}

/**
 * The widest rank, label and value across all rows. The list renders only the rows
 * in view, so a hidden row carrying these keeps the shared columns from resizing as
 * rows scroll in and out.
 */
export function getSizerContent(
	rows: TopListRow[],
	unit?: string,
	precision?: PrecisionOption,
): SizerContent {
	const longest = (values: string[]): string =>
		values.reduce(
			(widest, value) => (value.length > widest.length ? value : widest),
			'',
		);
	return {
		rank: String(rows.length),
		label: longest(rows.map((row) => row.label)),
		value: longest(rows.map((row) => formatRowValue(row, unit, precision))),
	};
}
