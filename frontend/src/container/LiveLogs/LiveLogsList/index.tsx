import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { toast } from '@signozhq/ui/sonner';
import { Card } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import ListLogView from 'components/Logs/ListLogView';
import LogLinesActionButtons from 'components/Logs/LogLinesActionButtons/LogLinesActionButtons';
import { getRowBackgroundColor } from 'components/Logs/LogStateIndicator/getRowBackgroundColor';
import { getLogIndicatorType } from 'components/Logs/LogStateIndicator/utils';
import RawLogView from 'components/Logs/RawLogView';
import { useLogsTableColumns } from 'components/Logs/TableView/useLogsTableColumns';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import type { TanStackTableHandle } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { useHiddenColumnIds } from 'components/TanStackTableView/useColumnStore';
import { CARD_BODY_STYLE } from 'constants/card';
import { LOCALSTORAGE } from 'constants/localStorage';
import { OptionFormatTypes } from 'constants/optionsFormatTypes';
import { QueryParams } from 'constants/query';
import { InfinityWrapperStyled } from 'container/LogsExplorerList/styles';
import { convertKeysToColumnFields } from 'container/LogsExplorerList/utils';
import { useOptionsMenu } from 'container/OptionsMenu';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import useLogDetailHandlers from 'hooks/logs/useLogDetailHandlers';
import useScrollToLog from 'hooks/logs/useScrollToLog';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useEventSource } from 'providers/EventSource';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
// interfaces
import { ILog } from 'types/api/logs/log';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import loadingPlaneUrl from '@/assets/Icons/loading-plane.gif';
import { getAbsoluteUrl } from 'utils/basePath';

import { LiveLogsListProps } from './types';

import './LiveLogsList.styles.scss';

function LiveLogsList({
	logs,
	isLoading,
	handleChangeSelectedView,
}: LiveLogsListProps): JSX.Element {
	const ref = useRef<TanStackTableHandle | VirtuosoHandle | null>(null);
	const [, setCopy] = useCopyToClipboard();
	const isDarkMode = useIsDarkMode();

	const { isConnectionLoading } = useEventSource();

	const { activeLogId } = useCopyLogLink();
	const { logs: logsPreferences } = usePreferenceContext();
	const hiddenColumnIds = useHiddenColumnIds(LOCALSTORAGE.LOGS_LIST_COLUMNS);
	const hasReconciledHiddenColumnsRef = useRef(false);

	const {
		activeLog,
		onAddToQuery,
		selectedTab,
		handleSetActiveLog,
		handleCloseLogDetail,
	} = useLogDetailHandlers();

	// get only data from the logs object
	const formattedLogs: ILog[] = useMemo(
		() => logs.map((log) => log?.data).flat(),
		[logs],
	);

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator: StringOperators.NOOP,
	});

	const activeLogIndex = useMemo(
		() => formattedLogs.findIndex(({ id }) => id === activeLogId),
		[formattedLogs, activeLogId],
	);

	const selectedFields = convertKeysToColumnFields([
		...defaultLogsSelectedColumns,
		...options.selectColumns,
	]);

	const syncedSelectedColumns = useMemo(
		() =>
			options.selectColumns.filter(({ name }) => !hiddenColumnIds.includes(name)),
		[options.selectColumns, hiddenColumnIds],
	);

	const logsColumns = useLogsTableColumns({
		fields: selectedFields,
		fontSize: options.fontSize,
		appendTo: 'end',
	});

	useEffect(() => {
		if (hasReconciledHiddenColumnsRef.current) {
			return;
		}

		hasReconciledHiddenColumnsRef.current = true;

		if (syncedSelectedColumns.length === options.selectColumns.length) {
			return;
		}

		logsPreferences.updateColumns(syncedSelectedColumns);
	}, [logsPreferences, options.selectColumns.length, syncedSelectedColumns]);

	const handleColumnRemove = useCallback(
		(columnId: string) => {
			const updatedColumns = options.selectColumns.filter(
				({ name }) => name !== columnId,
			);
			logsPreferences.updateColumns(updatedColumns);
		},
		[options.selectColumns, logsPreferences],
	);

	const makeOnLogCopy = useCallback(
		(log: ILog) =>
			(event: MouseEvent<HTMLElement>): void => {
				event.preventDefault();
				event.stopPropagation();
				const urlQuery = new URLSearchParams(window.location.search);
				urlQuery.delete(QueryParams.activeLogId);
				urlQuery.delete(QueryParams.relativeTime);
				urlQuery.set(QueryParams.activeLogId, `"${log.id}"`);
				const link = getAbsoluteUrl(
					`${window.location.pathname}?${urlQuery.toString()}`,
				);
				setCopy(link);
				toast.success('Copied to clipboard', { position: 'top-right' });
			},
		[setCopy],
	);

	const handleScrollToLog = useScrollToLog({
		logs: formattedLogs,
		virtuosoRef: ref as React.RefObject<Pick<
			VirtuosoHandle,
			'scrollToIndex'
		> | null>,
	});

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => {
			if (options.format === 'raw') {
				return (
					<div key={log.id}>
						<RawLogView
							data={log}
							isActiveLog={activeLog?.id === log.id}
							linesPerRow={options.maxLines}
							selectedFields={selectedFields}
							fontSize={options.fontSize}
							handleChangeSelectedView={handleChangeSelectedView}
							onSetActiveLog={handleSetActiveLog}
							onClearActiveLog={handleCloseLogDetail}
						/>
					</div>
				);
			}

			return (
				<div key={log.id}>
					<ListLogView
						logData={log}
						isActiveLog={activeLog?.id === log.id}
						selectedFields={selectedFields}
						linesPerRow={options.maxLines}
						onAddToQuery={onAddToQuery}
						onSetActiveLog={handleSetActiveLog}
						onClearActiveLog={handleCloseLogDetail}
						fontSize={options.fontSize}
						handleChangeSelectedView={handleChangeSelectedView}
					/>
				</div>
			);
		},
		[
			options.format,
			options.maxLines,
			options.fontSize,
			activeLog?.id,
			selectedFields,
			onAddToQuery,
			handleSetActiveLog,
			handleCloseLogDetail,
			handleChangeSelectedView,
		],
	);

	useEffect(() => {
		if (!activeLogId || activeLogIndex < 0) {
			return;
		}

		ref?.current?.scrollToIndex({
			index: activeLogIndex,
			align: 'start',
			behavior: 'smooth',
		});
	}, [activeLogId, activeLogIndex]);

	const isLoadingList = isConnectionLoading && formattedLogs.length === 0;

	const renderLoading = useCallback(
		() => (
			<div className="live-logs-list-loading">
				<div className="loading-live-logs-content">
					<img className="loading-gif" src={loadingPlaneUrl} alt="wait-icon" />

					<Typography>Fetching live logs...</Typography>
				</div>
			</div>
		),
		[],
	);

	return (
		<div className="live-logs-list">
			{(formattedLogs.length === 0 || isLoading || isLoadingList) &&
				renderLoading()}

			{formattedLogs.length !== 0 && (
				<InfinityWrapperStyled>
					{options.format === OptionFormatTypes.TABLE ? (
						<TanStackTable<ILog>
							ref={ref as React.Ref<TanStackTableHandle>}
							columns={logsColumns}
							columnStorageKey={LOCALSTORAGE.LOGS_LIST_COLUMNS}
							onColumnRemove={handleColumnRemove}
							plainTextCellLineClamp={options.maxLines}
							cellTypographySize={options.fontSize}
							data={formattedLogs}
							isLoading={false}
							isRowActive={(log): boolean => log.id === activeLog?.id}
							getRowStyle={(log): CSSProperties =>
								({
									'--row-active-bg': getRowBackgroundColor(
										isDarkMode,
										getLogIndicatorType(log),
									),
									'--row-hover-bg': getRowBackgroundColor(
										isDarkMode,
										getLogIndicatorType(log),
									),
								}) as CSSProperties
							}
							onRowClick={(log): void => {
								handleSetActiveLog(log);
							}}
							onRowDeactivate={handleCloseLogDetail}
							activeRowIndex={activeLogIndex}
							renderRowActions={(log): ReactNode => (
								<LogLinesActionButtons
									handleShowContext={(e): void => {
										e.preventDefault();
										e.stopPropagation();
										handleSetActiveLog(log, VIEW_TYPES.CONTEXT);
									}}
									onLogCopy={makeOnLogCopy(log)}
								/>
							)}
						/>
					) : (
						<Card style={{ width: '100%' }} bodyStyle={CARD_BODY_STYLE}>
							<OverlayScrollbar isVirtuoso>
								<Virtuoso
									ref={ref as React.Ref<VirtuosoHandle>}
									initialTopMostItemIndex={activeLogIndex !== -1 ? activeLogIndex : 0}
									data={formattedLogs}
									totalCount={formattedLogs.length}
									itemContent={getItemContent}
								/>
							</OverlayScrollbar>
						</Card>
					)}
				</InfinityWrapperStyled>
			)}

			{activeLog && selectedTab && (
				<LogDetail
					selectedTab={selectedTab}
					log={activeLog}
					onClose={handleCloseLogDetail}
					onAddToQuery={onAddToQuery}
					onClickActionItem={onAddToQuery}
					handleChangeSelectedView={handleChangeSelectedView}
					logs={formattedLogs}
					onNavigateLog={handleSetActiveLog}
					onScrollToLog={handleScrollToLog}
				/>
			)}
		</div>
	);
}
export default memo(LiveLogsList);
