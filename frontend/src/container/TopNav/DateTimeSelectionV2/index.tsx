import './DateTimeSelectionV2.styles.scss';

import { SyncOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import {
	constructCompositeQuery,
	defaultLiveQueryDataConfig,
} from 'container/LiveLogs/constants';
import { QueryHistoryState } from 'container/LiveLogs/types';
import dayjs, { Dayjs } from 'dayjs';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { updateStepInterval } from 'hooks/queryBuilder/useStepInterval';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import { ChevronDown, ChevronUp, Clock4 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { connect, useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading, UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';

import AutoRefresh from '../AutoRefreshV2';
import CustomDateTimeModal, { DateTimeRangeType } from '../CustomDateTimeModal';
import {
	FixedDurationSuggestionOptions,
	getDefaultOption,
	getOptions,
	Option,
	RelativeDurationSuggestionOptions,
	Time,
} from './config';
import RefreshText from './Refresh';
import { Form, FormContainer, FormItem } from './styles';

function DateTimeSelection({
	location,
	updateTimeInterval,
	globalTimeLoading,
}: Props): JSX.Element {
	const [formSelector] = Form.useForm();

	const [isOpen, setIsOpen] = useState<boolean>(false);
	const urlQuery = useUrlQuery();
	const searchStartTime = urlQuery.get('startTime');
	const searchEndTime = urlQuery.get('endTime');
	const queryClient = useQueryClient();

	const localstorageStartTime = getLocalStorageKey('startTime');
	const localstorageEndTime = getLocalStorageKey('endTime');

	const getTime = useCallback((): [number, number] | undefined => {
		if (searchEndTime && searchStartTime) {
			const startDate = dayjs(
				new Date(parseInt(getTimeString(searchStartTime), 10)),
			);
			const endDate = dayjs(new Date(parseInt(getTimeString(searchEndTime), 10)));

			return [startDate.toDate().getTime() || 0, endDate.toDate().getTime() || 0];
		}
		if (localstorageStartTime && localstorageEndTime) {
			const startDate = dayjs(localstorageStartTime);
			const endDate = dayjs(localstorageEndTime);

			return [startDate.toDate().getTime() || 0, endDate.toDate().getTime() || 0];
		}
		return undefined;
	}, [
		localstorageEndTime,
		localstorageStartTime,
		searchEndTime,
		searchStartTime,
	]);

	const [options, setOptions] = useState(getOptions(location.pathname));
	const [refreshButtonHidden, setRefreshButtonHidden] = useState<boolean>(false);
	const [customDateTimeVisible, setCustomDTPickerVisible] = useState<boolean>(
		false,
	);

	const { stagedQuery, initQueryBuilderData, panelType } = useQueryBuilder();

	const handleGoLive = useCallback(() => {
		if (!stagedQuery) return;

		setIsOpen(false);
		let queryHistoryState: QueryHistoryState | null = null;

		const compositeQuery = constructCompositeQuery({
			query: stagedQuery,
			initialQueryData: initialQueryBuilderFormValuesMap.logs,
			customQueryData: defaultLiveQueryDataConfig,
		});

		const isListView =
			panelType === PANEL_TYPES.LIST && stagedQuery.builder.queryData[0];

		if (isListView) {
			const [graphQuery, listQuery] = queryClient.getQueriesData<
				SuccessResponse<MetricRangePayloadProps> | ErrorResponse
			>({
				queryKey: REACT_QUERY_KEY.GET_QUERY_RANGE,
				active: true,
			});

			queryHistoryState = {
				graphQueryPayload:
					graphQuery && graphQuery[1]
						? graphQuery[1].payload?.data.result || []
						: [],
				listQueryPayload:
					listQuery && listQuery[1]
						? listQuery[1].payload?.data.newResult.data.result || []
						: [],
			};
		}

		const JSONCompositeQuery = encodeURIComponent(JSON.stringify(compositeQuery));

		const path = `${ROUTES.LIVE_LOGS}?${QueryParams.compositeQuery}=${JSONCompositeQuery}`;

		history.push(path, queryHistoryState);
	}, [panelType, queryClient, stagedQuery]);

	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const getInputLabel = (
		startTime?: Dayjs,
		endTime?: Dayjs,
		timeInterval: Time = '15min',
	): string | Time => {
		if (startTime && endTime && timeInterval === 'custom') {
			const format = 'YYYY/MM/DD HH:mm';

			const startString = startTime.format(format);
			const endString = endTime.format(format);

			return `${startString} - ${endString}`;
		}

		return timeInterval;
	};

	useEffect(() => {
		if (selectedTime === 'custom') {
			setRefreshButtonHidden(true);
		} else {
			setRefreshButtonHidden(false);
		}
	}, [selectedTime]);

	const getDefaultTime = (pathName: string): Time => {
		const defaultSelectedOption = getDefaultOption(pathName);

		const routes = getLocalStorageKey(LOCALSTORAGE.METRICS_TIME_IN_DURATION);

		if (routes !== null) {
			const routesObject = JSON.parse(routes || '{}');
			const selectedTime = routesObject[pathName];

			if (selectedTime) {
				return selectedTime;
			}
		}

		return defaultSelectedOption;
	};

	const updateLocalStorageForRoutes = (value: Time): void => {
		const preRoutes = getLocalStorageKey(LOCALSTORAGE.METRICS_TIME_IN_DURATION);
		if (preRoutes !== null) {
			const preRoutesObject = JSON.parse(preRoutes);

			const preRoute = {
				...preRoutesObject,
			};
			preRoute[location.pathname] = value;

			setLocalStorageKey(
				LOCALSTORAGE.METRICS_TIME_IN_DURATION,
				JSON.stringify(preRoute),
			);
		}
	};

	const onLastRefreshHandler = useCallback(() => {
		const currentTime = dayjs();

		const lastRefresh = dayjs(
			selectedTime === 'custom' ? minTime / 1000000 : maxTime / 1000000,
		);

		const secondsDiff = currentTime.diff(lastRefresh, 'seconds');

		const minutedDiff = currentTime.diff(lastRefresh, 'minutes');
		const hoursDiff = currentTime.diff(lastRefresh, 'hours');
		const daysDiff = currentTime.diff(lastRefresh, 'days');
		const monthsDiff = currentTime.diff(lastRefresh, 'months');

		if (monthsDiff > 0) {
			return `Refreshed -${monthsDiff} months ago`;
		}

		if (daysDiff > 0) {
			return `Refreshed - ${daysDiff} days ago`;
		}

		if (hoursDiff > 0) {
			return `Refreshed - ${hoursDiff} hrs ago`;
		}

		if (minutedDiff > 0) {
			return `Refreshed - ${minutedDiff} mins ago`;
		}

		return `Refreshed - ${secondsDiff} sec ago`;
	}, [maxTime, minTime, selectedTime]);

	const isLogsExplorerPage = useMemo(
		() => location.pathname === ROUTES.LOGS_EXPLORER,
		[location.pathname],
	);

	const onSelectHandler = (value: Time): void => {
		setIsOpen(false);
		if (value !== 'custom') {
			updateTimeInterval(value);
			updateLocalStorageForRoutes(value);
			if (refreshButtonHidden) {
				setRefreshButtonHidden(false);
			}
		} else {
			setRefreshButtonHidden(true);
			setCustomDTPickerVisible(true);
		}

		const { maxTime, minTime } = GetMinMax(value, getTime());

		if (!isLogsExplorerPage) {
			urlQuery.set(QueryParams.startTime, minTime.toString());
			urlQuery.set(QueryParams.endTime, maxTime.toString());
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.replace(generatedUrl);
		}

		if (!stagedQuery) {
			return;
		}
		initQueryBuilderData(updateStepInterval(stagedQuery, maxTime, minTime));
	};

	const onRefreshHandler = (): void => {
		onSelectHandler(selectedTime);
		onLastRefreshHandler();
	};

	const onCustomDateHandler = (dateTimeRange: DateTimeRangeType): void => {
		if (dateTimeRange !== null) {
			const [startTimeMoment, endTimeMoment] = dateTimeRange;
			if (startTimeMoment && endTimeMoment) {
				setCustomDTPickerVisible(false);
				updateTimeInterval('custom', [
					startTimeMoment?.toDate().getTime() || 0,
					endTimeMoment?.toDate().getTime() || 0,
				]);
				setLocalStorageKey('startTime', startTimeMoment.toString());
				setLocalStorageKey('endTime', endTimeMoment.toString());
				updateLocalStorageForRoutes('custom');
				if (!isLogsExplorerPage) {
					urlQuery.set(QueryParams.startTime, startTimeMoment.toString());
					urlQuery.set(QueryParams.endTime, endTimeMoment.toString());
					const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
					history.replace(generatedUrl);
				}
			}
		}
	};

	// this is triggred when we change the routes and based on that we are changing the default options
	useEffect(() => {
		const metricsTimeDuration = getLocalStorageKey(
			LOCALSTORAGE.METRICS_TIME_IN_DURATION,
		);

		if (metricsTimeDuration === null) {
			setLocalStorageKey(
				LOCALSTORAGE.METRICS_TIME_IN_DURATION,
				JSON.stringify({}),
			);
		}

		const currentRoute = location.pathname;
		const time = getDefaultTime(currentRoute);

		const currentOptions = getOptions(currentRoute);
		setOptions(currentOptions);

		const getCustomOrIntervalTime = (time: Time): Time => {
			if (searchEndTime !== null && searchStartTime !== null) {
				return 'custom';
			}
			if (
				(localstorageEndTime === null || localstorageStartTime === null) &&
				time === 'custom'
			) {
				return getDefaultOption(currentRoute);
			}

			return time;
		};

		const updatedTime = getCustomOrIntervalTime(time);

		const [preStartTime = 0, preEndTime = 0] = getTime() || [];

		setRefreshButtonHidden(updatedTime === 'custom');

		updateTimeInterval(updatedTime, [preStartTime, preEndTime]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname, updateTimeInterval, globalTimeLoading]);

	function getTimeChips(options: Option[]): JSX.Element {
		return (
			<div className="relative-date-time-section">
				{options.map((option) => (
					<Button
						type="text"
						className="time-btns"
						key={option.label + option.value}
						onClick={(): void => {
							onSelectHandler(option.value);
						}}
					>
						{option.label}
					</Button>
				))}
			</div>
		);
	}

	return (
		<>
			<RefreshText
				{...{
					onLastRefreshHandler,
				}}
				refreshButtonHidden={refreshButtonHidden}
			/>
			<Form
				form={formSelector}
				layout="inline"
				initialValues={{ interval: selectedTime }}
			>
				<FormContainer>
					<Popover
						placement="bottomRight"
						open={isOpen}
						showArrow={false}
						onOpenChange={setIsOpen}
						rootClassName="date-time-root"
						content={
							<div className="date-time-popover">
								<div className="date-time-options">
									<Button className="data-time-live" type="text" onClick={handleGoLive}>
										Live
									</Button>
									{options.map((option) => (
										<Button
											type="text"
											key={option.label + option.value}
											onClick={(): void => {
												onSelectHandler(option.value);
											}}
											className="date-time-options-btn"
										>
											{option.label}
										</Button>
									))}
								</div>
								<div className="relative-date-time">
									<div>
										<div className="time-heading">RELATIVE TIMES</div>
										<div>{getTimeChips(RelativeDurationSuggestionOptions)}</div>
									</div>
									<div>
										<div className="time-heading">FIXED TIMES</div>
										<div>{getTimeChips(FixedDurationSuggestionOptions)}</div>
									</div>
								</div>
							</div>
						}
						data-testid="dropDown"
						style={{
							minWidth: 120,
						}}
					>
						<Button className="date-time-input-element">
							<div className="date-time-input-content">
								<Clock4 size={14} className="time-btn" />
								{getInputLabel(
									dayjs(minTime / 1000000),
									dayjs(maxTime / 1000000),
									selectedTime,
								)}
							</div>
							{isOpen ? (
								<ChevronUp size={14} className="down-arrow" />
							) : (
								<ChevronDown size={14} className="down-arrow" />
							)}
						</Button>
					</Popover>

					<div className="refresh-actions">
						<FormItem hidden={refreshButtonHidden} className="refresh-btn">
							<Button icon={<SyncOutlined />} onClick={onRefreshHandler} />
						</FormItem>

						<FormItem>
							<AutoRefresh
								disabled={refreshButtonHidden}
								showAutoRefreshBtnPrimary={false}
							/>
						</FormItem>
					</div>
				</FormContainer>
			</Form>

			<CustomDateTimeModal
				visible={customDateTimeVisible}
				onCreate={onCustomDateHandler}
				onCancel={(): void => {
					setCustomDTPickerVisible(false);
				}}
			/>
		</>
	);
}

interface DispatchProps {
	updateTimeInterval: (
		interval: Time,
		dateTimeRange?: [number, number],
	) => (dispatch: Dispatch<AppActions>) => void;
	globalTimeLoading: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateTimeInterval: bindActionCreators(UpdateTimeInterval, dispatch),
	globalTimeLoading: bindActionCreators(GlobalTimeLoading, dispatch),
});

type Props = DispatchProps & RouteComponentProps;

export default connect(null, mapDispatchToProps)(withRouter(DateTimeSelection));
