/* eslint-disable sonarjs/cognitive-complexity */
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	getOrderByTimestamp,
	INITIAL_PAGE_SIZE,
	INITIAL_PAGE_SIZE_SMALL_FONT,
	LOGS_MORE_PAGE_SIZE,
} from 'container/LogsContextList/configs';
import { getRequestData } from 'container/LogsContextList/utils';
import { FontSize } from 'container/OptionsMenu/types';
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
	fontSize,
}: {
	log: ILog;
	query: Query;
	order: string;
	isEdit: boolean;
	filters: TagFilter | null;
	page: number;
	setPage: Dispatch<SetStateAction<number>>;
	fontSize?: FontSize;
}): {
	logs: ILog[];
	handleShowNextLines: () => void;
	isError: boolean;
	isFetching: boolean;
	isDisabledFetch: boolean;
} => {
	const [logs, setLogs] = useState<ILog[]>([]);

	const [lastLog, setLastLog] = useState<ILog>(log);

	const orderByTimestamp = useMemo(() => getOrderByTimestamp(order), [order]);

	const logsMorePageSize = useMemo(() => (page - 1) * LOGS_MORE_PAGE_SIZE, [
		page,
	]);

	const initialPageSize =
		fontSize && fontSize === FontSize.SMALL
			? INITIAL_PAGE_SIZE_SMALL_FONT
			: INITIAL_PAGE_SIZE;
	const pageSize = useMemo(
		() => (page <= 1 ? initialPageSize : logsMorePageSize + initialPageSize),
		[page, initialPageSize, logsMorePageSize],
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
				log: lastLog,
				orderByTimestamp,
				page,
				pageSize: initialPageSize,
			}),
		[
			currentStagedQueryData,
			query,
			lastLog,
			orderByTimestamp,
			page,
			initialPageSize,
		],
	);

	const [requestData, setRequestData] = useState<Query | null>(
		initialLogsRequest,
	);

	const handleSuccess = useCallback(
		(data: SuccessResponse<MetricRangePayloadProps, unknown>) => {
			const currentData = data?.payload?.data?.newResult?.data?.result || [];

			if (currentData.length > 0 && currentData[0].list) {
				const currentLogs: ILog[] = currentData[0].list.map((item) => ({
					...item.data,
					timestamp: item.timestamp,
				}));

				if (order === ORDERBY_FILTERS.ASC) {
					const reversedCurrentLogs = currentLogs.reverse();
					setLogs([...reversedCurrentLogs]);
					setLastLog(reversedCurrentLogs[0]);
				} else {
					setLogs([...currentLogs]);
					setLastLog(currentLogs[currentLogs.length - 1]);
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
			log: lastLog,
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
		lastLog,
		currentStagedQueryData,
		isDisabledFetch,
		orderByTimestamp,
	]);

	useEffect(() => {
		if (!isEdit) return;

		const newRequestData = getRequestData({
			stagedQueryData: currentStagedQueryData,
			query,
			log: lastLog,
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
