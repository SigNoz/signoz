import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { OPERATORS } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useHandleLogsPagination } from 'hooks/infraMonitoring/useHandleLogsPagination';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
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
function createSpanLogsFilters(traceId: string, spanId: string): TagFilter {
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
				op: getOperatorValue(OPERATORS.IN),
				value: traceId,
				key: traceIdKey,
			},
			{
				id: uuid(),
				op: getOperatorValue(OPERATORS.IN),
				value: spanId,
				key: spanIdKey,
			},
		],
		op: 'AND',
	};
}

function SpanLogs({ traceId, spanId, timeRange }: SpanLogsProps): JSX.Element {
	const filters = useMemo(() => createSpanLogsFilters(traceId, spanId), [
		traceId,
		spanId,
	]);

	const basePayload = getSpanLogsQueryPayload(
		timeRange.startTime,
		timeRange.endTime,
		filters,
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
		(_: number, logToRender: ILog): JSX.Element => (
			<RawLogView
				isTextOverflowEllipsisDisabled
				key={logToRender.id}
				data={logToRender}
				linesPerRow={5}
				fontSize={FontSize.MEDIUM}
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
		),
		[],
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
							style={{ height: `calc(${logs.length} * ${24}px)` }}
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
		<div className="span-logs-empty">
			<div className="span-logs-empty-content">
				<p>No logs found for this span</p>
			</div>
		</div>
	);

	return (
		<div className="span-logs">
			{isLoading && <LogsLoading />}
			{!isLoading && !isError && logs.length === 0 && renderNoLogsFound()}
			{isError && !isLoading && <LogsError />}
			{!isLoading && !isError && logs.length > 0 && renderContent}
		</div>
	);
}

export default SpanLogs;
