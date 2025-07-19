import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { isEqual } from 'lodash-es';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { ILog } from 'types/api/logs/log';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

interface TimeRange {
	startTime: number;
	endTime: number;
}

interface UsePaginatedLogsProps {
	timeRange: TimeRange;
	filters: IBuilderQuery['filters'];
	queryKeyFilters?: string[];
	excludeFilterKeys?: string[];
	basePayload: GetQueryResultsProps;
}

interface UseHandleLogsPagination {
	logs: ILog[];
	hasReachedEndOfLogs: boolean;
	isPaginating: boolean;
	currentPage: number;
	resetLogsList: boolean;
	setIsPaginating: Dispatch<SetStateAction<boolean>>;
	handleNewData: (currentData: any) => void;
	loadMoreLogs: () => void;
	shouldResetPage: boolean;
	queryPayload: GetQueryResultsProps;
}

export const useHandleLogsPagination = ({
	timeRange,
	filters,
	queryKeyFilters = [],
	excludeFilterKeys = [],
	basePayload,
}: UsePaginatedLogsProps): UseHandleLogsPagination => {
	const [logs, setLogs] = useState<ILog[]>([]);
	const [hasReachedEndOfLogs, setHasReachedEndOfLogs] = useState(false);
	const [restFilters, setRestFilters] = useState<TagFilterItem[]>([]);
	const [resetLogsList, setResetLogsList] = useState<boolean>(false);
	const [page, setPage] = useState(1);
	const [prevTimeRange, setPrevTimeRange] = useState<TimeRange | null>(
		timeRange,
	);
	const [isPaginating, setIsPaginating] = useState(false);

	const { shouldResetPage, newRestFilters } = useMemo(() => {
		const newRestFilters = filters?.items?.filter((item) => {
			const keyToCheck = item.key?.key ?? '';
			return (
				!queryKeyFilters.includes(keyToCheck) &&
				!excludeFilterKeys.includes(keyToCheck)
			);
		});

		const areFiltersSame = isEqual(restFilters, newRestFilters);

		const shouldResetPage =
			!areFiltersSame ||
			timeRange.startTime !== prevTimeRange?.startTime ||
			timeRange.endTime !== prevTimeRange?.endTime;

		return { shouldResetPage, newRestFilters };
	}, [
		filters,
		timeRange,
		prevTimeRange,
		queryKeyFilters,
		excludeFilterKeys,
		restFilters,
	]);

	const currentPage = useMemo(() => {
		if (shouldResetPage) {
			return 1;
		}
		return page;
	}, [shouldResetPage, page]);

	// Handle data updates
	const handleNewData = useCallback(
		(currentData: any) => {
			if (!currentData[0].list) {
				setHasReachedEndOfLogs(true);
				return;
			}

			const currentLogs: ILog[] =
				currentData[0].list?.map((item: any) => ({
					...item.data,
					timestamp: item.timestamp,
				})) || [];

			if (resetLogsList) {
				setLogs(currentLogs);
				setResetLogsList(false);
				return;
			}

			const newLogs = currentLogs.filter(
				(newLog) => !logs.some((existingLog) => isEqual(existingLog, newLog)),
			);

			if (newLogs.length > 0) {
				setLogs((prev) => [...prev, ...newLogs]);
			}
		},
		[logs, resetLogsList],
	);

	// Reset logic
	useEffect(() => {
		if (shouldResetPage) {
			setPage(1);
			setLogs([]);
			setResetLogsList(true);
		}

		setPrevTimeRange(timeRange);
		setRestFilters(newRestFilters || []);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldResetPage, timeRange]);

	const loadMoreLogs = useCallback(() => {
		if (!logs.length) return;
		setPage((prev) => prev + 1);
		setIsPaginating(true);
	}, [logs]);

	const queryPayload = useMemo(
		() => ({
			...basePayload,
			query: {
				...basePayload.query,
				builder: {
					...basePayload.query.builder,
					queryData: [
						{
							...basePayload.query.builder.queryData[0],
							pageSize: DEFAULT_PER_PAGE_VALUE,
							offset: (currentPage - 1) * DEFAULT_PER_PAGE_VALUE,
							orderBy: [
								{ columnName: 'timestamp', order: ORDERBY_FILTERS.DESC },
								{ columnName: 'id', order: ORDERBY_FILTERS.DESC },
							],
						},
					],
				},
			},
		}),
		[basePayload, currentPage],
	);

	return {
		logs,
		hasReachedEndOfLogs,
		isPaginating,
		currentPage,
		resetLogsList,
		queryPayload,
		setIsPaginating,
		handleNewData,
		loadMoreLogs,
		shouldResetPage,
	};
};
