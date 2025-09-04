import { ENTITY_VERSION_V4 } from 'constants/app';
import { OPERATORS } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import { getSpanLogsQueryPayload } from './constants';

interface UseSpanContextLogsProps {
	traceId: string;
	spanId: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
}

interface UseSpanContextLogsReturn {
	logs: ILog[];
	isLoading: boolean;
	isError: boolean;
	isFetching: boolean;
	spanLogIds: Set<string>;
	isLogSpanRelated: (logId: string) => boolean;
}

/**
 * Creates tag filters for querying logs by trace_id and span_id (for span logs)
 */
const createSpanLogsFilters = (traceId: string, spanId: string): TagFilter => {
	const traceIdKey = {
		id: uuid(),
		dataType: DataTypes.String,
		isColumn: true,
		type: '',
		isJSON: false,
		key: 'trace_id',
	};

	const spanIdKey = {
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
};

/**
 * Creates tag filters for querying context logs with id constraints
 */
const createContextFilters = (
	traceId: string,
	logId: string,
	operator: 'lt' | 'gt',
): TagFilter => {
	const traceIdKey = {
		id: uuid(),
		dataType: DataTypes.String,
		isColumn: true,
		type: '',
		isJSON: false,
		key: 'trace_id',
	};

	const idKey = {
		id: uuid(),
		dataType: DataTypes.String,
		isColumn: true,
		type: '',
		isJSON: false,
		key: 'id',
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
				op: getOperatorValue(operator === 'lt' ? OPERATORS['<'] : OPERATORS['>']),
				value: logId,
				key: idKey,
			},
		],
		op: 'AND',
	};
};

export const useSpanContextLogs = ({
	traceId,
	spanId,
	timeRange,
}: UseSpanContextLogsProps): UseSpanContextLogsReturn => {
	const [allLogs, setAllLogs] = useState<ILog[]>([]);
	const [spanLogIds, setSpanLogIds] = useState<Set<string>>(new Set());
	const [isInitializing, setIsInitializing] = useState(false);

	// Phase 1: Fetch span-specific logs (trace_id + span_id)
	const spanFilters = useMemo(() => createSpanLogsFilters(traceId, spanId), [
		traceId,
		spanId,
	]);
	const spanQueryPayload = useMemo(
		() =>
			getSpanLogsQueryPayload(timeRange.startTime, timeRange.endTime, spanFilters),
		[timeRange.startTime, timeRange.endTime, spanFilters],
	);

	const {
		data: spanData,
		isLoading: isSpanLoading,
		isError: isSpanError,
		isFetching: isSpanFetching,
	} = useQuery({
		queryKey: [
			REACT_QUERY_KEY.SPAN_LOGS,
			traceId,
			spanId,
			timeRange.startTime,
			timeRange.endTime,
		],
		queryFn: () => GetMetricQueryRange(spanQueryPayload, ENTITY_VERSION_V4),
		enabled: !!traceId && !!spanId,
	});

	// Extract span logs and track their IDs
	const spanLogs = useMemo(() => {
		if (!spanData?.payload?.data?.newResult?.data?.result?.[0]?.list) {
			setSpanLogIds(new Set());
			return [];
		}

		const logs = spanData.payload.data.newResult.data.result[0].list.map(
			(item: any) => ({
				...item.data,
				timestamp: item.timestamp,
			}),
		);

		// Track span log IDs
		const logIds = new Set(logs.map((log: ILog) => log.id));
		setSpanLogIds(logIds);

		return logs;
	}, [spanData]);

	// Get first and last span logs for context queries
	const { firstSpanLog, lastSpanLog } = useMemo(() => {
		if (spanLogs.length === 0) return { firstSpanLog: null, lastSpanLog: null };

		const sortedLogs = [...spanLogs].sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
		);

		return {
			firstSpanLog: sortedLogs[0],
			lastSpanLog: sortedLogs[sortedLogs.length - 1],
		};
	}, [spanLogs]);
	// Phase 2: Fetch context logs before first span log
	const beforeFilters = useMemo(() => {
		if (!firstSpanLog) return null;
		return createContextFilters(traceId, firstSpanLog.id, 'lt');
	}, [traceId, firstSpanLog]);

	const beforeQueryPayload = useMemo(() => {
		if (!beforeFilters) return null;
		return getSpanLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			beforeFilters,
		);
	}, [timeRange.startTime, timeRange.endTime, beforeFilters]);

	const { data: beforeData, isFetching: isBeforeFetching } = useQuery({
		queryKey: [
			REACT_QUERY_KEY.SPAN_BEFORE_LOGS,
			traceId,
			firstSpanLog?.id,
			timeRange.startTime,
			timeRange.endTime,
		],
		queryFn: () =>
			GetMetricQueryRange(beforeQueryPayload as any, ENTITY_VERSION_V4),
		enabled: !!beforeQueryPayload && !!firstSpanLog,
	});

	// Phase 3: Fetch context logs after last span log
	const afterFilters = useMemo(() => {
		if (!lastSpanLog) return null;
		return createContextFilters(traceId, lastSpanLog.id, 'gt');
	}, [traceId, lastSpanLog]);

	const afterQueryPayload = useMemo(() => {
		if (!afterFilters) return null;
		return getSpanLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			afterFilters,
		);
	}, [timeRange.startTime, timeRange.endTime, afterFilters]);

	const { data: afterData, isFetching: isAfterFetching } = useQuery({
		queryKey: [
			REACT_QUERY_KEY.SPAN_AFTER_LOGS,
			traceId,
			lastSpanLog?.id,
			timeRange.startTime,
			timeRange.endTime,
		],
		queryFn: () =>
			GetMetricQueryRange(afterQueryPayload as any, ENTITY_VERSION_V4),
		enabled: !!afterQueryPayload && !!lastSpanLog,
	});

	// Extract context logs
	const beforeLogs = useMemo(() => {
		if (!beforeData?.payload?.data?.newResult?.data?.result?.[0]?.list) return [];

		return beforeData.payload.data.newResult.data.result[0].list.map(
			(item: any) => ({
				...item.data,
				timestamp: item.timestamp,
			}),
		);
	}, [beforeData]);

	const afterLogs = useMemo(() => {
		if (!afterData?.payload?.data?.newResult?.data?.result?.[0]?.list) return [];

		return afterData.payload.data.newResult.data.result[0].list.map(
			(item: any) => ({
				...item.data,
				timestamp: item.timestamp,
			}),
		);
	}, [afterData]);

	// Combine all logs chronologically
	useEffect(() => {
		const combined = [...beforeLogs, ...spanLogs, ...afterLogs];
		setAllLogs(combined);
		setIsInitializing(false);
	}, [beforeLogs, spanLogs, afterLogs]);

	// Helper function to check if a log belongs to the span
	const isLogSpanRelated = useCallback(
		(logId: string): boolean => spanLogIds.has(logId),
		[spanLogIds],
	);

	// Reset when trace/span changes
	useEffect(() => {
		setAllLogs([]);
		setIsInitializing(true);
	}, [traceId, spanId, timeRange.startTime, timeRange.endTime]);

	return {
		logs: allLogs,
		isLoading: isSpanLoading || isInitializing,
		isError: isSpanError,
		isFetching: isSpanFetching || isBeforeFetching || isAfterFetching,
		spanLogIds,
		isLogSpanRelated,
	};
};
