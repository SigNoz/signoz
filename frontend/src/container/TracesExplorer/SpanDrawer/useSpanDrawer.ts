import {
	PointerEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { useRowNavigation } from 'components/TanStackTableView/useRowNavigation';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import type { TracesTableProps } from 'container/TracesExplorer/TracesTable/TracesTable';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useCloseOnOutsidePress } from 'hooks/useCloseOnOutsidePress';

import { OPEN_TRACE_COLUMN } from './openTraceColumn';
import type { SpanDrawerProps } from './SpanDrawer';

type ActiveSpan = { id: string; index: number };

type UseSpanDrawerResult = {
	tableProps: Pick<
		TracesTableProps,
		'onRowClick' | 'isRowActive' | 'activeRowIndex'
	>;
	/** Leading column that opens the trace page. */
	openTraceColumn: TableColumnDef<TracesTableRow>;
	drawerProps: SpanDrawerProps;
	/** `onPointerDownCapture` for the area a press keeps the drawer open in. */
	onPressInside: (event: PointerEvent) => void;
};

export function useSpanDrawer(rows: TracesTableRow[]): UseSpanDrawerResult {
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

	// A new query closes the drawer at once instead of waiting for its rows.
	const { stagedQuery } = useQueryBuilder();
	const queryId = stagedQuery?.id;
	const lastQueryIdRef = useRef(queryId);
	useEffect(() => {
		if (lastQueryIdRef.current && lastQueryIdRef.current !== queryId) {
			setActiveSpan(null);
		}
		lastQueryIdRef.current = queryId;
	}, [queryId]);

	const onPressInside = useCloseOnOutsidePress(
		activeRowIndex !== -1,
		clearActiveSpan,
	);

	const navigation = useRowNavigation({
		rows,
		activeIndex: activeRowIndex,
		onNavigate: handleNavigate,
	});

	return {
		tableProps: {
			onRowClick: selectRow,
			isRowActive,
			activeRowIndex,
		},
		openTraceColumn: OPEN_TRACE_COLUMN,
		drawerProps: {
			row: rows[activeRowIndex] ?? null,
			onClose: clearActiveSpan,
			navigation,
		},
		onPressInside,
	};
}
