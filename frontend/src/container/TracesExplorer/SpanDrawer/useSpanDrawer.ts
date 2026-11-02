import { PointerEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRowNavigation } from 'components/TanStackTableView/useRowNavigation';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import type { TracesTableProps } from 'container/TracesExplorer/TracesTable/TracesTable';
import { useCloseOnOutsidePress } from 'hooks/useCloseOnOutsidePress';

import type { SpanDrawerProps } from './SpanDrawer';
import { isSpanDrawerEnabled } from './utils';

type ActiveSpan = { id: string; index: number };

type UseSpanDrawerResult = {
	tableProps: Pick<
		TracesTableProps,
		'onRowClick' | 'isRowActive' | 'activeRowIndex'
	>;
	/** Null while the drawer flag is off. */
	drawerProps: SpanDrawerProps | null;
	/** `onPointerDownCapture` for the area a press keeps the drawer open in. */
	onPressInside: (event: PointerEvent) => void;
};

export function useSpanDrawer(rows: TracesTableRow[]): UseSpanDrawerResult {
	const [isEnabled] = useState(isSpanDrawerEnabled);
	// The index lets navigation step past a duplicate span; the id survives a refetch.
	const [activeSpan, setActiveSpan] = useState<ActiveSpan | null>(null);

	const activeRowIndex = useMemo(() => {
		if (!activeSpan) {
			return -1;
		}
		return rows[activeSpan.index]?.id === activeSpan.id
			? activeSpan.index
			: rows.findIndex((row) => row.id === activeSpan.id);
	}, [rows, activeSpan]);

	const isRowActive = useCallback(
		(row: TracesTableRow): boolean => row === rows[activeRowIndex],
		[rows, activeRowIndex],
	);

	const handleNavigate = useCallback(
		(row: TracesTableRow, index: number): void => {
			setActiveSpan({ id: row.id, index });
		},
		[],
	);

	const selectRow = useCallback(
		(row: TracesTableRow): void => handleNavigate(row, rows.indexOf(row)),
		[handleNavigate, rows],
	);

	const clearActiveSpan = useCallback((): void => setActiveSpan(null), []);

	// A refetch can drop the open span; forget it so a later page can't reopen it.
	useEffect(() => {
		if (activeSpan && activeRowIndex === -1) {
			setActiveSpan(null);
		}
	}, [activeSpan, activeRowIndex]);

	const onPressInside = useCloseOnOutsidePress(
		isEnabled && activeRowIndex !== -1,
		clearActiveSpan,
	);

	const navigation = useRowNavigation({
		rows,
		activeIndex: activeRowIndex,
		onNavigate: handleNavigate,
	});

	if (!isEnabled) {
		return { tableProps: {}, drawerProps: null, onPressInside };
	}

	return {
		tableProps: { onRowClick: selectRow, isRowActive, activeRowIndex },
		drawerProps: {
			row: rows[activeRowIndex] ?? null,
			onClose: clearActiveSpan,
			navigation,
		},
		onPressInside,
	};
}
