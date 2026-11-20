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
import { parseAsString, useQueryStates } from 'nuqs';
import { SELECTED_SPAN_ID_PARAM } from 'pages/TraceDetailsV3/hooks/useSelectedSpanId';

import { OPEN_TRACE_COLUMN } from './openTraceColumn';
import type { SpanDrawerProps } from './SpanDrawer';
import { usePrefetchTraceSummary } from './usePrefetchTraceSummary';

type UseSpanDrawerResult = {
	tableProps: Pick<
		TracesTableProps,
		'onRowClick' | 'isRowActive' | 'activeRowIndex' | 'onRowHover'
	>;
	/** Leading column that opens the trace page. */
	openTraceColumn: TableColumnDef<TracesTableRow>;
	drawerProps: SpanDrawerProps;
	/** `onPointerDownCapture` for the area a press keeps the drawer open in. */
	onPressInside: (event: PointerEvent) => void;
};

// Long enough that a pointer crossing the list doesn't fetch every row it passes.
const HOVER_PREFETCH_DELAY_MS = 150;

// `spanId` is shared with the trace views (useSelectedSpanId); same options.
const spanDrawerParams = {
	traceId: parseAsString,
	[SELECTED_SPAN_ID_PARAM]: parseAsString,
};

export function useSpanDrawer(
	rows: TracesTableRow[],
	isListLoading = false,
): UseSpanDrawerResult {
	const [{ traceId, spanId }, setSpanDrawerParams] = useQueryStates(
		spanDrawerParams,
		{ shallow: false },
	);

	// The ids alone can't tell duplicate rows (a span stored twice) apart, so
	// navigation steps from the row it last opened while that row still matches.
	const [rowIndexHint, setRowIndexHint] = useState<number | null>(null);

	const activeRowIndex = useMemo(() => {
		if (!traceId || !spanId) {
			return -1;
		}
		const isOpenSpan = (row: TracesTableRow | undefined): boolean =>
			row?.trace_id === traceId && row?.span_id === spanId;
		if (rowIndexHint !== null && isOpenSpan(rows[rowIndexHint])) {
			return rowIndexHint;
		}
		return rows.findIndex(isOpenSpan);
	}, [rows, traceId, spanId, rowIndexHint]);

	const isRowActive = useCallback(
		(row: TracesTableRow): boolean => row === rows[activeRowIndex],
		[rows, activeRowIndex],
	);

	const openSpan = useCallback(
		(row: TracesTableRow, index: number): void => {
			setRowIndexHint(index);
			void setSpanDrawerParams({
				traceId: String(row.trace_id),
				spanId: String(row.span_id),
			});
		},
		[setSpanDrawerParams],
	);

	const openRow = useCallback(
		(row: TracesTableRow): void => openSpan(row, rows.indexOf(row)),
		[openSpan, rows],
	);

	const closeDrawer = useCallback((): void => {
		void setSpanDrawerParams({ traceId: null, spanId: null });
	}, [setSpanDrawerParams]);

	const isOpen = !!traceId && !!spanId;

	// A new query closes the drawer at once instead of waiting for its rows.
	const { stagedQuery } = useQueryBuilder();
	const queryId = stagedQuery?.id;
	const lastQueryIdRef = useRef(queryId);
	useEffect(() => {
		if (lastQueryIdRef.current && lastQueryIdRef.current !== queryId) {
			closeDrawer();
		}
		lastQueryIdRef.current = queryId;
	}, [queryId, closeDrawer]);

	const onPressInside = useCloseOnOutsidePress(isOpen, closeDrawer);

	// The span count decides the drawer's trace views, so it is fetched before a
	// row opens: on hover, and for the rows ↑/↓ lead to.
	const prefetchTraceSummary = usePrefetchTraceSummary();
	const hoverTimerRef = useRef<number>();
	const onRowHover = useCallback(
		(row: TracesTableRow): void => {
			window.clearTimeout(hoverTimerRef.current);
			hoverTimerRef.current = window.setTimeout(
				() => prefetchTraceSummary(String(row.trace_id)),
				HOVER_PREFETCH_DELAY_MS,
			);
		},
		[prefetchTraceSummary],
	);
	useEffect(() => (): void => window.clearTimeout(hoverTimerRef.current), []);

	useEffect(() => {
		if (activeRowIndex === -1) {
			return;
		}
		[rows[activeRowIndex - 1], rows[activeRowIndex + 1]].forEach((row) => {
			if (row && row.trace_id !== traceId) {
				prefetchTraceSummary(String(row.trace_id));
			}
		});
	}, [rows, activeRowIndex, traceId, prefetchTraceSummary]);

	const navigation = useRowNavigation({
		rows,
		activeIndex: activeRowIndex,
		onNavigate: openSpan,
	});

	return {
		tableProps: {
			onRowClick: openRow,
			isRowActive,
			activeRowIndex,
			onRowHover,
		},
		openTraceColumn: OPEN_TRACE_COLUMN,
		drawerProps: {
			traceId: isOpen ? traceId : null,
			spanId: isOpen ? spanId : null,
			onClose: closeDrawer,
			navigation: activeRowIndex === -1 ? null : navigation,
			seedRow: rows[activeRowIndex] ?? null,
			isListLoading,
		},
		onPressInside,
	};
}
