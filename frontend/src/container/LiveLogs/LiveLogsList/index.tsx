import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Card, Typography } from 'antd';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { CARD_BODY_STYLE } from 'constants/card';
import { LOCALSTORAGE } from 'constants/localStorage';
import { OptionFormatTypes } from 'constants/optionsFormatTypes';
import InfinityTableView from 'container/LogsExplorerList/InfinityTableView';
import { InfinityWrapperStyled } from 'container/LogsExplorerList/styles';
import { convertKeysToColumnFields } from 'container/LogsExplorerList/utils';
import { useOptionsMenu } from 'container/OptionsMenu';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useEventSource } from 'providers/EventSource';
// interfaces
import { ILog } from 'types/api/logs/log';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import { LiveLogsListProps } from './types';

import './LiveLogsList.styles.scss';

function LiveLogsList({
	logs,
	isLoading,
	handleChangeSelectedView,
}: LiveLogsListProps): JSX.Element {
	const ref = useRef<VirtuosoHandle>(null);

	const { isConnectionLoading } = useEventSource();

	const { activeLogId } = useCopyLogLink();

	const {
		activeLog,
		onClearActiveLog,
		onAddToQuery,
		onSetActiveLog,
	} = useActiveLog();

	const [selectedTab, setSelectedTab] = useState<
		typeof VIEW_TYPES[keyof typeof VIEW_TYPES] | undefined
	>();

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

	const handleSetActiveLog = useCallback(
		(
			log: ILog,
			selectedTab: typeof VIEW_TYPES[keyof typeof VIEW_TYPES] = VIEW_TYPES.OVERVIEW,
		) => {
			onSetActiveLog(log);
			setSelectedTab(selectedTab);
		},
		[onSetActiveLog],
	);

	const handleCloseLogDetail = useCallback(() => {
		onClearActiveLog();
		setSelectedTab(undefined);
	}, [onClearActiveLog]);

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => {
			if (options.format === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						isActiveLog={activeLog?.id === log.id}
						linesPerRow={options.maxLines}
						selectedFields={selectedFields}
						fontSize={options.fontSize}
						handleChangeSelectedView={handleChangeSelectedView}
						onSetActiveLog={handleSetActiveLog}
						onClearActiveLog={handleCloseLogDetail}
					/>
				);
			}

			return (
				<ListLogView
					key={log.id}
					logData={log}
					isActiveLog={activeLog?.id === log.id}
					selectedFields={selectedFields}
					linesPerRow={options.maxLines}
					onAddToQuery={onAddToQuery}
					onSetActiveLog={handleSetActiveLog}
					onClearActiveLog={handleCloseLogDetail}
					fontSize={options.fontSize}
					handleChangeSelectedView={handleChangeSelectedView}
					logs={formattedLogs}
				/>
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
			formattedLogs,
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
					<img
						className="loading-gif"
						src="/Icons/loading-plane.gif"
						alt="wait-icon"
					/>

					<Typography>Fetching live logs...</Typography>
				</div>
			</div>
		),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	return (
		<div className="live-logs-list">
			{(formattedLogs.length === 0 || isLoading || isLoadingList) &&
				renderLoading()}

			{formattedLogs.length !== 0 && (
				<InfinityWrapperStyled>
					{options.format === OptionFormatTypes.TABLE ? (
						<InfinityTableView
							ref={ref}
							isLoading={false}
							tableViewProps={{
								logs: formattedLogs,
								fields: selectedFields,
								linesPerRow: options.maxLines,
								fontSize: options.fontSize,
								appendTo: 'end',
								activeLogIndex,
							}}
							handleChangeSelectedView={handleChangeSelectedView}
							logs={formattedLogs}
							onSetActiveLog={handleSetActiveLog}
							onClearActiveLog={handleCloseLogDetail}
							activeLog={activeLog}
						/>
					) : (
						<Card style={{ width: '100%' }} bodyStyle={CARD_BODY_STYLE}>
							<OverlayScrollbar isVirtuoso>
								<Virtuoso
									ref={ref}
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
				/>
			)}
		</div>
	);
}
export default memo(LiveLogsList);
