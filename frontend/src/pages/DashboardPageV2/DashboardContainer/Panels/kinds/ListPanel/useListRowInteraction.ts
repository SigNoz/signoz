import { HTMLAttributes, useCallback, useMemo } from 'react';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { VIEW_TYPES, type VIEWS } from 'components/LogDetail/constants';
import { getTraceLink } from 'container/TracesExplorer/ListView/utils';
import useLogDetailHandlers from 'hooks/logs/useLogDetailHandlers';
import history from 'lib/history';
import type { RowData } from 'lib/query/createTableColumnsFromQuery';
import type { ILog } from 'types/api/logs/log';
import { openInNewTab } from 'utils/navigation';

import type { RawTableRow } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareRawTable';

import { rawRowToILog } from './rawRowToILog';

/** Drawer state surfaced to the renderer when the panel shows logs. */
export interface ListLogDetail {
	activeLog: ILog | null;
	selectedTab: VIEWS;
	logs: ILog[];
	onClose: () => void;
	onAddToQuery: ReturnType<typeof useLogDetailHandlers>['onAddToQuery'];
	onNavigateLog: (log: ILog) => void;
}

interface UseListRowInteractionArgs {
	/** Telemetry signal of the panel's first builder query (logs vs traces). */
	signal: TelemetrytypesSignalDTO;
	/** Current page rows, mapped to `ILog[]` for log-detail navigation. */
	rows: RawTableRow[];
}

interface UseListRowInteractionResult {
	/** antd `onRow` handler: opens the log drawer or navigates to a trace. */
	onRow: (row: RawTableRow) => HTMLAttributes<HTMLElement>;
	/** Log-drawer state — `null` for non-log panels (renderer skips the drawer). */
	logDetail: ListLogDetail | null;
}

/**
 * Signal-aware row interaction for the List panel, reusing the shared surfaces:
 * a `logs` panel opens the `LogDetail` drawer (with prev/next navigation and
 * add-to-query), a `traces` panel navigates to the trace detail page
 * (⌘/Ctrl-click → new tab). Mirrors V1's Logs/Traces list components.
 */
export function useListRowInteraction({
	signal,
	rows,
}: UseListRowInteractionArgs): UseListRowInteractionResult {
	const isLogs = signal === TelemetrytypesSignalDTO.logs;
	const isTraces = signal === TelemetrytypesSignalDTO.traces;

	const {
		activeLog,
		onAddToQuery,
		selectedTab,
		handleSetActiveLog,
		handleCloseLogDetail,
	} = useLogDetailHandlers();

	const logs = useMemo(
		() => (isLogs ? rows.map(rawRowToILog) : []),
		[isLogs, rows],
	);

	const onRow = useCallback(
		(row: RawTableRow): HTMLAttributes<HTMLElement> => ({
			onClick: (event): void => {
				if (isTraces) {
					const link = getTraceLink(row as unknown as RowData);
					if (event.metaKey || event.ctrlKey) {
						openInNewTab(link);
					} else {
						history.push(link);
					}
					return;
				}
				if (isLogs) {
					handleSetActiveLog(rawRowToILog(row));
				}
			},
		}),
		[isLogs, isTraces, handleSetActiveLog],
	);

	const logDetail = useMemo<ListLogDetail | null>(
		() =>
			isLogs
				? {
						activeLog,
						selectedTab: selectedTab ?? VIEW_TYPES.OVERVIEW,
						logs,
						onClose: handleCloseLogDetail,
						onAddToQuery,
						onNavigateLog: handleSetActiveLog,
					}
				: null,
		[
			isLogs,
			activeLog,
			selectedTab,
			logs,
			handleCloseLogDetail,
			onAddToQuery,
			handleSetActiveLog,
		],
	);

	return { onRow, logDetail };
}
