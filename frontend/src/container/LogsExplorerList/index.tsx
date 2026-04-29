import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { toast } from '@signozhq/ui';
import { Card } from 'antd';
import logEvent from 'api/common/logEvent';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import ListLogView from 'components/Logs/ListLogView';
import LogLinesActionButtons from 'components/Logs/LogLinesActionButtons/LogLinesActionButtons';
import { getRowBackgroundColor } from 'components/Logs/LogStateIndicator/getRowBackgroundColor';
import { getLogIndicatorType } from 'components/Logs/LogStateIndicator/utils';
import RawLogView from 'components/Logs/RawLogView';
import { useLogsTableColumns } from 'components/Logs/TableView/useLogsTableColumns';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import Spinner from 'components/Spinner';
import type { TanStackTableHandle } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { useHiddenColumnIds } from 'components/TanStackTableView/useColumnStore';
import { CARD_BODY_STYLE } from 'constants/card';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { useOptionsMenu } from 'container/OptionsMenu';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import { FontSize } from 'container/OptionsMenu/types';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import useLogDetailHandlers from 'hooks/logs/useLogDetailHandlers';
import useScrollToLog from 'hooks/logs/useScrollToLog';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
import APIError from 'types/api/error';
// interfaces
import { ILog } from 'types/api/logs/log';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import { getAbsoluteUrl } from '@/utils/basePath';

import NoLogs from '../NoLogs/NoLogs';
import { LogsExplorerListProps } from './LogsExplorerList.interfaces';
import { InfinityWrapperStyled } from './styles';
import {
	convertKeysToColumnFields,
	getEmptyLogsListConfig,
	isTraceToLogsQuery,
} from './utils';

import './LogsExplorerList.style.scss';

function Footer(): JSX.Element {
	return <Spinner height={20} tip="Getting Logs" />;
}
function LogsExplorerList({
	isLoading,
	isFetching,
	currentStagedQueryData,
	logs,
	onEndReached,
	isError,
	error,
	isFilterApplied,
	handleChangeSelectedView,
}: LogsExplorerListProps): JSX.Element {
	const ref = useRef<TanStackTableHandle | VirtuosoHandle | null>(null);
	const [, setCopy] = useCopyToClipboard();
	const isDarkMode = useIsDarkMode();
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

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator:
			currentStagedQueryData?.aggregateOperator || StringOperators.NOOP,
	});

	const { currentQuery, lastUsedQuery, redirectWithQueryBuilderData } =
		useQueryBuilder();

	const activeLogIndex = useMemo(
		() => logs.findIndex(({ id }) => id === activeLogId),
		[logs, activeLogId],
	);

	const selectedFields = useMemo(
		() =>
			convertKeysToColumnFields([
				...defaultLogsSelectedColumns,
				...options.selectColumns,
			]),
		[options],
	);

	const syncedSelectedColumns = useMemo(
		() =>
			options.selectColumns.filter(({ name }) => !hiddenColumnIds.includes(name)),
		[options.selectColumns, hiddenColumnIds],
	);

	const handleColumnRemove = useCallback(
		(columnId: string) => {
			const updatedColumns = options.selectColumns.filter(
				({ name }) => name !== columnId,
			);
			logsPreferences.updateColumns(updatedColumns);
		},
		[options.selectColumns, logsPreferences],
	);

	const logsColumns = useLogsTableColumns({
		fields: selectedFields,
		fontSize: options.fontSize,
		appendTo: 'end',
	});

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
		logs,
		virtuosoRef: ref as React.RefObject<Pick<
			VirtuosoHandle,
			'scrollToIndex'
		> | null>,
	});

	useEffect(() => {
		if (!isLoading && !isFetching && !isError && logs.length !== 0) {
			logEvent('Logs Explorer: Data present', {
				panelType: 'LIST',
			});
		}
	}, [isLoading, isFetching, isError, logs.length]);

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
						onAddToQuery={onAddToQuery}
						onSetActiveLog={handleSetActiveLog}
						activeLog={activeLog}
						fontSize={options.fontSize}
						linesPerRow={options.maxLines}
						handleChangeSelectedView={handleChangeSelectedView}
						onClearActiveLog={handleCloseLogDetail}
					/>
				</div>
			);
		},
		[
			options.format,
			options.fontSize,
			options.maxLines,
			activeLog,
			selectedFields,
			onAddToQuery,
			handleSetActiveLog,
			handleChangeSelectedView,
			handleCloseLogDetail,
		],
	);

	const renderContent = useMemo(() => {
		const components = isLoading
			? {
					Footer,
				}
			: {};

		if (options.format === 'table') {
			return (
				<TanStackTable<ILog>
					ref={ref as React.Ref<TanStackTableHandle>}
					columns={logsColumns}
					columnStorageKey={LOCALSTORAGE.LOGS_LIST_COLUMNS}
					onColumnRemove={handleColumnRemove}
					plainTextCellLineClamp={options.maxLines}
					cellTypographySize={options.fontSize}
					data={logs}
					isLoading={isLoading || isFetching}
					onEndReached={onEndReached}
					isRowActive={(log): boolean =>
						log.id === activeLog?.id || log.id === activeLogId
					}
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
			);
		}
		function getMarginTop(): string {
			switch (options.fontSize) {
				case FontSize.SMALL:
					return '10px';
				case FontSize.MEDIUM:
					return '12px';
				case FontSize.LARGE:
					return '15px';
				default:
					return '15px';
			}
		}

		return (
			<Card
				style={{ width: '100%', marginTop: getMarginTop() }}
				bodyStyle={CARD_BODY_STYLE}
			>
				<OverlayScrollbar isVirtuoso>
					<Virtuoso
						key={activeLogIndex || 'logs-virtuoso'}
						ref={ref as React.Ref<VirtuosoHandle>}
						initialTopMostItemIndex={activeLogIndex !== -1 ? activeLogIndex : 0}
						data={logs}
						endReached={onEndReached}
						totalCount={logs.length}
						itemContent={getItemContent}
						components={components}
					/>
				</OverlayScrollbar>
			</Card>
		);
	}, [
		isLoading,
		options.format,
		options.maxLines,
		options.fontSize,
		activeLogIndex,
		logs,
		onEndReached,
		getItemContent,
		isFetching,
		handleSetActiveLog,
		handleCloseLogDetail,
		activeLog,
		isDarkMode,
		makeOnLogCopy,
	]);

	const isTraceToLogsNavigation = useMemo(() => {
		if (!currentStagedQueryData) {
			return false;
		}
		return isTraceToLogsQuery(currentStagedQueryData);
	}, [currentStagedQueryData]);

	const handleClearFilters = useCallback((): void => {
		const queryIndex = lastUsedQuery ?? 0;
		const updatedQuery = currentQuery?.builder.queryData?.[queryIndex];

		if (!updatedQuery) {
			return;
		}

		if (updatedQuery?.filters?.items) {
			updatedQuery.filters.items = [];
		}

		const preparedQuery = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item, idx: number) => ({
					...item,
					filters: {
						...item.filters,
						items: idx === queryIndex ? [] : [...(item.filters?.items || [])],
						op: item.filters?.op || 'AND',
					},
				})),
			},
		};

		redirectWithQueryBuilderData(preparedQuery);
	}, [currentQuery, lastUsedQuery, redirectWithQueryBuilderData]);

	const getEmptyStateMessage = useMemo(() => {
		if (!isTraceToLogsNavigation) {
			return;
		}

		return getEmptyLogsListConfig(handleClearFilters);
	}, [isTraceToLogsNavigation, handleClearFilters]);

	return (
		<div className="logs-list-view-container">
			{(isLoading || (isFetching && logs.length === 0)) && <LogsLoading />}

			{!isLoading &&
				!isFetching &&
				!isError &&
				!isFilterApplied &&
				logs.length === 0 && <NoLogs dataSource={DataSource.LOGS} />}

			{!isLoading &&
				!isFetching &&
				logs.length === 0 &&
				!isError &&
				isFilterApplied && (
					<EmptyLogsSearch
						dataSource={DataSource.LOGS}
						panelType="LIST"
						customMessage={getEmptyStateMessage}
					/>
				)}

			{isError && !isLoading && !isFetching && error && (
				<ErrorInPlace error={error as APIError} />
			)}

			{!isLoading && !isError && logs.length > 0 && (
				<>
					<InfinityWrapperStyled data-testid="logs-list-virtuoso">
						{renderContent}
					</InfinityWrapperStyled>

					{selectedTab && activeLog && (
						<LogDetail
							selectedTab={selectedTab}
							log={activeLog}
							onClose={handleCloseLogDetail}
							onAddToQuery={onAddToQuery}
							onClickActionItem={onAddToQuery}
							handleChangeSelectedView={handleChangeSelectedView}
							logs={logs}
							onNavigateLog={handleSetActiveLog}
							onScrollToLog={handleScrollToLog}
						/>
					)}
				</>
			)}
		</div>
	);
}

export default memo(LogsExplorerList);
