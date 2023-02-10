import { SyncOutlined } from '@ant-design/icons';
import { Button, Select as DefaultSelect } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import dayjs, { Dayjs } from 'dayjs';
import { useIntervalRange } from 'hooks/useIntervalRange';
import GetMinMax from 'lib/getMinMax';
import history from 'lib/history';
import React, { useCallback, useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading, UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getDiffs } from 'utils/getDiffs';

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
		const lastRefresh = dayjs(
			selectedTime === 'custom' ? minTime / 1000000 : maxTime / 1000000,
		);

		const {
			secondsDiff,
			minutedDiff,
			hoursDiff,
			daysDiff,
			monthsDiff,
		} = getDiffs(lastRefresh);

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
			const { maxTime, minTime } = GetMinMax(value);
			const params = new URLSearchParams({
				startTime: minTime.toString(),
				endTime: maxTime.toString(),
			});

			history.push({
				search: params.toString(),
			});

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
	const { getTime, getCustomOrIntervalTime } = useIntervalRange();

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

		const [preStartTime = 0, preEndTime = 0] = getTime() || [];

		setRefreshButtonHidden(updatedTime === 'custom');

		updateTimeInterval(updatedTime, [preStartTime, preEndTime]);
	}, [
		location.pathname,
		getTime,
		updateTimeInterval,
		globalTimeLoading,
		getCustomOrIntervalTime,
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
