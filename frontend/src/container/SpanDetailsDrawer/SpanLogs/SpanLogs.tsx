import './spanLogs.styles.scss';

import cx from 'classnames';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { QueryParams } from 'constants/query';
import {
	initialQueriesMap,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useHandleLogsPagination } from 'hooks/infraMonitoring/useHandleLogsPagination';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { MouseEvent, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import { getSpanLogsQueryPayload } from './constants';

interface SpanLogsProps {
	traceId: string;
	spanId: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
}

/**
 * Creates tag filters for querying logs by trace_id and span_id
 * @param traceId - The trace identifier
 * @param spanId - The span identifier
 * @returns Tag filters for the query builder
 */
function createSpanLogsFilters(traceId: string): TagFilter {
	const traceIdKey: BaseAutocompleteData = {
		id: uuid(),
		dataType: DataTypes.String,
		isColumn: true,
		type: '',
		isJSON: false,
		key: 'trace_id',
	};

	return {
		items: [
			{
				id: uuid(),
				op: getOperatorValue(OPERATORS.IN),
				value: traceId,
				key: traceIdKey,
			},
		],
		op: 'AND',
	};
}

function SpanLogs({ traceId, spanId, timeRange }: SpanLogsProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { updateAllQueriesOperators } = useQueryBuilder();

	const filters = useMemo(() => createSpanLogsFilters(traceId), [traceId]);

	const basePayload = getSpanLogsQueryPayload(
		timeRange.startTime,
		timeRange.endTime,
		filters,
	);

	// Create trace_id and span_id filters for logs explorer navigation
	const createSpanLogsFilter = useCallback((): TagFilter => {
		const traceIdKey: BaseAutocompleteData = {
			id: uuid(),
			dataType: DataTypes.String,
			isColumn: true,
			type: '',
			isJSON: false,
			key: 'trace_id',
		};

		const spanIdKey: BaseAutocompleteData = {
			id: uuid(),
			dataType: DataTypes.String,
			isColumn: true,
			type: '',
			isJSON: false,
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
					value: spanId,
					key: spanIdKey,
				},
			],
			op: 'AND',
		};
	}, [traceId, spanId]);

	// Navigate to logs explorer with trace_id and span_id filters and activeLogId
	const handleLogClick = useCallback(
		(log: ILog, event: MouseEvent): void => {
			const spanLogsFilter = createSpanLogsFilter();

			// Create base query with trace_id and span_id filters
			const baseQuery = updateAllQueriesOperators(
				initialQueriesMap[DataSource.LOGS],
				PANEL_TYPES.LIST,
				DataSource.LOGS,
			);

			// Add trace_id and span_id filters to the query
			const updatedQuery = {
				...baseQuery,
				builder: {
					...baseQuery.builder,
					queryData: baseQuery.builder.queryData.map((queryData) => ({
						...queryData,
						filters: spanLogsFilter,
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

			// Check for Ctrl+click (Windows/Linux) or Cmd+click (Mac) to open in new tab
			const shouldOpenInNewTab = event.ctrlKey || event.metaKey;

			if (shouldOpenInNewTab) {
				window.open(url, '_blank');
			} else {
				safeNavigate(url);
			}
		},
		[
			createSpanLogsFilter,
			updateAllQueriesOperators,
			timeRange.startTime,
			timeRange.endTime,
			safeNavigate,
		],
	);

	const {
		logs,
		hasReachedEndOfLogs,
		isPaginating,
		currentPage,
		setIsPaginating,
		handleNewData,
		loadMoreLogs,
		queryPayload,
	} = useHandleLogsPagination({
		timeRange,
		filters,
		excludeFilterKeys: [],
		basePayload,
	});

	const { data, isLoading, isFetching, isError } = useQuery({
		queryKey: [
			REACT_QUERY_KEY.SPAN_LOGS,
			traceId,
			spanId,
			timeRange.startTime,
			timeRange.endTime,
			currentPage,
		],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!queryPayload && !!traceId && !!spanId,
		keepPreviousData: isPaginating,
	});

	useEffect(() => {
		if (data?.payload?.data?.newResult?.data?.result) {
			handleNewData(data.payload.data.newResult.data.result);
		}
	}, [data, handleNewData]);

	useEffect(() => {
		setIsPaginating(false);
	}, [data, setIsPaginating]);

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
					isTextOverflowEllipsisDisabled
					key={logToRender.id}
					data={logToRender}
					linesPerRow={5}
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
							data={logs}
							endReached={loadMoreLogs}
							totalCount={logs.length}
							itemContent={getItemContent}
							style={{ height: `calc(${logs.length} * ${24}px + 40px)` }}
							overscan={200}
							components={{
								Footer: renderFooter,
							}}
						/>
					</OverlayScrollbar>
				</PreferenceContextProvider>
			</div>
		),
		[logs, loadMoreLogs, getItemContent, renderFooter],
	);

	const renderNoLogsFound = (): JSX.Element => (
		<div className="span-logs-empty-content">
			<p>No logs found for this span</p>
		</div>
	);

	return (
		<div className={cx('span-logs', { 'span-logs-empty': logs.length === 0 })}>
			{isLoading && <LogsLoading />}
			{!isLoading && !isError && logs.length === 0 && renderNoLogsFound()}
			{isError && !isLoading && <LogsError />}
			{!isLoading && !isError && logs.length > 0 && renderContent}
		</div>
	);
}

export default SpanLogs;
