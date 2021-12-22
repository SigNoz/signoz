import { Button, Select as DefaultSelect } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

import { getDefaultOption, getOptions, Time } from './config';
import { Container, Form, FormItem } from './styles';
const { Option } = DefaultSelect;
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCAL_STORAGE } from 'constants/localStorage';
import getTimeString from 'lib/getTimeString';
import dayjs, { Dayjs } from 'dayjs';
import { connect, useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading, UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import getParamsInObject from 'lib/query/getParamsInObject';
import history from 'lib/history';
import GetMinMax from 'lib/getGlobalMinMax';

import CustomDateTimeModal, { DateTimeRangeType } from '../CustomDateTimeModal';
import RefreshText from './Refresh';
import createQueryParams from 'lib/query/createQueryParamsInObject';

const DateTimeSelection = ({
	location,
	updateTimeInterval,
	globalTimeLoading,
}: Props): JSX.Element => {
	const [form_dtselector] = Form.useForm();

	const params = new URLSearchParams(location.search);
	const paramsInObject = getParamsInObject(params);
	const searchStartTime = paramsInObject['startTime'] || '';
	const searchEndTime = paramsInObject['endTime'] || '';
	const searchSelectedTime = paramsInObject['selectedTime'] || '';

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

	const [startTime, setStartTime] = useState<Dayjs>();
	const [endTime, setEndTime] = useState<Dayjs>();

	const [options, setOptions] = useState(getOptions(location.pathname));
	const [refreshButtonHidden, setRefreshButtonHidden] = useState<boolean>(false);
	const [customDateTimeVisible, setCustomDTPickerVisible] = useState<boolean>(
		false,
	);

	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const getDefaultTime = (pathName: string): Time => {
		const defaultSelectedOption = getDefaultOption(pathName);

		const routes = getLocalStorageKey(LOCAL_STORAGE.METRICS_TIME_IN_DURATION);

		if (routes !== null) {
			const routesObject = JSON.parse(routes || '{}');
			const selectedTime = routesObject[pathName];

			if (selectedTime) {
				return selectedTime;
			}
		}

		return defaultSelectedOption;
	};

	const [selectedTimeInterval, setSelectedTimeInterval] = useState<Time>(
		getDefaultTime(location.pathname),
	);

	// this is true when all the value from the search url is present
	const toIsCalulated =
		//searchEndTime present
		searchEndTime.length !== 0 &&
		//searchStartTime present
		searchStartTime.length !== 0 &&
		// valid option
		getOptions(location.pathname)
			.map((e) => e.value)
			.includes(searchSelectedTime as Time);

	const updateLocalStorageForRoutes = (value: Time): void => {
		const preRoutes = getLocalStorageKey(LOCAL_STORAGE.METRICS_TIME_IN_DURATION);
		if (preRoutes !== null) {
			const preRoutesObject = JSON.parse(preRoutes);

			const preRoute = {
				...preRoutesObject,
			};
			preRoute[location.pathname] = value;

			setLocalStorageKey(
				LOCAL_STORAGE.METRICS_TIME_IN_DURATION,
				JSON.stringify(preRoute),
			);
		}
	};

	const onSelectHandler = (value: Time): void => {
		if (value !== 'custom') {
			const selectedLabel = getInputLabel(undefined, undefined, value);
			setSelectedTimeInterval(selectedLabel as Time);
			updateLocalStorageForRoutes(value);

			const minMax = GetMinMax(value);

			paramsInObject['startTime'] = minMax.maxTime.toString();
			paramsInObject['endTime'] = minMax.minTime.toString();
			paramsInObject['selectedTime'] = value;

			history.push(
				history.location.pathname + `?${createQueryParams(paramsInObject)}`,
			);
		} else {
			setRefreshButtonHidden(true);
			setCustomDTPickerVisible(true);
		}
	};

	const onRefreshHandler = (): void => {
		onSelectHandler(selectedTimeInterval);
		onLastRefreshHandler();
	};

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

	const onLastRefreshHandler = useCallback(() => {
		const currentTime = dayjs();

		const lastRefresh = dayjs(
			selectedTimeInterval === 'custom' ? minTime : maxTime,
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
	}, [maxTime, minTime, selectedTimeInterval]);

	const onCustomDateHandler = (dateTimeRange: DateTimeRangeType): void => {
		if (dateTimeRange !== null) {
			const [startTimeMoment, endTimeMoment] = dateTimeRange;
			if (startTimeMoment && endTimeMoment) {
				setSelectedTimeInterval('custom');
				setStartTime(startTimeMoment);
				setEndTime(endTimeMoment);
				setCustomDTPickerVisible(false);
				updateTimeInterval('custom', toIsCalulated, [
					startTimeMoment?.toDate().getTime() || 0,
					endTimeMoment?.toDate().getTime() || 0,
				]);
				setLocalStorageKey('startTime', startTimeMoment.toString());
				setLocalStorageKey('endTime', endTimeMoment.toString());
				updateLocalStorageForRoutes('custom');
			}
		}
	};

	// this is triggred when we change the routes and based on that we are changing the default options
	useEffect(() => {
		const metricsTimeDuration = getLocalStorageKey(
			LOCAL_STORAGE.METRICS_TIME_IN_DURATION,
		);

		if (metricsTimeDuration === null) {
			setLocalStorageKey(
				LOCAL_STORAGE.METRICS_TIME_IN_DURATION,
				JSON.stringify({}),
			);
		}

		const currentRoute = location.pathname;
		const time = getDefaultTime(currentRoute);

		const currentOptions = getOptions(currentRoute);
		setOptions(currentOptions);

		const getCustomOrIntervalTime = (time: Time): Time => {
			// getting the custom selected time type from the URL
			if (
				searchEndTime !== null &&
				searchStartTime !== null &&
				searchSelectedTime === 'custom'
			) {
				return 'custom';
			}

			// search selected time
			if (toIsCalulated) {
				return searchSelectedTime as Time;
			}

			//handling if localstorageEndTime and localstorageStartTime is null as there is no entry in the localstorage
			if (
				(localstorageEndTime === null || localstorageStartTime === null) &&
				time === 'custom'
			) {
				return getDefaultOption(currentRoute);
			}

			//returing the default options
			return time;
		};

		const updatedTime = getCustomOrIntervalTime(time);

		const [preStartTime = 0, preEndTime = 0] = getTime() || [];

		setStartTime(dayjs(preStartTime));
		setEndTime(dayjs(preEndTime));

		updateTimeInterval(updatedTime, !toIsCalulated, [preStartTime, preEndTime]);
	}, [
		location.pathname,
		getTime,
		localstorageEndTime,
		localstorageStartTime,
		searchEndTime,
		searchStartTime,
		updateTimeInterval,
		globalTimeLoading,
	]);

	return (
		<Container>
			<Form
				form={form_dtselector}
				layout="inline"
				initialValues={{ interval: selectedTime }}
			>
				<DefaultSelect
					onSelect={(value): void => onSelectHandler(value as Time)}
					value={getInputLabel(startTime, endTime, selectedTime)}
					data-testid="dropDown"
				>
					{options.map(({ value, label }) => (
						<Option key={value + label} value={value}>
							{label}
						</Option>
					))}
				</DefaultSelect>

				<FormItem hidden={refreshButtonHidden}>
					<Button type="primary" onClick={onRefreshHandler}>
						Refresh
					</Button>
				</FormItem>
			</Form>

			<RefreshText
				{...{
					onLastRefreshHandler,
				}}
			/>

			<CustomDateTimeModal
				visible={customDateTimeVisible}
				onCreate={onCustomDateHandler}
				onCancel={(): void => {
					setCustomDTPickerVisible(false);
				}}
			/>
		</Container>
	);
};

interface DispatchProps {
	updateTimeInterval: (
		interval: Time,
		isCalulated: boolean,
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
