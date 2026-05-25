import { useMemo } from 'react';
import type { ExpandedState, Row } from '@tanstack/react-table';

import { FlatItem } from './types';

export interface UseFlatItemsOptions<TData> {
	tableRows: Row<TData>[];
	/** Whether row expansion is enabled, needs to be unknown since it will be a function that can be updated/modified, boolean does not work well here */
	renderExpandedRow?: unknown;
	expanded: ExpandedState;
	/** Index of the active row (for scroll-to behavior) */
	activeRowIndex?: number;
}

export interface UseFlatItemsResult<TData> {
	flatItems: FlatItem<TData>[];
	/** Index of active row in flatItems (-1 if not found) */
	flatIndexForActiveRow: number;
}

/**
 * Flattens table rows with their expansion rows into a single list.
 *
 * When a row is expanded, an expansion item is inserted immediately after it.
 * Also computes the flat index for the active row (used for scroll-to).
 */
export function useFlatItems<TData>({
	tableRows,
	renderExpandedRow,
	expanded,
	activeRowIndex,
}: UseFlatItemsOptions<TData>): UseFlatItemsResult<TData> {
	const flatItems = useMemo<FlatItem<TData>[]>(() => {
		const result: FlatItem<TData>[] = [];
		for (const row of tableRows) {
			result.push({ kind: 'row', row });
			if (renderExpandedRow && row.getIsExpanded()) {
				result.push({ kind: 'expansion', row });
			}
		}
		return result;
		// expanded needs to be here, otherwise the rows are not updated when you click to expand
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tableRows, renderExpandedRow, expanded]);

	const flatIndexForActiveRow = useMemo(() => {
		if (activeRowIndex == null || activeRowIndex < 0) {
			return -1;
		}
		for (let i = 0; i < flatItems.length; i++) {
			const item = flatItems[i];
			if (item.kind === 'row' && item.row.index === activeRowIndex) {
				return i;
			}
		}
		return -1;
	}, [activeRowIndex, flatItems]);

	return { flatItems, flatIndexForActiveRow };
}
