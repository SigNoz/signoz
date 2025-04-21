/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './CustomTimePicker.styles.scss';

import { Input, Popover, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import {
	FixedDurationSuggestionOptions,
	Options,
	RelativeDurationSuggestionOptions,
} from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs from 'dayjs';
import { isValidTimeFormat } from 'lib/getMinMax';
import { defaultTo, isFunction, noop } from 'lodash-es';
import debounce from 'lodash-es/debounce';
import { CheckCircle, ChevronDown, Clock } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import {
	ChangeEvent,
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { popupContainer } from 'utils/selectPopupContainer';

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
	handleGoLive?: () => void;
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
	handleGoLive,
}: CustomTimePickerProps): JSX.Element {
	const [
		selectedTimePlaceholderValue,
		setSelectedTimePlaceholderValue,
	] = useState('Select / Enter Time Range');

	const [inputValue, setInputValue] = useState('');
	const [inputStatus, setInputStatus] = useState<'' | 'error' | 'success'>('');
	const [inputErrorMessage, setInputErrorMessage] = useState<string | null>(
		null,
	);
	const location = useLocation();
	const [isInputFocused, setIsInputFocused] = useState(false);

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
			return selectedTime;
		}

		return '';
	};

	useEffect(() => {
		const value = getSelectedTimeRangeLabel(selectedTime, selectedValue);
		setSelectedTimePlaceholderValue(value);
	}, [selectedTime, selectedValue]);

	const hide = (): void => {
		setOpen(false);
	};

	const handleOpenChange = (newOpen: boolean): void => {
		setOpen(newOpen);
		if (!newOpen) {
			setCustomDTPickerVisible?.(false);
			setActiveView('datetime');
		}
	};

	const debouncedHandleInputChange = debounce((inputValue): void => {
		const isValidFormat = /^(\d+)([mhdw])$/.test(inputValue);
		if (isValidFormat) {
			setInputStatus('success');
			onError(false);
			setInputErrorMessage(null);

			const match = inputValue.match(/^(\d+)([mhdw])$/);

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
		} else {
			setInputStatus('error');
			onError(true);
			setInputErrorMessage(null);
			if (isFunction(onCustomTimeStatusUpdate)) {
				onCustomTimeStatusUpdate(false);
			}
		}
	}, 300);

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
		const inputValue = event.target.value;

		if (inputValue.length > 0) {
			setOpen(false);
		} else {
			setOpen(true);
		}

		setInputValue(inputValue);

		// Call the debounced function with the input value
		debouncedHandleInputChange(inputValue);
	};

	const handleSelect = (label: string, value: string): void => {
		onSelect(value);
		setSelectedTimePlaceholderValue(label);
		setInputStatus('');
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

	const handleFocus = (): void => {
		setIsInputFocused(true);
		setActiveView('datetime');
	};

	const handleBlur = (): void => {
		setIsInputFocused(false);
	};

	// this is required as TopNav component wraps the components and we need to clear the state on path change
	useEffect(() => {
		setInputStatus('');
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

	return (
		<div className="custom-time-picker">
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
							handleGoLive={defaultTo(handleGoLive, noop)}
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
				onOpenChange={handleOpenChange}
				style={{
					padding: 0,
				}}
			>
				<Input
					className="timeSelection-input"
					type="text"
					status={inputValue && inputStatus === 'error' ? 'error' : ''}
					placeholder={
						isInputFocused
							? 'Time Format (1m or 2h or 3d or 4w)'
							: selectedTimePlaceholderValue
					}
					value={inputValue}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onChange={handleInputChange}
					prefix={
						inputValue && inputStatus === 'success' ? (
							<CheckCircle size={14} color="#51E7A8" />
						) : (
							<Tooltip title="Enter time in format (e.g., 1m, 2h, 3d, 4w)">
								<Clock size={14} />
							</Tooltip>
						)
					}
					suffix={
						<>
							{!!isTimezoneOverridden && activeTimezoneOffset && (
								<div className="timezone-badge" onClick={handleTimezoneHintClick}>
									<span>{activeTimezoneOffset}</span>
								</div>
							)}
							<ChevronDown
								size={14}
								onClick={(): void => handleViewChange('datetime')}
							/>
						</>
					}
				/>
			</Popover>

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
	handleGoLive: noop,
	onCustomTimeStatusUpdate: noop,
};
