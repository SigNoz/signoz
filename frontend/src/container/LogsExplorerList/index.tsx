import './LogsExplorerList.style.scss';

import { Card } from 'antd';
import logEvent from 'api/common/logEvent';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import Spinner from 'components/Spinner';
import { CARD_BODY_STYLE } from 'constants/card';
import { LOCALSTORAGE } from 'constants/localStorage';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { useOptionsMenu } from 'container/OptionsMenu';
import { FontSize } from 'container/OptionsMenu/types';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import APIError from 'types/api/error';
// interfaces
import { ILog } from 'types/api/logs/log';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import NoLogs from '../NoLogs/NoLogs';
import InfinityTableView from './InfinityTableView';
import { LogsExplorerListProps } from './LogsExplorerList.interfaces';
import { InfinityWrapperStyled } from './styles';
import {
	convertKeysToColumnFields,
	getEmptyLogsListConfig,
	isTraceToLogsQuery,
} from './utils';

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
}: LogsExplorerListProps): JSX.Element {
	const ref = useRef<VirtuosoHandle>(null);
	const { activeLogId } = useCopyLogLink();

	const {
		activeLog,
		onClearActiveLog,
		onAddToQuery,
		onGroupByAttribute,
		onSetActiveLog,
	} = useActiveLog();

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator:
			currentStagedQueryData?.aggregateOperator || StringOperators.NOOP,
	});

	const {
		currentQuery,
		lastUsedQuery,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const activeLogIndex = useMemo(
		() => logs.findIndex(({ id }) => id === activeLogId),
		[logs, activeLogId],
	);

	const selectedFields = useMemo(
		() => convertKeysToColumnFields(options.selectColumns),
		[options],
	);
	useEffect(() => {
		if (!isLoading && !isFetching && !isError && logs.length !== 0) {
			logEvent('Logs Explorer: Data present', {
				panelType: 'LIST',
			});
		}
	}, [isLoading, isFetching, isError, logs.length]);

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => {
			if (options.format === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={options.maxLines}
						selectedFields={selectedFields}
						fontSize={options.fontSize}
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
					fontSize={options.fontSize}
					linesPerRow={options.maxLines}
				/>
			);
		},
		[
			activeLog,
			onAddToQuery,
			onSetActiveLog,
			options.fontSize,
			options.format,
			options.maxLines,
			selectedFields,
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
				<InfinityTableView
					ref={ref}
					isLoading={isLoading}
					tableViewProps={{
						logs,
						fields: selectedFields,
						linesPerRow: options.maxLines,
						fontSize: options.fontSize,
						appendTo: 'end',
						activeLogIndex,
					}}
					infitiyTableProps={{ onEndReached }}
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
						ref={ref}
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
		selectedFields,
	]);

	const isTraceToLogsNavigation = useMemo(() => {
		if (!currentStagedQueryData) return false;
		return isTraceToLogsQuery(currentStagedQueryData);
	}, [currentStagedQueryData]);

	const handleClearFilters = useCallback((): void => {
		const queryIndex = lastUsedQuery ?? 0;
		const updatedQuery = currentQuery?.builder.queryData?.[queryIndex];

		if (!updatedQuery) return;

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
		if (!isTraceToLogsNavigation) return;

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

					<LogDetail
						selectedTab={VIEW_TYPES.OVERVIEW}
						log={activeLog}
						onClose={onClearActiveLog}
						onAddToQuery={onAddToQuery}
						onGroupByAttribute={onGroupByAttribute}
						onClickActionItem={onAddToQuery}
					/>
				</>
			)}
		</div>
	);
}

export default memo(LogsExplorerList);
