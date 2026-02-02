/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import {
	ChangeEvent,
	Dispatch,
	SetStateAction,
	useEffect,
	useRef,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Input, InputRef, Popover, Tooltip } from 'antd';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import {
	FixedDurationSuggestionOptions,
	Options,
	RelativeDurationSuggestionOptions,
} from 'container/TopNav/DateTimeSelectionV2/constants';
import dayjs from 'dayjs';
import { isValidShortHandDateTimeFormat } from 'lib/getMinMax';
import { defaultTo, isFunction, noop } from 'lodash-es';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import { getTimeDifference, validateEpochRange } from 'utils/epochUtils';
import { popupContainer } from 'utils/selectPopupContainer';
import { TimeRangeValidationResult, validateTimeRange } from 'utils/timeUtils';

import CustomTimePickerPopoverContent from './CustomTimePickerPopoverContent';

import './CustomTimePicker.styles.scss';

const maxAllowedMinTimeInMonths = 15;
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
	minTime: number;
	maxTime: number;
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
	minTime,
	maxTime,
}: CustomTimePickerProps): JSX.Element {
	const [
		selectedTimePlaceholderValue,
		setSelectedTimePlaceholderValue,
	] = useState('Select / Enter Time Range');

	const [inputValue, setInputValue] = useState('');
	const [inputStatus, setInputStatus] = useState<CustomTimePickerInputStatus>(
		CustomTimePickerInputStatus.UNSET,
	);
	const [inputErrorDetails, setInputErrorDetails] = useState<
		TimeRangeValidationResult['errorDetails'] | null
	>(null);
	const location = useLocation();

	const inputRef = useRef<InputRef>(null);

	const [activeView, setActiveView] = useState<ViewType>(DEFAULT_VIEW);

	const { timezone } = useTimezone();
	const activeTimezoneOffset = timezone.offset;

	const [isOpenedFromFooter, setIsOpenedFromFooter] = useState(false);

	// function to get selected time in Last 1m, Last 2h, Last 3d, Last 4w format
	// 1m, 2h, 3d, 4w -> Last 1 minute, Last 2 hours, Last 3 days, Last 4 weeks
	const getSelectedTimeRangeLabelInRelativeFormat = (
		selectedTime: string,
	): string => {
		if (!selectedTime || selectedTime === 'custom') {
			return selectedTime || '';
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
		if (!selectedTime) {
			return '';
		}

		if (selectedTime === 'custom') {
			// TODO: if the user preference is 12 hour format, then convert the date range string to 12-hour format (pick this up while working on 12/24 hour preference feature)
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

		if (isValidShortHandDateTimeFormat(selectedTime)) {
			return getSelectedTimeRangeLabelInRelativeFormat(selectedTime);
		}

		return '';
	};

	const resetErrorStatus = (): void => {
		setInputStatus(CustomTimePickerInputStatus.UNSET);
		onError(false);
		setInputErrorDetails(null);
	};

	useEffect(() => {
		if (showLiveLogs) {
			setSelectedTimePlaceholderValue('Live');
			setInputValue('Live');
			resetErrorStatus();
		} else {
			const value = getSelectedTimeRangeLabel(selectedTime, selectedValue);
			setSelectedTimePlaceholderValue(value);
			setInputValue(value);
			resetErrorStatus();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTime, selectedValue, showLiveLogs]);

	const hide = (): void => {
		setOpen(false);
	};

	const getInputPrefix = (): JSX.Element => {
		if (showLiveLogs) {
			return (
				<span className="time-input-prefix is-live">
					<span className="live-dot-icon" />
				</span>
			);
		}

		const timeDifference = getTimeDifference(
			Number(minTime / 1000_000),
			Number(maxTime / 1000_000),
		);

		return <span className="time-input-prefix">{timeDifference}</span>;
	};

	const handleOpenChange = (newOpen: boolean): void => {
		setOpen(newOpen);

		if (!newOpen) {
			setCustomDTPickerVisible?.(false);
			setActiveView('datetime');

			if (showLiveLogs) {
				setSelectedTimePlaceholderValue('Live');
				setInputValue('Live');
				return;
			}

			// set the input value to a relative format if the selected time is not custom
			const inputValue = getSelectedTimeRangeLabel(selectedTime, selectedValue);
			setInputValue(inputValue);
		}
	};

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
		const inputValue = event.target.value;
		setInputValue(inputValue);

		resetErrorStatus();
	};

	const handleInputPressEnter = (): void => {
		// check if the entered time is in the format of 1m, 2h, 3d, 4w
		const isTimeDurationShortHandFormat = /^(\d+)([mhdw])$/.test(inputValue);

		if (isTimeDurationShortHandFormat) {
			setInputStatus(CustomTimePickerInputStatus.SUCCESS);
			onError(false);
			setInputErrorDetails(null);

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
				setInputErrorDetails({
					message: `Please enter time less than ${maxAllowedMinTimeInMonths} months`,
					code: 'TIME_LESS_THAN_MAX_ALLOWED_TIME_IN_MONTHS',
					description: `Please enter time less than ${maxAllowedMinTimeInMonths} months`,
				});
				if (isFunction(onCustomTimeStatusUpdate)) {
					onCustomTimeStatusUpdate(true);
				}
			} else {
				onValidCustomDateChange({
					time: [minTime, currentTime],
					timeStr: inputValue,
				});

				setOpen(false);
			}

			return;
		}

		// parse the input value to get the start and end time
		const [startTime, endTime] = inputValue.split(/\s[-–]\s/);

		// check if startTime and endTime are epoch format
		const { isValid: isValidStartTime, range: epochRange } = validateEpochRange(
			Number(startTime),
			Number(endTime),
		);

		if (isValidStartTime && epochRange?.startTime && epochRange?.endTime) {
			onCustomDateHandler?.([epochRange?.startTime, epochRange?.endTime]);

			setOpen(false);

			return;
		}

		const {
			isValid: isValidTimeRange,
			errorDetails,
			startTimeMs,
			endTimeMs,
		} = validateTimeRange(
			startTime,
			endTime,
			DATE_TIME_FORMATS.UK_DATETIME_SECONDS,
			timezone.value,
		);

		if (!isValidTimeRange) {
			setInputStatus(CustomTimePickerInputStatus.ERROR);
			onError(true);
			setInputErrorDetails(errorDetails || null);
			return;
		}

		onCustomDateHandler?.([dayjs(startTimeMs), dayjs(endTimeMs)]);

		setOpen(false);
	};

	const handleSelect = (label: string, value: string): void => {
		if (value === 'custom') {
			setCustomDTPickerVisible?.(true);
			return;
		}

		onSelect(value);
		setSelectedTimePlaceholderValue(label);
		resetErrorStatus();
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

	const handleOpen = (e?: React.SyntheticEvent): void => {
		e?.stopPropagation?.();

		if (showLiveLogs) {
			setOpen(true);
			setSelectedTimePlaceholderValue('Live');
			setInputValue('Live');
			return;
		}

		setOpen(true);
		// reset the input status and error message as we reset the time to previous correct value
		resetErrorStatus();

		const startTime = dayjs(minTime / 1000_000)
			.tz(timezone.value)
			.format(DATE_TIME_FORMATS.UK_DATETIME_SECONDS);
		const endTime = dayjs(maxTime / 1000_000)
			.tz(timezone.value)
			.format(DATE_TIME_FORMATS.UK_DATETIME_SECONDS);

		setInputValue(`${startTime} - ${endTime}`);
	};

	const handleClose = (e: React.MouseEvent): void => {
		e.stopPropagation();
		setOpen(false);
		setCustomDTPickerVisible?.(false);

		if (showLiveLogs) {
			setInputValue('Live');
			return;
		}

		// set the input value to a relative format if the selected time is not custom
		const inputValue = getSelectedTimeRangeLabel(selectedTime, selectedValue);
		setInputValue(inputValue);
	};

	// this is required as TopNav component wraps the components and we need to clear the state on path change
	useEffect(() => {
		resetErrorStatus();
		setInputValue('');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname]);

	const handleInputBlur = (): void => {
		resetErrorStatus();
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

	const focusInput = (): void => {
		// Use setTimeout to wait for React to update the DOM and make input editable
		setTimeout(() => {
			const inputElement = inputRef.current?.input;
			if (inputElement) {
				inputElement.focus();
				inputElement.select();
			}
		}, 100);
	};

	// Focus and select input text when popover opens
	useEffect(() => {
		if (open && inputRef.current) {
			focusInput();
		}
	}, [open]);

	const handleTimezoneChange = (): void => {
		focusInput();
	};

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
								isLiveLogsEnabled={!!showLiveLogs}
								setIsOpen={setOpen}
								setCustomDTPickerVisible={defaultTo(setCustomDTPickerVisible, noop)}
								customDateTimeVisible={defaultTo(customDateTimeVisible, false)}
								onCustomDateHandler={defaultTo(onCustomDateHandler, noop)}
								onSelectHandler={handleSelect}
								onTimezoneChange={handleTimezoneChange}
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
								inputErrorDetails={inputErrorDetails}
								minTime={minTime}
								maxTime={maxTime}
							/>
						) : (
							content
						)
					}
					arrow={false}
					trigger="click"
					open={open}
					destroyTooltipOnHide
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
						readOnly={!open || showLiveLogs}
						placeholder={selectedTimePlaceholderValue}
						value={inputValue}
						onFocus={handleOpen}
						onClick={handleOpen}
						onChange={handleInputChange}
						onPressEnter={handleInputPressEnter}
						onBlur={handleInputBlur}
						data-1p-ignore
						prefix={getInputPrefix()}
						suffix={
							<div className="time-input-suffix">
								{activeTimezoneOffset && (
									<div className="timezone-badge">
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
