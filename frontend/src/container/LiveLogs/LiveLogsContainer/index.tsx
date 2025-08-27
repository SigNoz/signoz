import './LiveLogsContainer.styles.scss';

import { MAX_LOGS_LIST_SIZE } from 'constants/liveTail';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GoToTop from 'container/GoToTop';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useEventSourceEvent } from 'hooks/useEventSourceEvent';
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
import LiveLogsListChart from '../LiveLogsListChart';
import { QueryHistoryState } from '../types';
import { prepareQueryByFilter } from '../utils';

function LiveLogsContainer(): JSX.Element {
	const location = useLocation();
	const [logs, setLogs] = useState<ILog[]>([]);

	const { stagedQuery } = useQueryBuilder();

	const queryLocationState = location.state as QueryHistoryState;

	const batchedEventsRef = useRef<ILog[]>([]);

	const { selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const {
		handleStartOpenConnection,
		handleCloseConnection,
		initialLoading,
		isConnectionLoading,
		isConnectionError,
		reconnectDueToError,
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
		console.error('Sorry, something went wrong');
	}, []);

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

	useEffect((): (() => void) | undefined => {
		if (isConnectionError && reconnectDueToError && compositeQuery) {
			// Small delay to prevent immediate reconnection attempts
			const reconnectTimer = setTimeout(() => {
				handleStartNewConnection(compositeQuery);
			}, 1000);

			return (): void => clearTimeout(reconnectTimer);
		}
		return undefined;
	}, [
		isConnectionError,
		reconnectDueToError,
		compositeQuery,
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
		<div className="live-logs-container">
			<div className="live-logs-content">
				<ListViewPanel />
				<div className="live-logs-chart-container">
					<LiveLogsListChart
						initialData={queryLocationState?.graphQueryPayload || null}
					/>
				</div>
				<div className="live-logs-list-container">
					<LiveLogsList
						logs={logs}
						isLoading={initialLoading && logs.length === 0}
					/>
				</div>
			</div>

			<GoToTop />
		</div>
	);
}

export default LiveLogsContainer;
