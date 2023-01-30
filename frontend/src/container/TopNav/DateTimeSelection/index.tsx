import { SyncOutlined } from '@ant-design/icons';
import { Button, Select as DefaultSelect } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import dayjs, { Dayjs } from 'dayjs';
import getTimeString from 'lib/getTimeString';
import React, { useCallback, useEffect, useState } from 'react';
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
import { getDefaultOption, getOptions, Time } from './config';
import RefreshText from './Refresh';
import { Form, FormContainer, FormItem } from './styles';

const { Option } = DefaultSelect;

function DateTimeSelection({
	location,
	updateTimeInterval,
	globalTimeLoading,
}: Props): JSX.Element {
	const [formSelector] = Form.useForm();

	const params = new URLSearchParams(location.search);
	const searchStartTime = params.get('startTime');
	const searchEndTime = params.get('endTime');

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
			const routesSelectedTime = routesObject[pathName];

			if (routesSelectedTime) {
				return routesSelectedTime;
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

	const onSelectHandler = (value: Time): void => {
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

		const getCustomOrIntervalTime = (timeParam: Time): Time => {
			if (searchEndTime !== null && searchStartTime !== null) {
				return 'custom';
			}

			if (
				(localstorageEndTime === null || localstorageStartTime === null) &&
				timeParam === 'custom'
			) {
				return getDefaultOption(currentRoute);
			}

			return timeParam;
		};

		const updatedTime = getCustomOrIntervalTime(time);

		const [preStartTime = 0, preEndTime = 0] = getTime() || [];

		setRefreshButtonHidden(updatedTime === 'custom');

		updateTimeInterval(updatedTime, [preStartTime, preEndTime]);
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
		<>
			<Form
				form={formSelector}
				layout="inline"
				initialValues={{ interval: selectedTime }}
			>
				<FormContainer>
					<DefaultSelect
						onSelect={(value: unknown): void => onSelectHandler(value as Time)}
						value={getInputLabel(
							dayjs(minTime / 1000000),
							dayjs(maxTime / 1000000),
							selectedTime,
						)}
						data-testid="dropDown"
					>
						{options.map(({ value, label }) => (
							<Option key={value + label} value={value}>
								{label}
							</Option>
						))}
					</DefaultSelect>

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

			<RefreshText
				{...{
					onLastRefreshHandler,
				}}
				refreshButtonHidden={refreshButtonHidden}
			/>

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
