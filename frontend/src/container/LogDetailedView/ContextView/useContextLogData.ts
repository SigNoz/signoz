import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	getOrderByTimestamp,
	INITIAL_PAGE_SIZE,
	LOGS_MORE_PAGE_SIZE,
} from 'container/LogsContextList/configs';
import { getRequestData } from 'container/LogsContextList/utils';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { SuccessResponse } from 'types/api';
import { ILog } from 'types/api/logs/log';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export const useContextLogData = ({
	log,
	query,
	order,
	isEdit,
	filters,
	page,
	setPage,
}: {
	log: ILog;
	query: Query;
	order: string;
	isEdit: boolean;
	filters: TagFilter | null;
	page: number;
	setPage: Dispatch<SetStateAction<number>>;
}): {
	logs: ILog[];
	handleShowNextLines: () => void;
	isError: boolean;
	isFetching: boolean;
	isDisabledFetch: boolean;
} => {
	const [logs, setLogs] = useState<ILog[]>([]);

	const orderByTimestamp = useMemo(() => getOrderByTimestamp(order), [order]);

	const logsMorePageSize = useMemo(() => (page - 1) * LOGS_MORE_PAGE_SIZE, [
		page,
	]);
	const pageSize = useMemo(
		() => (page <= 1 ? INITIAL_PAGE_SIZE : logsMorePageSize + INITIAL_PAGE_SIZE),
		[page, logsMorePageSize],
	);
	const isDisabledFetch = useMemo(() => logs.length < pageSize, [
		logs.length,
		pageSize,
	]);

	const currentStagedQueryData = useMemo(() => {
		if (!query || query.builder.queryData.length !== 1) return null;

		return query.builder.queryData[0];
	}, [query]);

	const initialLogsRequest = useMemo(
		() =>
			getRequestData({
				stagedQueryData: currentStagedQueryData,
				query,
				log,
				orderByTimestamp,
				page,
			}),
		[currentStagedQueryData, page, log, query, orderByTimestamp],
	);

	const [requestData, setRequestData] = useState<Query | null>(
		initialLogsRequest,
	);

	const handleSuccess = useCallback(
		(data: SuccessResponse<MetricRangePayloadProps, unknown>) => {
			const currentData = data?.payload.data.newResult.data.result || [];

			if (currentData.length > 0 && currentData[0].list) {
				const currentLogs: ILog[] = currentData[0].list.map((item) => ({
					...item.data,
					timestamp: item.timestamp,
				}));

				if (order === ORDERBY_FILTERS.ASC) {
					const reversedCurrentLogs = currentLogs.reverse();
					setLogs([...reversedCurrentLogs]);
				} else {
					setLogs([...currentLogs]);
				}
			}
		},
		[order],
	);

	const { isError, isFetching } = useGetExplorerQueryRange(
		requestData,
		PANEL_TYPES.LIST,
		DEFAULT_ENTITY_VERSION,
		{
			keepPreviousData: true,
			enabled: !!requestData,
			onSuccess: handleSuccess,
		},
	);

	const handleShowNextLines = useCallback(() => {
		const newRequestData = getRequestData({
			stagedQueryData: currentStagedQueryData,
			query,
			log,
			orderByTimestamp,
			page: page + 1,
			pageSize: LOGS_MORE_PAGE_SIZE,
		});

		setPage((prevPage) => prevPage + 1);
		setRequestData(newRequestData);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		query,
		page,
		order,
		currentStagedQueryData,
		isDisabledFetch,
		orderByTimestamp,
	]);

	useEffect(() => {
		if (!isEdit) return;

		const newRequestData = getRequestData({
			stagedQueryData: currentStagedQueryData,
			query,
			log,
			orderByTimestamp,
			page: 1,
		});

		setPage(1);
		setLogs([]);
		setRequestData(newRequestData);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	return {
		logs,
		handleShowNextLines,
		isError,
		isFetching,
		isDisabledFetch,
	};
};
