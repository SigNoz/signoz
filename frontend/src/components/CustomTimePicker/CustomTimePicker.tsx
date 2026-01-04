/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './CustomTimePicker.styles.scss';

import { Input, InputRef, Popover, Tooltip } from 'antd';
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
import { ChevronDown, ChevronUp } from 'lucide-react';
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
import { popupContainer } from 'utils/selectPopupContainer';

import CustomTimePickerPopoverContent from './CustomTimePickerPopoverContent';

const maxAllowedMinTimeInMonths = 6;
type ViewType = 'datetime' | 'timezone';
const DEFAULT_VIEW: ViewType = 'datetime';

export enum CustomTimePickerInputStatus {
	SUCCESS = 'success',
	ERROR = 'error',
	UNSET = '',
}

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
	/** When false, hides the "Recently Used" time ranges section */
	showRecentlyUsed?: boolean;
}

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
	showRecentlyUsed = true,
}: CustomTimePickerProps): JSX.Element {
	const [
		selectedTimePlaceholderValue,
		setSelectedTimePlaceholderValue,
	] = useState('Select / Enter Time Range');

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [inputValue, setInputValue] = useState('');
	const [inputStatus, setInputStatus] = useState<CustomTimePickerInputStatus>(
		CustomTimePickerInputStatus.UNSET,
	);
	const [inputErrorMessage, setInputErrorMessage] = useState<string | null>(
		null,
	);
	const location = useLocation();

	const inputRef = useRef<InputRef>(null);

	const [activeView, setActiveView] = useState<ViewType>(DEFAULT_VIEW);

	const { timezone, browserTimezone } = useTimezone();
	const activeTimezoneOffset = timezone.offset;
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

	// function to get selected time in Last 1m, Last 2h, Last 3d, Last 4w format
	// 1m, 2h, 3d, 4w -> Last 1 minute, Last 2 hours, Last 3 days, Last 4 weeks
	const getSelectedTimeRangeLabelInRelativeFormat = (
		selectedTime: string,
	): string => {
		if (selectedTime === 'custom') {
			return selectedTime;
		}

		// Check if the format matches the relative time format (e.g., 1m, 2h, 3d, 4w)
		const match = selectedTime.match(/^(\d+)([mhdw])$/);
		if (!match) {
			// If it doesn't match the format, return as is
			return `Last ${selectedTime}`;
		}

		const value = parseInt(match[1], 10);
		const unit = match[2];

		// Map unit abbreviations to full words
		const unitMap: Record<string, { singular: string; plural: string }> = {
			m: { singular: 'minute', plural: 'minutes' },
			h: { singular: 'hour', plural: 'hours' },
			d: { singular: 'day', plural: 'days' },
			w: { singular: 'week', plural: 'weeks' },
		};

		const unitLabel = value === 1 ? unitMap[unit].singular : unitMap[unit].plural;

		return `Last ${value} ${unitLabel}`;
	};

	const getSelectedTimeRangeLabel = (
		selectedTime: string,
		selectedTimeValue: string,
	): string => {
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
				return Options[index].label;
			}
		}

		for (
			let index = 0;
			index < RelativeDurationSuggestionOptions.length;
			index++
		) {
			if (RelativeDurationSuggestionOptions[index].value === selectedTime) {
				return RelativeDurationSuggestionOptions[index].label;
			}
		}

		for (let index = 0; index < FixedDurationSuggestionOptions.length; index++) {
			if (FixedDurationSuggestionOptions[index].value === selectedTime) {
				return FixedDurationSuggestionOptions[index].label;
			}
		}

		if (isValidTimeFormat(selectedTime)) {
			return getSelectedTimeRangeLabelInRelativeFormat(selectedTime);
		}

		return '';
	};

	useEffect(() => {
		if (showLiveLogs) {
			setSelectedTimePlaceholderValue('Live');
		} else {
			const value = getSelectedTimeRangeLabel(selectedTime, selectedValue);
			setSelectedTimePlaceholderValue(value);
			setInputValue(value);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTime, selectedValue, showLiveLogs]);

	const hide = (): void => {
		setOpen(false);
	};

	const handleOpenChange = (newOpen: boolean): void => {
		setOpen(newOpen);

		if (!newOpen) {
			setCustomDTPickerVisible?.(false);
			setActiveView('datetime');

			// set the input value to a relative format if the selected time is not custom
			const inputValue = getSelectedTimeRangeLabel(selectedTime, selectedValue);
			setInputValue(inputValue);
		}
	};

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
		const inputValue = event.target.value;

		setInputValue(inputValue);

		setInputStatus(CustomTimePickerInputStatus.UNSET);
		onError(false);
		setInputErrorMessage(null);

		// Call the debounced function with the input value
		// debouncedHandleInputChange(inputValue);
	};

	const handleInputPressEnter = (): void => {
		// check if the entered time is in the format of 1m, 2h, 3d, 4w
		const isTimeDurationShortHandFormat = /^(\d+)([mhdw])$/.test(inputValue);

		if (isTimeDurationShortHandFormat) {
			setInputStatus(CustomTimePickerInputStatus.SUCCESS);
			onError(false);
			setInputErrorMessage(null);

			const match = inputValue.match(/^(\d+)([mhdw])$/) as RegExpMatchArray;

			const value = parseInt(match[1], 10);
			const unit = match[2];

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
				setInputStatus(CustomTimePickerInputStatus.ERROR);
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

			return;
		}

		// parse the input value to get the start and end times
		const [startTime, endTime] = inputValue.split(' - ');

		// convert the start and end times to epoch milliseconds
		const startTimeValue = dayjs(
			startTime,
			DATE_TIME_FORMATS.UK_DATETIME_SECONDS,
		).unix();
		const endTimeValue = dayjs(
			endTime,
			DATE_TIME_FORMATS.UK_DATETIME_SECONDS,
		).unix();

		if (startTimeValue && endTimeValue) {
			onCustomDateHandler?.([
				dayjs.unix(startTimeValue),
				dayjs.unix(endTimeValue),
			]);

			setOpen(false);
		} else {
			setInputStatus(CustomTimePickerInputStatus.ERROR);
			onError(true);
			setInputErrorMessage('Invalid time range');
		}
	};

	const handleSelect = (label: string, value: string): void => {
		if (label === 'Custom') {
			setCustomDTPickerVisible?.(true);
			return;
		}

		onSelect(value);
		setSelectedTimePlaceholderValue(label);
		setInputStatus(CustomTimePickerInputStatus.UNSET);
		onError(false);
		setInputErrorMessage(null);
		setInputValue('');
		if (value !== 'custom') {
			hide();
		}
	};

	const content = (
		<div className="time-selection-dropdown-content">
			<div className="time-options-container">
				{items?.map(({ value, label }) => (
					<div
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

	const handleOpen = (e: React.SyntheticEvent): void => {
		e.stopPropagation();
		console.log('handleOpen called');
		setOpen(true);

		// reset the input status and error message as we reset the time to previous correct value
		setInputStatus(CustomTimePickerInputStatus.UNSET);
		onError(false);
		setInputErrorMessage(null);

		const startTime = dayjs(minTime / 1000_000).format(
			DATE_TIME_FORMATS.UK_DATETIME_SECONDS,
		);
		const endTime = dayjs(maxTime / 1000_000).format(
			DATE_TIME_FORMATS.UK_DATETIME_SECONDS,
		);

		console.log('startTime', startTime);
		console.log('endTime', endTime);

		setInputValue(`${startTime} - ${endTime}`);
	};

	const handleClose = (e: React.MouseEvent): void => {
		e.stopPropagation();
		console.log('handleClose called');
		setOpen(false);
		setCustomDTPickerVisible?.(false);

		// set the input value to a relative format if the selected time is not custom
		const inputValue = getSelectedTimeRangeLabel(selectedTime, selectedValue);
		setInputValue(inputValue);
	};

	// this is required as TopNav component wraps the components and we need to clear the state on path change
	useEffect(() => {
		setInputStatus(CustomTimePickerInputStatus.UNSET);
		onError(false);
		setInputErrorMessage(null);
		setInputValue('');
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
		if (selectedTime === 'custom' && inputValue === '' && !open) {
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

	// Focus and select input text when popover opens
	useEffect(() => {
		if (open && inputRef.current) {
			// Use setTimeout to wait for React to update the DOM and make input editable
			setTimeout(() => {
				const inputElement = inputRef.current?.input;
				if (inputElement) {
					inputElement.focus();
					inputElement.select();
				}
			}, 0);
		}
	}, [open]);

	return (
		<div className="custom-time-picker">
			<Tooltip title={getTooltipTitle()} placement="top">
				<Popover
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
								showRecentlyUsed={showRecentlyUsed}
								customDateTimeInputStatus={inputStatus}
								inputErrorMessage={inputErrorMessage}
							/>
						) : (
							content
						)
					}
					arrow={false}
					trigger="click"
					open={open}
					onOpenChange={handleOpenChange}
					style={{
						padding: 0,
					}}
				>
					<Input
						ref={inputRef}
						className={cx(
							'timeSelection-input',
							inputStatus === CustomTimePickerInputStatus.ERROR ? 'error' : '',
						)}
						type="text"
						status={
							inputValue && inputStatus === CustomTimePickerInputStatus.ERROR
								? 'error'
								: ''
						}
						readOnly={!open}
						placeholder={selectedTimePlaceholderValue}
						// placeholder={
						// 	isInputFocused
						// 		? 'Time Format (1m or 2h or 3d or 4w)'
						// 		: selectedTimePlaceholderValue
						// }
						value={inputValue}
						onFocus={handleOpen}
						onClick={handleOpen}
						// onBlur={handleClose}
						onChange={handleInputChange}
						onPressEnter={handleInputPressEnter}
						data-1p-ignore
						// prefix={getInputPrefix()}
						suffix={
							<div className="time-input-suffix">
								{!!isTimezoneOverridden && activeTimezoneOffset && (
									<div className="timezone-badge" onClick={handleTimezoneHintClick}>
										<span>{activeTimezoneOffset}</span>
									</div>
								)}

								{open ? (
									<ChevronUp
										size={14}
										className="cursor-pointer time-input-suffix-icon-badge"
										onClick={handleClose}
									/>
								) : (
									<ChevronDown
										size={14}
										className="cursor-pointer time-input-suffix-icon-badge"
										onClick={handleOpen}
									/>
								)}
							</div>
						}
					/>
				</Popover>
			</Tooltip>
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
	showRecentlyUsed: true,
};
