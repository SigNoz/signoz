import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { OPERATORS } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Filter } from 'types/api/v5/queryRange';
import { v4 as uuid } from 'uuid';

import { getSpanLogsQueryPayload, getTraceOnlyFilters } from './constants';

interface UseSpanContextLogsProps {
	traceId: string;
	spanId: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	isDrawerOpen?: boolean;
}

interface UseSpanContextLogsReturn {
	logs: ILog[];
	isLoading: boolean;
	isError: boolean;
	isFetching: boolean;
	spanLogIds: Set<string>;
	isLogSpanRelated: (logId: string) => boolean;
	hasTraceIdLogs: boolean;
}

const traceIdKey = {
	id: uuid(),
	dataType: DataTypes.String,
	type: '',
	key: 'trace_id',
};
/**
 * Creates v5 filter expression for querying logs by trace_id and span_id (for span logs)
 */
const createSpanLogsFilters = (traceId: string, spanId: string): Filter => {
	const spanIdKey = {
		id: uuid(),
		dataType: DataTypes.String,
		type: '',
		key: 'span_id',
	};

	const filters = {
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

	return convertFiltersToExpression(filters);
};

/**
 * Creates v5 filter expression for querying context logs with id constraints
 */
const createContextFilters = (
	traceId: string,
	logId: string,
	operator: 'lt' | 'gt',
): Filter => {
	const idKey = {
		id: uuid(),
		dataType: DataTypes.String,
		type: '',
		key: 'id',
	};

	const filters = {
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

	return convertFiltersToExpression(filters);
};

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
export const useSpanContextLogs = ({
	traceId,
	spanId,
	timeRange,
	isDrawerOpen = true,
}: UseSpanContextLogsProps): UseSpanContextLogsReturn => {
	const [allLogs, setAllLogs] = useState<ILog[]>([]);
	const [spanLogIds, setSpanLogIds] = useState<Set<string>>(new Set());

	// Phase 1: Fetch span-specific logs (trace_id + span_id)
	const spanFilter = useMemo(() => createSpanLogsFilters(traceId, spanId), [
		traceId,
		spanId,
	]);
	const spanQueryPayload = useMemo(
		() =>
			getSpanLogsQueryPayload(timeRange.startTime, timeRange.endTime, spanFilter),
		[timeRange.startTime, timeRange.endTime, spanFilter],
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
		queryFn: () => GetMetricQueryRange(spanQueryPayload, ENTITY_VERSION_V5),
		enabled: !!traceId && !!spanId,
		staleTime: FIVE_MINUTES_IN_MS,
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
	const beforeFilter = useMemo(() => {
		if (!firstSpanLog) return null;
		return createContextFilters(traceId, firstSpanLog.id, 'lt');
	}, [traceId, firstSpanLog]);

	const beforeQueryPayload = useMemo(() => {
		if (!beforeFilter) return null;
		return getSpanLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			beforeFilter,
		);
	}, [timeRange.startTime, timeRange.endTime, beforeFilter]);

	const { data: beforeData, isFetching: isBeforeFetching } = useQuery({
		queryKey: [
			REACT_QUERY_KEY.SPAN_BEFORE_LOGS,
			traceId,
			firstSpanLog?.id,
			timeRange.startTime,
			timeRange.endTime,
		],
		queryFn: () =>
			GetMetricQueryRange(beforeQueryPayload as any, ENTITY_VERSION_V5),
		enabled: !!beforeQueryPayload && !!firstSpanLog,
		staleTime: FIVE_MINUTES_IN_MS,
	});

	// Phase 3: Fetch context logs after last span log
	const afterFilter = useMemo(() => {
		if (!lastSpanLog) return null;
		return createContextFilters(traceId, lastSpanLog.id, 'gt');
	}, [traceId, lastSpanLog]);

	const afterQueryPayload = useMemo(() => {
		if (!afterFilter) return null;
		return getSpanLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			afterFilter,
			'asc',
		);
	}, [timeRange.startTime, timeRange.endTime, afterFilter]);

	const { data: afterData, isFetching: isAfterFetching } = useQuery({
		queryKey: [
			REACT_QUERY_KEY.SPAN_AFTER_LOGS,
			traceId,
			lastSpanLog?.id,
			timeRange.startTime,
			timeRange.endTime,
		],
		queryFn: () =>
			GetMetricQueryRange(afterQueryPayload as any, ENTITY_VERSION_V5),
		enabled: !!afterQueryPayload && !!lastSpanLog,
		staleTime: FIVE_MINUTES_IN_MS,
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

	useEffect(() => {
		const combined = [...afterLogs.reverse(), ...spanLogs, ...beforeLogs];
		setAllLogs(combined);
	}, [beforeLogs, spanLogs, afterLogs]);

	// Phase 4: Check for trace_id-only logs when span has no logs
	// This helps differentiate between "no logs for span" vs "no logs for trace"
	const traceOnlyFilter = useMemo(() => {
		if (spanLogs.length > 0) return null;
		const filters = getTraceOnlyFilters(traceId);
		return convertFiltersToExpression(filters);
	}, [traceId, spanLogs.length]);

	const traceOnlyQueryPayload = useMemo(() => {
		if (!traceOnlyFilter) return null;
		return getSpanLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			traceOnlyFilter,
		);
	}, [timeRange.startTime, timeRange.endTime, traceOnlyFilter]);

	const { data: traceOnlyData } = useQuery({
		queryKey: [
			REACT_QUERY_KEY.TRACE_ONLY_LOGS,
			traceId,
			timeRange.startTime,
			timeRange.endTime,
		],
		queryFn: () =>
			GetMetricQueryRange(traceOnlyQueryPayload as any, ENTITY_VERSION_V5),
		enabled: isDrawerOpen && !!traceOnlyQueryPayload && spanLogs.length === 0,
		staleTime: FIVE_MINUTES_IN_MS,
	});

	const hasTraceIdLogs = useMemo(() => {
		if (spanLogs.length > 0) return true;
		return !!(
			traceOnlyData?.payload?.data?.newResult?.data?.result?.[0]?.list?.length || 0
		);
	}, [spanLogs.length, traceOnlyData]);

	// Helper function to check if a log belongs to the span
	const isLogSpanRelated = useCallback(
		(logId: string): boolean => spanLogIds.has(logId),
		[spanLogIds],
	);

	return {
		logs: allLogs,
		isLoading: isSpanLoading && spanLogs.length === 0,
		isError: isSpanError,
		isFetching: isSpanFetching || isBeforeFetching || isAfterFetching,
		spanLogIds,
		isLogSpanRelated,
		hasTraceIdLogs,
	};
};
