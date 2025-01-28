import './DateTimeSelection.styles.scss';

import { SyncOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import CustomTimePicker from 'components/CustomTimePicker/CustomTimePicker';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import dayjs, { Dayjs } from 'dayjs';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { updateStepInterval } from 'hooks/queryBuilder/useStepInterval';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import { isObject } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading, UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';

import AutoRefresh from '../AutoRefresh';
import CustomDateTimeModal, { DateTimeRangeType } from '../CustomDateTimeModal';
import { CustomTimeType, Time as TimeV2 } from '../DateTimeSelectionV2/config';
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

	const { stagedQuery, initQueryBuilderData } = useQueryBuilder();

	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const getInputLabel = (
		startTime?: Dayjs,
		endTime?: Dayjs,
		timeInterval: Time | TimeV2 | CustomTimeType = '15m',
	): string | Time => {
		if (startTime && endTime && timeInterval === 'custom') {
			const format = DATE_TIME_FORMATS.SLASH_DATETIME;

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

	const updateLocalStorageForRoutes = (value: Time | TimeV2 | string): void => {
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
			return `Last refresh -${monthsDiff} months ago`;
		}

		if (daysDiff > 0) {
			return `Last refresh - ${daysDiff} days ago`;
		}

		if (hoursDiff > 0) {
			return `Last refresh - ${hoursDiff} hrs ago`;
		}

		if (minutedDiff > 0) {
			return `Last refresh - ${minutedDiff} mins ago`;
		}

		return `Last refresh - ${secondsDiff} sec ago`;
	}, [maxTime, minTime, selectedTime]);

	const isLogsExplorerPage = useMemo(
		() => location.pathname === ROUTES.LOGS_EXPLORER,
		[location.pathname],
	);

	const onSelectHandler = (value: Time | TimeV2 | CustomTimeType): void => {
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
			history.push(generatedUrl);
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
				updateTimeInterval('custom', [
					startTimeMoment?.toDate().getTime() || 0,
					endTimeMoment?.toDate().getTime() || 0,
				]);
				updateLocalStorageForRoutes(
					JSON.stringify({ startTime: startTimeMoment, endTime: endTimeMoment }),
				);
				if (!isLogsExplorerPage) {
					urlQuery.set(
						QueryParams.startTime,
						startTimeMoment?.toDate().getTime().toString(),
					);
					urlQuery.set(
						QueryParams.endTime,
						endTimeMoment?.toDate().getTime().toString(),
					);
					const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
					history.push(generatedUrl);
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

		if (updatedTime !== 'custom') {
			const { minTime, maxTime } = GetMinMax(updatedTime);
			urlQuery.set(QueryParams.startTime, minTime.toString());
			urlQuery.set(QueryParams.endTime, maxTime.toString());
		} else {
			urlQuery.set(QueryParams.startTime, preStartTime.toString());
			urlQuery.set(QueryParams.endTime, preEndTime.toString());
		}
		const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
		history.replace(generatedUrl);

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname, updateTimeInterval, globalTimeLoading]);

	return (
		<div className="date-time-selection-container">
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
						onValidCustomDateChange={(dateTime): void =>
							onCustomDateHandler(dateTime.time as DateTimeRangeType)
						}
						selectedValue={getInputLabel(
							dayjs(minTime / 1000000),
							dayjs(maxTime / 1000000),
							selectedTime,
						)}
						data-testid="dropDown"
						items={options}
					/>

					<FormItem hidden={refreshButtonHidden}>
						<Button
							icon={<SyncOutlined />}
							type="primary"
							onClick={onRefreshHandler}
						/>
					</FormItem>

					<FormItem>
						<AutoRefresh disabled={refreshButtonHidden} />
					</FormItem>
				</FormContainer>
			</Form>

			{!hasSelectedTimeError && selectedTime !== 'custom' && (
				<RefreshText
					{...{
						onLastRefreshHandler,
					}}
					refreshButtonHidden={refreshButtonHidden}
				/>
			)}

			<CustomDateTimeModal
				visible={customDateTimeVisible}
				onCreate={onCustomDateHandler}
				onCancel={(): void => {
					setCustomDTPickerVisible(false);
				}}
				setCustomDTPickerVisible={setCustomDTPickerVisible}
			/>
		</div>
	);
}

interface DispatchProps {
	updateTimeInterval: (
		interval: Time | TimeV2 | CustomTimeType,
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
