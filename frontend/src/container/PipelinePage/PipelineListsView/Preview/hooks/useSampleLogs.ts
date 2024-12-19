import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import {
	initialFilters,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import cloneDeep from 'lodash-es/cloneDeep';
import { useMemo } from 'react';
import { ILog } from 'types/api/logs/log';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

export interface SampleLogsRequest {
	filter: TagFilter;
	timeInterval: Time;
	count: number;
}

export interface SampleLogsResponse {
	isLoading: boolean;
	logs: ILog[];
	isError: boolean;
}

const DEFAULT_SAMPLE_LOGS_COUNT = 5;

const useSampleLogs = ({
	filter,
	timeInterval,
	count,
}: SampleLogsRequest): SampleLogsResponse => {
	const query = useMemo(() => {
		const q = cloneDeep(initialQueriesMap.logs);
		q.builder.queryData[0] = {
			...q.builder.queryData[0],
			filters: filter || initialFilters,
			aggregateOperator: LogsAggregatorOperator.NOOP,
			orderBy: [{ columnName: 'timestamp', order: 'desc' }],
			limit: count || DEFAULT_SAMPLE_LOGS_COUNT,
		};
		return q;
	}, [count, filter]);

	const response = useGetQueryRange(
		{
			graphType: PANEL_TYPES.LIST,
			query,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: timeInterval,
		},
		DEFAULT_ENTITY_VERSION,
	);

	const { isFetching: isLoading, data } = response;

	const errorMsg = data?.error || '';
	const isError = response.isError || Boolean(errorMsg);

	let logs: ILog[] = [];
	if (!(isLoading || isError)) {
		const logsList = data?.payload?.data?.newResult?.data?.result[0]?.list || [];
		logs = logsList.map((item) => ({
			...item.data,
			timestamp: item.timestamp,
		}));
	}

	return { isLoading, logs, isError };
};

export default useSampleLogs;
