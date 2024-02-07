import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValues,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { useEffect, useMemo, useState } from 'react';
import { ILog } from 'types/api/logs/log';
import {
	IBuilderQuery,
	OrderByPayload,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

import { LogTimeRange } from './logs/types';
import { useCopyLogLink } from './logs/useCopyLogLink';
import { useGetExplorerQueryRange } from './queryBuilder/useGetExplorerQueryRange';
import useUrlQueryData from './useUrlQueryData';

export const useLogsData = ({
	result,
	panelType,
	stagedQuery,
	isDashboardPanel,
}: {
	result: QueryDataV3[] | undefined;
	panelType: PANEL_TYPES;
	stagedQuery: Query | null;
	isDashboardPanel?: boolean;
}): {
	logs: ILog[];
	handleEndReached: (index: number) => void;
	isFetching: boolean;
} => {
	const [logs, setLogs] = useState<ILog[]>([]);
	const [page, setPage] = useState<number>(1);
	const [requestData, setRequestData] = useState<Query | null>(null);

	const { queryData: pageSize } = useUrlQueryData(
		QueryParams.pageSize,
		DEFAULT_PER_PAGE_VALUE,
	);

	const listQuery = useMemo(() => {
		if (!stagedQuery || stagedQuery?.builder?.queryData?.length < 1) return null;

		return stagedQuery.builder?.queryData.find((item) => !item.disabled) || null;
	}, [stagedQuery]);

	const isLimit: boolean = useMemo(() => {
		if (!listQuery) return false;
		if (!listQuery.limit) return false;

		return logs.length >= listQuery.limit;
	}, [logs.length, listQuery]);

	const orderByTimestamp: OrderByPayload | null = useMemo(() => {
		const timestampOrderBy = listQuery?.orderBy.find(
			(item) => item.columnName === 'timestamp',
		);

		return timestampOrderBy || null;
	}, [listQuery]);

	useEffect(() => {
		if (panelType !== PANEL_TYPES.LIST) return;
		const currentData = result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			const newLogs = [...currentLogs];

			setLogs(newLogs);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [result]);

	const getRequestData = (
		query: Query | null,
		params: {
			page: number;
			log: ILog | null;
			pageSize: number;
			filters: TagFilter;
		},
	): Query | null => {
		if (!query) return null;

		const paginateData = getPaginationQueryData({
			filters: params.filters,
			listItemId: params.log ? params.log.id : null,
			orderByTimestamp,
			page: params.page,
			pageSize: params.pageSize,
		});

		const queryData: IBuilderQuery[] =
			query.builder.queryData.length > 1
				? query.builder.queryData
				: [
						{
							...(listQuery || initialQueryBuilderFormValues),
							...paginateData,
						},
				  ];

		const data: Query = {
			...query,
			builder: {
				...query.builder,
				queryData,
			},
		};

		return data;
	};

	const { activeLogId, timeRange, onTimeRangeChange } = useCopyLogLink();

	const { data, isFetching } = useGetExplorerQueryRange(
		// , isFetching, isError to be handled
		requestData,
		panelType,
		{
			keepPreviousData: true,
			enabled: !isLimit && !!requestData,
		},
		{
			...(timeRange &&
				activeLogId &&
				!logs.length && {
					start: timeRange.start,
					end: timeRange.end,
				}),
		},
		isDashboardPanel,
	);

	useEffect(() => {
		const currentParams = data?.params as Omit<LogTimeRange, 'pageSize'>;
		const currentData = data?.payload.data.newResult.data.result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			const newLogs = [...logs, ...currentLogs];

			setLogs(newLogs);
			onTimeRangeChange({
				start: currentParams?.start,
				end: timeRange?.end || currentParams?.end,
				pageSize: newLogs.length,
			});
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	const handleEndReached = (index: number): void => {
		if (!listQuery) return;

		if (isLimit) return;
		if (logs.length < pageSize) return;

		const { limit, filters } = listQuery;

		const lastLog = logs[index];

		const nextLogsLength = logs.length + pageSize;

		const nextPageSize =
			limit && nextLogsLength >= limit ? limit - logs.length : pageSize;

		if (!stagedQuery) return;

		const newRequestData = getRequestData(stagedQuery, {
			filters,
			page: page + 1,
			log: orderByTimestamp ? lastLog : null,
			pageSize: nextPageSize,
		});

		setPage((prevPage) => prevPage + 1);

		setRequestData(newRequestData);
	};

	return { logs, handleEndReached, isFetching };
};
