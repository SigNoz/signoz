import { Button, Form, Select as DefaultSelect, Space } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import { LOCAL_STORAGE } from 'constants/localStorage';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import { cloneDeep } from 'lodash';
import moment from 'moment';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { GlobalTime, updateTimeInterval } from 'store/actions';
import { DateTimeRangeType } from 'store/actions';
import { AppState } from 'store/reducers';
import styled from 'styled-components';

import {
	DefaultOptionsBasedOnRoute,
	Options,
	ServiceMapOptions,
} from './config';
import CustomDateTimeModal from './CustomDateTimeModal';
import { getLocalStorageRouteKey } from './utils';
const { Option } = DefaultSelect;

const DateTimeWrapper = styled.div`
	margin-top: 20px;
	justify-content: flex-end !important;
`;
const Select = styled(DefaultSelect)``;
interface DateTimeSelectorProps extends RouteComponentProps<any> {
	currentpath?: string;
	updateTimeInterval?: (value: string) => void;
	globalTime?: GlobalTime;
}

import { SelectValue } from 'antd/lib/select';
import history from 'lib/history';

const _DateTimeSelector = (props: DateTimeSelectorProps): JSX.Element => {
	const location = history.location;
	const LocalStorageRouteKey: string = getLocalStorageRouteKey(
		location.pathname,
	);
	const timeDurationInLocalStorage = useMemo(() => {
		return (
			JSON.parse(localStorage.getItem(LOCAL_STORAGE.METRICS_TIME_IN_DURATION)) ||
			{}
		);
	}, []);

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
	const { globalTime, updateTimeInterval } = props;

	const setToLocalStorage = useCallback(
		(val: string) => {
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
		},
		[LocalStorageRouteKey, timeDurationInLocalStorage],
	);

	const setMetricsTimeInterval = useCallback(
		(value: string) => {
			if (updateTimeInterval) {
				updateTimeInterval(value);
			}
			setTimeInterval(value);
			setEndTime(null);
			setStartTime(null);
			setToLocalStorage(value);
		},
		[setToLocalStorage, updateTimeInterval],
	);

	const setCustomTime = useCallback(
		(startTime: moment.Moment, endTime: moment.Moment) => {
			if (updateTimeInterval) {
				updateTimeInterval('custom', [startTime.valueOf(), endTime.valueOf()]);
			}
			setEndTime(endTime);
			setStartTime(startTime);
		},
		[updateTimeInterval],
	);

	const counter = useRef(0);

	useEffect(() => {
		if (counter.current === 0) {
			counter.current = 1;
			setMetricsTimeInterval(defaultTime);
		}
	}, [defaultTime, setMetricsTimeInterval]);

	const updateUrlForTimeInterval = (value: string): void => {
		const preSearch = new URLSearchParams(location.search);

		const widgetId = preSearch.get('widgetId');
		const graphType = preSearch.get('graphType');

		let result = '';

		if (widgetId !== null) {
			result = result + `&widgetId=${widgetId}`;
		}

		if (graphType !== null) {
			result = result + `&graphType=${graphType}`;
		}

		history.push({
			search: `?${METRICS_PAGE_QUERY_PARAM.interval}=${value}${result}`,
		}); //pass time in URL query param for all choices except custom in datetime picker
	};

	const updateUrlForCustomTime = (
		startTime: moment.Moment,
		endTime: moment.Moment,
	): void => {
		history.push(
			`?${METRICS_PAGE_QUERY_PARAM.startTime}=${startTime.valueOf()}&${
				METRICS_PAGE_QUERY_PARAM.endTime
			}=${endTime.valueOf()}`,
		);
	};

	const handleOnSelect = (value: SelectValue): void => {
		if (value === 'custom') {
			setCustomDTPickerVisible(true);
		} else {
			if (value !== undefined) {
				updateUrlForTimeInterval(value as string);
				setRefreshButtonHidden(false); // for normal intervals, show refresh button
			}
		}

		const urlParams = new URLSearchParams(location.search);
		const intervalInQueryParam = value;
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
			setCustomTime(startTime, endTime);
		} else if (currentLocalStorageRouteKey !== LocalStorageRouteKey) {
			setMetricsTimeInterval(defaultTime);
			setCurrentLocalStorageRouteKey(LocalStorageRouteKey);
		}
		// first pref: handle intervalInQueryParam
		else if (intervalInQueryParam) {
			setMetricsTimeInterval(intervalInQueryParam.toString());
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

	const timeSinceLastRefresh = useCallback(() => {
		const currentTime = moment();
		const lastRefresh = moment(globalTime?.maxTime / 1000000);

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
	}, [globalTime?.maxTime]);

	const handleRefresh = (): void => {
		setRefreshButtonClick(refreshButtonClick + 1);
		setMetricsTimeInterval(timeInterval);
	};

	useEffect(() => {
		setRefreshText('');
		const interval = setInterval(() => {
			setRefreshText(timeSinceLastRefresh());
		}, 2000);
		return (): void => {
			clearInterval(interval);
		};
	}, [refreshButtonClick, timeSinceLastRefresh]);

	if (location.pathname.startsWith(ROUTES.USAGE_EXPLORER)) {
		return <></>;
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
							<Select onChange={handleOnSelect} value={inputLabeLToShow}>
								{options.map(({ value, label }) => (
									<Option key={value} value={value}>
										{label}
									</Option>
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
						onCancel={(): void => {
							setCustomDTPickerVisible(false);
						}}
					/>
				</Space>
			</DateTimeWrapper>
		);
	}
};
const mapStateToProps = (state: AppState): { globalTime: GlobalTime } => {
	return { globalTime: state.globalTime };
};

export const DateTimeSelector = connect(mapStateToProps, {
	updateTimeInterval: updateTimeInterval,
})(_DateTimeSelector);

export default DateTimeSelector;
