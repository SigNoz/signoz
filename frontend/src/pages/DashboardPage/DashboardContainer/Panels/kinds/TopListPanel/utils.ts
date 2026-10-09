import type { PrecisionOption } from 'components/Graph/types';
import type { TooltipCardRow } from 'lib/uPlotV2/components/Tooltip/components/TooltipCard/TooltipCard';

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

/** Under 10% to one decimal, whole percents above; a nonzero share never reads as 0%. */
export function formatShare(share: number | null): string {
	if (share === null) {
		return NO_VALUE;
	}
	const percent = share * 100;
	if (percent > 0 && percent < 0.1) {
		return '<0.1%';
	}
	return `${percent < 10 ? Number(percent.toFixed(1)) : Math.round(percent)}%`;
}

interface TooltipContentOptions {
	valueName: string;
	unit?: string;
	precision?: PrecisionOption;
	showShare: boolean;
}

/**
 * The value and, when shown, the share; then the group values behind the label, unless
 * the label is the lone group value already.
 */
export function getTooltipContent(
	row: TopListRow,
	{ valueName, unit, precision, showShare }: TooltipContentOptions,
): { rows: TooltipCardRow[]; mutedRows: TooltipCardRow[] } {
	const rows: TooltipCardRow[] = [
		{
			key: 'value',
			label: valueName,
			value: formatRowValue(row, unit, precision),
		},
	];
	if (showShare && row.share !== null) {
		rows.push({
			key: 'share',
			label: 'Share of listed total',
			value: formatShare(row.share),
		});
	}

	const groups = Object.entries(row.labels);
	const isLabelTheGroup = groups.length === 1 && groups[0][1] === row.label;
	return {
		rows,
		mutedRows: isLabelTheGroup
			? []
			: groups.map(([key, value]) => ({ key, label: key, value })),
	};
}

const ELLIPSIS = '…';

/**
 * Cuts the middle out of `text` so it fits `maxWidth`, keeping both ends: with
 * multi-key labels and paths, the tail often tells rows apart.
 */
export function truncateMiddle(
	text: string,
	maxWidth: number,
	measure: (value: string) => number,
): string {
	if (measure(text) <= maxWidth) {
		return text;
	}
	const fit = (kept: number): string =>
		text.slice(0, Math.ceil(kept / 2)) +
		ELLIPSIS +
		text.slice(text.length - Math.floor(kept / 2));
	let low = 0;
	let high = text.length - 1;
	while (low < high) {
		const mid = Math.ceil((low + high) / 2);
		if (measure(fit(mid)) <= maxWidth) {
			low = mid;
		} else {
			high = mid - 1;
		}
	}
	return fit(low);
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

const longest = (values: string[]): string =>
	values.reduce(
		(widest, value) => (value.length > widest.length ? value : widest),
		'',
	);

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
	return longest(rows.map((row) => formatRowValue(row, unit, precision)));
}

/** The widest share across all rows, for the same reason as `getWidestValue`. */
export function getWidestShare(rows: TopListRow[]): string {
	return longest(rows.map((row) => formatShare(row.share)));
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
