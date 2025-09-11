import './spanLogs.styles.scss';

import { Button } from '@signozhq/button';
import { Typography } from 'antd';
import cx from 'classnames';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { QueryParams } from 'constants/query';
import {
	initialQueriesMap,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import createQueryParams from 'lib/createQueryParams';
import { Compass } from 'lucide-react';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import { useSpanContextLogs } from './useSpanContextLogs';

interface SpanLogsProps {
	traceId: string;
	spanId: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	handleExplorerPageRedirect: () => void;
}

function SpanLogs({
	traceId,
	spanId,
	timeRange,
	handleExplorerPageRedirect,
}: SpanLogsProps): JSX.Element {
	const { updateAllQueriesOperators } = useQueryBuilder();

	const {
		logs,
		isLoading,
		isError,
		isFetching,
		isLogSpanRelated,
	} = useSpanContextLogs({
		traceId,
		spanId,
		timeRange,
	});

	// Create trace_id and span_id filters for logs explorer navigation
	const createLogsFilter = useCallback(
		(targetSpanId: string): TagFilter => {
			const traceIdKey: BaseAutocompleteData = {
				id: uuid(),
				dataType: DataTypes.String,
				type: '',
				key: 'trace_id',
			};

			const spanIdKey: BaseAutocompleteData = {
				id: uuid(),
				dataType: DataTypes.String,
				type: '',
				key: 'span_id',
			};

			return {
				items: [
					{
						id: uuid(),
						op: getOperatorValue(OPERATORS['=']),
						value: traceId,
						key: traceIdKey,
					},
					{
						id: uuid(),
						op: getOperatorValue(OPERATORS['=']),
						value: targetSpanId,
						key: spanIdKey,
					},
				],
				op: 'AND',
			};
		},
		[traceId],
	);

	// Navigate to logs explorer with trace_id and span_id filters
	const handleLogClick = useCallback(
		(log: ILog): void => {
			// Determine if this is a span log or context log
			const isSpanLog = isLogSpanRelated(log.id);

			// Extract log's span_id (handles both spanID and span_id properties)
			const logSpanId = log.spanID || log.span_id || '';

			// Use appropriate span ID: current span for span logs, individual log's span for context logs
			const targetSpanId = isSpanLog ? spanId : logSpanId;
			const filters = createLogsFilter(targetSpanId);

			// Create base query
			const baseQuery = updateAllQueriesOperators(
				initialQueriesMap[DataSource.LOGS],
				PANEL_TYPES.LIST,
				DataSource.LOGS,
			);

			// Add appropriate filters to the query
			const updatedQuery = {
				...baseQuery,
				builder: {
					...baseQuery.builder,
					queryData: baseQuery.builder.queryData.map((queryData) => ({
						...queryData,
						filters,
					})),
				},
			};

			const queryParams = {
				[QueryParams.activeLogId]: `"${log.id}"`,
				[QueryParams.startTime]: timeRange.startTime.toString(),
				[QueryParams.endTime]: timeRange.endTime.toString(),
				[QueryParams.compositeQuery]: JSON.stringify(updatedQuery),
			};

			const url = `${ROUTES.LOGS_EXPLORER}?${createQueryParams(queryParams)}`;

			window.open(url, '_blank');
		},
		[
			isLogSpanRelated,
			createLogsFilter,
			spanId,
			updateAllQueriesOperators,
			timeRange.startTime,
			timeRange.endTime,
		],
	);

	// Footer rendering for pagination
	const hasReachedEndOfLogs = false;

	const getItemContent = useCallback(
		(_: number, logToRender: ILog): JSX.Element => {
			const getIsSpanRelated = (log: ILog, currentSpanId: string): boolean => {
				if (log.spanID) {
					return log.spanID === currentSpanId;
				}
				return log.span_id === currentSpanId;
			};

			const isSpanRelated = getIsSpanRelated(logToRender, spanId);

			return (
				<RawLogView
					key={logToRender.id}
					data={logToRender}
					linesPerRow={1}
					fontSize={FontSize.MEDIUM}
					onLogClick={handleLogClick}
					isHighlighted={isSpanRelated}
					helpTooltip={
						isSpanRelated ? 'This log belongs to the current span' : undefined
					}
					selectedFields={[
						{
							dataType: 'string',
							type: '',
							name: 'body',
						},
						{
							dataType: 'string',
							type: '',
							name: 'timestamp',
						},
					]}
				/>
			);
		},
		[handleLogClick, spanId],
	);

	const renderFooter = useCallback((): JSX.Element | null => {
		if (isFetching) {
			return <div className="logs-loading-skeleton"> Loading more logs ... </div>;
		}

		if (hasReachedEndOfLogs) {
			return <div className="logs-loading-skeleton"> *** End *** </div>;
		}

		return null;
	}, [isFetching, hasReachedEndOfLogs]);

	const renderContent = useMemo(
		() => (
			<div className="span-logs-list-container">
				<PreferenceContextProvider>
					<OverlayScrollbar isVirtuoso>
						<Virtuoso
							className="span-logs-virtuoso"
							key="span-logs-virtuoso"
							style={
								logs.length <= 35 ? { height: `calc(${logs.length} * 22px)` } : {}
							}
							data={logs}
							totalCount={logs.length}
							itemContent={getItemContent}
							overscan={200}
							components={{
								Footer: renderFooter,
							}}
						/>
					</OverlayScrollbar>
				</PreferenceContextProvider>
			</div>
		),
		[logs, getItemContent, renderFooter],
	);

	const renderNoLogsFound = (): JSX.Element => (
		<div className="span-logs-empty-content">
			<section className="description">
				<img src="/Icons/no-data.svg" alt="no-data" className="no-data-img" />
				<Typography.Text className="no-data-text-1">
					No logs found for selected span.
					<span className="no-data-text-2">
						Try viewing logs for the current trace.
					</span>
				</Typography.Text>
			</section>
			<section className="action-section">
				<Button
					className="action-btn"
					variant="action"
					prefixIcon={<Compass size={14} />}
					onClick={handleExplorerPageRedirect}
					size="md"
				>
					Log Explorer
				</Button>
			</section>
		</div>
	);

	return (
		<div className={cx('span-logs', { 'span-logs-empty': logs.length === 0 })}>
			{(isLoading || isFetching) && <LogsLoading />}
			{!isLoading &&
				!isFetching &&
				!isError &&
				logs.length === 0 &&
				renderNoLogsFound()}
			{isError && !isLoading && !isFetching && <LogsError />}
			{!isLoading && !isFetching && !isError && logs.length > 0 && renderContent}
		</div>
	);
}

export default SpanLogs;
