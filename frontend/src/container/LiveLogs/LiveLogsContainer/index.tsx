import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Switch, Typography } from 'antd';
import LogsFormatOptionsMenu from 'components/LogsFormatOptionsMenu/LogsFormatOptionsMenu';
import { MAX_LOGS_LIST_SIZE } from 'constants/liveTail';
import { LOCALSTORAGE } from 'constants/localStorage';
import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import GoToTop from 'container/GoToTop';
import { useOptionsMenu } from 'container/OptionsMenu';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useEventSourceEvent } from 'hooks/useEventSourceEvent';
import { useEventSource } from 'providers/EventSource';
import { DataSource, StringOperators } from 'types/common/queryBuilder';
import { validateQuery } from 'utils/queryValidationUtils';

import LiveLogsList from '../LiveLogsList';
import { ILiveLogsLog } from '../LiveLogsList/types';
import LiveLogsListChart from '../LiveLogsListChart';
import { QueryHistoryState } from '../types';

import './LiveLogsContainer.styles.scss';

interface LiveLogsContainerProps {
	handleChangeSelectedView?: ChangeViewFunctionType;
}

function LiveLogsContainer({
	handleChangeSelectedView,
}: LiveLogsContainerProps): JSX.Element {
	const location = useLocation();
	const [logs, setLogs] = useState<ILiveLogsLog[]>([]);
	const { currentQuery, stagedQuery } = useQueryBuilder();
	const [showLiveLogsFrequencyChart, setShowLiveLogsFrequencyChart] = useState(
		true,
	);

	const listQuery = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length < 1) {
			return null;
		}

		return stagedQuery.builder.queryData.find((item) => !item.disabled) || null;
	}, [stagedQuery]);

	const queryLocationState = location.state as QueryHistoryState;

	const batchedEventsRef = useRef<ILiveLogsLog[]>([]);

	const prevFilterExpressionRef = useRef<string | null>(null);

	const { options, config } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator: listQuery?.aggregateOperator || StringOperators.NOOP,
	});

	const formatItems = [
		{
			key: 'raw',
			label: 'Raw',
			data: {
				title: 'max lines per row',
			},
		},
		{
			key: 'list',
			label: 'Default',
		},
		{
			key: 'table',
			label: 'Column',
			data: {
				title: 'columns',
			},
		},
	];

	const {
		handleStartOpenConnection,
		handleCloseConnection,
		initialLoading,
		isConnectionLoading,
		isConnectionError,
		reconnectDueToError,
	} = useEventSource();

	const compositeQuery = useGetCompositeQueryParam();

	const updateLogs = useCallback((newLogs: ILiveLogsLog[]) => {
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
		(log: ILiveLogsLog): void => {
			batchedEventsRef.current.push(log);

			debouncedUpdateLogs();
		},
		[debouncedUpdateLogs],
	);

	const handleGetLiveLogs = useCallback(
		(event: MessageEvent<string>) => {
			const data: ILiveLogsLog = JSON.parse(event?.data);

			batchLiveLog(data);
		},
		[batchLiveLog],
	);

	const handleError = useCallback(() => {
		console.error('Sorry, something went wrong');
	}, []);

	useEventSourceEvent('message', handleGetLiveLogs);
	useEventSourceEvent('error', handleError);

	const openConnection = useCallback(
		(filterExpression?: string | null) => {
			handleStartOpenConnection(filterExpression || '');
		},
		[handleStartOpenConnection],
	);

	const handleStartNewConnection = useCallback(
		(filterExpression?: string | null) => {
			handleCloseConnection();

			openConnection(filterExpression);
		},
		[handleCloseConnection, openConnection],
	);

	useEffect(() => {
		const currentFilterExpression =
			currentQuery?.builder.queryData[0]?.filter?.expression?.trim() || '';

		// Check if filterExpression has actually changed
		if (
			!prevFilterExpressionRef.current ||
			prevFilterExpressionRef.current !== currentFilterExpression
		) {
			const validationResult = validateQuery(currentFilterExpression || '');

			if (validationResult.isValid) {
				setLogs([]);
				batchedEventsRef.current = [];
				handleStartNewConnection(currentFilterExpression);
			}

			prevFilterExpressionRef.current = currentFilterExpression || null;
		}
	}, [currentQuery, handleStartNewConnection]);

	useEffect(() => {
		if (initialLoading && !isConnectionLoading) {
			const currentFilterExpression =
				currentQuery?.builder.queryData[0]?.filter?.expression?.trim() || '';

			const validationResult = validateQuery(currentFilterExpression || '');

			if (validationResult.isValid) {
				handleStartNewConnection(currentFilterExpression);
				prevFilterExpressionRef.current = currentFilterExpression || null;
			} else {
				handleStartNewConnection(null);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialLoading, isConnectionLoading, handleStartNewConnection]);

	useEffect((): (() => void) | undefined => {
		if (isConnectionError && reconnectDueToError) {
			// Small delay to prevent immediate reconnection attempts
			const reconnectTimer = setTimeout(() => {
				const fallbackFilterExpression =
					prevFilterExpressionRef.current ||
					currentQuery?.builder.queryData[0]?.filter?.expression?.trim() ||
					null;

				const validationResult = validateQuery(fallbackFilterExpression || '');

				if (validationResult.isValid) {
					handleStartNewConnection(fallbackFilterExpression);
				} else {
					handleStartNewConnection(null);
				}
			}, 1000);

			return (): void => clearTimeout(reconnectTimer);
		}
		return undefined;
	}, [
		isConnectionError,
		reconnectDueToError,
		compositeQuery,
		handleStartNewConnection,
		currentQuery,
	]);

	// clean up the connection when the component unmounts
	useEffect(
		() => (): void => {
			handleCloseConnection();
		},
		[handleCloseConnection],
	);

	const handleToggleFrequencyChart = useCallback(() => {
		setShowLiveLogsFrequencyChart(!showLiveLogsFrequencyChart);
	}, [showLiveLogsFrequencyChart]);

	return (
		<div className="live-logs-container">
			<div className="live-logs-content">
				<div className="live-logs-settings-panel">
					<div className="live-logs-frequency-chart-view-controller">
						<Typography>Frequency chart</Typography>
						<Switch
							size="small"
							checked={showLiveLogsFrequencyChart}
							defaultChecked
							onChange={handleToggleFrequencyChart}
						/>
					</div>

					<LogsFormatOptionsMenu
						items={formatItems}
						selectedOptionFormat={options.format}
						config={config}
					/>
				</div>

				{showLiveLogsFrequencyChart && (
					<div className="live-logs-chart-container">
						<LiveLogsListChart
							initialData={queryLocationState?.graphQueryPayload || null}
							className="live-logs-chart"
							isShowingLiveLogs
						/>
					</div>
				)}

				<div className="live-logs-list-container">
					<LiveLogsList
						logs={logs}
						isLoading={initialLoading && logs.length === 0}
						handleChangeSelectedView={handleChangeSelectedView}
					/>
				</div>
			</div>

			<GoToTop />
		</div>
	);
}

LiveLogsContainer.defaultProps = {
	handleChangeSelectedView: undefined,
};

export default LiveLogsContainer;
