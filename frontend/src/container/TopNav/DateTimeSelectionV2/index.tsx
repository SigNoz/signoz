import './DateTimeSelectionV2.styles.scss';

import { SyncOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import CustomTimePicker from 'components/CustomTimePicker/CustomTimePicker';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import NewExplorerCTA from 'container/NewExplorerCTA';
import dayjs, { Dayjs } from 'dayjs';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { isValidTimeFormat } from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import { cloneDeep, isObject } from 'lodash-es';
import { Undo } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import { useCallback, useEffect, useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { useNavigationType, useSearchParams } from 'react-router-dom-v5-compat';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading, UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { normalizeTimeToMs } from 'utils/timeUtils';
import { v4 as uuid } from 'uuid';

import AutoRefresh from '../AutoRefreshV2';
import { DateTimeRangeType } from '../CustomDateTimeModal';
import { RelativeTimeMap } from '../DateTimeSelection/config';
import {
	convertOldTimeToNewValidCustomTimeFormat,
	CustomTimeType,
	getDefaultOption,
	getOptions,
	LocalStorageTimeRange,
	OLD_RELATIVE_TIME_VALUES,
	Time,
	TimeRange,
} from './config';
import RefreshText from './Refresh';
import { Form, FormContainer, FormItem } from './styles';

function DateTimeSelection({
	showAutoRefresh,
	showRefreshText = true,
	location,
	updateTimeInterval,
	globalTimeLoading,
	showResetButton = false,
	showOldExplorerCTA = false,
	defaultRelativeTime = RelativeTimeMap['6hr'] as Time,
	isModalTimeSelection = false,
	onTimeChange,
	modalSelectedInterval,
	modalInitialStartTime,
	modalInitialEndTime,
	onGoLive,
	onExitLiveLogs,
	showLiveLogs,
}: Props): JSX.Element {
	const [formSelector] = Form.useForm();
	const { safeNavigate } = useSafeNavigate();
	const navigationType = useNavigationType(); // Returns 'POP' for back/forward navigation
	const dispatch = useDispatch();

	const [hasSelectedTimeError, setHasSelectedTimeError] = useState(false);
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const urlQuery = useUrlQuery();
	const searchStartTime = urlQuery.get('startTime');
	const searchEndTime = urlQuery.get('endTime');
	const relativeTimeFromUrl = urlQuery.get(QueryParams.relativeTime);

	// Prioritize props for initial modal time, fallback to URL params
	let initialModalStartTime = 0;
	if (modalInitialStartTime !== undefined) {
		initialModalStartTime = modalInitialStartTime;
	} else if (searchStartTime) {
		initialModalStartTime = parseInt(searchStartTime, 10);
	}

	let initialModalEndTime = 0;
	if (modalInitialEndTime !== undefined) {
		initialModalEndTime = modalInitialEndTime;
	} else if (searchEndTime) {
		initialModalEndTime = parseInt(searchEndTime, 10);
	}

	const [modalStartTime, setModalStartTime] = useState<number>(
		initialModalStartTime,
	);
	const [modalEndTime, setModalEndTime] = useState<number>(initialModalEndTime);

	const [searchParams] = useSearchParams();

	// Effect to update modal time state when props change
	useEffect(() => {
		if (modalInitialStartTime !== undefined) {
			setModalStartTime(modalInitialStartTime);
		}
		if (modalInitialEndTime !== undefined) {
			setModalEndTime(modalInitialEndTime);
		}
	}, [modalInitialStartTime, modalInitialEndTime]);

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

	const { stagedQuery, currentQuery, initQueryBuilderData } = useQueryBuilder();

	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const getInputLabel = (
		startTime?: Dayjs,
		endTime?: Dayjs,
		timeInterval: Time | CustomTimeType = '15m',
	): string | Time => {
		if (startTime && endTime && timeInterval === 'custom') {
			const format = DATE_TIME_FORMATS.UK_DATETIME_SECONDS;

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

	useEffect(() => {
		if (isModalTimeSelection && modalSelectedInterval === 'custom') {
			setCustomDTPickerVisible(true);
		}
	}, [isModalTimeSelection, modalSelectedInterval]);

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

	const updateLocalStorageForRoutes = useCallback(
		(value: Time | string): void => {
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
		},
		[location.pathname],
	);

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

	const getUpdatedCompositeQuery = useCallback((): string => {
		let updatedCompositeQuery = cloneDeep(currentQuery);
		updatedCompositeQuery.id = uuid();
		// Remove the filters
		updatedCompositeQuery = {
			...updatedCompositeQuery,
			builder: {
				...updatedCompositeQuery.builder,
				queryData: updatedCompositeQuery.builder.queryData.map((item) => ({
					...item,
					filter: {
						...item.filter,
						expression: item.filter?.expression?.trim() || '',
					},
					filters: {
						items: [],
						op: 'AND',
					},
				})),
			},
		};
		return encodeURIComponent(JSON.stringify(updatedCompositeQuery));
	}, [currentQuery]);

	const onSelectHandler = useCallback(
		(value: Time | CustomTimeType): void => {
			if (isModalTimeSelection) {
				if (value === 'custom') {
					setCustomDTPickerVisible(true);
					return;
				}
				onTimeChange?.(value);
				return;
			}
			if (value !== 'custom') {
				setIsOpen(false);
				updateTimeInterval(value);
				updateLocalStorageForRoutes(value);
				if (refreshButtonHidden) {
					setRefreshButtonHidden(false);
				}
			} else {
				setRefreshButtonHidden(true);
				setCustomDTPickerVisible(true);

				return;
			}

			urlQuery.delete('startTime');
			urlQuery.delete('endTime');

			urlQuery.set(QueryParams.relativeTime, value);
			// Remove Hidden Filters from URL query parameters on time change
			urlQuery.delete(QueryParams.activeLogId);

			if (searchParams.has(QueryParams.compositeQuery)) {
				const updatedCompositeQuery = getUpdatedCompositeQuery();
				urlQuery.set(QueryParams.compositeQuery, updatedCompositeQuery);
			}

			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);

			// // For logs explorer - time range handling is managed in useCopyLogLink.ts:52
		},
		[
			isModalTimeSelection,
			location.pathname,
			onTimeChange,
			refreshButtonHidden,
			safeNavigate,
			getUpdatedCompositeQuery,
			updateLocalStorageForRoutes,
			updateTimeInterval,
			urlQuery,
			searchParams,
		],
	);

	const onRefreshHandler = (): void => {
		onSelectHandler(selectedTime);
		onLastRefreshHandler();
	};
	const handleReset = useCallback(() => {
		if (defaultRelativeTime) {
			onSelectHandler(defaultRelativeTime);
		}
	}, [defaultRelativeTime, onSelectHandler]);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const onCustomDateHandler = (dateTimeRange: DateTimeRangeType): void => {
		if (dateTimeRange !== null) {
			const [startTimeMoment, endTimeMoment] = dateTimeRange;
			if (isModalTimeSelection) {
				if (!startTimeMoment || !endTimeMoment) {
					setHasSelectedTimeError(true);
					return;
				}

				const startTs = startTimeMoment.toDate().getTime();
				const endTs = endTimeMoment.toDate().getTime();

				if (startTs >= endTs) {
					setHasSelectedTimeError(true);
					return;
				}

				setCustomDTPickerVisible(false);
				setHasSelectedTimeError(false);
				setModalStartTime(startTs);
				setModalEndTime(endTs);
				onTimeChange?.('custom', [startTs, endTs]);
				return;
			}
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

				urlQuery.set(
					QueryParams.startTime,
					startTime?.toDate().getTime().toString(),
				);
				urlQuery.set(QueryParams.endTime, endTime?.toDate().getTime().toString());
				urlQuery.delete(QueryParams.relativeTime);

				if (searchParams.has(QueryParams.compositeQuery)) {
					const updatedCompositeQuery = getUpdatedCompositeQuery();
					urlQuery.set(QueryParams.compositeQuery, updatedCompositeQuery);
				}

				const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
				safeNavigate(generatedUrl);
			}
		}
	};

	const onValidCustomDateHandler = (dateTimeStr: CustomTimeType): void => {
		if (isModalTimeSelection) {
			onTimeChange?.(dateTimeStr);
			return;
		}
		setIsOpen(false);
		updateTimeInterval(dateTimeStr);
		updateLocalStorageForRoutes(dateTimeStr);

		urlQuery.delete('startTime');
		urlQuery.delete('endTime');

		urlQuery.set(QueryParams.relativeTime, dateTimeStr);

		const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
		safeNavigate(generatedUrl);

		if (!stagedQuery) {
			return;
		}

		// the second boolean param directs the qb about the time change so to merge the query and retain the current state
		// we removed update step interval to stop auto updating the value on time change
		initQueryBuilderData(stagedQuery, true);
	};

	const getCustomOrIntervalTime = (
		time: Time,
		currentRoute: string,
	): Time | CustomTimeType => {
		// if the relativeTime param is present in the url give top most preference to the same
		// if the relativeTime param is not valid then move to next preference
		if (relativeTimeFromUrl != null && isValidTimeFormat(relativeTimeFromUrl)) {
			return relativeTimeFromUrl as Time;
		}

		// if the startTime and endTime params are present in the url give next preference to the them.
		if (searchEndTime !== null && searchStartTime !== null) {
			return 'custom';
		}

		// if nothing is present in the url for time range then rely on the local storage values
		if (
			(localstorageEndTime === null || localstorageStartTime === null) &&
			time === 'custom'
		) {
			return getDefaultOption(currentRoute);
		}

		// if not present in the local storage as well then rely on the defaults set for the page
		if (OLD_RELATIVE_TIME_VALUES.indexOf(time) > -1) {
			return convertOldTimeToNewValidCustomTimeFormat(time);
		}
		return time;
	};

	const handleAbsoluteTimeSync = useCallback(
		(
			startTime: string,
			endTime: string,
			currentMinTime: number,
			currentMaxTime: number,
		): void => {
			const startTs = normalizeTimeToMs(startTime);
			const endTs = normalizeTimeToMs(endTime);

			const timeComparison = {
				url: {
					start: dayjs(startTs).startOf('minute'),
					end: dayjs(endTs).startOf('minute'),
				},
				current: {
					start: dayjs(normalizeTimeToMs(currentMinTime)).startOf('minute'),
					end: dayjs(normalizeTimeToMs(currentMaxTime)).startOf('minute'),
				},
			};

			const hasTimeChanged =
				!timeComparison.current.start.isSame(timeComparison.url.start) ||
				!timeComparison.current.end.isSame(timeComparison.url.end);

			if (hasTimeChanged) {
				dispatch(UpdateTimeInterval('custom', [startTs, endTs]));
			}
		},
		[dispatch],
	);

	const handleRelativeTimeSync = useCallback(
		(relativeTime: string): void => {
			updateTimeInterval(relativeTime as Time);
			setRefreshButtonHidden(false);
		},
		[updateTimeInterval],
	);

	// Sync time picker state with URL on browser navigation
	useEffect(() => {
		if (navigationType !== 'POP') return;

		if (searchStartTime && searchEndTime) {
			handleAbsoluteTimeSync(searchStartTime, searchEndTime, minTime, maxTime);
			return;
		}

		if (
			relativeTimeFromUrl &&
			isValidTimeFormat(relativeTimeFromUrl) &&
			relativeTimeFromUrl !== selectedTime
		) {
			handleRelativeTimeSync(relativeTimeFromUrl);
		}
	}, [
		navigationType,
		searchStartTime,
		searchEndTime,
		relativeTimeFromUrl,
		selectedTime,
		minTime,
		maxTime,
		dispatch,
		updateTimeInterval,
		handleAbsoluteTimeSync,
		handleRelativeTimeSync,
	]);

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

		// Give priority to relativeTime from URL if it exists and start /end time are not present in the url, to sync the relative time in URL param with the time picker
		if (
			!searchStartTime &&
			!searchEndTime &&
			relativeTimeFromUrl &&
			isValidTimeFormat(relativeTimeFromUrl)
		) {
			handleRelativeTimeSync(relativeTimeFromUrl);
		}

		// set the default relative time for alert history and overview pages if relative time is not specified
		if (
			(!urlQuery.has(QueryParams.startTime) ||
				!urlQuery.has(QueryParams.endTime)) &&
			!urlQuery.has(QueryParams.relativeTime) &&
			(currentRoute === ROUTES.ALERT_OVERVIEW ||
				currentRoute === ROUTES.ALERT_HISTORY)
		) {
			updateTimeInterval(defaultRelativeTime);
			urlQuery.set(QueryParams.relativeTime, defaultRelativeTime);
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);
			return;
		}

		const time = getDefaultTime(currentRoute);

		const currentOptions = getOptions(currentRoute);
		setOptions(currentOptions);

		const updatedTime = getCustomOrIntervalTime(time, currentRoute);

		const [preStartTime = 0, preEndTime = 0] = getTime() || [];

		setRefreshButtonHidden(updatedTime === 'custom');

		if (updatedTime !== 'custom') {
			updateTimeInterval(updatedTime);
		} else {
			updateTimeInterval(updatedTime, [preStartTime, preEndTime]);
		}

		if (updatedTime !== 'custom') {
			urlQuery.delete('startTime');
			urlQuery.delete('endTime');
			urlQuery.set(QueryParams.relativeTime, updatedTime);
		} else {
			const startTime = preStartTime.toString();
			const endTime = preEndTime.toString();

			urlQuery.set(QueryParams.startTime, startTime);
			urlQuery.set(QueryParams.endTime, endTime);
			urlQuery.delete(QueryParams.relativeTime);
		}
		const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
		safeNavigate(generatedUrl);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname, updateTimeInterval, globalTimeLoading]);

	const { timezone } = useTimezone();

	const getSelectedValue = (): string => {
		if (showLiveLogs) {
			return 'live';
		}

		return getInputLabel(
			dayjs(isModalTimeSelection ? modalStartTime : minTime / 1000000).tz(
				timezone.value,
			),
			dayjs(isModalTimeSelection ? modalEndTime : maxTime / 1000000).tz(
				timezone.value,
			),
			isModalTimeSelection ? modalSelectedInterval : selectedTime,
		);
	};

	return (
		<div className="date-time-selector">
			{showResetButton && selectedTime !== defaultRelativeTime && (
				<FormItem>
					<Button
						type="default"
						className="reset-button"
						onClick={handleReset}
						title={`Reset to ${defaultRelativeTime}`}
						icon={<Undo size={14} />}
					>
						Reset
					</Button>
				</FormItem>
			)}

			{showOldExplorerCTA && (
				<div style={{ marginRight: 12 }}>
					<NewExplorerCTA />
				</div>
			)}

			{!hasSelectedTimeError && !refreshButtonHidden && showRefreshText && (
				<div className="refresh-text-container">
					<RefreshText
						{...{
							onLastRefreshHandler,
						}}
						refreshButtonHidden={refreshButtonHidden}
					/>
				</div>
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
						selectedTime={
							isModalTimeSelection ? (modalSelectedInterval as Time) : selectedTime
						}
						onValidCustomDateChange={(dateTime): void => {
							onValidCustomDateHandler(dateTime.timeStr as CustomTimeType);
						}}
						selectedValue={getSelectedValue()}
						data-testid="dropDown"
						items={options}
						showLiveLogs={showLiveLogs}
						newPopover
						onGoLive={onGoLive}
						onCustomDateHandler={onCustomDateHandler}
						customDateTimeVisible={customDateTimeVisible}
						setCustomDTPickerVisible={setCustomDTPickerVisible}
						onExitLiveLogs={onExitLiveLogs}
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
				</FormContainer>
			</Form>
		</div>
	);
}

interface DateTimeSelectionV2Props {
	showAutoRefresh: boolean;
	showRefreshText?: boolean;
	hideShareModal?: boolean;
	showOldExplorerCTA?: boolean;
	showResetButton?: boolean;
	defaultRelativeTime?: Time;
	isModalTimeSelection?: boolean;
	onTimeChange?: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
	modalSelectedInterval?: Time;
	modalInitialStartTime?: number;
	modalInitialEndTime?: number;
	showLiveLogs?: boolean;
	onGoLive?: () => void;
	onExitLiveLogs?: () => void;
}

DateTimeSelection.defaultProps = {
	hideShareModal: false,
	showOldExplorerCTA: false,
	showRefreshText: true,
	showResetButton: false,
	defaultRelativeTime: RelativeTimeMap['6hr'] as Time,
	isModalTimeSelection: false,
	onTimeChange: (): void => {},
	modalSelectedInterval: RelativeTimeMap['5m'] as Time,
	modalInitialStartTime: undefined,
	modalInitialEndTime: undefined,
	onGoLive: (): void => {},
	onExitLiveLogs: (): void => {},
	showLiveLogs: false,
};
interface DispatchProps {
	updateTimeInterval: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => (dispatch: Dispatch<AppActions>) => void;
	globalTimeLoading: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
	{ isModalTimeSelection }: DateTimeSelectionV2Props,
): DispatchProps => ({
	updateTimeInterval: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	): ((dispatch: Dispatch<AppActions>) => void) => {
		/**
		 * Updates the global time interval only when not in modal view
		 *
		 * @param interval - Selected time interval or custom time range
		 * @param dateTimeRange - Optional tuple of [startTime, endTime]
		 * @returns Function that updates redux store with new time interval, or empty function for modal view
		 *
		 * When in modal view (isModalTimeSelection=true), we don't want to update the global time state
		 * as the selection is temporary until the modal is confirmed
		 */
		if (!isModalTimeSelection) {
			return bindActionCreators(UpdateTimeInterval, dispatch)(
				interval,
				dateTimeRange,
			);
		}
		// Return empty function for modal view as we don't want to update global state
		return (): void => {};
	},
	globalTimeLoading: bindActionCreators(GlobalTimeLoading, dispatch),
});

type Props = DateTimeSelectionV2Props & DispatchProps & RouteComponentProps;

export default connect(null, mapDispatchToProps)(withRouter(DateTimeSelection));
