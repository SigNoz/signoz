import { cloneElement, isValidElement, ReactElement } from 'react';
import { ColumnTypeRender } from 'components/Logs/TableView/types';

import { OrderedColumn } from './types';

export const getColumnId = (column: OrderedColumn): string =>
	String(column.key);

/** Browser default root font size; TanStack column sizing uses px. */
const REM_PX = 16;
const MIN_WIDTH_OTHER_REM = 12;
const MIN_WIDTH_BODY_REM = 40;

/** When total column count is below this, body column min width is doubled (more horizontal space for few columns). */
export const FEW_COLUMNS_BODY_MIN_WIDTH_THRESHOLD = 4;

/**
 * Minimum width (px) for TanStack column defs + colgroup.
 * Design: state/expand 32px; body min 40rem (doubled when fewer than
 * {@link FEW_COLUMNS_BODY_MIN_WIDTH_THRESHOLD} total columns); other columns use rem→px (16px root).
 */
export const getColumnMinWidthPx = (
	column: OrderedColumn,
	orderedColumns?: OrderedColumn[],
): number => {
	const key = String(column.key);
	if (key === 'state-indicator' || key === 'expand') {
		return 32;
	}
	if (key === 'body') {
		const base = MIN_WIDTH_BODY_REM * REM_PX;
		const fewColumns =
			orderedColumns != null &&
			orderedColumns.length < FEW_COLUMNS_BODY_MIN_WIDTH_THRESHOLD;
		return fewColumns ? base * 1.5 : base;
	}
	return MIN_WIDTH_OTHER_REM * REM_PX;
};

export const resolveColumnTypeRender = (
	rendered: ColumnTypeRender<Record<string, unknown>>,
): ReactElement | string | number | null => {
	if (
		rendered &&
		typeof rendered === 'object' &&
		'children' in rendered &&
		isValidElement(rendered.children)
	) {
		const { children, props } = rendered as {
			children: ReactElement;
			props?: Record<string, unknown>;
		};
		return cloneElement(children, props || {});
	}
	if (rendered && typeof rendered === 'object' && isValidElement(rendered)) {
		return rendered;
	}
	return typeof rendered === 'string' || typeof rendered === 'number'
		? rendered
		: null;
};
