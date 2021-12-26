import { Button, Select as DefaultSelect } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

import {
	getDefaultOption,
	getOptions,
	getTimeBasedOnStartAndEndTime,
	Time,
} from './config';
import { Form, FormItem } from './styles';
const { Option } = DefaultSelect;
import dayjs, { Dayjs } from 'dayjs';
import GetMinMax from 'lib/getGlobalMinMax';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import createQueryParams from 'lib/query/createQueryParamsInObject';
import getParamsInObject from 'lib/query/getParamsInObject';
import { connect, useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';

import CustomDateTimeModal, { DateTimeRangeType } from '../CustomDateTimeModal';
import Paused from './Paused';
import RefreshText from './Refresh';

const DateTimeSelection = ({
	location,
	updateTimeInterval,
}: Props): JSX.Element => {
	const [form_dtselector] = Form.useForm();

	const [startTime, setStartTime] = useState<Dayjs>();
	const [endTime, setEndTime] = useState<Dayjs>();

	const [options, setOptions] = useState(getOptions(location.pathname));
	const [customDateTimeVisible, setCustomDTPickerVisible] = useState<boolean>(
		false,
	);

	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const getDefaultTime = (pathName: string): Time => {
		const defaultSelectedOption = getDefaultOption(pathName);
		return defaultSelectedOption;
	};

	const [selectedTimeInterval, setSelectedTimeInterval] = useState<Time>(
		getDefaultTime(location.pathname),
	);

	const onSelectHandler = (value: Time): void => {
		const params = new URLSearchParams(location.search);

		if (value !== 'custom') {
			const selectedLabel = getInputLabel(undefined, undefined, value);
			setSelectedTimeInterval(selectedLabel as Time);
			// updateLocalStorageForRoutes(value);

			const minMax = GetMinMax(value);

			const paramsInObject = getParamsInObject(params);
			paramsInObject['startTime'] = minMax.maxTime.toString();
			paramsInObject['endTime'] = minMax.minTime.toString();

			history.push(
				history.location.pathname + `?${createQueryParams(paramsInObject)}`,
			);
		} else {
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
				updateTimeInterval('custom', [
					startTimeMoment?.toDate().getTime() || 0,
					endTimeMoment?.toDate().getTime() || 0,
				]);
			}
		}
	};

	const getTime = useCallback(
		(
			paramsInObject: ReturnType<typeof getParamsInObject>,
		): [number, number] | undefined => {
			const searchStartTime = paramsInObject['startTime'] || '';
			const searchEndTime = paramsInObject['endTime'] || '';

			if (searchEndTime && searchStartTime) {
				const startDate = dayjs(
					new Date(parseInt(getTimeString(searchStartTime), 10)),
				);
				const endDate = dayjs(new Date(parseInt(getTimeString(searchEndTime), 10)));

				return [startDate.toDate().getTime() || 0, endDate.toDate().getTime() || 0];
			}

			return undefined;
		},
		[],
	);

	const getCustomOrIntervalTime = (
		searchisPaused: string,
		time: Time,
		searchEndTime: string,
		searchStartTime: string,
	): Time => {
		if (
			searchisPaused === 'false' ||
			(searchEndTime.length !== 0 &&
				searchStartTime.length !== 0 &&
				searchisPaused === 'false')
		) {
			return 'custom';
		}

		// need to judge the time based on start time and end time
		if (searchEndTime.length !== 0 && searchStartTime.length !== 0) {
			return getTimeBasedOnStartAndEndTime(
				parseInt(searchStartTime, 10),
				parseInt(searchEndTime, 10),
				time,
			);
		}

		return time;
	};

	// this is triggred when we change the routes and based on that we are changing the default options
	useEffect(() => {
		const currentRoute = location.pathname;
		const time = getDefaultTime(currentRoute);

		const currentOptions = getOptions(currentRoute);
		setOptions(currentOptions);

		const params = new URLSearchParams(location.search);
		const paramsInObject = getParamsInObject(params);

		const searchisPaused = paramsInObject['paused'];
		const searchStartTime = paramsInObject['startTime'] || '';
		const searchEndTime = paramsInObject['endTime'] || '';

		const updatedTime = getCustomOrIntervalTime(
			searchisPaused,
			time,
			searchEndTime,
			searchStartTime,
		);

		const [preStartTime = 0, preEndTime = 0] = getTime(paramsInObject) || [];

		setStartTime(dayjs(preStartTime));
		setEndTime(dayjs(preEndTime));

		updateTimeInterval(updatedTime, [preStartTime, preEndTime]);
	}, [getTime, updateTimeInterval, location.pathname, location.search]);

	return (
		<>
			<Form
				form={form_dtselector}
				layout="inline"
				initialValues={{ interval: selectedTime }}
			>
				<FormItem>
					<Paused />
				</FormItem>

				<FormItem>
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
				</FormItem>

				<FormItem>
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
		</>
	);
};

interface DispatchProps {
	updateTimeInterval: (
		interval: Time,
		dateTimeRange?: [number, number],
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateTimeInterval: bindActionCreators(UpdateTimeInterval, dispatch),
});

type Props = DispatchProps & RouteComponentProps;

export default connect(null, mapDispatchToProps)(withRouter(DateTimeSelection));
