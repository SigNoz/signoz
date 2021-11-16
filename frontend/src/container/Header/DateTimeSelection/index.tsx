import { Button, Select as DefaultSelect } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { getDefaultOption, getOptions, Time } from './config';
import { Container, Form, FormItem } from './styles';
const { Option } = DefaultSelect;
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import { LOCAL_STORAGE } from 'constants/localStorage';
import getTimeString from 'lib/getTimeString';
import moment from 'moment';
import { connect, useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading, UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';

import CustomDateTimeModal, { DateTimeRangeType } from '../CustomDateTimeModal';
import RefreshText from './Refresh';

const DateTimeSelection = ({
	location,
	updateTimeInterval,
	globalTimeLoading,
}: Props): JSX.Element => {
	const [form_dtselector] = Form.useForm();

	const params = new URLSearchParams(location.search);
	const searchStartTime = params.get('startTime');
	const searchEndTime = params.get('endTime');

	const localstorageStartTime = get('startTime');
	const localstorageEndTime = get('endTime');

	const getTime = useCallback((): [number, number] | undefined => {
		if (searchEndTime && searchStartTime) {
			const startMoment = moment(
				new Date(parseInt(getTimeString(searchStartTime), 10)),
			);
			const endMoment = moment(
				new Date(parseInt(getTimeString(searchEndTime), 10)),
			);

			return [
				startMoment.toDate().getTime() || 0,
				endMoment.toDate().getTime() || 0,
			];
		}
		if (localstorageStartTime && localstorageEndTime) {
			const startMoment = moment(localstorageStartTime);
			const endMoment = moment(localstorageEndTime);

			return [
				startMoment.toDate().getTime() || 0,
				endMoment.toDate().getTime() || 0,
			];
		}
		return undefined;
	}, [
		localstorageEndTime,
		localstorageStartTime,
		searchEndTime,
		searchStartTime,
	]);

	const [startTime, setStartTime] = useState<moment.Moment>();
	const [endTime, setEndTime] = useState<moment.Moment>();

	const [options, setOptions] = useState(getOptions(location.pathname));
	const [refreshButtonHidden, setRefreshButtonHidden] = useState<boolean>(false);
	const [customDateTimeVisible, setCustomDTPickerVisible] = useState<boolean>(
		false,
	);

	const { maxTime, minTime, selectedTime, loading } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const getDefaultTime = (pathName: string): Time => {
		const defaultSelectedOption = getDefaultOption(pathName);

		const routes = get(LOCAL_STORAGE.METRICS_TIME_IN_DURATION);

		if (routes !== null) {
			const routesObject = JSON.parse(routes);
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

	const updateLocalStorageForRoutes = (value: Time): void => {
		const preRoutes = get(LOCAL_STORAGE.METRICS_TIME_IN_DURATION);
		if (preRoutes !== null) {
			const preRoutesObject = JSON.parse(preRoutes);

			const preRoute = {
				...preRoutesObject,
			};
			preRoute[location.pathname] = value;

			set(LOCAL_STORAGE.METRICS_TIME_IN_DURATION, JSON.stringify(preRoute));
		}
	};

	const onSelectHandler = (value: Time): void => {
		if (value !== 'custom') {
			updateTimeInterval(value);
			const selectedLabel = getInputLabel(undefined, undefined, value);
			setSelectedTimeInterval(selectedLabel as Time);
			updateLocalStorageForRoutes(value);
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
		startTime?: moment.Moment,
		endTime?: moment.Moment,
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
		const currentTime = moment();

		const lastRefresh = moment(
			selectedTimeInterval === 'custom' ? minTime / 1000000 : maxTime / 1000000,
		);
		const duration = moment.duration(currentTime.diff(lastRefresh));

		const secondsDiff = Math.floor(duration.asSeconds());
		const minutedDiff = Math.floor(duration.asMinutes());
		const hoursDiff = Math.floor(duration.asHours());
		const daysDiff = Math.floor(duration.asDays());
		const monthsDiff = Math.floor(duration.asMonths());

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
				updateTimeInterval('custom', [
					startTimeMoment?.toDate().getTime() || 0,
					endTimeMoment?.toDate().getTime() || 0,
				]);
				set('startTime', startTimeMoment.toString());
				set('endTime', endTimeMoment.toString());
				updateLocalStorageForRoutes('custom');
			}
		}
	};

	// this is triggred when we change the routes and based on that we are changing the default options
	useEffect(() => {
		const metricsTimeDuration = get(LOCAL_STORAGE.METRICS_TIME_IN_DURATION);

		if (metricsTimeDuration === null) {
			set(LOCAL_STORAGE.METRICS_TIME_IN_DURATION, JSON.stringify({}));
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

		setStartTime(moment(preStartTime));
		setEndTime(moment(preEndTime));

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

// DateTimeSelection.whyDidYouRender = {
// 	logOnDifferentValues: true,
// 	customName: 'DateTimeSelection',
// };
