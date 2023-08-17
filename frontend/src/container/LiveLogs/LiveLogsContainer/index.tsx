import { Col } from 'antd';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import GoToTop from 'container/GoToTop';
import BackButton from 'container/LiveLogs/BackButton';
import FiltersInput from 'container/LiveLogs/FiltersInput';
import LiveLogsTopNav from 'container/LiveLogsTopNav';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useEventSourceEvent } from 'hooks/useEventSourceEvent';
import { useNotifications } from 'hooks/useNotifications';
import { useEventSource } from 'providers/EventSource';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { prepareQueryRangePayload } from 'store/actions/dashboard/prepareQueryRangePayload';
import { AppState } from 'store/reducers';
import { ILog } from 'types/api/logs/log';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import { idObject } from '../constants';
import ListViewPanel from '../ListViewPanel';
import LiveLogsList from '../LiveLogsList';
import { prepareQueryByFilter } from '../utils';
import { LiveLogsChart, Wrapper } from './styles';

function LiveLogsContainer(): JSX.Element {
	const [logs, setLogs] = useState<ILog[]>([]);

	const { stagedQuery } = useQueryBuilder();

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

	const updateLogs = useCallback(() => {
		setLogs(batchedEventsRef.current);

		batchedEventsRef.current = [];
	}, []);

	const debouncedUpdateLogs = useDebouncedFn(updateLogs, 500);

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

	const handleStartNewConnection = useCallback(() => {
		if (!compositeQuery) return;

		handleCloseConnection();

		const { queryPayload } = prepareQueryRangePayload({
			query: compositeQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
		});

		const encodedQueryPayload = encodeURIComponent(JSON.stringify(queryPayload));

		const queryString = `q=${encodedQueryPayload}`;

		handleStartOpenConnection({ queryString });
	}, [
		compositeQuery,
		globalSelectedTime,
		handleCloseConnection,
		handleStartOpenConnection,
	]);

	useEffect(() => {
		if (!compositeQuery || !stagedQuery) return;

		if (compositeQuery.id !== stagedQuery.id || initialLoading) {
			handleStartNewConnection();
		}
	}, [stagedQuery, initialLoading, compositeQuery, handleStartNewConnection]);

	return (
		<>
			<LiveLogsTopNav getPreparedQuery={getPreparedQuery} />
			<Wrapper gutter={[0, 20]} style={{ color: themeColors.lightWhite }}>
				<Col span={24}>
					<BackButton />
				</Col>
				<Col span={24}>
					<FiltersInput getPreparedQuery={getPreparedQuery} />
				</Col>
				{initialLoading ? (
					<Col span={24}>
						<Spinner style={{ height: 'auto' }} tip="Getting logs" />
					</Col>
				) : (
					<>
						<Col span={24}>
							<LiveLogsChart />
						</Col>
						<Col span={24}>
							<ListViewPanel />
						</Col>
						<Col span={24}>
							{isConnectionLoading ? (
								<Spinner style={{ height: 'auto' }} tip="Getting logs" />
							) : (
								<LiveLogsList logs={logs} />
							)}
						</Col>
					</>
				)}
				<GoToTop />
			</Wrapper>
		</>
	);
}

export default LiveLogsContainer;
