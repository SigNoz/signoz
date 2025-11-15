/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './CustomTimePicker.styles.scss';

import type { InputRef } from 'antd';
import { Input, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import {
	FixedDurationSuggestionOptions,
	Options,
	RelativeDurationSuggestionOptions,
} from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs from 'dayjs';
import { isValidTimeFormat } from 'lib/getMinMax';
import { defaultTo, isFunction, noop } from 'lodash-es';
import { CheckCircle, ChevronDown, Clock } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import {
	ChangeEvent,
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import CustomTimePickerPopoverContent from './CustomTimePickerPopoverContent';

const maxAllowedMinTimeInMonths = 6;
type ViewType = 'datetime' | 'timezone';
const DEFAULT_VIEW: ViewType = 'datetime';

interface CustomTimePickerProps {
	onSelect: (value: string) => void;
	onError: (value: boolean) => void;
	selectedValue: string;
	selectedTime: string;
	onValidCustomDateChange: ({
		time: [t1, t2],
		timeStr,
	}: {
		time: [dayjs.Dayjs | null, dayjs.Dayjs | null];
		timeStr: string;
	}) => void;
	onCustomTimeStatusUpdate?: (isValid: boolean) => void;
	open: boolean;
	setOpen: Dispatch<SetStateAction<boolean>>;
	items: any[];
	newPopover?: boolean;
	customDateTimeVisible?: boolean;
	setCustomDTPickerVisible?: Dispatch<SetStateAction<boolean>>;
	onCustomDateHandler?: (dateTimeRange: DateTimeRangeType) => void;
	showLiveLogs?: boolean;
	onGoLive?: () => void;
	onExitLiveLogs?: () => void;
}

const formatSelectedTimeValue = (selectedTime: string): string => {
	console.log('selectedTime', selectedTime);

	// format valid time format to 12-hour format
	// 1m -> Last 1 minute
	// 1h -> Last 1 hour
	// 1d -> Last 1 day
	// 1w -> Last 1 week
	// 30m -> Last 30 minutes
	// 6h -> Last 6 hours
	// 3d -> Last 3 days
	// 1w -> Last 1 week
	// 1month -> Last 1 month
	// 2months -> Last 2 months

	// parse the string to generate the label
	const regex = /^(\d+)([mhdw])$/;
	const match = regex.exec(selectedTime);
	if (match) {
		const value = match[1];
		const unit = match[2];

		const intValue = parseInt(value, 10);

		switch (unit) {
			case 'm':
				return `Last ${value} minutes`;
			case 'h':
				return `Last ${value} hour${intValue > 1 ? 's' : ''}`;
			case 'd':
				return `Last ${value} day${intValue > 1 ? 's' : ''}`;
			case 'w':
				return `Last ${value} week${intValue > 1 ? 's' : ''}`;
			case 'month':
				return `Last ${value} month${intValue > 1 ? 's' : ''}`;
			default:
				return '';
		}
	}

	return '';
};

const getSelectedTimeRangeLabel = (
	selectedTime: string,
	selectedTimeValue: string,
): string => {
	let selectedTimeLabel = '';

	if (selectedTime === 'custom') {
		// TODO(shaheer): if the user preference is 12 hour format, then convert the date range string to 12-hour format (pick this up while working on 12/24 hour preference feature)
		// // Convert the date range string to 12-hour format
		// const dates = selectedTimeValue.split(' - ');
		// if (dates.length === 2) {
		// 	const startDate = dayjs(dates[0], DATE_TIME_FORMATS.UK_DATETIME);
		// 	const endDate = dayjs(dates[1], DATE_TIME_FORMATS.UK_DATETIME);

		// 	return `${startDate.format(DATE_TIME_FORMATS.UK_DATETIME)} - ${endDate.format(
		// 		DATE_TIME_FORMATS.UK_DATETIME,
		// 	)}`;
		// }
		return selectedTimeValue;
	}

	for (let index = 0; index < Options.length; index++) {
		if (Options[index].value === selectedTime) {
			selectedTimeLabel = Options[index].label;
		}
	}

	for (
		let index = 0;
		index < RelativeDurationSuggestionOptions.length;
		index++
	) {
		if (RelativeDurationSuggestionOptions[index].value === selectedTime) {
			selectedTimeLabel = RelativeDurationSuggestionOptions[index].label;
		}
	}

	for (let index = 0; index < FixedDurationSuggestionOptions.length; index++) {
		if (FixedDurationSuggestionOptions[index].value === selectedTime) {
			selectedTimeLabel = FixedDurationSuggestionOptions[index].label;
		}
	}

	if (isValidTimeFormat(selectedTime)) {
		selectedTimeLabel = formatSelectedTimeValue(selectedTime);
	}

	return selectedTimeLabel;
};

// const getFormattedSelectedTimeValue = (
// 	selectedTime: string,
// 	selectedTimeValue: string,
// ): string => {
// 	console.log('selectedTime', selectedTime);
// 	console.log('selectedTimeValue', selectedTimeValue);

// 	if (selectedTime === 'custom') {
// 		// TODO(shaheer): if the user preference is 12 hour format, then convert the date range string to 12-hour format (pick this up while working on 12/24 hour preference feature)
// 		// // Convert the date range string to 12-hour format
// 		// const dates = selectedTimeValue.split(' - ');
// 		// if (dates.length === 2) {
// 		// 	const startDate = dayjs(dates[0], DATE_TIME_FORMATS.UK_DATETIME);
// 		// 	const endDate = dayjs(dates[1], DATE_TIME_FORMATS.UK_DATETIME);

// 		// 	return `${startDate.format(DATE_TIME_FORMATS.UK_DATETIME)} - ${endDate.format(
// 		// 		DATE_TIME_FORMATS.UK_DATETIME,
// 		// 	)}`;
// 		// }
// 		return selectedTimeValue;
// 	}

// 	for (let index = 0; index < Options.length; index++) {
// 		if (Options[index].value === selectedTime) {
// 			return Options[index].label;
// 		}
// 	}

// 	for (
// 		let index = 0;
// 		index < RelativeDurationSuggestionOptions.length;
// 		index++
// 	) {
// 		if (RelativeDurationSuggestionOptions[index].value === selectedTime) {
// 			return RelativeDurationSuggestionOptions[index].label;
// 		}
// 	}

// 	for (let index = 0; index < FixedDurationSuggestionOptions.length; index++) {
// 		if (FixedDurationSuggestionOptions[index].value === selectedTime) {
// 			return FixedDurationSuggestionOptions[index].label;
// 		}
// 	}

// 	if (isValidTimeFormat(selectedTime)) {
// 		return selectedTime;
// 	}

// 	return '';
// };

function CustomTimePicker({
	onSelect,
	onError,
	items,
	selectedValue,
	selectedTime,
	open,
	setOpen,
	onValidCustomDateChange,
	onCustomTimeStatusUpdate,
	newPopover,
	customDateTimeVisible,
	setCustomDTPickerVisible,
	onCustomDateHandler,
	onGoLive,
	onExitLiveLogs,
	showLiveLogs,
}: CustomTimePickerProps): JSX.Element {
	const [
		selectedTimePlaceholderValue,
		setSelectedTimePlaceholderValue,
	] = useState('Select / Enter Time Range');

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const inputRef = useRef<InputRef | null>(null);

	const [value, setValue] = useState<string>('');

	const [inputStatus, setInputStatus] = useState<'' | 'error' | 'success'>('');
	const [inputErrorMessage, setInputErrorMessage] = useState<string | null>(
		null,
	);
	const location = useLocation();

	const [showDateTimeOptions, setShowDateTimeOptions] = useState(open);

	const [isInputFocused, setIsInputFocused] = useState(false);

	const [activeView, setActiveView] = useState<ViewType>(DEFAULT_VIEW);

	const { timezone, browserTimezone } = useTimezone();

	const activeTimezoneOffset = timezone.offset;

	useEffect(() => {
		setShowDateTimeOptions(open);
	}, [open]);

	useEffect(() => {
		setValue(getSelectedTimeRangeLabel(selectedTime, selectedValue));
	}, [selectedTime, selectedValue]);

	const isTimezoneOverridden = useMemo(
		() => timezone.offset !== browserTimezone.offset,
		[timezone, browserTimezone],
	);

	const handleViewChange = useCallback(
		(newView: 'timezone' | 'datetime'): void => {
			if (activeView !== newView) {
				setActiveView(newView);
			}
			setOpen(true);
		},
		[activeView, setOpen],
	);

	const [isOpenedFromFooter, setIsOpenedFromFooter] = useState(false);

	useEffect(() => {
		if (showLiveLogs) {
			setSelectedTimePlaceholderValue('Live');
		} else {
			const value = getSelectedTimeRangeLabel(selectedTime, selectedValue);
			setSelectedTimePlaceholderValue(value);

			setValue(value);
		}
	}, [selectedTime, selectedValue, showLiveLogs]);

	const hide = (): void => {
		setOpen(false);
	};

	const handleCustomDateChange = (inputValue: string): void => {
		const dates = inputValue.split(' - ');

		const startDate = dayjs(dates[0], DATE_TIME_FORMATS.UK_DATETIME_SECONDS);
		const endDate = dayjs(dates[1], DATE_TIME_FORMATS.UK_DATETIME_SECONDS);

		if (!startDate.isValid() || !endDate.isValid()) {
			setInputStatus('error');
			onError(true);
			setInputErrorMessage('Please enter valid date range');

			return;
		}

		if (startDate.isAfter(endDate)) {
			setInputStatus('error');
			onError(true);
			setInputErrorMessage('Start date should be before end date');

			return;
		}

		onCustomDateHandler?.([startDate, endDate]);

		setInputStatus('success');
		onError(false);
		setInputErrorMessage(null);
	};

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const handleDateTimeChange = (inputValue: string): void => {
		if (!inputValue || inputValue === '') {
			return;
		}

		const isValidFormat = /^(\d+)([mhdw])$/.test(inputValue);

		if (inputValue && isValidFormat) {
			setInputStatus('success');
			onError(false);
			setInputErrorMessage(null);

			const match = inputValue.match(/^(\d+)([mhdw])$/);

			const value = match ? parseInt(match[1], 10) : 0;
			const unit = match ? match[2] : null;

			const currentTime = dayjs();
			const maxAllowedMinTime = currentTime.subtract(
				maxAllowedMinTimeInMonths,
				'month',
			);
			let minTime = null;

			switch (unit) {
				case 'm':
					minTime = currentTime.subtract(value, 'minute');
					break;

				case 'h':
					minTime = currentTime.subtract(value, 'hour');
					break;
				case 'd':
					minTime = currentTime.subtract(value, 'day');
					break;
				case 'w':
					minTime = currentTime.subtract(value, 'week');
					break;
				default:
					break;
			}

			if (minTime && (!minTime.isValid() || minTime < maxAllowedMinTime)) {
				setInputStatus('error');
				onError(true);
				setInputErrorMessage('Please enter time less than 6 months');
				if (isFunction(onCustomTimeStatusUpdate)) {
					onCustomTimeStatusUpdate(true);
				}
			} else {
				onValidCustomDateChange({
					time: [minTime, currentTime],
					timeStr: inputValue,
				});
			}
		} else if (selectedTime === 'custom') {
			handleCustomDateChange(inputValue);
		} else {
			setInputStatus('error');
			onError(true);
			setInputErrorMessage(null);
			if (isFunction(onCustomTimeStatusUpdate)) {
				onCustomTimeStatusUpdate(false);
			}
		}
	};

	const handleSelect = (label: string, value: string): void => {
		if (label === 'Custom') {
			setCustomDTPickerVisible?.(true);
			return;
		}

		onSelect(value);
		setSelectedTimePlaceholderValue(label);
		setInputStatus('');

		inputRef.current?.input?.blur();
		setIsInputFocused(false);
		onError(false);
		setInputErrorMessage(null);
		if (value !== 'custom') {
			hide();
		}
	};

	const handleRecentlyUsedTimeRangeClick = (): void => {
		setInputStatus('');
		inputRef.current?.input?.blur();
	};

	const content = (
		<div className="time-selection-dropdown-content">
			<div className="time-options-container">
				{items?.map(({ value, label }) => (
					<div
						onMouseDown={(e): void => {
							// Prevent blur when clicking on options
							e.preventDefault();
						}}
						onClick={(): void => {
							handleSelect(label, value);
						}}
						key={value}
						className={cx(
							'time-options-item',
							selectedValue === value ? 'active' : '',
						)}
					>
						{label}
					</div>
				))}
			</div>
		</div>
	);

	const handleFocus = (): void => {
		setIsInputFocused(true);
		setInputStatus('');
		setInputErrorMessage(null);

		// Get the raw/editable format for the current selection
		let editableValue = selectedTime;

		// If it's a custom time, use the selectedValue (date range string)
		if (selectedTime === 'custom') {
			editableValue = selectedValue;
		}
		// If it's a predefined option, convert back to raw format
		else if (selectedTime && selectedTime !== 'custom') {
			// For predefined options, use the selectedTime as is (like "5m", "1h")
			editableValue = selectedTime;
		}

		// Update state with the raw format for editing
		setValue(editableValue);

		setOpen(true);
		// setCustomDTPickerVisible?.(true);
		setShowDateTimeOptions(true);
	};

	const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
		// Update the value state for controlled input
		setValue(e.target.value);
	};

	const handleEnter = (): void => {
		const newVal = value;
		setValue('');

		setIsInputFocused(false);
		if (newVal !== selectedValue) {
			handleDateTimeChange(newVal);
		}
		if (inputRef.current?.input) {
			inputRef.current.input.blur();
		}
	};

	const handleBlur = (): void => {
		if (!isInputFocused) {
			return;
		}

		// Don't close if custom date picker is visible
		if (customDateTimeVisible) {
			return;
		}

		setIsInputFocused(false);

		const newVal = value;
		setValue('');

		if (newVal !== selectedValue) {
			handleDateTimeChange(newVal);
		}
		if (inputRef.current?.input) {
			inputRef.current.input.blur();
		}

		setOpen(false);
		setCustomDTPickerVisible?.(false);
		setShowDateTimeOptions(false);
	};

	// No need for manual DOM sync with controlled input

	// this is required as TopNav component wraps the components and we need to clear the state on path change
	useEffect(() => {
		setInputStatus('');
		onError(false);
		setInputErrorMessage(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname]);

	const handleTimezoneHintClick = (e: React.MouseEvent): void => {
		e.stopPropagation();
		handleViewChange('timezone');
		setIsOpenedFromFooter(false);
		logEvent(
			'DateTimePicker: Timezone picker opened from time range input badge',
			{
				page: location.pathname,
			},
		);
	};

	const getTooltipTitle = (): string => {
		if (selectedTime === 'custom' && value === '' && !open) {
			return `${dayjs(minTime / 1000_000)
				.tz(timezone.value)
				.format(DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS)} - ${dayjs(
				maxTime / 1000_000,
			)
				.tz(timezone.value)
				.format(DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS)}`;
		}

		return '';
	};

	const getInputPrefix = (): JSX.Element => {
		if (showLiveLogs) {
			return (
				<div className="time-input-prefix">
					<div className="live-dot-icon" />
				</div>
			);
		}

		return (
			<div className="time-input-prefix">
				{value && inputStatus === 'success' ? (
					<CheckCircle size={14} color="#51E7A8" />
				) : (
					<Tooltip title="Enter time in format (e.g., 1m, 2h, 3d, 4w)">
						<Clock size={14} className="cursor-pointer" />
					</Tooltip>
				)}
			</div>
		);
	};

	return (
		<div className="custom-time-picker">
			<Tooltip title={getTooltipTitle()} placement="top">
				<div className="date-time-picker-container">
					{/* <Popover
						className={cx(
							'timeSelection-input-container',
							selectedTime === 'custom' && inputValue === '' ? 'custom-time' : '',
						)}
						placement="bottomRight"
						getPopupContainer={popupContainer}
						rootClassName="date-time-root"
						content={
							newPopover ? (
								<CustomTimePickerPopoverContent
									setIsOpen={setOpen}
									customDateTimeVisible={defaultTo(customDateTimeVisible, false)}
									setCustomDTPickerVisible={defaultTo(setCustomDTPickerVisible, noop)}
									onCustomDateHandler={defaultTo(onCustomDateHandler, noop)}
									onSelectHandler={handleSelect}
									onGoLive={defaultTo(onGoLive, noop)}
									onExitLiveLogs={defaultTo(onExitLiveLogs, noop)}
									options={items}
									selectedTime={selectedTime}
									activeView={activeView}
									setActiveView={setActiveView}
									setIsOpenedFromFooter={setIsOpenedFromFooter}
									isOpenedFromFooter={isOpenedFromFooter}
								/>
							) : (
								content
							)
						}
						arrow={false}
						trigger="click"
						open={open}
					> */}

					<Input
						className={cx(
							'date-time-picker-input timeSelection-input',
							selectedTime === 'custom' ? 'custom-time' : '',
						)}
						type="text"
						status={value && inputStatus === 'error' ? 'error' : ''}
						placeholder={selectedTimePlaceholderValue}
						ref={inputRef}
						value={isInputFocused ? value : ''}
						onChange={handleChange}
						onBlur={handleBlur}
						onPressEnter={handleEnter}
						onClick={handleFocus}
						data-1p-ignore
						prefix={getInputPrefix()}
						suffix={
							<div className="time-input-suffix">
								{!!isTimezoneOverridden && activeTimezoneOffset && (
									<div className="timezone-badge" onClick={handleTimezoneHintClick}>
										<span>{activeTimezoneOffset}</span>
									</div>
								)}
								<ChevronDown size={14} />
							</div>
						}
					/>

					{showDateTimeOptions && (
						<div
							className="date-time-picker-content date-time-root"
							onMouseDown={(e): void => {
								// Prevent blur when clicking inside the popover
								e.preventDefault();
							}}
						>
							{newPopover ? (
								<CustomTimePickerPopoverContent
									setIsOpen={setOpen}
									customDateTimeVisible={defaultTo(customDateTimeVisible, false)}
									setCustomDTPickerVisible={defaultTo(setCustomDTPickerVisible, noop)}
									onCustomDateHandler={defaultTo(onCustomDateHandler, noop)}
									onHandleRecentlyUsedTimeRangeClick={defaultTo(
										handleRecentlyUsedTimeRangeClick,
										noop,
									)}
									onSelectHandler={handleSelect}
									onGoLive={defaultTo(onGoLive, noop)}
									onExitLiveLogs={defaultTo(onExitLiveLogs, noop)}
									options={items}
									selectedTime={selectedTime}
									activeView={activeView}
									setActiveView={setActiveView}
									setIsOpenedFromFooter={setIsOpenedFromFooter}
									isOpenedFromFooter={isOpenedFromFooter}
								/>
							) : (
								content
							)}
						</div>
					)}
				</div>
			</Tooltip>
			{inputStatus === 'error' && inputErrorMessage && (
				<Typography.Title level={5} className="valid-format-error">
					{inputErrorMessage}
				</Typography.Title>
			)}
		</div>
	);
}

export default CustomTimePicker;

CustomTimePicker.defaultProps = {
	newPopover: false,
	customDateTimeVisible: false,
	setCustomDTPickerVisible: noop,
	onCustomDateHandler: noop,
	onGoLive: noop,
	onCustomTimeStatusUpdate: noop,
	onExitLiveLogs: noop,
	showLiveLogs: false,
};
