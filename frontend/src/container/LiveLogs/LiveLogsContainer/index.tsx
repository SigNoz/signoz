import { Col } from 'antd';
import Spinner from 'components/Spinner';
import { MAX_LOGS_LIST_SIZE } from 'constants/liveTail';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import GoToTop from 'container/GoToTop';
import FiltersInput from 'container/LiveLogs/FiltersInput';
import LiveLogsTopNav from 'container/LiveLogsTopNav';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useEventSourceEvent } from 'hooks/useEventSourceEvent';
import { useNotifications } from 'hooks/useNotifications';
import { prepareQueryRangePayload } from 'lib/dashboard/prepareQueryRangePayload';
import { useEventSource } from 'providers/EventSource';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ILog } from 'types/api/logs/log';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import { idObject } from '../constants';
import ListViewPanel from '../ListViewPanel';
import LiveLogsList from '../LiveLogsList';
import { QueryHistoryState } from '../types';
import { prepareQueryByFilter } from '../utils';
import { ContentWrapper, LiveLogsChart, Wrapper } from './styles';

function LiveLogsContainer(): JSX.Element {
	const location = useLocation();
	const [logs, setLogs] = useState<ILog[]>([]);

	const { stagedQuery } = useQueryBuilder();

	const queryLocationState = location.state as QueryHistoryState;

	const batchedEventsRef = useRef<ILog[]>([]);

	const { notifications } = useNotifications();

	const { selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const {
		handleStartOpenConnection,
		handleCloseConnection,
		initialLoading,
		isConnectionLoading,
	} = useEventSource();

	const compositeQuery = useGetCompositeQueryParam();

	const updateLogs = useCallback((newLogs: ILog[]) => {
		setLogs((prevState) =>
			[...newLogs, ...prevState].slice(0, MAX_LOGS_LIST_SIZE),
		);

		batchedEventsRef.current = [];
	}, []);

	const debouncedUpdateLogs = useDebouncedFn(() => {
		const reversedData = batchedEventsRef.current.reverse();
		updateLogs(reversedData);
	}, 500);

	const batchLiveLog = useCallback(
		(log: ILog): void => {
			batchedEventsRef.current.push(log);

			debouncedUpdateLogs();
		},
		[debouncedUpdateLogs],
	);

	const handleGetLiveLogs = useCallback(
		(event: MessageEvent<string>) => {
			const data: ILog = JSON.parse(event.data);

			batchLiveLog(data);
		},
		[batchLiveLog],
	);

	const handleError = useCallback(() => {
		notifications.error({ message: 'Sorry, something went wrong' });
	}, [notifications]);

	useEventSourceEvent('message', handleGetLiveLogs);
	useEventSourceEvent('error', handleError);

	const getPreparedQuery = useCallback(
		(query: Query): Query => {
			const firstLogId: string | null = logs.length ? logs[0].id : null;

			const preparedQuery: Query = prepareQueryByFilter(
				query,
				idObject,
				firstLogId,
			);

			return preparedQuery;
		},
		[logs],
	);

	const openConnection = useCallback(
		(query: Query) => {
			const { queryPayload } = prepareQueryRangePayload({
				query,
				graphType: PANEL_TYPES.LIST,
				selectedTime: 'GLOBAL_TIME',
				globalSelectedInterval: globalSelectedTime,
			});

			const encodedQueryPayload = encodeURIComponent(JSON.stringify(queryPayload));
			const queryString = `q=${encodedQueryPayload}`;

			handleStartOpenConnection({ queryString });
		},
		[globalSelectedTime, handleStartOpenConnection],
	);

	const handleStartNewConnection = useCallback(
		(query: Query) => {
			handleCloseConnection();

			const preparedQuery = getPreparedQuery(query);

			openConnection(preparedQuery);
		},
		[getPreparedQuery, handleCloseConnection, openConnection],
	);

	useEffect(() => {
		if (!compositeQuery) return;

		if (
			(initialLoading && !isConnectionLoading) ||
			compositeQuery.id !== stagedQuery?.id
		) {
			handleStartNewConnection(compositeQuery);
		}
	}, [
		compositeQuery,
		initialLoading,
		stagedQuery,
		isConnectionLoading,
		openConnection,
		handleStartNewConnection,
	]);

	useEffect(() => {
		const prefetchedList = queryLocationState?.listQueryPayload[0]?.list;

		if (prefetchedList) {
			const prefetchedLogs: ILog[] = prefetchedList
				.map((item) => ({
					...item.data,
					timestamp: item.timestamp,
				}))
				.reverse();

			updateLogs(prefetchedLogs);
		}
	}, [queryLocationState, updateLogs]);

	return (
		<Wrapper>
			<LiveLogsTopNav />
			<ContentWrapper gutter={[0, 20]} style={{ color: themeColors.lightWhite }}>
				<Col span={24}>
					<FiltersInput />
				</Col>
				{initialLoading && logs.length === 0 ? (
					<Col span={24}>
						<Spinner style={{ height: 'auto' }} tip="Fetching Logs" />
					</Col>
				) : (
					<>
						<Col span={24}>
							<LiveLogsChart
								initialData={queryLocationState?.graphQueryPayload || null}
							/>
						</Col>
						<Col span={24}>
							<ListViewPanel />
						</Col>
						<Col span={24}>
							<LiveLogsList logs={logs} />
						</Col>
					</>
				)}
				<GoToTop />
			</ContentWrapper>
		</Wrapper>
	);
}

export default LiveLogsContainer;
