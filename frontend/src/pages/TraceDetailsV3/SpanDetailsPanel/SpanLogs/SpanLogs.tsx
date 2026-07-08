import { useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { QueryParams } from 'constants/query';
import {
	initialQueriesMap,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import LogsError from 'container/LogsError/LogsError';
import { EmptyLogsListConfig } from 'container/LogsExplorerList/utils';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import createQueryParams from 'lib/createQueryParams';
import { Compass } from '@signozhq/icons';
import { ILog } from 'types/api/logs/log';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { openInNewTab } from 'utils/navigation';
import { v4 as uuid } from 'uuid';

import noDataUrl from '@/assets/Icons/no-data.svg';

import styles from './SpanLogs.module.scss';

interface SpanLogsProps {
	traceId: string;
	spanId: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	logs: ILog[];
	isLoading: boolean;
	isError: boolean;
	isFetching: boolean;
	isLogSpanRelated: (logId: string) => boolean;
	handleExplorerPageRedirect: () => void;
	emptyStateConfig?: EmptyLogsListConfig;
}

function SpanLogs({
	traceId,
	spanId,
	timeRange,
	logs,
	isLoading,
	isError,
	isFetching,
	isLogSpanRelated,
	handleExplorerPageRedirect,
	emptyStateConfig,
}: SpanLogsProps): JSX.Element {
	const { updateAllQueriesOperators } = useQueryBuilder();

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

			openInNewTab(url);
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
			return (
				<div className={styles.logsLoadingSkeleton}> Loading more logs ... </div>
			);
		}

		if (hasReachedEndOfLogs) {
			return <div className={styles.logsLoadingSkeleton}> *** End *** </div>;
		}

		return null;
	}, [isFetching, hasReachedEndOfLogs]);

	const renderContent = useMemo(
		() => (
			<div className={styles.spanLogsListContainer}>
				<OverlayScrollbar isVirtuoso>
					<Virtuoso
						className={styles.spanLogsVirtuoso}
						key="span-logs-virtuoso"
						style={{ height: '100%' }}
						data={logs}
						totalCount={logs.length}
						itemContent={getItemContent}
						overscan={200}
						components={{
							Footer: renderFooter,
						}}
					/>
				</OverlayScrollbar>
			</div>
		),
		[logs, getItemContent, renderFooter],
	);

	const renderNoLogsFound = (): JSX.Element => (
		<div className={styles.spanLogsEmptyContent}>
			<section className={styles.description}>
				<img src={noDataUrl} alt="no-data" className={styles.noDataImg} />
				<Typography.Text className={styles.noDataDescription}>
					No logs found for selected span. View logs for the current trace.
				</Typography.Text>
			</section>
			<section className={styles.actionSection}>
				<Button
					className={styles.actionBtn}
					variant="action"
					prefix={<Compass size={14} />}
					onClick={handleExplorerPageRedirect}
					size="md"
				>
					View Logs
				</Button>
			</section>
		</div>
	);

	const renderSpanLogsContent = (): JSX.Element | null => {
		if (isLoading || isFetching) {
			return <LogsLoading />;
		}

		if (isError) {
			return <LogsError />;
		}

		if (logs.length === 0) {
			if (emptyStateConfig) {
				return (
					<EmptyLogsSearch
						dataSource={DataSource.LOGS}
						panelType="LIST"
						customMessage={emptyStateConfig}
					/>
				);
			}
			return renderNoLogsFound();
		}

		return renderContent;
	};

	return <div className={styles.spanLogs}>{renderSpanLogsContent()}</div>;
}
SpanLogs.defaultProps = {
	emptyStateConfig: undefined,
};

export default SpanLogs;
