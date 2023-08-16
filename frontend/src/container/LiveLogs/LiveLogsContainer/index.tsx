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
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import ListViewPanel from '../ListViewPanel';
import LiveLogsList from '../LiveLogsList';
import { LiveLogsChart, Wrapper } from './styles';
import { prepareQueryFilter } from './utils';

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

	const handleStartNewConnection = useCallback(() => {
		if (!compositeQuery) return;

		const idObject: BaseAutocompleteData = {
			key: 'id',
			type: '',
			dataType: 'string',
			isColumn: true,
		};

		const preparedQuery: Query = {
			...compositeQuery,
			builder: {
				...compositeQuery.builder,
				queryData: compositeQuery.builder.queryData.map((item) => ({
					...item,
					filters:
						logs.length > 0
							? prepareQueryFilter(item.filters, idObject, logs[0].id)
							: item.filters,
				})),
			},
		};

		handleCloseConnection();

		const { queryPayload } = prepareQueryRangePayload({
			query: preparedQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
		});

		const encodedQueryPayload = encodeURIComponent(JSON.stringify(queryPayload));

		const queryString = `q=${encodedQueryPayload}`;

		handleStartOpenConnection({ queryString });
	}, [
		compositeQuery,
		logs,
		handleCloseConnection,
		globalSelectedTime,
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
			<LiveLogsTopNav onOpenConnection={handleStartNewConnection} />
			<Wrapper gutter={[0, 20]} style={{ color: themeColors.lightWhite }}>
				<Col span={24}>
					<BackButton />
				</Col>
				<Col span={24}>
					<FiltersInput />
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
