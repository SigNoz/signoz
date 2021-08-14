import React, { useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';
import { Select as DefaultSelect, Button, Space, Form } from 'antd';
import styled from 'styled-components';
import { withRouter } from 'react-router';
import { getLocalStorageRouteKey } from './utils';
import { RouteComponentProps, useLocation } from 'react-router-dom';
import { connect } from 'react-redux';
import ROUTES from 'Src/constants/routes';
import CustomDateTimeModal from './CustomDateTimeModal';
import { GlobalTime, updateTimeInterval } from '../../../store/actions';
import { StoreState } from '../../../store/reducers';
import FormItem from 'antd/lib/form/FormItem';
import {
	Options,
	ServiceMapOptions,
	DefaultOptionsBasedOnRoute,
} from './config';
import { DateTimeRangeType } from '../../../store/actions';
import { METRICS_PAGE_QUERY_PARAM } from 'Src/constants/query';
import { LOCAL_STORAGE } from 'Src/constants/localStorage';
import moment from 'moment';
const { Option } = DefaultSelect;

const DateTimeWrapper = styled.div`
	margin-top: 20px;
	justify-content: flex-end !important;
`;
const Select = styled(DefaultSelect)``;
interface DateTimeSelectorProps extends RouteComponentProps<any> {
	currentpath?: string;
	updateTimeInterval: Function;
	globalTime: GlobalTime;
}

/*
This components is mounted all the time. Use event listener to track changes.
 */
const _DateTimeSelector = (props: DateTimeSelectorProps) => {
	const location = useLocation();
	const LocalStorageRouteKey: string = getLocalStorageRouteKey(
		location.pathname,
	);
	const timeDurationInLocalStorage =
		JSON.parse(localStorage.getItem(LOCAL_STORAGE.METRICS_TIME_IN_DURATION)) ||
		{};
	const options =
		location.pathname === ROUTES.SERVICE_MAP ? ServiceMapOptions : Options;
	let defaultTime = DefaultOptionsBasedOnRoute[LocalStorageRouteKey]
		? DefaultOptionsBasedOnRoute[LocalStorageRouteKey]
		: DefaultOptionsBasedOnRoute.default;
	if (timeDurationInLocalStorage[LocalStorageRouteKey]) {
		defaultTime = timeDurationInLocalStorage[LocalStorageRouteKey];
	}
	const [currentLocalStorageRouteKey, setCurrentLocalStorageRouteKey] = useState(
		LocalStorageRouteKey,
	);
	const [customDTPickerVisible, setCustomDTPickerVisible] = useState(false);
	const [timeInterval, setTimeInterval] = useState(defaultTime);
	const [startTime, setStartTime] = useState<moment.Moment | null>(null);
	const [endTime, setEndTime] = useState<moment.Moment | null>(null);
	const [refreshButtonHidden, setRefreshButtonHidden] = useState(false);
	const [refreshText, setRefreshText] = useState('');
	const [refreshButtonClick, setRefreshButtonClick] = useState(0);
	const [form_dtselector] = Form.useForm();

	const updateTimeOnQueryParamChange = () => {
		const urlParams = new URLSearchParams(location.search);
		const intervalInQueryParam = urlParams.get(METRICS_PAGE_QUERY_PARAM.interval);
		const startTimeString = urlParams.get(METRICS_PAGE_QUERY_PARAM.startTime);
		const endTimeString = urlParams.get(METRICS_PAGE_QUERY_PARAM.endTime);

		// first pref: handle both startTime and endTime
		if (
			startTimeString &&
			startTimeString.length > 0 &&
			endTimeString &&
			endTimeString.length > 0
		) {
			const startTime = moment(Number(startTimeString));
			const endTime = moment(Number(endTimeString));
			setCustomTime(startTime, endTime, true);
		} else if (currentLocalStorageRouteKey !== LocalStorageRouteKey) {
			setMetricsTimeInterval(defaultTime);
			setCurrentLocalStorageRouteKey(LocalStorageRouteKey);
		}
		// first pref: handle intervalInQueryParam
		else if (intervalInQueryParam) {
			setMetricsTimeInterval(intervalInQueryParam);
		}
	};

	const setToLocalStorage = (val: string) => {
		let timeDurationInLocalStorageObj = cloneDeep(timeDurationInLocalStorage);
		if (timeDurationInLocalStorageObj) {
			timeDurationInLocalStorageObj[LocalStorageRouteKey] = val;
		} else {
			timeDurationInLocalStorageObj = {
				[LocalStorageRouteKey]: val,
			};
		}
		window.localStorage.setItem(
			LOCAL_STORAGE.METRICS_TIME_IN_DURATION,
			JSON.stringify(timeDurationInLocalStorageObj),
		);
	};

	useEffect(() => {
		setMetricsTimeInterval(defaultTime);
	}, []);

	// On URL Change
	useEffect(() => {
		updateTimeOnQueryParamChange();
	}, [location]);

	const setMetricsTimeInterval = (value: string) => {
		props.updateTimeInterval(value);
		setTimeInterval(value);
		setEndTime(null);
		setStartTime(null);
		setToLocalStorage(value);
	};
	const setCustomTime = (
		startTime: moment.Moment,
		endTime: moment.Moment,
		triggeredByURLChange = false,
	) => {
		props.updateTimeInterval('custom', [startTime.valueOf(), endTime.valueOf()]);
		setEndTime(endTime);
		setStartTime(startTime);
	};

	const updateUrlForTimeInterval = (value: string) => {
		props.history.push({
			search: `?${METRICS_PAGE_QUERY_PARAM.interval}=${value}`,
		}); //pass time in URL query param for all choices except custom in datetime picker
	};

	const updateUrlForCustomTime = (
		startTime: moment.Moment,
		endTime: moment.Moment,
		triggeredByURLChange = false,
	) => {
		props.history.push(
			`?${METRICS_PAGE_QUERY_PARAM.startTime}=${startTime.valueOf()}&${
				METRICS_PAGE_QUERY_PARAM.endTime
			}=${endTime.valueOf()}`,
		);
	};

	const handleOnSelect = (value: string) => {
		if (value === 'custom') {
			setCustomDTPickerVisible(true);
		} else {
			updateUrlForTimeInterval(value);
			setRefreshButtonHidden(false); // for normal intervals, show refresh button
		}
	};

	//function called on clicking apply in customDateTimeModal
	const handleCustomDate = (dateTimeRange: DateTimeRangeType) => {
		// pass values in ms [minTime, maxTime]
		if (
			dateTimeRange !== null &&
			dateTimeRange !== undefined &&
			dateTimeRange[0] !== null &&
			dateTimeRange[1] !== null
		) {
			const startTime = dateTimeRange[0].valueOf();
			const endTime = dateTimeRange[1].valueOf();

			updateUrlForCustomTime(moment(startTime), moment(endTime));
			//setting globaltime
			setRefreshButtonHidden(true);
			form_dtselector.setFieldsValue({
				interval:
					dateTimeRange[0].format('YYYY/MM/DD HH:mm') +
					'-' +
					dateTimeRange[1].format('YYYY/MM/DD HH:mm'),
			});
		}
		setCustomDTPickerVisible(false);
	};

	const timeSinceLastRefresh = () => {
		const currentTime = moment();
		const lastRefresh = moment(props.globalTime.maxTime / 1000000);
		const duration = moment.duration(currentTime.diff(lastRefresh));

		const secondsDiff = Math.floor(duration.asSeconds());
		const minutedDiff = Math.floor(duration.asMinutes());
		const hoursDiff = Math.floor(duration.asHours());

		if (hoursDiff > 0) {
			return `Last refresh - ${hoursDiff} hrs ago`;
		} else if (minutedDiff > 0) {
			return `Last refresh - ${minutedDiff} mins ago`;
		}
		return `Last refresh - ${secondsDiff} sec ago`;
	};

	const handleRefresh = () => {
		setRefreshButtonClick(refreshButtonClick + 1);
		setMetricsTimeInterval(timeInterval);
	};

	useEffect(() => {
		setRefreshText('');
		const interval = setInterval(() => {
			setRefreshText(timeSinceLastRefresh());
		}, 2000);
		return () => {
			clearInterval(interval);
		};
	}, [props.location, refreshButtonClick]);

	if (props.location.pathname.startsWith(ROUTES.USAGE_EXPLORER)) {
		return null;
	} else {
		const inputLabeLToShow =
			startTime && endTime
				? `${startTime.format('YYYY/MM/DD HH:mm')} - ${endTime.format(
					'YYYY/MM/DD HH:mm',
				  )}`
				: timeInterval;

		return (
			<DateTimeWrapper>
				<Space style={{ float: 'right', display: 'block' }}>
					<Space>
						<Form
							form={form_dtselector}
							layout="inline"
							initialValues={{ interval: '15min' }}
							style={{ marginTop: 10, marginBottom: 10 }}
						>
							<Select onSelect={handleOnSelect} value={inputLabeLToShow}>
								{options.map(({ value, label }) => (
									<Option value={value}>{label}</Option>
								))}
							</Select>

							<FormItem hidden={refreshButtonHidden} name="refresh_button">
								<Button type="primary" onClick={handleRefresh}>
									Refresh
								</Button>
							</FormItem>
						</Form>
					</Space>
					<Space
						style={{
							float: 'right',
							display: 'block',
							marginRight: 20,
							minHeight: 23,
							width: 200,
							textAlign: 'right',
						}}
					>
						{refreshText}
					</Space>
					<CustomDateTimeModal
						visible={customDTPickerVisible}
						onCreate={handleCustomDate}
						onCancel={() => {
							setCustomDTPickerVisible(false);
						}}
					/>
				</Space>
			</DateTimeWrapper>
		);
	}
};
const mapStateToProps = (state: StoreState): { globalTime: GlobalTime } => {
	return { globalTime: state.globalTime };
};

export const DateTimeSelector = withRouter(
	connect(mapStateToProps, {
		updateTimeInterval: updateTimeInterval,
	})(_DateTimeSelector),
);

export default DateTimeSelector;
