import './DateTimeSelectionV2.styles.scss';

import { SyncOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Popover, Switch, Tooltip, Typography } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import CustomTimePicker from 'components/CustomTimePicker/CustomTimePicker';
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
import { isObject } from 'lodash-es';
import { Check, Copy, Info, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { connect, useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading, UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';

import AutoRefresh from '../AutoRefreshV2';
import { DateTimeRangeType } from '../CustomDateTimeModal';
import {
	getDefaultOption,
	getOptions,
	LocalStorageTimeRange,
	Time,
	TimeRange,
} from './config';
import RefreshText from './Refresh';
import { Form, FormContainer, FormItem } from './styles';

function DateTimeSelection({
	showAutoRefresh,
	location,
	updateTimeInterval,
	globalTimeLoading,
}: Props): JSX.Element {
	const [formSelector] = Form.useForm();

	const [hasSelectedTimeError, setHasSelectedTimeError] = useState(false);
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const urlQuery = useUrlQuery();
	const searchStartTime = urlQuery.get('startTime');
	const searchEndTime = urlQuery.get('endTime');
	const searchRelativeTime = urlQuery.get('relativeTime');
	const queryClient = useQueryClient();
	const [enableAbsoluteTime, setEnableAbsoluteTime] = useState(false);
	const [isValidteRelativeTime, setIsValidteRelativeTime] = useState(false);
	const [validCustomTime, setValidCustomTime] = useState<string | undefined>(
		undefined,
	);
	const [, handleCopyToClipboard] = useCopyToClipboard();
	const [isURLCopied, setIsURLCopied] = useState(false);

	const {
		localstorageStartTime,
		localstorageEndTime,
	} = ((): LocalStorageTimeRange => {
		const routes = getLocalStorageKey(LOCALSTORAGE.METRICS_TIME_IN_DURATION);

		if (routes !== null) {
			const routesObject = JSON.parse(routes || '{}');
			const selectedTime = routesObject[location.pathname];

			if (selectedTime) {
				let parsedSelectedTime: TimeRange;
				try {
					parsedSelectedTime = JSON.parse(selectedTime);
				} catch {
					parsedSelectedTime = selectedTime;
				}

				if (isObject(parsedSelectedTime)) {
					return {
						localstorageStartTime: parsedSelectedTime.startTime,
						localstorageEndTime: parsedSelectedTime.endTime,
					};
				}
				return { localstorageStartTime: null, localstorageEndTime: null };
			}
		}
		return { localstorageStartTime: null, localstorageEndTime: null };
	})();

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
			const format = 'DD/MM/YYYY HH:mm';

			const startString = startTime.format(format);
			const endString = endTime.format(format);

			return `${startString} - ${endString}`;
		}

		return timeInterval;
	};

	useEffect(() => {
		if (selectedTime === 'custom') {
			setRefreshButtonHidden(true);
			setCustomDTPickerVisible(true);
		} else {
			setRefreshButtonHidden(false);
			setCustomDTPickerVisible(false);
		}
	}, [selectedTime]);

	const getDefaultTime = (pathName: string): Time => {
		const defaultSelectedOption = getDefaultOption(pathName);

		const routes = getLocalStorageKey(LOCALSTORAGE.METRICS_TIME_IN_DURATION);

		if (routes !== null) {
			const routesObject = JSON.parse(routes || '{}');
			const selectedTime = routesObject[pathName];

			if (selectedTime) {
				let parsedSelectedTime: TimeRange;
				try {
					parsedSelectedTime = JSON.parse(selectedTime);
				} catch {
					parsedSelectedTime = selectedTime;
				}
				if (isObject(parsedSelectedTime)) {
					return 'custom';
				}

				return selectedTime;
			}
		}

		return defaultSelectedOption;
	};

	const updateLocalStorageForRoutes = (value: Time | string): void => {
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
			return `Refreshed ${monthsDiff} months ago`;
		}

		if (daysDiff > 0) {
			return `Refreshed ${daysDiff} days ago`;
		}

		if (hoursDiff > 0) {
			return `Refreshed ${hoursDiff} hrs ago`;
		}

		if (minutedDiff > 0) {
			return `Refreshed ${minutedDiff} mins ago`;
		}

		return `Refreshed ${secondsDiff} sec ago`;
	}, [maxTime, minTime, selectedTime]);

	const isLogsExplorerPage = useMemo(
		() => location.pathname === ROUTES.LOGS_EXPLORER,
		[location.pathname],
	);

	const onSelectHandler = (value: Time): void => {
		if (value !== 'custom') {
			setIsOpen(false);
			updateTimeInterval(value);
			updateLocalStorageForRoutes(value);
			setIsValidteRelativeTime(true);
			if (refreshButtonHidden) {
				setRefreshButtonHidden(false);
			}
		} else {
			setRefreshButtonHidden(true);
			setCustomDTPickerVisible(true);
			setIsValidteRelativeTime(false);
			setEnableAbsoluteTime(false);

			return;
		}

		const { maxTime, minTime } = GetMinMax(value, getTime());

		if (!isLogsExplorerPage) {
			// urlQuery.set(QueryParams.startTime, minTime.toString());
			// urlQuery.set(QueryParams.endTime, maxTime.toString());

			urlQuery.delete('startTime');
			urlQuery.delete('endTime');

			urlQuery.set(QueryParams.relativeTime, value);

			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.replace(generatedUrl);
		}

		if (!stagedQuery) {
			return;
		}
		// the second boolean param directs the qb about the time change so to merge the query and retain the current state
		initQueryBuilderData(updateStepInterval(stagedQuery, maxTime, minTime), true);
	};

	const onRefreshHandler = (): void => {
		onSelectHandler(selectedTime);
		onLastRefreshHandler();
	};

	const onCustomDateHandler = (dateTimeRange: DateTimeRangeType): void => {
		// console.log('dateTimeRange', dateTimeRange);
		if (dateTimeRange !== null) {
			const [startTimeMoment, endTimeMoment] = dateTimeRange;
			if (startTimeMoment && endTimeMoment) {
				const startTime = startTimeMoment;
				const endTime = endTimeMoment;
				setCustomDTPickerVisible(false);

				updateTimeInterval('custom', [
					startTime.toDate().getTime(),
					endTime.toDate().getTime(),
				]);

				setLocalStorageKey('startTime', startTime.toString());
				setLocalStorageKey('endTime', endTime.toString());

				updateLocalStorageForRoutes(JSON.stringify({ startTime, endTime }));

				if (!isLogsExplorerPage) {
					urlQuery.set(
						QueryParams.startTime,
						startTime?.toDate().getTime().toString(),
					);
					urlQuery.set(QueryParams.endTime, endTime?.toDate().getTime().toString());
					urlQuery.delete(QueryParams.relativeTime);
					const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
					history.replace(generatedUrl);
				}
			}
		}
	};

	const onValidCustomDateHandler = (
		dateTimeStr: string,
		dateTimeRange: DateTimeRangeType,
	): void => {
		console.log('dateTimeRange', dateTimeStr, dateTimeRange);
		setIsOpen(false);
		updateTimeInterval(dateTimeStr);
		updateLocalStorageForRoutes(dateTimeStr);

		urlQuery.delete('startTime');
		urlQuery.delete('endTime');

		setIsValidteRelativeTime(true);

		const { maxTime, minTime } = GetMinMax(dateTimeStr, getTime());

		console.log({ maxTime, minTime });

		if (!isLogsExplorerPage) {
			// urlQuery.set(QueryParams.startTime, minTime.toString());
			// urlQuery.set(QueryParams.endTime, maxTime.toString());

			urlQuery.delete('startTime');
			urlQuery.delete('endTime');

			urlQuery.set(QueryParams.relativeTime, dateTimeStr);

			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.replace(generatedUrl);
		}

		if (!stagedQuery) {
			return;
		}

		// the second boolean param directs the qb about the time change so to merge the query and retain the current state
		initQueryBuilderData(updateStepInterval(stagedQuery, maxTime, minTime), true);
	};

	const getCustomOrIntervalTime = (time: Time, currentRoute: string): Time => {
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

		const updatedTime = getCustomOrIntervalTime(time, currentRoute);

		setIsValidteRelativeTime(updatedTime !== 'custom');

		const [preStartTime = 0, preEndTime = 0] = getTime() || [];

		setRefreshButtonHidden(updatedTime === 'custom');

		updateTimeInterval(updatedTime, [preStartTime, preEndTime]);

		console.log('updatedTime', updatedTime);

		if (updatedTime !== 'custom') {
			// const { minTime, maxTime } = GetMinMax(updatedTime);
			// urlQuery.set(QueryParams.startTime, minTime.toString());
			// urlQuery.set(QueryParams.endTime, maxTime.toString());

			urlQuery.delete('startTime');
			urlQuery.delete('endTime');

			urlQuery.set(QueryParams.relativeTime, updatedTime);
		} else {
			// if (searchRelativeTime && isValidTimeFormat(searchRelativeTime)) {
			// 	const endTime = dayjs();
			// 	let startTime = null;

			// 	const { time, unit } = extractTimeAndUnit(searchRelativeTime);

			// 	setenableAbsoluteTime(true);

			// 	switch (unit) {
			// 		case 'm':
			// 			startTime = endTime.subtract(time, 'minute');
			// 			break;

			// 		case 'h':
			// 			startTime = endTime.subtract(time, 'hour');
			// 			break;
			// 		case 'd':
			// 			startTime = endTime.subtract(time, 'day');
			// 			break;
			// 		case 'w':
			// 			startTime = endTime.subtract(time, 'week');
			// 			break;
			// 		default:
			// 			startTime = endTime;
			// 			break;
			// 	}

			// 	const startTimeEpoch = startTime.toDate().getTime().toString();
			// 	const endTimeEpoch = endTime.toDate().getTime().toString();

			// 	urlQuery.set(QueryParams.startTime, startTimeEpoch);
			// 	urlQuery.set(QueryParams.endTime, endTimeEpoch);

			// 	return;
			// }

			const startTime = preStartTime.toString();
			const endTime = preEndTime.toString();

			urlQuery.set(QueryParams.startTime, startTime);
			urlQuery.set(QueryParams.endTime, endTime);
		}

		const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;

		console.log('generatedUrl', generatedUrl);

		history.replace(generatedUrl);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname, updateTimeInterval, globalTimeLoading]);

	const shareModalContent = (): JSX.Element => {
		let currentUrl = window.location.href;

		console.log('selectedTime', selectedTime, validCustomTime);

		if (enableAbsoluteTime) {
			const time = selectedTime === 'custom' ? validCustomTime : selectedTime;
			const { minTime, maxTime } = GetMinMax(time);

			urlQuery.set(QueryParams.startTime, minTime.toString());
			urlQuery.set(QueryParams.endTime, maxTime.toString());
			urlQuery.delete(QueryParams.relativeTime);

			currentUrl = `${window.location.host}${
				location.pathname
			}?${urlQuery.toString()}`;
		} else if (!enableAbsoluteTime) {
			urlQuery.delete(QueryParams.startTime);
			urlQuery.delete(QueryParams.endTime);

			urlQuery.set(QueryParams.relativeTime, selectedTime);
			currentUrl = `${window.location.host}${
				location.pathname
			}?${urlQuery.toString()}`;
		}

		return (
			<div className="share-modal-content">
				<div className="absolute-relative-time-toggler-container">
					<Tooltip
						title={
							!searchRelativeTime && !isValidteRelativeTime ? (
								<Typography.Text color="#FFD778">
									Please select / enter relative time format to enable
								</Typography.Text>
							) : (
								''
							)
						}
						placement="left"
					>
						<div className="absolute-relative-time-toggler">
							{!searchRelativeTime && !isValidteRelativeTime && (
								<Info size={14} color="#FFD778" />
							)}

							<Switch
								checked={enableAbsoluteTime}
								disabled={!isValidteRelativeTime && !searchRelativeTime}
								size="small"
								onChange={(): void => {
									setEnableAbsoluteTime(!enableAbsoluteTime);
								}}
							/>
						</div>
					</Tooltip>

					<Typography.Text>Enable Absolute Time</Typography.Text>
				</div>

				<div className="share-link">
					<Typography.Text ellipsis className="share-url">
						{currentUrl}
					</Typography.Text>

					<Button
						className="periscope-btn copy-url-btn"
						onClick={(): void => {
							handleCopyToClipboard(currentUrl);
							setIsURLCopied(true);
							setTimeout(() => {
								setIsURLCopied(false);
							}, 1000);
						}}
						icon={
							isURLCopied ? (
								<Check size={14} color={Color.BG_FOREST_500} />
							) : (
								<Copy size={14} color={Color.BG_ROBIN_500} />
							)
						}
					/>
				</div>
			</div>
		);
	};

	console.log('selectedTime', selectedTime);

	return (
		<div className="date-time-selector">
			{!hasSelectedTimeError && !refreshButtonHidden && (
				<RefreshText
					{...{
						onLastRefreshHandler,
					}}
					refreshButtonHidden={refreshButtonHidden}
				/>
			)}
			<Form
				form={formSelector}
				layout="inline"
				initialValues={{ interval: selectedTime }}
			>
				<FormContainer>
					<CustomTimePicker
						open={isOpen}
						setOpen={setIsOpen}
						onSelect={(value: unknown): void => {
							onSelectHandler(value as Time);
						}}
						onError={(hasError: boolean): void => {
							setHasSelectedTimeError(hasError);
						}}
						selectedTime={selectedTime}
						onValidCustomDateChange={(dateTime): void => {
							onValidCustomDateHandler(
								dateTime.timeStr,
								dateTime.time as DateTimeRangeType,
							);
							setValidCustomTime(dateTime.timeStr);
						}}
						onCustomTimeStatusUpdate={(isValid: boolean): void => {
							setIsValidteRelativeTime(isValid);
						}}
						selectedValue={getInputLabel(
							dayjs(minTime / 1000000),
							dayjs(maxTime / 1000000),
							selectedTime,
						)}
						data-testid="dropDown"
						items={options}
						newPopover
						handleGoLive={handleGoLive}
						onCustomDateHandler={onCustomDateHandler}
						customDateTimeVisible={customDateTimeVisible}
						setCustomDTPickerVisible={setCustomDTPickerVisible}
					/>

					{showAutoRefresh && selectedTime !== 'custom' && (
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
					)}

					<Popover
						className="shareable-link-popover"
						placement="bottomRight"
						title="Shareable Link"
						content={shareModalContent}
						arrow={false}
						trigger={['click']}
					>
						<Button className="periscope-btn" icon={<Send size={14} />}>
							Share
						</Button>
					</Popover>
				</FormContainer>
			</Form>
		</div>
	);
}

interface DateTimeSelectionV2Props {
	showAutoRefresh: boolean;
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

type Props = DateTimeSelectionV2Props & DispatchProps & RouteComponentProps;

export default connect(null, mapDispatchToProps)(withRouter(DateTimeSelection));
