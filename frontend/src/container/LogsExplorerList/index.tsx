import './LogsExplorerList.style.scss';

import { Card } from 'antd';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import Spinner from 'components/Spinner';
import { CARD_BODY_STYLE } from 'constants/card';
import { LOCALSTORAGE } from 'constants/localStorage';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { useOptionsMenu } from 'container/OptionsMenu';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
// interfaces
import { ILog } from 'types/api/logs/log';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import NoLogs from '../NoLogs/NoLogs';
import InfinityTableView from './InfinityTableView';
import { LogsExplorerListProps } from './LogsExplorerList.interfaces';
import { InfinityWrapperStyled } from './styles';
import { convertKeysToColumnFields } from './utils';

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
	isFilterApplied,
}: LogsExplorerListProps): JSX.Element {
	const ref = useRef<VirtuosoHandle>(null);
	const { initialDataSource } = useQueryBuilder();

	const { activeLogId } = useCopyLogLink();

	const {
		activeLog,
		onClearActiveLog,
		onAddToQuery,
		onSetActiveLog,
	} = useActiveLog();

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: initialDataSource || DataSource.METRICS,
		aggregateOperator:
			currentStagedQueryData?.aggregateOperator || StringOperators.NOOP,
	});

	const activeLogIndex = useMemo(
		() => logs.findIndex(({ id }) => id === activeLogId),
		[logs, activeLogId],
	);

	const selectedFields = useMemo(
		() => convertKeysToColumnFields(options.selectColumns),
		[options],
	);

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => {
			if (options.format === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={options.maxLines}
						selectedFields={selectedFields}
					/>
				);
			}

			return (
				<ListLogView
					key={log.id}
					logData={log}
					selectedFields={selectedFields}
					onAddToQuery={onAddToQuery}
					onSetActiveLog={onSetActiveLog}
					activeLog={activeLog}
				/>
			);
		},
		[
			activeLog,
			onAddToQuery,
			onSetActiveLog,
			options.format,
			options.maxLines,
			selectedFields,
		],
	);

	useEffect(() => {
		if (!activeLogId || activeLogIndex < 0) return;

		ref?.current?.scrollToIndex({
			index: activeLogIndex,
			align: 'start',
			behavior: 'smooth',
		});
	}, [activeLogId, activeLogIndex]);

	const renderContent = useMemo(() => {
		const components = isLoading
			? {
					Footer,
			  }
			: {};

		if (options.format === 'table') {
			return (
				<InfinityTableView
					ref={ref}
					isLoading={isLoading}
					tableViewProps={{
						logs,
						fields: selectedFields,
						linesPerRow: options.maxLines,
						appendTo: 'end',
					}}
					infitiyTableProps={{ onEndReached }}
				/>
			);
		}

		return (
			<Card
				style={{ width: '100%', marginTop: '20px' }}
				bodyStyle={CARD_BODY_STYLE}
			>
				<Virtuoso
					ref={ref}
					data={logs}
					endReached={onEndReached}
					totalCount={logs.length}
					itemContent={getItemContent}
					components={components}
				/>
			</Card>
		);
	}, [isLoading, options, logs, onEndReached, getItemContent, selectedFields]);

	return (
		<div className="logs-list-view-container">
			{(isLoading || (isFetching && logs.length === 0)) && <LogsLoading />}

			{!isLoading &&
				!isFetching &&
				!isError &&
				!isFilterApplied &&
				logs.length === 0 && <NoLogs />}

			{!isLoading &&
				!isFetching &&
				logs.length === 0 &&
				!isError &&
				isFilterApplied && <EmptyLogsSearch />}

			{isError && !isLoading && !isFetching && <LogsError />}

			{!isLoading && !isError && logs.length > 0 && (
				<>
					<InfinityWrapperStyled>{renderContent}</InfinityWrapperStyled>

					<LogDetail
						selectedTab={VIEW_TYPES.OVERVIEW}
						log={activeLog}
						onClose={onClearActiveLog}
						onAddToQuery={onAddToQuery}
						onClickActionItem={onAddToQuery}
					/>
				</>
			)}
		</div>
	);
}

export default memo(LogsExplorerList);
